import { createServerClient } from "@/lib/supabase-server";
import { getResend } from "@/lib/resend";
import {
  confirmationEmail,
  adminNotificationEmail,
  sponsorAdminNotificationEmail,
  announcementEmail,
} from "@/lib/email-templates";
import type { Registration, Sponsor } from "@/types/database";

const FROM_EMAIL = "Crystal Lake Cars & Caffeine <noreply@crystallakecarshow.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crystallakecarshow.com";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendWithRetry(
  params: { from: string; to: string; subject: string; html: string },
  retries = 3
): Promise<{ id?: string }> {
  const resend = getResend();
  for (let attempt = 0; attempt < retries; attempt++) {
    const { data, error } = await resend.emails.send(params);
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
