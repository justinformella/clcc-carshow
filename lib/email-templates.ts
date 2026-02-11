import type { Registration, Sponsor } from "@/types/database";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crystallakecarshow.com";

const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Grant+Brink+Williams+Streets+Crystal+Lake+IL";

const GOOGLE_CALENDAR_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  "&text=Crystal+Lake+Cars+%26+Caffeine+Car+Show" +
  "&dates=20260517T073000/20260517T130000" +
  "&location=Grant%2C+Brink+%26+Williams+Streets%2C+Downtown+Crystal+Lake%2C+IL" +
  "&details=Annual+car+show+benefiting+the+Crystal+Lake+Food+Pantry.+Check-in+opens+at+7%3A30+AM.";

function htmlShell(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0; padding:0; background:#f8f5f0; font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5f0; padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#2c2c2c; padding:28px 32px; text-align:center;">
            <span style="font-size:22px; font-weight:700; color:#c9a84c; letter-spacing:0.08em;">
              CRYSTAL LAKE CARS &amp; CAFFEINE
            </span>
            <br/>
            <span style="font-size:12px; color:#a0a0a0; letter-spacing:0.06em;">
              Est. 2021 &middot; Crystal Lake, Illinois
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
            Crystal Lake Cars &amp; Caffeine &middot; Crystal Lake, IL<br/>
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
    <!-- Heading -->
    <h1 style="margin:0 0 24px; font-size:26px; color:#2c2c2c; text-align:center;">
      &#9989; You're Registered!
    </h1>

    <!-- Car Number Badge -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td align="center">
        <table cellpadding="0" cellspacing="0" style="border:2px solid #c9a84c; border-radius:8px; padding:16px 28px; text-align:center;">
          <tr>
            <td>
              <span style="font-size:13px; color:#888; letter-spacing:0.06em; text-transform:uppercase;">Your Car Number</span><br/>
              <span style="font-size:32px; font-weight:700; color:#2c2c2c; letter-spacing:0.04em;">CAR #${reg.car_number}</span><br/>
              <span style="font-size:15px; color:#555;">${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}</span>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Event Details Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px; background:#f8f5f0; border-radius:8px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px; font-size:11px; color:#888; text-transform:uppercase; letter-spacing:0.08em;">Event Details</p>
          <p style="margin:0 0 8px; font-size:17px; font-weight:700; color:#2c2c2c;">Saturday, May 17, 2026</p>
          <p style="margin:0 0 8px; font-size:15px; color:#444;">Grant, Brink &amp; Williams Streets<br/>Downtown Crystal Lake, IL</p>
          <a href="${GOOGLE_MAPS_URL}" style="font-size:14px; color:#c9a84c; text-decoration:none; font-weight:600;">View on Google Maps &rarr;</a>
        </td>
      </tr>
    </table>

    <!-- Schedule -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>
        <td>
          <p style="margin:0 0 12px; font-size:11px; color:#888; text-transform:uppercase; letter-spacing:0.08em;">Schedule</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#c9a84c; font-weight:700; width:90px; vertical-align:top;">7:30 AM</td>
              <td style="padding:6px 0; font-size:14px; color:#333;">Check-in &amp; Day-of Registration</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#c9a84c; font-weight:700; vertical-align:top;">9:30 AM</td>
              <td style="padding:6px 0; font-size:14px; color:#333;">Registration Closes</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#c9a84c; font-weight:700; vertical-align:top;">10:00 AM</td>
              <td style="padding:6px 0; font-size:14px; color:#333;">Show Starts</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#c9a84c; font-weight:700; vertical-align:top;">12:30 PM</td>
              <td style="padding:6px 0; font-size:14px; color:#333;">Awards Ceremony</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#c9a84c; font-weight:700; vertical-align:top;">1:00 PM</td>
              <td style="padding:6px 0; font-size:14px; color:#333;">Show Ends</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Arrival Instructions -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>
        <td>
          <p style="margin:0 0 12px; font-size:11px; color:#888; text-transform:uppercase; letter-spacing:0.08em;">Arrival Instructions</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 0; font-size:14px; color:#333; line-height:1.5;">&#8226;&nbsp; Arrive between 7:30 &ndash; 9:30 AM for check-in</td>
            </tr>
            <tr>
              <td style="padding:4px 0; font-size:14px; color:#333; line-height:1.5;">&#8226;&nbsp; Drive your vehicle to the registration area on Grant Street</td>
            </tr>
            <tr>
              <td style="padding:4px 0; font-size:14px; color:#333; line-height:1.5;">&#8226;&nbsp; You'll receive your car number placard at check-in</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Add to Calendar Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td align="center">
        <a href="${GOOGLE_CALENDAR_URL}" style="display:inline-block; padding:14px 32px; background:#c9a84c; color:#2c2c2c; text-decoration:none; font-weight:700; font-size:15px; border-radius:6px; letter-spacing:0.02em;">
          Add to Calendar
        </a>
      </td></tr>
    </table>

    <!-- Charity Note -->
    <p style="margin:0; font-size:13px; color:#888; text-align:center; line-height:1.5;">
      100% of net proceeds benefit the Crystal Lake Food Pantry
    </p>
  `;

  return {
    subject: `You're Registered! Car #${reg.car_number} — Crystal Lake Cars & Caffeine`,
    html: htmlShell(content),
  };
}

