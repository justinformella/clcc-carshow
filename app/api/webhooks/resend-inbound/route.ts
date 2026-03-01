import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServerClient } from "@/lib/supabase-server";
import {
  sendHelpRequestConfirmation,
  sendHelpRequestAdminNotification,
} from "@/lib/email";

const TICKET_SUBJECT_SUFFIX = " — Crystal Lake Cars & Caffeine";

/**
 * Fetch the full email content from the Resend Received Emails API.
 * The webhook only sends metadata — body must be fetched separately.
 */
async function fetchEmailContent(emailId: string): Promise<{ text?: string; html?: string } | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    console.error(`[resend-inbound] Failed to fetch email ${emailId}: ${res.status}`);
    return null;
  }

  const data = await res.json();
  return { text: data.text, html: data.html };
}

/**
 * Strip quoted reply text from an email body.
 * Keeps only the new content above common reply markers.
 */
function stripQuotedReply(text: string): string {
  const lines = text.split("\n");
  const cutPatterns = [
    /^On .+ wrote:$/,                          // Gmail / Apple Mail
    /^-{3,}$/,                                  // --- separator
    /^-{5,}\s*Forwarded message\s*-{5,}$/,      // Gmail forward
    /^From:\s/,                                 // Outlook-style
    /^Sent from my /,                           // Mobile signatures
  ];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (cutPatterns.some((p) => p.test(trimmed))) {
      const result = lines.slice(0, i).join("\n").trim();
      return result || text.trim();
    }
  }

  return text.trim();
}

/**
 * Try to extract the original ticket subject from a reply subject line.
 * Expected pattern: "Re: [original subject] — Crystal Lake Cars & Caffeine"
 */
function parseTicketSubject(subject: string): string | null {
  let s = subject.trim();

  // Strip leading Re:/Fwd: prefixes (possibly multiple)
  s = s.replace(/^(Re|Fwd|Fw)\s*:\s*/gi, "");

  // Strip the suffix
  if (s.endsWith(TICKET_SUBJECT_SUFFIX)) {
    return s.slice(0, -TICKET_SUBJECT_SUFFIX.length).trim() || null;
  }

  return null;
}

/**
 * Extract a display name from the From header.
 * "John Doe <john@example.com>" → "John Doe"
 * "john@example.com" → "john@example.com"
 */
function parseFromName(from: string): string {
  const match = from.match(/^(.+?)\s*<.+>$/);
  return match ? match[1].replace(/^["']|["']$/g, "").trim() : from.trim();
}

/**
 * Extract an email address from the From header.
 * "John Doe <john@example.com>" → "john@example.com"
 * "john@example.com" → "john@example.com"
 */
function parseFromEmail(from: string): string {
  const match = from.match(/<(.+?)>/);
  return match ? match[1].trim().toLowerCase() : from.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  // --- Verify webhook signature ---
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[resend-inbound] RESEND_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const body = await request.text();
  const svixId = request.headers.get("svix-id") ?? "";
  const svixTimestamp = request.headers.get("svix-timestamp") ?? "";
  const svixSignature = request.headers.get("svix-signature") ?? "";

  let payload: {
    type: string;
    data: {
      email_id: string;
      from: string;
      to: string[];
      subject: string;
    };
  };

  try {
    const wh = new Webhook(webhookSecret);
    payload = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof payload;
  } catch (err) {
    console.error("[resend-inbound] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Only handle inbound email events
  if (payload.type !== "email.received") {
    return NextResponse.json({ received: true });
  }

  const { email_id, from, subject } = payload.data;
  const senderEmail = parseFromEmail(from);
  const senderName = parseFromName(from);

  // Fetch the full email body from Resend API (webhook only has metadata)
  const emailContent = await fetchEmailContent(email_id);
  const rawBody = emailContent?.text || emailContent?.html || "";
  const messageBody = stripQuotedReply(rawBody).slice(0, 10000);

  if (!messageBody) {
    console.log("[resend-inbound] Empty email body, ignoring");
    return NextResponse.json({ received: true });
  }

  const supabase = createServerClient();

  // --- Try to match an existing help desk ticket ---
  const ticketSubject = parseTicketSubject(subject);

  if (ticketSubject) {
    const { data: existingRequest } = await supabase
      .from("help_requests")
      .select("*")
      .eq("subject", ticketSubject)
      .ilike("email", senderEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingRequest) {
      // Add reply message to existing ticket
      await supabase.from("help_request_messages").insert({
        help_request_id: existingRequest.id,
        sender_type: "submitter",
        sender_name: senderName,
        sender_email: senderEmail,
        body: messageBody,
      });

      // Reopen ticket if it was resolved or waiting
      if (
        existingRequest.status === "resolved" ||
        existingRequest.status === "waiting_on_submitter"
      ) {
        await supabase
          .from("help_requests")
          .update({ status: "open" })
          .eq("id", existingRequest.id);
      }

      // Notify admins
      sendHelpRequestAdminNotification(existingRequest.id).catch((err) =>
        console.error("[resend-inbound] Admin notification failed:", err)
      );

      // Log the inbound email
      await supabase.from("email_log").insert({
        registration_id: null,
        email_type: "email_reply",
        recipient_email: senderEmail,
        subject: subject,
        resend_id: null,
      });

      console.log(
        `[resend-inbound] Added reply to ticket #${existingRequest.request_number} from ${senderEmail}`
      );
      return NextResponse.json({ received: true });
    }
  }

  // --- No match → create new ticket ---

  // Auto-link registration if email matches a paid registration
  const { data: registration } = await supabase
    .from("registrations")
    .select("id")
    .ilike("email", senderEmail)
    .eq("payment_status", "paid")
    .limit(1)
    .maybeSingle();

  const { data: helpRequest, error: insertError } = await supabase
    .from("help_requests")
    .insert({
      name: senderName,
      email: senderEmail,
      subject: subject.replace(/^(Re|Fwd|Fw)\s*:\s*/gi, "").trim() || "Email inquiry",
      category: "general",
      registration_id: registration?.id || null,
    })
    .select()
    .single();

  if (insertError || !helpRequest) {
    console.error("[resend-inbound] Failed to create help request:", insertError);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }

  // Insert the email body as the first message
  await supabase.from("help_request_messages").insert({
    help_request_id: helpRequest.id,
    sender_type: "submitter",
    sender_name: senderName,
    sender_email: senderEmail,
    body: messageBody,
  });

  // Log the inbound email
  await supabase.from("email_log").insert({
    registration_id: registration?.id || null,
    email_type: "email_reply",
    recipient_email: senderEmail,
    subject: subject,
    resend_id: null,
  });

  // Send confirmation and admin notification (non-blocking)
  sendHelpRequestConfirmation(helpRequest.id).catch((err) =>
    console.error("[resend-inbound] Confirmation email failed:", err)
  );

  sendHelpRequestAdminNotification(helpRequest.id).catch((err) =>
    console.error("[resend-inbound] Admin notification failed:", err)
  );

  console.log(
    `[resend-inbound] Created new ticket #${helpRequest.request_number} from ${senderEmail}`
  );
  return NextResponse.json({ received: true });
}
