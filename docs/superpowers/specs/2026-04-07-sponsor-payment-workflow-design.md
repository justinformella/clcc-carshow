# Sponsor Payment Workflow Design

**Date:** 2026-04-07
**Status:** Draft

## Overview

A complete sponsor payment workflow: admin-managed sponsorship tiers, unique payment links per sponsor, Stripe Checkout (matching the registration flow), pay-by-check option, editable sponsor info, upgrade capability, and tax receipts referencing the Downtown Crystal Lake charity.

## Database Changes

### New table: `sponsorship_tiers`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | |
| `name` | text | e.g., "Presenting Sponsor" |
| `price_cents` | integer | e.g., 250000 |
| `benefits` | text | Markdown — rendered on payment page |
| `display_order` | integer | Controls sort order |
| `is_active` | boolean, default true | Hide without deleting |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-trigger |

**Seed data (three tiers from existing flyer):**

- **Presenting Sponsor ($2,500):** Branding on all advertising material, logo on trophy titled as "Presenting Sponsor", optional 10x10 booth, 1 show car space, up to 12 Facebook advertisements (1/month) on CLCC page (700+ members)
- **Premier Sponsor ($1,000):** Branding on all advertising materials, logo on trophy, 10x10 booth, 1 show car space, up to 12 Facebook advertisements (1/month) on CLCC page (700+ members)
- **Community Sponsor ($500):** 10x10 booth, 1 show car space, branding on all advertising material, up to 6 Facebook advertisements on CLCC page (700+ members)

### Changes to `sponsors` table

| Column | Type | Notes |
|--------|------|-------|
| `payment_token` | UUID, nullable, unique | Generated when admin creates payment link |
| `payment_method` | text, nullable | `'stripe'` or `'check'` |
| `check_note` | text, nullable | Sponsor's note about when they'll send check |
| `original_level` | text, nullable | Tracks admin's original assignment to detect upgrades |
| `stripe_session_id` | text, nullable | Stripe Checkout session ID |
| `stripe_payment_intent_id` | text, nullable | Stripe payment intent ID (for fetching details) |

Existing columns unchanged. `sponsorship_level` remains text (not a FK) for backward compatibility.

## Admin: Sponsor Tiers Page

New tab "Tiers" under Sponsors section in admin nav.

**Features:**
- Table of all tiers: name, price, display order, active/hidden status
- Each tier row lists the sponsors assigned to that level
- Click to edit: name, price (input in dollars, stored as cents), benefits (markdown textarea), display order
- "Add Tier" button for new tiers
- Toggle active/hidden (no delete)
- Markdown hints below benefits textarea: `Tip: Use - for bullet points, **bold** for emphasis`
- Live preview of rendered markdown alongside textarea

**Migration:** Replace hardcoded `SPONSORSHIP_LEVELS` constant throughout the app (sponsor forms, dropdowns, inquiry form) with data fetched from `sponsorship_tiers` table.

## Sponsor Payment Page (`/sponsor/pay/[token]`)

Public page, no auth required. Token-based access (UUID is unguessable).

**Layout:** Matches registration page style and branding.

### Page sections

1. **Header** — Event branding, consistent with registration page
2. **Sponsor info card** — Company name, logo (view-only if uploaded)
3. **Editable fields** — name, company, email, phone, website — pre-filled, sponsor can update before paying
4. **Sponsorship level** — Shows assigned tier with rendered benefits (markdown). Dropdown to upgrade (only higher tiers shown). Price updates on tier change.
5. **Payment section** — Two options:
   - **Pay with card** — Stripe Checkout (same flow as registration)
   - **Pay by check** — Expand form: confirm choice, text field for when they'll send it, instructions (payable to Downtown Crystal Lake, mailing address)
6. **Already paid state** — If revisited after paying, show "Thank you, your sponsorship is confirmed" message

### Upgrade behavior

- Only tiers above the sponsor's current/assigned tier are shown
- Price auto-adjusts to the selected tier
- `original_level` stores what admin originally assigned
- Admin is notified of the upgrade in the confirmation email

## Stripe Checkout & Webhook

### Checkout

- **Route:** `POST /api/sponsors/checkout`
- Creates Stripe Checkout Session with one line item for sponsorship amount
- Metadata: `sponsor_id`, `payment_token`, `tier_name`, `upgraded_from` (if applicable)
- Success URL: `/sponsor/pay/success?session_id={id}`
- Cancel URL: `/sponsor/pay/[token]`

### Webhook

- Extend existing `/api/webhooks/stripe/route.ts`
- On `checkout.session.completed` with `sponsor_id` in metadata:
  - Update sponsor: `status` → `'paid'`, `amount_paid`, `paid_at`, `payment_method` → `'stripe'`
  - If upgraded: update `sponsorship_level` to new tier
  - Send sponsor receipt email
  - Send admin notification email

### Pay by check

- **Route:** `POST /api/sponsors/pay-by-check`
- Updates sponsor: `payment_method` → `'check'`, `check_note`, status stays `'committed'`
- If upgraded: update `sponsorship_level`
- Send admin notification email

## Emails

All use existing `htmlShell()` template wrapper, Resend service, retry logic, and email logging.

### 1. Payment link email

- **Trigger:** Admin clicks "Send Payment Email" on sponsor detail page
- **To:** Sponsor's email
- **Subject:** "Crystal Lake Cars & Caffeine — Sponsorship Payment"
- **Body:** Greeting, tier name, amount, button linking to payment page

### 2. Sponsor payment receipt

- **Trigger:** After Stripe payment completes (webhook)
- **To:** Sponsor's email
- **Subject:** "Sponsorship Receipt — Crystal Lake Cars & Caffeine"
- **Body:** Thank you, tier, amount paid, benefits summary, charity receipt info:
  - Organization: Downtown Crystal Lake (downtowncl.org)
  - Details from https://downtowncl.org/who-we-are/

### 3. Admin notification

- **Trigger:** After payment (Stripe or check selection)
- **To:** All admins
- **Subject:** "Sponsor Payment: {company}" or "Sponsor Check Pending: {company}"
- **Body:** Sponsor details, tier, amount, payment method, upgrade notice if sponsor chose a higher tier

## Admin Integration

### Sponsor detail page (`/admin/sponsors/[id]`)

- New "Payment Link" section:
  - "Generate Payment Link" button → creates `payment_token`, shows copyable URL
  - "Send Payment Email" button → sends payment link email to sponsor
  - Link status display: not generated / generated / sent / paid
- Check pending: show check note and badge if sponsor chose pay-by-check
- Upgrade indicator: show original level vs current level if sponsor upgraded
- **Stripe payment details section** (when paid via Stripe): Mirrors the registration detail page (`/admin/registrations/[id]`). Uses the same `/api/admin/stripe-details` endpoint. Displays:
  - Card info (brand, last 4, expiry, funding type, country, wallet)
  - Payment date
  - Receipt URL link
  - "View in Stripe" dashboard link
  - Billing name and address
  - Risk assessment level

### Sponsor list page

- Visual indicator for payment method (card icon vs check pending badge)

### Forms (new sponsor, edit sponsor, inquiry)

- Tier dropdown pulls from `sponsorship_tiers` table instead of hardcoded `SPONSORSHIP_LEVELS`

## Success Page (`/sponsor/pay/success`)

- Matches registration success page style
- Thank you message with confirmation
- Tax receipt information:
  - Sponsorship tier and amount
  - Charity: Downtown Crystal Lake (downtowncl.org)
  - Organization details for tax purposes
- Event details reminder