export function adminNotificationEmail(
  reg: Registration,
  adminDetailUrl: string
): { subject: string; html: string } {
  const content = `
    <h1 style="margin:0 0 16px; font-size:24px; color:#2c2c2c;">New Registration</h1>
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.6;">
      A new registration has been submitted and paid:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888; width:140px;">Name</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${reg.first_name} ${reg.last_name}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888;">Email</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${reg.email}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888;">Vehicle</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888;">Car Number</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c; font-weight:600;">#${reg.car_number}</td>
      </tr>
    </table>
    <a href="${adminDetailUrl}" style="display:inline-block; padding:12px 24px; background:#c9a84c; color:#2c2c2c; text-decoration:none; font-weight:600; font-size:14px; border-radius:6px;">
      View Registration
    </a>
  `;

  return {
    subject: `New Registration: ${reg.first_name} ${reg.last_name} — #${reg.car_number}`,
    html: htmlShell(content),
  };
}

export function sponsorAdminNotificationEmail(
  sponsor: Sponsor,
  adminDetailUrl: string
): { subject: string; html: string } {
  const content = `
    <h1 style="margin:0 0 16px; font-size:24px; color:#2c2c2c;">New Sponsor Inquiry</h1>
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.6;">
      A new sponsorship inquiry has been submitted:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888; width:140px;">Name</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${sponsor.name}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888;">Company</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${sponsor.company}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888;">Email</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${sponsor.email}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888;">Phone</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${sponsor.phone || "—"}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888;">Level</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${sponsor.sponsorship_level}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888;">Message</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${sponsor.message || "—"}</td>
      </tr>
    </table>
    <a href="${adminDetailUrl}" style="display:inline-block; padding:12px 24px; background:#c9a84c; color:#2c2c2c; text-decoration:none; font-weight:600; font-size:14px; border-radius:6px;">
      View Sponsor
    </a>
  `;

  return {
    subject: `New Sponsor Inquiry: ${sponsor.company} — ${sponsor.sponsorship_level}`,
    html: htmlShell(content),
  };
}

export function adminInviteEmail(
  name: string,
  inviteLink: string
): { subject: string; html: string } {
  const content = `
    <h1 style="margin:0 0 16px; font-size:24px; color:#2c2c2c;">You're Invited</h1>
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.6;">
      Hi ${name}, you've been invited to join the Crystal Lake Cars &amp; Caffeine admin team.
    </p>
    <p style="margin:0 0 24px; font-size:15px; color:#333; line-height:1.6;">
      Click the button below to set your password and access the admin dashboard.
    </p>
    <a href="${inviteLink}" style="display:inline-block; padding:12px 24px; background:#c9a84c; color:#2c2c2c; text-decoration:none; font-weight:600; font-size:14px; border-radius:6px;">
      Accept Invite
    </a>
    <p style="margin:24px 0 0; font-size:12px; color:#999; line-height:1.5;">
      If you didn't expect this invite, you can safely ignore this email.
    </p>
  `;

  return {
    subject: "You're invited to Crystal Lake Cars & Caffeine Admin",
    html: htmlShell(content),
  };
}

export function announcementEmail(
  emailSubject: string,
  body: string,
  recipientName: string
): { subject: string; html: string } {
  const content = `
    <h1 style="margin:0 0 16px; font-size:24px; color:#2c2c2c;">${emailSubject}</h1>
    <p style="margin:0 0 8px; font-size:14px; color:#888;">Hi ${recipientName},</p>
    <div style="margin:0 0 24px; font-size:15px; color:#333; line-height:1.6; white-space:pre-wrap;">${body}</div>
    <p style="margin:0; font-size:14px; color:#888;">
      — Crystal Lake Cars &amp; Caffeine Team
    </p>
  `;

  return {
    subject: emailSubject,
    html: htmlShell(content),
  };
}
