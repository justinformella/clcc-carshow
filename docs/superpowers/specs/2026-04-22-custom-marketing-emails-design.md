# Custom Marketing Email Composer

## Overview

Add the ability to compose, preview, and send custom freeform emails to marketing prospects using the branded CLCC email template (header with logo, white body, footer with unsubscribe link).

## Scope

1. **Custom email composer** — new tab or section in Marketing page where admin can write a subject and body, preview it in the branded template, select recipients, and send
2. **Fix announcement emails** — ensure the Marketing > Announcements tab (for registrants) also uses the branded HTML template (it already does via `htmlShell` — verify this is working correctly)

## UI (Marketing Page)

Add a "Compose" section to the Email tab in Marketing. The flow:

1. **Compose**: Subject line input + rich-text body textarea (plain text with line breaks converted to paragraphs). Optional CTA button (label + URL).
2. **Preview**: Renders the email in an iframe using `marketingHtmlShell` so admin sees exactly what recipients will get.
3. **Select recipients**: Choose from marketing prospects. Options:
   - All prospects (excluding unsubscribed)
   - Prospects who haven't registered for 2026
   - Manual checkbox selection
4. **Send**: Confirm recipient count, then send. Track sends in `marketing_sends` table.

## Template Function

Add a new `customMarketingEmail` function to `marketing-email-templates.ts`:

```ts
export function customMarketingEmail(
  subject: string,
  body: string,
  ctaLabel?: string,
  ctaUrl?: string,
  unsubscribeUrl: string
): string
```

- Wraps body text in styled paragraphs (split on double newlines)
- Adds optional CTA button matching the existing gold button style
- Signs off with "Crystal Lake Cars & Caffeine Team"
- Uses `marketingHtmlShell` for branded wrapper + unsubscribe

## API Route

`POST /api/marketing/send-custom` — accepts:
- `subject`: string
- `body`: string
- `cta_label`: string (optional)
- `cta_url`: string (optional)
- `prospect_ids`: string[] (selected prospect IDs)

Sends to each prospect, logs in `email_log` and `marketing_sends`.

## Files to Modify/Create

1. `lib/marketing-email-templates.ts` — add `customMarketingEmail` + export `marketingHtmlShell`
2. `app/api/marketing/send-custom/route.ts` — new API route
3. `app/admin/marketing/page.tsx` — add compose UI to Email tab
4. `app/api/marketing/preview-custom/route.ts` — returns preview HTML for iframe
