import { createServerClient } from "@/lib/supabase-server";
import { getResend } from "@/lib/resend";
import {
  confirmationEmail,
  multiVehicleConfirmationEmail,
  adminNotificationEmail,
  sponsorAdminNotificationEmail,
  sponsorPaymentLinkEmail,
  sponsorReceiptEmail,
  sponsorPaymentAdminNotificationEmail,
  announcementEmail,
  helpRequestConfirmationEmail,
  helpRequestAdminNotificationEmail,
  helpRequestReplyNotificationEmail,
} from "@/lib/email-templates";
import type { Registration, Sponsor, HelpRequest, HelpRequestMessage } from "@/types/database";

const FROM_EMAIL = "Crystal Lake Cars & Caffeine <noreply@crystallakecarshow.com>";
const REPLY_TO = "info@crystallakecarshow.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crystallakecarshow.com";

async function logSponsorActivity(sponsorId: string, action: string, details?: string) {
  try {
    const supabase = createServerClient();
    await supabase.from("sponsor_audit_log").insert({
      sponsor_id: sponsorId,
      changed_fields: { _activity: { action, details: details || null } },
      actor_email: "system",
    });
  } catch (err) {
    console.error("[sponsor-activity] Failed to log:", err);
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendWithRetry(
  params: { from: string; to: string; subject: string; html: string; replyTo?: string },
  retries = 3
): Promise<{ id?: string }> {
  const resend = getResend();
  const sendParams = { replyTo: REPLY_TO, ...params };
  for (let attempt = 0; attempt < retries; attempt++) {
    const { data, error } = await resend.emails.send(sendParams);
    if (!error) return { id: data?.id ?? undefined };
    if (error.message.toLowerCase().includes("rate") && attempt < retries - 1) {
      console.log(`[email] Rate limited, retrying in ${(attempt + 1) * 1.5}s...`);
      await wait((attempt + 1) * 1500);
      continue;
    }
    throw new Error(error.message);
  }
  throw new Error("Max retries exceeded");
}

async function logEmail(
  registrationId: string | null,
  emailType: string,
  recipientEmail: string,
  subject: string,
  resendId: string | null
) {
  const supabase = createServerClient();
  await supabase.from("email_log").insert({
    registration_id: registrationId,
    email_type: emailType,
    recipient_email: recipientEmail,
    subject,
    resend_id: resendId,
  });
}

export async function sendConfirmation(registrationId: string) {
  const supabase = createServerClient();
  const { data: reg } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", registrationId)
    .single();

  if (!reg) throw new Error("Registration not found");

  const { subject, html } = confirmationEmail(reg as Registration);

  const result = await sendWithRetry({ from: FROM_EMAIL, to: reg.email, subject, html });

  await logEmail(registrationId, "confirmation", reg.email, subject, result.id ?? null);
}

export async function sendMultiVehicleConfirmation(registrationIds: string[]) {
  // If only 1, delegate to existing single-vehicle confirmation
  if (registrationIds.length === 1) {
    return sendConfirmation(registrationIds[0]);
  }

  const supabase = createServerClient();
  const { data: regs } = await supabase
    .from("registrations")
    .select("*")
    .in("id", registrationIds)
    .order("car_number", { ascending: true });

  if (!regs || regs.length === 0) throw new Error("Registrations not found");

  const { subject, html } = multiVehicleConfirmationEmail(regs as Registration[]);

  const result = await sendWithRetry({ from: FROM_EMAIL, to: regs[0].email, subject, html });

  // Log the email against each registration row
  for (const reg of regs) {
    await logEmail(reg.id, "confirmation", reg.email, subject, result.id ?? null);
  }
}

export async function sendAdminNotification(registrationId: string) {
  const supabase = createServerClient();

  const { data: reg } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", registrationId)
    .single();

  if (!reg) throw new Error("Registration not found");

  const { data: admins } = await supabase.from("admins").select("*");

  if (!admins || admins.length === 0) {
    console.log("No admins configured — skipping admin notification");
    return;
  }

  const adminDetailUrl = `${SITE_URL}/admin/registrations/${registrationId}`;
  const { subject, html } = adminNotificationEmail(reg as Registration, adminDetailUrl);

  for (const admin of admins) {
    try {
      const result = await sendWithRetry({ from: FROM_EMAIL, to: admin.email, subject, html });
      await logEmail(registrationId, "admin_notification", admin.email, subject, result.id ?? null);
    } catch (err) {
      console.error(`Failed to notify admin ${admin.email}:`, err);
    }
  }
}

export async function sendSponsorAdminNotification(sponsorId: string) {
  console.log("[sponsor-notify] Starting notification for sponsor:", sponsorId);
  const supabase = createServerClient();

  const { data: sponsor, error: sponsorError } = await supabase
    .from("sponsors")
    .select("*")
    .eq("id", sponsorId)
    .single();

  if (sponsorError) {
    console.error("[sponsor-notify] Failed to fetch sponsor:", sponsorError);
    throw new Error(`Sponsor fetch failed: ${sponsorError.message}`);
  }

  if (!sponsor) throw new Error("Sponsor not found");
  console.log("[sponsor-notify] Found sponsor:", sponsor.company);

  const { data: admins, error: adminsError } = await supabase.from("admins").select("*");

  if (adminsError) {
    console.error("[sponsor-notify] Failed to fetch admins:", adminsError);
    throw new Error(`Admins fetch failed: ${adminsError.message}`);
  }

  console.log("[sponsor-notify] Found admins:", admins?.length ?? 0);

  if (!admins || admins.length === 0) {
    console.log("[sponsor-notify] No admins configured — skipping");
    return;
  }

  const adminDetailUrl = `${SITE_URL}/admin/sponsors/${sponsorId}`;
  const { subject, html } = sponsorAdminNotificationEmail(sponsor as Sponsor, adminDetailUrl);

  for (const admin of admins) {
    try {
      console.log("[sponsor-notify] Sending to:", admin.email);
      const result = await sendWithRetry({ from: FROM_EMAIL, to: admin.email, subject, html });
      console.log("[sponsor-notify] Sent to:", admin.email, "resend_id:", result.id);
      await logEmail(null, "sponsor_notification", admin.email, subject, result.id ?? null);
    } catch (err) {
      console.error(`[sponsor-notify] Exception for ${admin.email}:`, err);
    }
  }
}

export async function sendSponsorPaymentLink(sponsorId: string) {
  console.log("[sponsor-payment-link] Starting for sponsor:", sponsorId);
  const supabase = createServerClient();

  const { data: sponsor, error: sponsorError } = await supabase
    .from("sponsors")
    .select("*")
    .eq("id", sponsorId)
    .single();

  if (sponsorError || !sponsor) {
    throw new Error(`Sponsor fetch failed: ${sponsorError?.message || "not found"}`);
  }

  const { data: tier } = await supabase
    .from("sponsorship_tiers")
    .select("name, price_cents")
    .eq("name", sponsor.sponsorship_level)
    .single();

  const tierName = tier?.name || sponsor.sponsorship_level;
  const amountDollars = tier ? `$${(tier.price_cents / 100).toLocaleString()}` : "See payment page";
  const paymentUrl = `${SITE_URL}/sponsor/pay/${sponsor.payment_token}`;

  const { subject, html } = sponsorPaymentLinkEmail(sponsor as Sponsor, tierName, amountDollars, paymentUrl);

  const result = await sendWithRetry({ from: FROM_EMAIL, to: sponsor.email, subject, html });
  console.log("[sponsor-payment-link] Sent to:", sponsor.email, "resend_id:", result.id);
  await logEmail(null, "sponsor_payment_link", sponsor.email, subject, result.id ?? null);
  await logSponsorActivity(sponsorId, "Payment link email sent", `To: ${sponsor.email}`);
}

export async function sendSponsorReceipt(sponsorId: string) {
  console.log("[sponsor-receipt] Starting for sponsor:", sponsorId);
  const supabase = createServerClient();

  const { data: sponsor, error: sponsorError } = await supabase
    .from("sponsors")
    .select("*")
    .eq("id", sponsorId)
    .single();

  if (sponsorError || !sponsor) {
    throw new Error(`Sponsor fetch failed: ${sponsorError?.message || "not found"}`);
  }

  const { data: tier } = await supabase
    .from("sponsorship_tiers")
    .select("name, price_cents, benefits")
    .eq("name", sponsor.sponsorship_level)
    .single();

  const tierName = tier?.name || sponsor.sponsorship_level;
  const tierAmountCents = tier?.price_cents || sponsor.sponsorship_amount;
  const donationCents = sponsor.donation_cents || 0;
  const totalCents = sponsor.sponsorship_amount || (tierAmountCents + donationCents);

  const tierAmountDollars = `$${(tierAmountCents / 100).toLocaleString()}`;
  const donationDollars = donationCents > 0 ? `$${(donationCents / 100).toLocaleString()}` : null;
  const totalDollars = `$${(totalCents / 100).toLocaleString()}`;
  const benefits = tier?.benefits || "";

  const { subject, html } = sponsorReceiptEmail(sponsor as Sponsor, tierName, tierAmountDollars, donationDollars, totalDollars, benefits);

  const result = await sendWithRetry({ from: FROM_EMAIL, to: sponsor.email, subject, html });
  console.log("[sponsor-receipt] Sent to:", sponsor.email, "resend_id:", result.id);
  await logEmail(null, "sponsor_receipt", sponsor.email, subject, result.id ?? null);
  await logSponsorActivity(sponsorId, "Receipt email sent", `To: ${sponsor.email}`);
}

export async function sendSponsorPaymentAdminNotification(sponsorId: string, paymentMethod: "stripe" | "check") {
  console.log("[sponsor-payment-notify] Starting for sponsor:", sponsorId);
  const supabase = createServerClient();

  const { data: sponsor, error: sponsorError } = await supabase
    .from("sponsors")
    .select("*")
    .eq("id", sponsorId)
    .single();

  if (sponsorError || !sponsor) {
    throw new Error(`Sponsor fetch failed: ${sponsorError?.message || "not found"}`);
  }

  const { data: tier } = await supabase
    .from("sponsorship_tiers")
    .select("name, price_cents")
    .eq("name", sponsor.sponsorship_level)
    .single();

  const tierName = tier?.name || sponsor.sponsorship_level;
  const amountDollars = tier ? `$${(tier.price_cents / 100).toLocaleString()}` : `$${(sponsor.sponsorship_amount / 100).toLocaleString()}`;
  const upgradedFrom = sponsor.original_level && sponsor.original_level !== sponsor.sponsorship_level
    ? sponsor.original_level
    : null;

  const adminDetailUrl = `${SITE_URL}/admin/sponsors/${sponsorId}`;
  const { subject, html } = sponsorPaymentAdminNotificationEmail(
    sponsor as Sponsor, tierName, amountDollars, paymentMethod, upgradedFrom, adminDetailUrl
  );

  const { data: admins } = await supabase.from("admins").select("*");

  if (!admins || admins.length === 0) {
    console.log("[sponsor-payment-notify] No admins configured — skipping");
    return;
  }

  for (const admin of admins) {
    try {
      const result = await sendWithRetry({ from: FROM_EMAIL, to: admin.email, subject, html });
      console.log("[sponsor-payment-notify] Sent to:", admin.email);
      await logEmail(null, "sponsor_payment_notification", admin.email, subject, result.id ?? null);
    } catch (err) {
      console.error(`[sponsor-payment-notify] Exception for ${admin.email}:`, err);
    }
  }
}

export async function sendSponsorCheckAdminNotification(sponsorId: string) {
  return sendSponsorPaymentAdminNotification(sponsorId, "check");
}

export async function sendAnnouncement(
  subject: string,
  body: string,
  recipientIds: string[]
): Promise<{ sent: number; failed: number }> {
  const supabase = createServerClient();

  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, first_name, last_name, email")
    .in("id", recipientIds);

  if (!registrations || registrations.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const reg of registrations) {
    try {
      const { subject: emailSubject, html } = announcementEmail(
        subject,
        body,
        reg.first_name
      );

      const result = await sendWithRetry({ from: FROM_EMAIL, to: reg.email, subject: emailSubject, html });
      await logEmail(reg.id, "announcement", reg.email, emailSubject, result.id ?? null);
      sent++;
    } catch (err) {
      console.error(`Failed to send announcement to ${reg.email}:`, err);
      failed++;
    }
  }

  return { sent, failed };
}

export async function sendHelpRequestConfirmation(requestId: string) {
  const supabase = createServerClient();
  const { data: request } = await supabase
    .from("help_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) throw new Error("Help request not found");

  const { subject, html } = helpRequestConfirmationEmail(
    request.name,
    request.request_number,
    request.subject
  );

  const result = await sendWithRetry({ from: FROM_EMAIL, to: request.email, subject, html });
  await logEmail(null, "help_request_confirmation", request.email, subject, result.id ?? null);
}

export async function sendHelpRequestAdminNotification(requestId: string) {
  const supabase = createServerClient();

  const { data: request } = await supabase
    .from("help_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) throw new Error("Help request not found");

  const { data: messages } = await supabase
    .from("help_request_messages")
    .select("*")
    .eq("help_request_id", requestId)
    .order("created_at", { ascending: true })
    .limit(1);

  const firstMessage = messages?.[0]?.body || "";

  const { data: admins } = await supabase.from("admins").select("*");

  if (!admins || admins.length === 0) {
    console.log("No admins configured — skipping help request admin notification");
    return;
  }

  const adminDetailUrl = `${SITE_URL}/admin/help-desk/${requestId}`;
  const registrationLink = request.registration_id
    ? `${SITE_URL}/admin/registrations/${request.registration_id}`
    : undefined;

  const { subject, html } = helpRequestAdminNotificationEmail(
    request as HelpRequest,
    firstMessage,
    adminDetailUrl,
    registrationLink
  );

  for (const admin of admins) {
    try {
      const result = await sendWithRetry({ from: FROM_EMAIL, to: admin.email, subject, html });
      await logEmail(null, "help_request_admin_notification", admin.email, subject, result.id ?? null);
    } catch (err) {
      console.error(`Failed to notify admin ${admin.email} about help request:`, err);
    }
  }
}

export async function sendHelpRequestReplyNotification(requestId: string, messageId: string) {
  const supabase = createServerClient();

  const { data: request } = await supabase
    .from("help_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) throw new Error("Help request not found");

  const { data: message } = await supabase
    .from("help_request_messages")
    .select("*")
    .eq("id", messageId)
    .single();

  if (!message) throw new Error("Help request message not found");

  const { subject, html } = helpRequestReplyNotificationEmail(
    request.name,
    request.request_number,
    request.subject,
    message.body,
    message.sender_name
  );

  const result = await sendWithRetry({ from: FROM_EMAIL, to: request.email, subject, html });
  await logEmail(null, "help_request_reply", request.email, subject, result.id ?? null);
}
