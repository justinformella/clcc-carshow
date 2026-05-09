# Free Extra Car Promo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins send all paid registrants a unique promo code for one free additional car registration.

**Architecture:** New `promo_codes` table stores unique codes linked to the original registration. The checkout API accepts an optional `promo_code` — when valid, it skips Stripe and immediately marks the registration as `comped`. The registration form reads `?promo=CODE` from the URL and auto-fills it. A pre-built admin action generates codes + sends emails in one click.

**Tech Stack:** Supabase (table + RLS), Next.js API routes, Resend email

---

### Task 1: Database — Create promo_codes table

**Files:**
- Run SQL in Supabase dashboard

- [ ] **Step 1: Create table and policies**

```sql
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  registration_id uuid NOT NULL REFERENCES registrations(id),
  email text NOT NULL,
  used boolean DEFAULT false,
  used_at timestamptz,
  used_by_registration_id uuid REFERENCES registrations(id),
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_promo_codes_code ON promo_codes (code);
CREATE INDEX idx_promo_codes_email ON promo_codes (email);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to promo_codes"
  ON promo_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read promo_codes"
  ON promo_codes FOR SELECT
  TO authenticated
  USING (true);
```

---

### Task 2: Type definition

**Files:**
- Modify: `types/database.ts`

- [ ] **Step 1: Add PromoCode type**

Add after the `ShowExpense` type:

```typescript
export type PromoCode = {
  id: string;
  code: string;
  registration_id: string;
  email: string;
  used: boolean;
  used_at: string | null;
  used_by_registration_id: string | null;
  sent_at: string | null;
  created_at: string;
};
```

- [ ] **Step 2: Commit**

```bash
git add types/database.ts
git commit -m "feat: add PromoCode type"
```

---

### Task 3: Email template

**Files:**
- Modify: `lib/email-templates.ts`

- [ ] **Step 1: Add freeCarOfferEmail function**

Add at the end of the file (before the closing, after `helpRequestReplyNotificationEmail`):

```typescript
export function freeCarOfferEmail(
  firstName: string,
  promoCode: string,
  registerUrl: string
): { subject: string; html: string } {
  const content = `
    <h1 style="margin:0 0 16px; font-size:24px; color:#2c2c2c; text-align:center;">Bring Another Ride — On Us!</h1>
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.6;">
      Hi ${firstName},
    </p>
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.6;">
      Thank you for being part of the 2026 Crystal Lake Cars &amp; Caffeine Car Show! We&rsquo;d love to see even more of your collection on the streets of downtown Crystal Lake.
    </p>
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.6;">
      As a thank you for registering, here&rsquo;s a <strong>free registration</strong> for one additional vehicle. Just click the link below &mdash; your promo code is already applied.
    </p>

    <!-- CTA button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td align="center">
        <a href="${registerUrl}" style="display:inline-block; padding:16px 40px; background:#c9a84c; color:#2c2c2c; text-decoration:none; font-weight:700; font-size:16px; letter-spacing:0.04em;">
          Register Your Free Car
        </a>
      </td></tr>
    </table>

    <!-- Promo code display -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td align="center">
        <table cellpadding="0" cellspacing="0" style="border:2px solid #c9a84c; padding:16px 32px; text-align:center;">
          <tr>
            <td>
              <span style="font-size:11px; color:#888; text-transform:uppercase; letter-spacing:0.1em;">Your Promo Code</span><br/>
              <span style="font-size:28px; font-weight:700; color:#2c2c2c; letter-spacing:0.15em;">${promoCode}</span>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:0 0 20px; font-size:13px; color:#888; line-height:1.5; text-align:center;">
      This code is valid for one free vehicle registration and is tied to your email address.
    </p>

    <!-- Event details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px; background:#f8f5f0;">
      <tr>
        <td style="padding:16px 24px;">
          <p style="margin:0 0 8px; font-size:11px; color:#888; text-transform:uppercase; letter-spacing:0.08em;">Event Details</p>
          <p style="margin:0; font-size:14px; color:#333;">
            <strong>Sunday, May 17, 2026</strong><br/>
            Grant, Brink &amp; Williams Streets &middot; Downtown Crystal Lake, IL
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0; font-size:14px; color:#888;">
      See you at the show,<br/>
      Crystal Lake Cars &amp; Caffeine Team
    </p>
  `;

  return {
    subject: "You've earned a free car registration! 🚗",
    html: htmlShell(content),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/email-templates.ts
git commit -m "feat: add free car offer email template"
```

---

### Task 4: Promo code validation API

**Files:**
- Create: `app/api/promo/validate/route.ts`

