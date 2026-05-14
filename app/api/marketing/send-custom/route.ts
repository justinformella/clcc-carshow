import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getResend } from "@/lib/resend";
import { customMarketingEmailHtml } from "@/lib/marketing-email-templates";
import crypto from "crypto";

const FROM_EMAIL = "Crystal Lake Cars & Caffeine <info@crystallakecarshow.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crystallakecarshow.com";
const HMAC_SECRET = process.env.UNSUBSCRIBE_HMAC_SECRET || "clcc-unsub-default-key";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function makeUnsubscribeUrl(email: string): string {
  const sig = crypto.createHmac("sha256", HMAC_SECRET).update(email).digest("hex");
  return `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(email)}&sig=${sig}`;
}

async function sendWithRetry(
  params: { from: string; to: string; subject: string; html: string },
  retries = 3
): Promise<{ id?: string }> {
  const resend = getResend();
  const sendParams = { ...params };
  for (let attempt = 0; attempt < retries; attempt++) {
    const { data, error } = await resend.emails.send(sendParams);
    if (!error) return { id: data?.id ?? undefined };
    if (error.message.toLowerCase().includes("rate") && attempt < retries - 1) {
      await wait((attempt + 1) * 1500);
      continue;
    }
    throw new Error(error.message);
  }
  throw new Error("Max retries exceeded");
}

export async function POST(request: Request) {
  const supabase = createServerClient();

  const { subject, body, cta_label, cta_url, prospect_ids, emails } = await request.json();

  if (!subject || !body) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
  }

  // Build recipient list from prospect IDs and/or direct emails
  const recipients: { email: string; prospectId?: string }[] = [];

  if (Array.isArray(prospect_ids) && prospect_ids.length > 0) {
    const { data: prospects } = await supabase
      .from("marketing_prospects")
      .select("id, email")
      .in("id", prospect_ids)
      .eq("unsubscribed", false);

    for (const p of prospects || []) {
      recipients.push({ email: p.email, prospectId: p.id });
    }
  }

  if (Array.isArray(emails) && emails.length > 0) {
    const seen = new Set(recipients.map((r) => r.email.toLowerCase()));
    for (const email of emails) {
      const lower = email.toLowerCase().trim();
      if (lower && !seen.has(lower)) {
        seen.add(lower);
        recipients.push({ email });
      }
    }
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients selected" }, { status: 400 });
  }

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      const unsubUrl = makeUnsubscribeUrl(recipient.email);
      const html = customMarketingEmailHtml(subject, body, cta_label || undefined, cta_url || undefined, unsubUrl);

      const result = await sendWithRetry({
        from: FROM_EMAIL,
        to: recipient.email,
        subject,
        html,
      });

      if (recipient.prospectId) {
        await supabase.from("marketing_sends").insert({
          prospect_id: recipient.prospectId,
          template_key: "custom",
          subject,
          status: "sent",
          resend_id: result.id || null,
        });
      }

      await supabase.from("email_log").insert({
        registration_id: null,
        email_type: "marketing",
        recipient_email: recipient.email,
        subject,
        resend_id: result.id || null,
      });

      sent++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(`[send-custom] Failed for ${recipient.email}:`, errorMessage);

      if (recipient.prospectId) {
        await supabase.from("marketing_sends").insert({
          prospect_id: recipient.prospectId,
          template_key: "custom",
          subject,
          status: "failed",
          error_message: errorMessage,
        });
      }

      failed++;
    }

    await wait(200);
  }

  return NextResponse.json({ sent, failed });
}
