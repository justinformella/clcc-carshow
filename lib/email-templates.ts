import type { Registration } from "@/types/database";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crystallakecarshow.com";

function htmlShell(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0; padding:0; background:#f5f5f5; font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5; padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#1a1a2e; padding:24px 32px; text-align:center;">
            <span style="font-size:22px; font-weight:700; color:#c9a84c; letter-spacing:0.08em;">
              CRYSTAL LAKE CARS &amp; COFFEE
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#ffffff; padding:32px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px; text-align:center; font-size:12px; color:#999;">
            Crystal Lake Cars &amp; Coffee &middot; Crystal Lake, IL<br/>
            <a href="${SITE_URL}" style="color:#c9a84c; text-decoration:none;">${SITE_URL.replace(/^https?:\/\//, "")}</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function confirmationEmail(reg: Registration): { subject: string; html: string } {
  const content = `
    <h1 style="margin:0 0 16px; font-size:24px; color:#1a1a2e;">You're Registered!</h1>
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.6;">
      Thank you for registering for Crystal Lake Cars &amp; Coffee. Here are your details:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#666; width:140px;">Car Number</td>
        <td style="padding:8px 0; font-size:14px; color:#1a1a2e; font-weight:600;">#${reg.car_number}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#666;">Vehicle</td>
        <td style="padding:8px 0; font-size:14px; color:#1a1a2e;">${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#666;">Category</td>
        <td style="padding:8px 0; font-size:14px; color:#1a1a2e;">${reg.preferred_category}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#666;">Event Date</td>
        <td style="padding:8px 0; font-size:14px; color:#1a1a2e;">August 30, 2026</td>
      </tr>
    </table>
    <p style="margin:0; font-size:14px; color:#666; line-height:1.5;">
      We'll send more details as the event approaches. See you there!
    </p>
  `;

  return {
    subject: `You're Registered! Car #${reg.car_number} — Crystal Lake Cars & Coffee`,
    html: htmlShell(content),
  };
}

export function adminNotificationEmail(
  reg: Registration,
  adminDetailUrl: string
): { subject: string; html: string } {
  const content = `
    <h1 style="margin:0 0 16px; font-size:24px; color:#1a1a2e;">New Registration</h1>
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.6;">
      A new registration has been submitted and paid:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#666; width:140px;">Name</td>
        <td style="padding:8px 0; font-size:14px; color:#1a1a2e;">${reg.first_name} ${reg.last_name}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#666;">Email</td>
        <td style="padding:8px 0; font-size:14px; color:#1a1a2e;">${reg.email}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#666;">Vehicle</td>
        <td style="padding:8px 0; font-size:14px; color:#1a1a2e;">${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#666;">Car Number</td>
        <td style="padding:8px 0; font-size:14px; color:#1a1a2e;">#${reg.car_number}</td>
      </tr>
    </table>
    <a href="${adminDetailUrl}" style="display:inline-block; padding:12px 24px; background:#c9a84c; color:#1a1a2e; text-decoration:none; font-weight:600; font-size:14px;">
      View Registration
    </a>
  `;

  return {
    subject: `New Registration: ${reg.first_name} ${reg.last_name} — #${reg.car_number}`,
    html: htmlShell(content),
  };
}

export function announcementEmail(
  emailSubject: string,
  body: string,
  recipientName: string
): { subject: string; html: string } {
  const content = `
    <h1 style="margin:0 0 16px; font-size:24px; color:#1a1a2e;">${emailSubject}</h1>
    <p style="margin:0 0 8px; font-size:14px; color:#666;">Hi ${recipientName},</p>
    <div style="margin:0 0 24px; font-size:15px; color:#333; line-height:1.6; white-space:pre-wrap;">${body}</div>
    <p style="margin:0; font-size:14px; color:#666;">
      — Crystal Lake Cars &amp; Coffee Team
    </p>
  `;

  return {
    subject: emailSubject,
    html: htmlShell(content),
  };
}
