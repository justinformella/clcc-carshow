import type { MarketingTemplateKey } from "@/types/database";

// Always use production URL — marketing emails should never link to localhost
const SITE_URL = "https://crystallakecarshow.com";

const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Grant+Brink+Williams+Streets+Crystal+Lake+IL";

function marketingHtmlShell(content: string, unsubscribeUrl: string): string {
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
            <img src="https://crystallakecarshow.com/images/CLCC_Logo2026.png" alt="CLCC Logo" width="60" height="60" style="display:block; margin:0 auto 12px; border:0;" />
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
        <!-- Footer with unsubscribe -->
        <tr>
          <td style="padding:20px 32px; text-align:center; font-size:12px; color:#999;">
            Crystal Lake Cars &amp; Caffeine &middot; Crystal Lake, IL<br/>
            <a href="${SITE_URL}" style="color:#c9a84c; text-decoration:none;">${SITE_URL.replace(/^https?:\/\//, "")}</a>
            <br/><br/>
            <a href="${unsubscribeUrl}" style="color:#999; text-decoration:underline; font-size:11px;">Unsubscribe from future emails</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function saveTheDateHtml(unsubscribeUrl: string): string {
  const content = `
    <!-- Gold accent line -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td style="border-top:3px solid #c9a84c; font-size:0; line-height:0;">&nbsp;</td></tr>
    </table>

    <!-- Save the Date heading -->
    <h1 style="margin:0 0 8px; font-size:14px; color:#c9a84c; text-transform:uppercase; letter-spacing:0.12em; text-align:center; font-weight:700;">
      Save the Date
    </h1>
    <h2 style="margin:0 0 8px; font-size:28px; color:#2c2c2c; text-align:center; font-weight:700; line-height:1.2;">
      Crystal Lake Cars &amp; Caffeine
    </h2>
    <p style="margin:0 0 24px; font-size:13px; color:#888; text-align:center; text-transform:uppercase; letter-spacing:0.08em;">
      Annual Charity Car Show
    </p>

    <!-- Greeting -->
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.7;">
      Hi Car Enthusiasts,
    </p>

    <!-- New date announcement -->
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.7;">
      We are reaching out to our past participants with some exciting news regarding our annual charity car show.
    </p>
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.7;">
      To kick off the car show season with a bang, we are moving our event from Labor Day weekend to the weekend before Memorial Day! Please mark your calendars for <strong>Sunday, May 17, 2026</strong>.
    </p>

    <!-- New Date, Same Great Cause -->
    <h3 style="margin:0 0 12px; font-size:18px; color:#2c2c2c; font-weight:700;">
      New Date, Same Great Cause
    </h3>
    <p style="margin:0 0 24px; font-size:15px; color:#333; line-height:1.7;">
      By shifting to the spring, we hope to capture that early-season excitement when everyone is ready to get their cars out of the garage. While the date is changing, our mission remains the same: giving back to McHenry County. This year&rsquo;s charity is the <strong>Crystal Lake Food Pantry</strong>.
    </p>

    <!-- Date badge -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td align="center">
        <table cellpadding="0" cellspacing="0" style="border:2px solid #c9a84c; border-radius:8px; padding:20px 36px; text-align:center;">
          <tr>
            <td>
              <span style="font-size:26px; font-weight:700; color:#2c2c2c; letter-spacing:0.02em;">Sunday, May 17, 2026</span><br/>
              <span style="font-size:14px; color:#555; margin-top:4px; display:inline-block;">
                Grant, Brink &amp; Williams Streets &middot; Downtown Crystal Lake, IL
              </span>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Event Details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px; background:#f8f5f0; border-radius:8px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px; font-size:11px; color:#888; text-transform:uppercase; letter-spacing:0.08em;">Event Details</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#888; width:90px; vertical-align:top;">When</td>
              <td style="padding:6px 0; font-size:14px; color:#333; font-weight:600;">Sunday, May 17, 2026</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#888; vertical-align:top;">Time</td>
              <td style="padding:6px 0; font-size:14px; color:#333;">Show starts at 10:00 AM (Check-in begins at 7:30 AM)</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#888; vertical-align:top;">Where</td>
              <td style="padding:6px 0; font-size:14px; color:#333;">Downtown Crystal Lake (Grant, Brink &amp; Williams Streets)</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#888; vertical-align:top;">Rain Date</td>
              <td style="padding:6px 0; font-size:14px; color:#333;">Sunday, May 31, 2026</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Registration is open -->
    <p style="margin:0 0 24px; font-size:15px; color:#333; line-height:1.7; text-align:center;">
      Registration is officially open! Head over to our website to register your vehicle and view all the details.
    </p>

    <!-- CTA button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td align="center">
        <a href="${SITE_URL}/register" style="display:inline-block; padding:16px 40px; background:#c9a84c; color:#2c2c2c; text-decoration:none; font-weight:700; font-size:16px; border-radius:6px; letter-spacing:0.04em;">
          Register Now
        </a>
      </td></tr>
    </table>

    <!-- Location link -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td align="center">
        <a href="${GOOGLE_MAPS_URL}" style="font-size:14px; color:#c9a84c; text-decoration:none; font-weight:600;">View Location on Google Maps &rarr;</a>
      </td></tr>
    </table>

    <!-- Closing -->
    <p style="margin:0 0 8px; font-size:15px; color:#333; line-height:1.7;">
      Block off May 17th and start getting your ride ready. We can&rsquo;t wait to see the streets of Crystal Lake filled with your incredible rides once again!
    </p>
    <p style="margin:24px 0 0; font-size:14px; color:#888;">
      Best regards,<br/>
      The Crystal Lake Cars &amp; Caffeine Team
    </p>
  `;

  return marketingHtmlShell(content, unsubscribeUrl);
}

function registerNowHtml(unsubscribeUrl: string): string {
  const content = `
    <!-- Gold accent line -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td style="border-top:3px solid #c9a84c; font-size:0; line-height:0;">&nbsp;</td></tr>
    </table>

    <!-- Heading -->
    <h1 style="margin:0 0 8px; font-size:14px; color:#c9a84c; text-transform:uppercase; letter-spacing:0.12em; text-align:center; font-weight:700;">
      Registration Is Open
    </h1>
    <h2 style="margin:0 0 8px; font-size:28px; color:#2c2c2c; text-align:center; font-weight:700; line-height:1.2;">
      Crystal Lake Cars &amp; Caffeine
    </h2>
    <p style="margin:0 0 24px; font-size:13px; color:#888; text-align:center; text-transform:uppercase; letter-spacing:0.08em;">
      4th Annual Charity Car Show
    </p>

    <!-- Greeting -->
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.7;">
      Hi Car Enthusiasts,
    </p>

    <!-- Main message -->
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.7;">
      Great news &mdash; <strong>registration is officially open</strong> for the 4th Annual Crystal Lake Cars &amp; Caffeine charity car show! Spots are limited to 200 vehicles and they go fast, so don&rsquo;t wait.
    </p>
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.7;">
      Whether you&rsquo;re bringing a classic, a modern exotic, a muscle car, or your daily driver with a story &mdash; we want to see it on the streets of downtown Crystal Lake.
    </p>

    <!-- Registration details -->
    <h3 style="margin:0 0 12px; font-size:18px; color:#2c2c2c; font-weight:700;">
      How to Register
    </h3>
    <p style="margin:0 0 24px; font-size:15px; color:#333; line-height:1.7;">
      Registration is <strong>$30 per vehicle</strong> and takes just a few minutes. 100% of net proceeds benefit the <strong>Crystal Lake Food Pantry</strong>. You can register multiple vehicles in a single checkout.
    </p>

    <!-- CTA button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td align="center">
        <a href="${SITE_URL}/register" style="display:inline-block; padding:16px 40px; background:#c9a84c; color:#2c2c2c; text-decoration:none; font-weight:700; font-size:16px; border-radius:6px; letter-spacing:0.04em;">
          Register Your Vehicle
        </a>
      </td></tr>
    </table>

    <!-- Date badge -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td align="center">
        <table cellpadding="0" cellspacing="0" style="border:2px solid #c9a84c; border-radius:8px; padding:20px 36px; text-align:center;">
          <tr>
            <td>
              <span style="font-size:26px; font-weight:700; color:#2c2c2c; letter-spacing:0.02em;">Sunday, May 17, 2026</span><br/>
              <span style="font-size:14px; color:#555; margin-top:4px; display:inline-block;">
                Grant, Brink &amp; Williams Streets &middot; Downtown Crystal Lake, IL
              </span>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Event Details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px; background:#f8f5f0; border-radius:8px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px; font-size:11px; color:#888; text-transform:uppercase; letter-spacing:0.08em;">Event Details</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#888; width:110px; vertical-align:top;">Registration</td>
              <td style="padding:6px 0; font-size:14px; color:#333; font-weight:600;">$30 per vehicle</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#888; vertical-align:top;">Check-in</td>
              <td style="padding:6px 0; font-size:14px; color:#333;">7:30 AM</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#888; vertical-align:top;">Show Time</td>
              <td style="padding:6px 0; font-size:14px; color:#333;">10:00 AM &ndash; 2:00 PM</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#888; vertical-align:top;">Awards</td>
              <td style="padding:6px 0; font-size:14px; color:#333;">12:30 PM</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#888; vertical-align:top;">Where</td>
              <td style="padding:6px 0; font-size:14px; color:#333;">Downtown Crystal Lake (Grant, Brink &amp; Williams Streets)</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#888; vertical-align:top;">Rain Date</td>
              <td style="padding:6px 0; font-size:14px; color:#333;">Sunday, May 31, 2026</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:14px; color:#888; vertical-align:top;">Charity</td>
              <td style="padding:6px 0; font-size:14px; color:#333;">Crystal Lake Food Pantry</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Location link -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td align="center">
        <a href="${GOOGLE_MAPS_URL}" style="font-size:14px; color:#c9a84c; text-decoration:none; font-weight:600;">View Location on Google Maps &rarr;</a>
      </td></tr>
    </table>

    <!-- Closing -->
    <p style="margin:0 0 8px; font-size:15px; color:#333; line-height:1.7;">
      Don&rsquo;t miss your chance to be part of downtown Crystal Lake&rsquo;s biggest car event of the year. Grab your spot before we fill up!
    </p>
    <p style="margin:24px 0 0; font-size:14px; color:#888;">
      See you on May 17th,<br/>
      The Crystal Lake Cars &amp; Caffeine Team
    </p>
  `;

  return marketingHtmlShell(content, unsubscribeUrl);
}

// Convert simple markdown to email-safe HTML
function markdownToEmailHtml(text: string): string {
  const blocks = text.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  const pStyle = 'style="margin:0 0 16px; font-size:15px; color:#333; line-height:1.7;"';
  const liStyle = 'style="padding:3px 0; font-size:15px; color:#333; line-height:1.7;"';

  return blocks.map((block) => {
    const lines = block.split("\n");

    // Check if this block is a bullet list
    if (lines.every((l) => /^[-*]\s/.test(l.trim()))) {
      const items = lines.map((l) => {
        const content = inlineMarkdown(l.trim().replace(/^[-*]\s+/, ""));
        return `<li ${liStyle}>${content}</li>`;
      }).join("");
      return `<ul style="margin:0 0 16px; padding-left:20px;">${items}</ul>`;
    }

    // Regular paragraph
    const content = lines.map((l) => inlineMarkdown(l)).join("<br/>");
    return `<p ${pStyle}>${content}</p>`;
  }).join("\n");
}

// Handle inline formatting: **bold**, *italic*, [links](url)
function inlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#c9a84c; text-decoration:underline;">$1</a>');
}

export function customMarketingEmailHtml(
  subject: string,
  body: string,
  ctaLabel?: string,
  ctaUrl?: string,
  unsubscribeUrl: string = "#"
): string {
  const paragraphs = markdownToEmailHtml(body);

  const ctaHtml = ctaLabel && ctaUrl ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 28px;">
      <tr><td align="center">
        <a href="${ctaUrl}" style="display:inline-block; padding:16px 40px; background:#c9a84c; color:#2c2c2c; text-decoration:none; font-weight:700; font-size:16px; border-radius:6px; letter-spacing:0.04em;">
          ${ctaLabel}
        </a>
      </td></tr>
    </table>
  ` : "";

  const content = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td style="border-top:3px solid #c9a84c; font-size:0; line-height:0;">&nbsp;</td></tr>
    </table>
    <h1 style="margin:0 0 20px; font-size:24px; color:#2c2c2c; font-weight:700;">${subject}</h1>
    ${paragraphs}
    ${ctaHtml}
    <p style="margin:24px 0 0; font-size:14px; color:#888;">
      Best,<br/>
      Crystal Lake Cars &amp; Caffeine Team
    </p>
  `;

  return marketingHtmlShell(content, unsubscribeUrl);
}

export function getMarketingEmailHtml(
  templateKey: MarketingTemplateKey,
  unsubscribeUrl: string
): string {
  switch (templateKey) {
    case "save_the_date_2026":
      return saveTheDateHtml(unsubscribeUrl);
    case "register_now_2026":
      return registerNowHtml(unsubscribeUrl);
    default:
      throw new Error(`Unknown marketing template: ${templateKey}`);
  }
}

export function getMarketingPreviewHtml(templateKey: MarketingTemplateKey): string {
  return getMarketingEmailHtml(templateKey, "#");
}
