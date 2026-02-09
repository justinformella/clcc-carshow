import { createServerClient } from "@/lib/supabase-server";
import { getResend } from "@/lib/resend";
import {
  confirmationEmail,
  adminNotificationEmail,
  announcementEmail,
} from "@/lib/email-templates";
import type { Registration } from "@/types/database";

const FROM_EMAIL = "Crystal Lake Cars & Coffee <noreply@crystallakecarshow.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crystallakecarshow.com";

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
  const resend = getResend();

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: reg.email,
    subject,
    html,
  });

  if (error) throw new Error(error.message);

  await logEmail(registrationId, "confirmation", reg.email, subject, data?.id ?? null);
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
  const resend = getResend();

  for (const admin of admins) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: admin.email,
        subject,
        html,
      });

      if (error) {
        console.error(`Failed to notify admin ${admin.email}:`, error.message);
        continue;
      }

      await logEmail(registrationId, "admin_notification", admin.email, subject, data?.id ?? null);
    } catch (err) {
      console.error(`Failed to notify admin ${admin.email}:`, err);
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

  const resend = getResend();
  let sent = 0;
  let failed = 0;

  for (const reg of registrations) {
    try {
      const { subject: emailSubject, html } = announcementEmail(
        subject,
        body,
        reg.first_name
      );

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: reg.email,
        subject: emailSubject,
        html,
      });

      if (error) {
        console.error(`Failed to send announcement to ${reg.email}:`, error.message);
        failed++;
        continue;
      }

      await logEmail(reg.id, "announcement", reg.email, emailSubject, data?.id ?? null);
      sent++;
    } catch (err) {
      console.error(`Failed to send announcement to ${reg.email}:`, err);
      failed++;
    }
  }

  return { sent, failed };
}