- [ ] **Step 1: Create the validation endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const { code, email } = await request.json();

  if (!code || !email) {
    return NextResponse.json({ valid: false, error: "Code and email are required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: promo, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .single();

  if (error || !promo) {
    return NextResponse.json({ valid: false, error: "Invalid promo code" });
  }

  if (promo.used) {
    return NextResponse.json({ valid: false, error: "This code has already been used" });
  }

  if (promo.email.toLowerCase() !== email.toLowerCase().trim()) {
    return NextResponse.json({ valid: false, error: "This code is not associated with your email address" });
  }

  return NextResponse.json({ valid: true, code: promo.code });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/promo/validate/route.ts
git commit -m "feat: add promo code validation API"
```

---

### Task 5: Update checkout to accept promo codes

**Files:**
- Modify: `app/api/checkout/route.ts`

- [ ] **Step 1: Add promo code handling**

After the `donationCents` parsing (around line 40), add promo code extraction:

```typescript
    const promoCode = body.promo_code ? String(body.promo_code).toUpperCase().trim() : null;
```

After the capacity check (after line 129), before building rows, add promo validation:

```typescript
    // Validate promo code if provided
    let validPromo: { id: string; code: string; email: string } | null = null;
    if (promoCode) {
      const { data: promo } = await supabase
        .from("promo_codes")
        .select("id, code, email, used")
        .eq("code", promoCode)
        .single();

      if (!promo) {
        return NextResponse.json({ error: "Invalid promo code." }, { status: 400 });
      }
      if (promo.used) {
        return NextResponse.json({ error: "This promo code has already been used." }, { status: 400 });
      }
      if (promo.email.toLowerCase() !== email.toLowerCase().trim()) {
        return NextResponse.json({ error: "This promo code is not associated with your email address." }, { status: 400 });
      }
      if (vehicles.length > 1) {
        return NextResponse.json({ error: "Promo codes can only be used for a single vehicle." }, { status: 400 });
      }
      validPromo = promo;
    }
```

After inserting registration rows (after line 167), add the free registration path:

```typescript
    // If promo code is valid, skip Stripe — mark as comped immediately
    if (validPromo) {
      const regId = registrations[0].id;

      await supabase
        .from("registrations")
        .update({
          payment_status: "comped",
          amount_paid: 0,
        })
        .eq("id", regId);

      // Mark promo code as used
      await supabase
        .from("promo_codes")
        .update({
          used: true,
          used_at: new Date().toISOString(),
          used_by_registration_id: regId,
        })
        .eq("id", validPromo.id);

      // Generate car image in background
      fetch(`${siteUrl}/api/generate-car-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: regId }),
      }).catch(() => {});

      return NextResponse.json({ comped: true, registrationId: regId });
    }
```

- [ ] **Step 2: Commit**

```bash
git add app/api/checkout/route.ts
git commit -m "feat: accept promo codes in checkout, skip payment when valid"
```

---

### Task 6: Update registration form

**Files:**
- Modify: `app/register/page.tsx`

- [ ] **Step 1: Add promo code state and URL param reading**

Add to the existing state declarations (near line 35):

```typescript
  const promoFromUrl = searchParams.get("promo") || "";
  const [promoCode, setPromoCode] = useState(promoFromUrl);
  const [promoValidated, setPromoValidated] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [validatingPromo, setValidatingPromo] = useState(false);
```

- [ ] **Step 2: Add promo validation function**

Add before `handleSubmit`:

```typescript
  const validatePromo = async () => {
    if (!promoCode || !form.email) {
      setPromoError("Enter your email address first");
      return;
    }
    setValidatingPromo(true);
    setPromoError("");
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode, email: form.email }),
      });
      const data = await res.json();
      if (data.valid) {
        setPromoValidated(true);
        setPromoError("");
      } else {
        setPromoValidated(false);
        setPromoError(data.error || "Invalid code");
      }
    } catch {
      setPromoError("Failed to validate code");
    } finally {
      setValidatingPromo(false);
    }
  };
```

- [ ] **Step 3: Auto-validate on load if promo param present**

Add a useEffect after the validation function:

```typescript
  useEffect(() => {
    if (promoFromUrl && form.email) {
      validatePromo();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 4: Update handleSubmit to pass promo code**

In the `handleSubmit` function, add `promo_code` to the checkout body:

```typescript
        body: JSON.stringify({
          ...form,
          vehicles,
          donation_cents: promoValidated ? 0 : donationCents,
          promo_code: promoValidated ? promoCode : null,
        }),
```

Handle the comped response (after the existing `const data = await res.json()`):

```typescript
      if (data.comped) {
        // Free registration — redirect to success page directly
        window.location.href = `/register/success?comped=true`;
        return;
      }
```

- [ ] **Step 5: Add promo code UI**

Add a promo code section above the payment/donation area. When `promoValidated` is true, hide the donation section and show the $0 total. Show the promo input field with an "Apply" button.

- [ ] **Step 6: Limit to single vehicle when promo is active**

When `promoValidated` is true, hide the "Add Another Vehicle" button and show a note that the promo is for one vehicle only.

- [ ] **Step 7: Commit**

```bash
git add app/register/page.tsx
git commit -m "feat: add promo code support to registration form"
```

---

### Task 7: Update success page for comped registrations

**Files:**
- Modify: `app/register/success/page.tsx` (or equivalent)

- [ ] **Step 1: Handle comped query param**

Check for `?comped=true` in the search params and show an appropriate message like "Your free registration is confirmed!" instead of the Stripe payment confirmation.

- [ ] **Step 2: Commit**

```bash
git add app/register/success/page.tsx
git commit -m "feat: handle comped registration on success page"
```

---

### Task 8: Send free car offer API

**Files:**
- Create: `app/api/marketing/send-free-car-offer/route.ts`

- [ ] **Step 1: Create the send endpoint**

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getResend } from "@/lib/resend";
import { freeCarOfferEmail } from "@/lib/email-templates";
import crypto from "crypto";

const FROM_EMAIL = "Crystal Lake Cars & Caffeine <noreply@crystallakecarshow.com>";
const REPLY_TO = "info@crystallakecarshow.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crystallakecarshow.com";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function generateCode(): string {
  // 6 character alphanumeric, uppercase, easy to read (no O/0/I/1/L)
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

export async function POST() {
  const supabase = createServerClient();

  // Get all paid registrations (unique by email, take the first one)
  const { data: regs } = await supabase
    .from("registrations")
    .select("id, first_name, email")
    .in("payment_status", ["paid"])
    .order("created_at", { ascending: true });

  if (!regs || regs.length === 0) {
    return NextResponse.json({ error: "No paid registrations found" }, { status: 400 });
  }

  // Dedupe by email — one code per person
  const seen = new Set<string>();
  const unique: typeof regs = [];
  for (const r of regs) {
    const key = r.email.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }

  // Check which emails already have a promo code
  const { data: existingCodes } = await supabase
    .from("promo_codes")
    .select("email");

  const existingEmails = new Set((existingCodes || []).map((c: { email: string }) => c.email.toLowerCase()));

  // Filter to only those who don't have a code yet
  const toSend = unique.filter((r) => !existingEmails.has(r.email.toLowerCase()));

  if (toSend.length === 0) {
    return NextResponse.json({ sent: 0, skipped: unique.length, message: "All registrants already have promo codes" });
  }

  const resend = getResend();
  let sent = 0;
  let failed = 0;

  for (const reg of toSend) {
    try {
      const code = generateCode();

      // Insert promo code
      await supabase.from("promo_codes").insert({
        code,
        registration_id: reg.id,
        email: reg.email,
      });

      // Build email
      const registerUrl = `${SITE_URL}/register?promo=${code}`;
      const { subject, html } = freeCarOfferEmail(reg.first_name, code, registerUrl);

      // Send
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        reply_to: REPLY_TO,
        to: reg.email,
        subject,
        html,
      });

      if (error) throw new Error(error.message);

      // Mark as sent
      await supabase
        .from("promo_codes")
        .update({ sent_at: new Date().toISOString() })
        .eq("code", code);

      // Log
      await supabase.from("email_log").insert({
        registration_id: reg.id,
        email_type: "free_car_offer",
        recipient_email: reg.email,
        subject,
      });

      sent++;
    } catch (err) {
      console.error(`[free-car-offer] Failed for ${reg.email}:`, err);
      failed++;
    }

    await wait(200); // rate limit
  }

  return NextResponse.json({ sent, failed, skipped: unique.length - toSend.length });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/marketing/send-free-car-offer/route.ts
git commit -m "feat: add send free car offer API"
```

---

### Task 9: Admin UI — send button + status

**Files:**
- Modify: `app/admin/marketing/page.tsx`

- [ ] **Step 1: Add a "Free Car Promo" section to the Announcements tab or Email tab**

Add a card/section with:
- A "Send Free Car Offer" button that calls `POST /api/marketing/send-free-car-offer`
- Shows result: "Sent to X registrants, Y skipped (already have codes), Z failed"
- A summary showing total codes generated, codes used, codes remaining (fetched from `promo_codes` table)

- [ ] **Step 2: Commit**

```bash
git add app/admin/marketing/page.tsx
git commit -m "feat: add free car promo admin UI"
```

---

### Task 10: Build and verify

- [ ] **Step 1: Run build**

```bash
npx next build
```

- [ ] **Step 2: Test the full flow locally**

1. Go to `/admin/marketing`, click "Send Free Car Offer"
2. Check email log for the sent email
3. Click the link in the email — should go to `/register?promo=CODE`
4. Fill in the form — promo code should be auto-filled
5. Submit — should skip Stripe, redirect to success page
6. Check the registration in admin — should show as "comped"
7. Check promo_codes table — code should be marked as used
8. Try using the same code again — should show error

- [ ] **Step 3: Commit and push**

```bash
git add .
git commit -m "feat: free car promo - complete implementation"
git push
```
