# Sponsor Additional Donations

## Overview

Allow sponsors to make an optional additional donation on top of their tier payment. Track donations separately from tier payments so finances stay clean.

## Database

Add `donation_cents` (integer, default 0) to the `sponsors` table. This mirrors the existing `donation_cents` field on `registrations`.

## Payment Form (`SponsorPaymentForm.tsx`)

After the tier selection and before the payment buttons, add an "Additional Donation" section:

- Preset amount buttons: $100, $250, $500
- "Other" option that reveals a custom dollar input
- Clearly labeled as optional
- Shows updated total: "Tier: $1,000 + Donation: $100 = Total: $1,100"

The donation amount is passed to both the card and check payment APIs.

## Checkout API (`/api/sponsors/checkout`)

- Accept `donation_cents` in the request body
- Add donation as a second Stripe line item (if > 0):
  ```
  { name: "Additional Donation — Crystal Lake Cars & Caffeine", unit_amount: donation_cents }
  ```
- Store `donation_cents` in Stripe session metadata so the webhook can split the total

## Check Payment API (`/api/sponsors/pay-by-check`)

- Accept `donation_cents` in the request body
- Write `donation_cents` to the sponsor record immediately (same as it does for other fields)

## Stripe Webhook

- Read `donation_cents` from `session.metadata`
- Set `amount_paid` to tier price (not `session.amount_total`)
- Set `donation_cents` to the metadata value
- This keeps `amount_paid` = tier revenue and `donation_cents` = donation, matching the registration pattern

## Success Page

- Show the breakdown: sponsorship amount + donation amount if donation > 0

## Admin Sponsor Detail Page

- Show "Donation" field next to "Amount Paid" when `donation_cents > 0`

## Finances Page

- Add sponsor donations to the existing donation revenue totals
- P&L line "Gross Revenue (Donations)" should include both registration and sponsor donations
- Sponsor donation detail modal should list sponsor donors

## Files to Modify

1. `types/database.ts` — add `donation_cents` to `Sponsor` type
2. `app/sponsor/pay/[token]/SponsorPaymentForm.tsx` — donation input UI
3. `app/api/sponsors/checkout/route.ts` — second line item + metadata
4. `app/api/sponsors/pay-by-check/route.ts` — accept donation_cents
5. `app/api/webhooks/stripe/route.ts` — split amount_paid vs donation_cents
6. `app/sponsor/pay/success/page.tsx` — show donation in confirmation
7. `app/admin/sponsors/[id]/page.tsx` — display donation
8. `app/admin/finances/page.tsx` — include sponsor donations in totals
