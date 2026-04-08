# Sponsor Payment Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-managed sponsorship tiers, token-based payment links, Stripe Checkout + pay-by-check, editable sponsor info, tier upgrades, tax receipts, and Stripe payment details in admin.

**Architecture:** New `sponsorship_tiers` table stores tier config (name, price, benefits markdown). Sponsors get a `payment_token` column for unique payment URLs. Public payment page at `/sponsor/pay/[token]` lets sponsors review/edit info and pay via Stripe Checkout or check. Webhook extended to handle sponsor payments. Three new email templates use existing `htmlShell()`.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres), Stripe Checkout, Resend email, Tailwind CSS v4, react-markdown for benefits rendering.

---

## File Structure

### New files
- `app/admin/sponsors/tiers/page.tsx` — Admin tier management page
- `app/sponsor/pay/[token]/page.tsx` — Public sponsor payment page
- `app/sponsor/pay/success/page.tsx` — Post-payment success/receipt page
- `app/api/sponsors/checkout/route.ts` — Stripe Checkout session for sponsors
- `app/api/sponsors/pay-by-check/route.ts` — Check payment selection endpoint
- `app/api/sponsors/[id]/generate-token/route.ts` — Generate payment token
- `app/api/sponsors/[id]/send-payment-email/route.ts` — Send payment link email
- `app/api/sponsors/tiers/route.ts` — CRUD API for sponsorship tiers
- `app/api/sponsors/tiers/public/route.ts` — Public tiers endpoint (no auth)

### Modified files
- `types/database.ts` — Add `SponsorshipTier` type, update `Sponsor` type with new fields
- `supabase-schema.sql` — Add `sponsorship_tiers` table, alter `sponsors` table
- `app/api/webhooks/stripe/route.ts` — Handle sponsor checkout completions
- `lib/email-templates.ts` — Add 3 new email templates
- `lib/email.ts` — Add 3 new email sending functions
- `app/admin/sponsors/[id]/page.tsx` — Payment link section, Stripe details, check badge
- `app/admin/sponsors/page.tsx` — Payment method indicator column
- `app/admin/sponsors/new/page.tsx` — Fetch tiers from DB instead of hardcoded constant
- `app/admin/layout.tsx` — Add Tiers sub-nav under Sponsors
- `components/SponsorsSection.tsx` — Fetch tiers from DB for inquiry form dropdown

---

### Task 1: Database Schema — sponsorship_tiers table and sponsors alterations

**Files:**
- Modify: `supabase-schema.sql`
- Modify: `types/database.ts:180-215`

This task produces SQL for the user to run in Supabase SQL Editor, and updates the TypeScript types.

- [ ] **Step 1: Add sponsorship_tiers table and sponsors columns to schema file**

Append to `supabase-schema.sql` after the existing sponsors section:

```sql
-- ============================================================
-- Sponsorship Tiers
-- ============================================================

CREATE TABLE IF NOT EXISTS sponsorship_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  benefits TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER sponsorship_tiers_updated_at
  BEFORE UPDATE ON sponsorship_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE sponsorship_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage tiers"
  ON sponsorship_tiers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read active tiers"
  ON sponsorship_tiers FOR SELECT TO anon USING (is_active = true);

-- Seed default tiers
INSERT INTO sponsorship_tiers (name, price_cents, benefits, display_order) VALUES
  ('Presenting Sponsor', 250000, '- Branding on all advertising material
- Logo on trophy titled as "Presenting Sponsor"
- Optional 10x10 booth
- 1 show car space
- Up to 12 Facebook advertisements (1/month) on CLCC page with access to over 700 local members', 1),
  ('Premier Sponsor', 100000, '- Branding on all advertising materials
- Logo on trophy
- 10x10 booth
- 1 show car space
- Up to 12 Facebook advertisements (1/month) on CLCC page with access to over 700 local members', 2),
  ('Community Sponsor', 50000, '- 10x10 booth
- 1 show car space
- Branding on all advertising material
- Up to 6 Facebook advertisements on CLCC page with access to over 700 local members', 3);

-- Add new columns to sponsors table
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS payment_token UUID UNIQUE;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS check_note TEXT;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS original_level TEXT;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

CREATE INDEX IF NOT EXISTS idx_sponsors_payment_token ON sponsors (payment_token) WHERE payment_token IS NOT NULL;
```

- [ ] **Step 2: Update TypeScript types**

Add `SponsorshipTier` type and update `Sponsor` type in `types/database.ts`:

```typescript
// Add after SponsorAuditLogEntry type (around line 208)

export type SponsorshipTier = {
  id: string;
  name: string;
  price_cents: number;
  benefits: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
```

Add new fields to the `Sponsor` type (after `updated_at`):

```typescript
  payment_token: string | null;
  payment_method: string | null;
  check_note: string | null;
  original_level: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
```

- [ ] **Step 3: Commit**

```bash
git add supabase-schema.sql types/database.ts
git commit -m "feat: add sponsorship_tiers table and sponsor payment columns"
```

- [ ] **Step 4: Present SQL to user**

Output the SQL from Step 1 and tell the user to run it in the Supabase SQL Editor.

---

### Task 2: Sponsorship Tiers API

**Files:**
- Create: `app/api/sponsors/tiers/route.ts`
- Create: `app/api/sponsors/tiers/public/route.ts`

- [ ] **Step 1: Create the admin tiers CRUD API**

Create `app/api/sponsors/tiers/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// GET: List all tiers (admin — includes inactive)
export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("sponsorship_tiers")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tiers: data });
}

// POST: Create a new tier
export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();
  const { name, price_cents, benefits, display_order, is_active } = body;

  if (!name || price_cents == null) {
    return NextResponse.json({ error: "Name and price are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sponsorship_tiers")
    .insert({ name, price_cents, benefits: benefits || "", display_order: display_order || 0, is_active: is_active ?? true })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

// PUT: Update an existing tier
export async function PUT(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Tier ID is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sponsorship_tiers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Create the public tiers endpoint**

Create `app/api/sponsors/tiers/public/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// GET: List active tiers (public — for payment page and inquiry form)
export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("sponsorship_tiers")
    .select("id, name, price_cents, benefits, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tiers: data });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/sponsors/tiers/
git commit -m "feat: add sponsorship tiers API (admin CRUD + public read)"
```

---

### Task 3: Admin Tiers Management Page

**Files:**
- Create: `app/admin/sponsors/tiers/page.tsx`
- Modify: `app/admin/layout.tsx:20-27`

- [ ] **Step 1: Add Tiers nav item to admin layout**

In `app/admin/layout.tsx`, add the Tiers nav item after the Sponsors item in the Event group (line 25). The nav items array in the Event group should become:

```typescript
      { href: "/admin/registrations", label: "Registrations", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
      { href: "/admin/attendees", label: "Attendees", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
      { href: "/admin/sponsors", label: "Sponsors", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
      { href: "/admin/sponsors/tiers", label: "Tiers", icon: "M3 4h18M3 8h18M3 12h12M3 16h18M3 20h12" },
```

- [ ] **Step 2: Create the Tiers management page**

Create `app/admin/sponsors/tiers/page.tsx`. This page should:

- Fetch all tiers from `GET /api/sponsors/tiers` (includes inactive)
- For each tier, fetch sponsors with matching `sponsorship_level` via Supabase
- Display a card per tier: name, price, active badge, sponsor count
- Expand each tier card to show: list of sponsors (name, company, status badge), edit form
- Edit form: name input, price input (dollars — convert to/from cents), benefits markdown textarea with hint text (`Tip: Use - for bullet points, **bold** for emphasis`), display order number, active toggle
- Live markdown preview next to benefits textarea using `react-markdown`
- "Add New Tier" button at top that opens an inline form
- Follow admin page styling patterns: white cards, Playfair Display headings, gold accents

The page is a client component (`"use client"`) with state for tiers, editing tier ID, and form values. Match the styling conventions from the existing sponsor pages (inline styles with CSS variables).

Full code for this component will be substantial (~400 lines). Key sections:

**State:**
```typescript
const [tiers, setTiers] = useState<(SponsorshipTier & { sponsors: Sponsor[] })[]>([]);
const [editingId, setEditingId] = useState<string | null>(null);
const [adding, setAdding] = useState(false);
const [form, setForm] = useState({ name: "", price_dollars: "", benefits: "", display_order: 0, is_active: true });
```

**Tier card layout (per tier):**
- Header row: tier name (h3, Playfair Display), price badge, active/hidden badge, Edit button
- Sponsors list: table with columns — Company, Contact, Status (using `SponsorStatusBadge` color mapping)
- Edit mode: form fields for name, price (dollars), benefits textarea + markdown preview, display_order, is_active toggle, Save/Cancel buttons

**Markdown preview:** Install `react-markdown` and render benefits in a `<div>` beside the textarea.

- [ ] **Step 3: Install react-markdown**

```bash
npm install react-markdown
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/sponsors/tiers/page.tsx app/admin/layout.tsx package.json package-lock.json
git commit -m "feat: add admin sponsorship tiers management page"
```

---

### Task 4: Migrate Hardcoded SPONSORSHIP_LEVELS to Database

**Files:**
- Modify: `app/admin/sponsors/[id]/page.tsx:7,454`
- Modify: `app/admin/sponsors/new/page.tsx:6,163`
- Modify: `components/SponsorsSection.tsx:195-207`

- [ ] **Step 1: Update sponsor detail page to fetch tiers from DB**

In `app/admin/sponsors/[id]/page.tsx`:

Remove the import of `SPONSORSHIP_LEVELS` (line 7).

Add state and fetch for tiers:
```typescript
const [tiers, setTiers] = useState<{ name: string; price_cents: number }[]>([]);

useEffect(() => {
  fetch("/api/sponsors/tiers/public")
    .then((res) => res.json())
    .then((data) => setTiers(data.tiers || []))
    .catch(() => {});
}, []);
```

Replace the dropdown that maps `SPONSORSHIP_LEVELS` (around line 454) with:
```tsx
{tiers.map((tier) => (
  <option key={tier.name} value={tier.name}>
    {tier.name} (${(tier.price_cents / 100).toLocaleString()})
  </option>
))}
<option value="Other / Not Sure">Other / Not Sure</option>
```

- [ ] **Step 2: Update new sponsor page to fetch tiers from DB**

In `app/admin/sponsors/new/page.tsx`:

Remove the import of `SPONSORSHIP_LEVELS` (line 6).

Add state and fetch for tiers (same pattern as Step 1).

Replace the dropdown that maps `SPONSORSHIP_LEVELS` (around line 163) with the same dynamic options.

- [ ] **Step 3: Update public inquiry form to fetch tiers from DB**

In `components/SponsorsSection.tsx`, the tier options are hardcoded in JSX (lines 195-207). Replace with dynamic options:

Add state:
```typescript
const [tierOptions, setTierOptions] = useState<{ name: string; price_cents: number }[]>([]);
```

Add fetch in the existing `useEffect` or a new one:
```typescript
useEffect(() => {
  fetch("/api/sponsors/tiers/public")
    .then((res) => res.json())
    .then((data) => setTierOptions(data.tiers || []))
    .catch(() => {});
}, []);
```

Replace hardcoded `<option>` elements with:
```tsx
<option value="">Select a level...</option>
{tierOptions.map((tier) => (
  <option key={tier.name} value={`${tier.name} ($${(tier.price_cents / 100).toLocaleString()})`}>
    {tier.name} (${(tier.price_cents / 100).toLocaleString()})
  </option>
))}
<option value="Other">Other / Not Sure</option>
```

- [ ] **Step 4: Keep SPONSORSHIP_LEVELS constant as fallback**

Do NOT remove `SPONSORSHIP_LEVELS` from `types/database.ts` yet — it serves as a fallback reference. Mark it with a comment:

```typescript
/** @deprecated Use sponsorship_tiers table instead. Kept for reference. */
export const SPONSORSHIP_LEVELS = [
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/sponsors/[id]/page.tsx app/admin/sponsors/new/page.tsx components/SponsorsSection.tsx types/database.ts
git commit -m "feat: migrate sponsor tier dropdowns from hardcoded constant to database"
```

---

### Task 5: Payment Token Generation & Payment Link Email

**Files:**
- Create: `app/api/sponsors/[id]/generate-token/route.ts`
- Create: `app/api/sponsors/[id]/send-payment-email/route.ts`
- Modify: `lib/email-templates.ts`
- Modify: `lib/email.ts`

- [ ] **Step 1: Create generate-token API route**

Create `app/api/sponsors/[id]/generate-token/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { randomUUID } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  // Check sponsor exists
  const { data: sponsor, error: fetchError } = await supabase
    .from("sponsors")
    .select("id, payment_token, sponsorship_level")
    .eq("id", id)
    .single();

  if (fetchError || !sponsor) {
    return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
  }

  // Generate token if not already set
  const token = sponsor.payment_token || randomUUID();

  // Store original level if not already set
  const updates: Record<string, unknown> = { payment_token: token };
  if (!sponsor.payment_token) {
    updates.original_level = sponsor.sponsorship_level;
  }

  const { error: updateError } = await supabase
    .from("sponsors")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const paymentUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://crystallakecarshow.com"}/sponsor/pay/${token}`;

  return NextResponse.json({ token, paymentUrl });
}
```

- [ ] **Step 2: Add payment link email template**

In `lib/email-templates.ts`, add after the `sponsorAdminNotificationEmail` function:

```typescript
export function sponsorPaymentLinkEmail(
  sponsor: Sponsor,
  tierName: string,
  amountDollars: string,
  paymentUrl: string
): { subject: string; html: string } {
  const content = `
    <h1 style="margin:0 0 16px; font-size:24px; color:#2c2c2c;">Sponsorship Payment</h1>
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.6;">
      Hi ${sponsor.name},
    </p>
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.6;">
      Thank you for your support of Crystal Lake Cars &amp; Caffeine! Your sponsorship details are below.
      Click the button to review your information and complete payment.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888; width:140px;">Company</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${sponsor.company}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888;">Sponsorship Level</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${tierName}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888;">Amount</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c; font-weight:600;">${amountDollars}</td>
      </tr>
    </table>
    <a href="${paymentUrl}" style="display:inline-block; padding:12px 24px; background:#c9a84c; color:#2c2c2c; text-decoration:none; font-weight:600; font-size:14px; border-radius:6px;">
      Review &amp; Pay
    </a>
    <p style="margin:20px 0 0; font-size:13px; color:#888; line-height:1.5;">
      If you have any questions, reply to this email or contact us at info@crystallakecarshow.com.
    </p>
  `;

  return {
    subject: "Crystal Lake Cars & Caffeine — Sponsorship Payment",
    html: htmlShell(content),
  };
}
```

- [ ] **Step 3: Add send payment email function**

In `lib/email.ts`, add after `sendSponsorAdminNotification`:

```typescript
import { sponsorPaymentLinkEmail } from "./email-templates";
```

(Add to existing imports at top of file.)

```typescript
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

  // Look up tier price
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
}
```

- [ ] **Step 4: Create send-payment-email API route**

Create `app/api/sponsors/[id]/send-payment-email/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sendSponsorPaymentLink } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await sendSponsorPaymentLink(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-payment-email] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/sponsors/[id]/generate-token/ app/api/sponsors/[id]/send-payment-email/ lib/email-templates.ts lib/email.ts
git commit -m "feat: add payment token generation and payment link email for sponsors"
```

---

### Task 6: Sponsor Payment Page

**Files:**
- Create: `app/sponsor/pay/[token]/page.tsx`

- [ ] **Step 1: Create the sponsor payment page**

Create `app/sponsor/pay/[token]/page.tsx`. This is a client component that:

**Data loading:**
- Fetches sponsor by token: `GET /api/sponsors/by-token?token={token}` (we'll create a simple endpoint, or use server component with Supabase directly)
- Actually, use a server component wrapper + client component for the form. The server component fetches the sponsor and tiers, passes them as props.

Better approach — make it a server component that fetches data, with a client form component:

**Server component (`page.tsx`):**
```typescript
import { createServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import SponsorPaymentForm from "./SponsorPaymentForm";

export default async function SponsorPayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServerClient();

  const { data: sponsor } = await supabase
    .from("sponsors")
    .select("*")
    .eq("payment_token", token)
    .single();

  if (!sponsor) notFound();

  const { data: tiers } = await supabase
    .from("sponsorship_tiers")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  return <SponsorPaymentForm sponsor={sponsor} tiers={tiers || []} token={token} />;
}
```

**Client component (`SponsorPaymentForm.tsx` in same directory):**

Create `app/sponsor/pay/[token]/SponsorPaymentForm.tsx`:

This is a large component (~500 lines). Key sections:

**Props & State:**
```typescript
type Props = {
  sponsor: Sponsor;
  tiers: SponsorshipTier[];
  token: string;
};

// State
const [form, setForm] = useState({
  name: sponsor.name,
  company: sponsor.company,
  email: sponsor.email,
  phone: sponsor.phone || "",
  website: sponsor.website || "",
});
const [selectedLevel, setSelectedLevel] = useState(sponsor.sponsorship_level);
const [paymentMethod, setPaymentMethod] = useState<"card" | "check" | null>(null);
const [checkNote, setCheckNote] = useState("");
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**Already-paid check:**
```typescript
if (sponsor.status === "paid") {
  // Render "Thank you, your sponsorship is confirmed" message
  // Show company name, tier, amount paid
  return ( /* paid confirmation UI */ );
}
```

**Layout (matches registration page style):**
- Max-width 600px centered container on cream background
- Event header banner matching registration page
- White card sections with form fields

**Sections:**
1. **Logo display** (if `sponsor.logo_url` exists) — `<img>` centered, view-only
2. **Editable fields** — name, company, email, phone, website inputs (pre-filled)
3. **Sponsorship tier** — current tier shown with benefits (rendered markdown via `react-markdown`). Upgrade dropdown showing only tiers with `display_order` less than current (i.e., higher-ranked/more expensive). When changed, price updates.
4. **Amount display** — large styled price from selected tier's `price_cents`
5. **Payment method buttons:**
   - "Pay with Card" button → POST to `/api/sponsors/checkout` with form data + selected level, redirects to Stripe
   - "Pay by Check" button → expands check form
6. **Check form** (when expanded):
   - Instructions: "Please make checks payable to **Downtown Crystal Lake / Main Street** and mail to: Raue House, 25 W. Crystal Lake Avenue, Crystal Lake, IL 60014"
   - Textarea: "When do you plan to send the check?"
   - "Confirm Check Payment" button → POST to `/api/sponsors/pay-by-check`

**Card payment handler:**
```typescript
const handleCardPayment = async () => {
  setSubmitting(true);
  setError(null);
  try {
    const res = await fetch("/api/sponsors/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        sponsor_id: sponsor.id,
        name: form.name,
        company: form.company,
        email: form.email,
        phone: form.phone || null,
        website: form.website || null,
        selected_level: selectedLevel,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to start checkout");
    window.location.href = data.url;
  } catch (err) {
    setError(err instanceof Error ? err.message : "Something went wrong");
    setSubmitting(false);
  }
};
```

**Check payment handler:**
```typescript
const handleCheckPayment = async () => {
  setSubmitting(true);
  setError(null);
  try {
    const res = await fetch("/api/sponsors/pay-by-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        sponsor_id: sponsor.id,
        name: form.name,
        company: form.company,
        email: form.email,
        phone: form.phone || null,
        website: form.website || null,
        selected_level: selectedLevel,
        check_note: checkNote,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to submit");
    // Redirect to a simple confirmation or show inline confirmation
    window.location.href = `/sponsor/pay/success?method=check&company=${encodeURIComponent(form.company)}&level=${encodeURIComponent(selectedLevel)}`;
  } catch (err) {
    setError(err instanceof Error ? err.message : "Something went wrong");
    setSubmitting(false);
  }
};
```

**Styling:** Match registration page — inline styles with CSS variables (`var(--gold)`, `var(--charcoal)`, `var(--cream)`, `var(--white)`). Gold CTA buttons with uppercase text and letter-spacing.

- [ ] **Step 2: Commit**

```bash
git add app/sponsor/pay/[token]/
git commit -m "feat: add public sponsor payment page with editable info and tier upgrade"
```

---

### Task 7: Sponsor Checkout API Route

**Files:**
- Create: `app/api/sponsors/checkout/route.ts`

- [ ] **Step 1: Create the Stripe Checkout route for sponsors**

Create `app/api/sponsors/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, sponsor_id, name, company, email, phone, website, selected_level } = body;

  if (!token || !sponsor_id || !selected_level) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Verify sponsor and token match
  const { data: sponsor, error: fetchError } = await supabase
    .from("sponsors")
    .select("*")
    .eq("id", sponsor_id)
    .eq("payment_token", token)
    .single();

  if (fetchError || !sponsor) {
    return NextResponse.json({ error: "Invalid sponsor or token" }, { status: 404 });
  }

  if (sponsor.status === "paid") {
    return NextResponse.json({ error: "Sponsorship already paid" }, { status: 400 });
  }

  // Look up tier price
  const { data: tier, error: tierError } = await supabase
    .from("sponsorship_tiers")
    .select("name, price_cents")
    .eq("name", selected_level)
    .single();

  if (tierError || !tier) {
    return NextResponse.json({ error: "Invalid sponsorship level" }, { status: 400 });
  }

  // Update sponsor contact info
  await supabase
    .from("sponsors")
    .update({
      name,
      company,
      email,
      phone: phone || null,
      website: website || null,
      sponsorship_level: selected_level,
      status: "committed",
    })
    .eq("id", sponsor_id);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://crystallakecarshow.com";

  // Determine if this is an upgrade
  const upgradedFrom = sponsor.original_level && sponsor.original_level !== selected_level
    ? sponsor.original_level
    : undefined;

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${tier.name} — Crystal Lake Cars & Caffeine`,
            description: `Sponsorship for the 2026 Crystal Lake Cars & Caffeine Car Show`,
          },
          unit_amount: tier.price_cents,
        },
        quantity: 1,
      },
    ],
    customer_email: email,
    metadata: {
      sponsor_id,
      payment_token: token,
      tier_name: selected_level,
      ...(upgradedFrom ? { upgraded_from: upgradedFrom } : {}),
    },
    success_url: `${siteUrl}/sponsor/pay/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/sponsor/pay/${token}`,
    ...(process.env.STRIPE_CONNECTED_ACCOUNT_ID
      ? {
          payment_intent_data: {
            transfer_data: {
              destination: process.env.STRIPE_CONNECTED_ACCOUNT_ID,
            },
          },
        }
      : {}),
  });

  return NextResponse.json({ url: session.url });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/sponsors/checkout/route.ts
git commit -m "feat: add Stripe Checkout API route for sponsor payments"
```

---

### Task 8: Pay-by-Check API Route

**Files:**
- Create: `app/api/sponsors/pay-by-check/route.ts`

- [ ] **Step 1: Create the check payment route**

Create `app/api/sponsors/pay-by-check/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { sendSponsorCheckAdminNotification } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, sponsor_id, name, company, email, phone, website, selected_level, check_note } = body;

  if (!token || !sponsor_id || !selected_level) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Verify sponsor and token match
  const { data: sponsor, error: fetchError } = await supabase
    .from("sponsors")
    .select("*")
    .eq("id", sponsor_id)
    .eq("payment_token", token)
    .single();

  if (fetchError || !sponsor) {
    return NextResponse.json({ error: "Invalid sponsor or token" }, { status: 404 });
  }

  if (sponsor.status === "paid") {
    return NextResponse.json({ error: "Sponsorship already paid" }, { status: 400 });
  }

  // Update sponsor
  const { error: updateError } = await supabase
    .from("sponsors")
    .update({
      name,
      company,
      email,
      phone: phone || null,
      website: website || null,
      sponsorship_level: selected_level,
      status: "committed",
      payment_method: "check",
      check_note: check_note || null,
    })
    .eq("id", sponsor_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Send admin notification (non-blocking)
  try {
    await sendSponsorCheckAdminNotification(sponsor_id);
  } catch (err) {
    console.error("[pay-by-check] Admin notification failed:", err);
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/sponsors/pay-by-check/route.ts
git commit -m "feat: add pay-by-check API route for sponsors"
```

---

### Task 9: Stripe Webhook Extension for Sponsor Payments

**Files:**
- Modify: `app/api/webhooks/stripe/route.ts`
- Modify: `lib/email-templates.ts`
- Modify: `lib/email.ts`

- [ ] **Step 1: Add sponsor receipt and admin notification email templates**

In `lib/email-templates.ts`, add after the `sponsorPaymentLinkEmail` function:

```typescript
export function sponsorReceiptEmail(
  sponsor: Sponsor,
  tierName: string,
  amountDollars: string,
  benefits: string
): { subject: string; html: string } {
  const benefitsHtml = benefits
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      const text = line.replace(/^-\s*/, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      return `<li style="padding:4px 0; font-size:14px; color:#333;">${text}</li>`;
    })
    .join("");

  const content = `
    <h1 style="margin:0 0 16px; font-size:24px; color:#2c2c2c;">Sponsorship Receipt</h1>
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.6;">
      Thank you, ${sponsor.name}! Your sponsorship payment has been received.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888; width:140px;">Company</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${sponsor.company}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888;">Sponsorship Level</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${tierName}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888;">Amount Paid</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c; font-weight:600;">${amountDollars}</td>
      </tr>
    </table>
    ${benefitsHtml ? `
    <h2 style="margin:0 0 12px; font-size:18px; color:#2c2c2c;">Your Sponsorship Includes</h2>
    <ul style="margin:0 0 24px; padding-left:20px;">${benefitsHtml}</ul>
    ` : ""}
    <div style="background:#f8f5f0; padding:20px; margin:0 0 24px; border-left:4px solid #c9a84c;">
      <h3 style="margin:0 0 8px; font-size:16px; color:#2c2c2c;">Tax Receipt Information</h3>
      <p style="margin:0; font-size:13px; color:#555; line-height:1.6;">
        <strong>Organization:</strong> Downtown Crystal Lake / Main Street<br/>
        <strong>Type:</strong> 501(c)(3) not-for-profit, founded 1996<br/>
        <strong>Address:</strong> Raue House, 25 W. Crystal Lake Avenue, Crystal Lake, IL 60014<br/>
        <strong>Phone:</strong> 815-479-0835<br/>
        <strong>Website:</strong> downtowncl.org
      </p>
    </div>
    <p style="margin:0; font-size:13px; color:#888; line-height:1.5;">
      If you have any questions, contact us at info@crystallakecarshow.com.
    </p>
  `;

  return {
    subject: "Sponsorship Receipt — Crystal Lake Cars & Caffeine",
    html: htmlShell(content),
  };
}

export function sponsorPaymentAdminNotificationEmail(
  sponsor: Sponsor,
  tierName: string,
  amountDollars: string,
  paymentMethod: "stripe" | "check",
  upgradedFrom: string | null,
  adminDetailUrl: string
): { subject: string; html: string } {
  const isCheck = paymentMethod === "check";
  const upgradeNote = upgradedFrom
    ? `<tr>
        <td style="padding:8px 0; font-size:14px; color:#e65100; width:140px;">⬆ Upgraded From</td>
        <td style="padding:8px 0; font-size:14px; color:#e65100; font-weight:600;">${upgradedFrom}</td>
      </tr>`
    : "";

  const content = `
    <h1 style="margin:0 0 16px; font-size:24px; color:#2c2c2c;">
      ${isCheck ? "Sponsor Check Pending" : "Sponsor Payment Received"}
    </h1>
    <p style="margin:0 0 20px; font-size:15px; color:#333; line-height:1.6;">
      ${isCheck
        ? `${sponsor.company} has chosen to pay by check.`
        : `${sponsor.company} has completed their sponsorship payment.`}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888; width:140px;">Company</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${sponsor.company}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888;">Contact</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${sponsor.name} (${sponsor.email})</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888;">Level</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${tierName}</td>
      </tr>
      ${upgradeNote}
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888;">Amount</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c; font-weight:600;">${amountDollars}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888;">Payment Method</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${isCheck ? "Check" : "Credit Card (Stripe)"}</td>
      </tr>
      ${isCheck && sponsor.check_note ? `
      <tr>
        <td style="padding:8px 0; font-size:14px; color:#888;">Check Note</td>
        <td style="padding:8px 0; font-size:14px; color:#2c2c2c;">${sponsor.check_note}</td>
      </tr>
      ` : ""}
    </table>
    <a href="${adminDetailUrl}" style="display:inline-block; padding:12px 24px; background:#c9a84c; color:#2c2c2c; text-decoration:none; font-weight:600; font-size:14px; border-radius:6px;">
      View Sponsor
    </a>
  `;

  return {
    subject: isCheck
      ? `Sponsor Check Pending: ${sponsor.company}`
      : `Sponsor Payment: ${sponsor.company}`,
    html: htmlShell(content),
  };
}
```

- [ ] **Step 2: Add email sending functions**

In `lib/email.ts`, add the new import to the existing imports from `email-templates`:

```typescript
import {
  // ... existing imports ...
  sponsorReceiptEmail,
  sponsorPaymentAdminNotificationEmail,
} from "./email-templates";
```

Add two new functions:

```typescript
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
  const amountDollars = `$${(sponsor.amount_paid / 100).toLocaleString()}`;
  const benefits = tier?.benefits || "";

  const { subject, html } = sponsorReceiptEmail(sponsor as Sponsor, tierName, amountDollars, benefits);

  const result = await sendWithRetry({ from: FROM_EMAIL, to: sponsor.email, subject, html });
  console.log("[sponsor-receipt] Sent to:", sponsor.email, "resend_id:", result.id);
  await logEmail(null, "sponsor_receipt", sponsor.email, subject, result.id ?? null);
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
  const amountDollars = tier ? `$${(tier.price_cents / 100).toLocaleString()}` : `$${(sponsor.amount_paid / 100).toLocaleString()}`;
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
```

- [ ] **Step 3: Extend the Stripe webhook to handle sponsor payments**

In `app/api/webhooks/stripe/route.ts`, add the sponsor import at the top:

```typescript
import { sendSponsorReceipt, sendSponsorPaymentAdminNotification } from "@/lib/email";
```

After the existing `if (registrationIds.length > 0) { ... }` block (around line 117), add the sponsor handling:

```typescript
    // Handle sponsor payments
    const sponsorId = session.metadata?.sponsor_id;
    if (sponsorId) {
      const supabase = createServerClient();

      const { error } = await supabase
        .from("sponsors")
        .update({
          status: "paid",
          amount_paid: session.amount_total,
          paid_at: new Date().toISOString(),
          payment_method: "stripe",
          stripe_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
          ...(session.metadata?.tier_name ? { sponsorship_level: session.metadata.tier_name } : {}),
        })
        .eq("id", sponsorId);

      if (error) {
        console.error("Failed to update sponsor:", error);
        return NextResponse.json({ error: "Failed to update sponsor" }, { status: 500 });
      }

      after(async () => {
        try {
          await sendSponsorReceipt(sponsorId);
        } catch (err) {
          console.error("Sponsor receipt email failed:", err);
        }

        try {
          await sendSponsorPaymentAdminNotification(sponsorId, "stripe");
        } catch (err) {
          console.error("Sponsor payment admin notification failed:", err);
        }
      });
    }
```

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/stripe/route.ts lib/email-templates.ts lib/email.ts
git commit -m "feat: handle sponsor payments in Stripe webhook with receipt and admin emails"
```

---

### Task 10: Sponsor Payment Success Page

**Files:**
- Create: `app/sponsor/pay/success/page.tsx`

- [ ] **Step 1: Create the success/receipt page**

Create `app/sponsor/pay/success/page.tsx`:

This page handles two scenarios:
1. **Stripe payment** — has `session_id` query param, fetches sponsor details via Stripe session
2. **Check payment** — has `method=check` query param with company and level

```typescript
import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";

function LoadingState() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--cream, #f8f5f0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#888" }}>Loading...</p>
    </div>
  );
}

async function SuccessContent({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const sessionId = params.session_id;
  const isCheck = params.method === "check";

  let company = params.company || "";
  let tierName = params.level || "";
  let amountDisplay = "";

  if (sessionId) {
    // Stripe payment — look up sponsor from session metadata
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const sponsorId = session.metadata?.sponsor_id;

    if (sponsorId) {
      const supabase = createServerClient();
      const { data: sponsor } = await supabase
        .from("sponsors")
        .select("company, sponsorship_level, amount_paid")
        .eq("id", sponsorId)
        .single();

      if (sponsor) {
        company = sponsor.company;
        tierName = sponsor.sponsorship_level;
        amountDisplay = `$${(sponsor.amount_paid / 100).toLocaleString()}`;
      }
    }

    if (!amountDisplay && session.amount_total) {
      amountDisplay = `$${(session.amount_total / 100).toLocaleString()}`;
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream, #f8f5f0)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ background: "#2c2c2c", padding: "24px 32px", textAlign: "center", marginBottom: 0 }}>
          <img src="/images/CLCC_Logo2026.png" alt="CLCC Logo" width={50} height={50} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: "#c9a84c", letterSpacing: "0.08em" }}>
            CRYSTAL LAKE CARS & CAFFEINE
          </div>
          <div style={{ fontSize: 11, color: "#a0a0a0", letterSpacing: "0.06em" }}>
            Est. 2021 · Crystal Lake, Illinois
          </div>
        </div>

        {/* Content */}
        <div style={{ background: "#fff", padding: "32px", borderTop: "3px solid #c9a84c" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✓</div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, color: "#2c2c2c", margin: "0 0 8px" }}>
              {isCheck ? "Check Payment Noted" : "Thank You!"}
            </h1>
            <p style={{ fontSize: 16, color: "#666", margin: 0 }}>
              {isCheck
                ? `We've noted your check payment for ${company}.`
                : `Your sponsorship payment for ${company} has been received.`}
            </p>
          </div>

          {/* Payment details */}
          <div style={{ background: "#f8f5f0", padding: 20, marginBottom: 24 }}>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              {company && (
                <tr>
                  <td style={{ padding: "6px 0", fontSize: 14, color: "#888", width: 140 }}>Company</td>
                  <td style={{ padding: "6px 0", fontSize: 14, color: "#2c2c2c", fontWeight: 600 }}>{company}</td>
                </tr>
              )}
              {tierName && (
                <tr>
                  <td style={{ padding: "6px 0", fontSize: 14, color: "#888", width: 140 }}>Sponsorship Level</td>
                  <td style={{ padding: "6px 0", fontSize: 14, color: "#2c2c2c" }}>{tierName}</td>
                </tr>
              )}
              {amountDisplay && (
                <tr>
                  <td style={{ padding: "6px 0", fontSize: 14, color: "#888", width: 140 }}>Amount</td>
                  <td style={{ padding: "6px 0", fontSize: 14, color: "#2c2c2c", fontWeight: 600 }}>{amountDisplay}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: "6px 0", fontSize: 14, color: "#888", width: 140 }}>Payment Method</td>
                <td style={{ padding: "6px 0", fontSize: 14, color: "#2c2c2c" }}>{isCheck ? "Check" : "Credit Card"}</td>
              </tr>
            </table>
          </div>

          {isCheck && (
            <div style={{ background: "#fff3e0", border: "1px solid #ffe0b2", padding: 16, marginBottom: 24, fontSize: 14, color: "#e65100", lineHeight: 1.6 }}>
              <strong>Check Instructions:</strong><br />
              Please make checks payable to <strong>Downtown Crystal Lake / Main Street</strong> and mail to:<br />
              Raue House, 25 W. Crystal Lake Avenue, Crystal Lake, IL 60014
            </div>
          )}

          {/* Tax receipt info */}
          <div style={{ borderLeft: "4px solid #c9a84c", paddingLeft: 16, marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, color: "#2c2c2c", margin: "0 0 8px" }}>
              Tax Receipt Information
            </h2>
            <p style={{ fontSize: 13, color: "#555", lineHeight: 1.8, margin: 0 }}>
              <strong>Organization:</strong> Downtown Crystal Lake / Main Street<br />
              <strong>Type:</strong> 501(c)(3) not-for-profit, founded 1996<br />
              <strong>Address:</strong> Raue House, 25 W. Crystal Lake Avenue, Crystal Lake, IL 60014<br />
              <strong>Phone:</strong> 815-479-0835<br />
              <strong>Website:</strong> downtowncl.org<br />
              <strong>Accreditation:</strong> Main Street America accredited program
            </p>
          </div>

          {/* Event details */}
          <div style={{ textAlign: "center", padding: "16px 0", borderTop: "1px solid #eee" }}>
            <p style={{ fontSize: 14, color: "#888", margin: "0 0 4px" }}>
              Crystal Lake Cars & Caffeine Car Show
            </p>
            <p style={{ fontSize: 14, color: "#2c2c2c", margin: "0 0 4px", fontWeight: 600 }}>
              May 17, 2026 · 7:30 AM – 2:00 PM
            </p>
            <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
              Grant, Brink & Williams Streets · Downtown Crystal Lake, IL
            </p>
          </div>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <a
              href="/"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                background: "#c9a84c",
                color: "#2c2c2c",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SponsorPaySuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  return (
    <Suspense fallback={<LoadingState />}>
      <SuccessContent searchParams={searchParams} />
    </Suspense>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/sponsor/pay/success/page.tsx
git commit -m "feat: add sponsor payment success page with tax receipt details"
```

---

### Task 11: Admin Sponsor Detail Page — Payment Link Section & Stripe Details

**Files:**
- Modify: `app/admin/sponsors/[id]/page.tsx`

- [ ] **Step 1: Add payment link section to sponsor detail page**

In `app/admin/sponsors/[id]/page.tsx`, add state for payment link management:

```typescript
const [paymentToken, setPaymentToken] = useState<string | null>(sponsor?.payment_token || null);
const [paymentUrl, setPaymentUrl] = useState<string | null>(
  sponsor?.payment_token ? `${window.location.origin}/sponsor/pay/${sponsor.payment_token}` : null
);
const [generatingToken, setGeneratingToken] = useState(false);
const [sendingEmail, setSendingEmail] = useState(false);
const [emailSent, setEmailSent] = useState(false);
const [copied, setCopied] = useState(false);
```

Add handlers:

```typescript
const handleGenerateToken = async () => {
  setGeneratingToken(true);
  try {
    const res = await fetch(`/api/sponsors/${sponsor.id}/generate-token`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setPaymentToken(data.token);
    setPaymentUrl(data.paymentUrl);
  } catch (err) {
    alert(err instanceof Error ? err.message : "Failed to generate token");
  } finally {
    setGeneratingToken(false);
  }
};

const handleSendPaymentEmail = async () => {
  setSendingEmail(true);
  try {
    const res = await fetch(`/api/sponsors/${sponsor.id}/send-payment-email`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setEmailSent(true);
  } catch (err) {
    alert(err instanceof Error ? err.message : "Failed to send email");
  } finally {
    setSendingEmail(false);
  }
};

const handleCopyLink = () => {
  if (paymentUrl) {
    navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
};
```

Add a "Payment Link" section in the view mode, after existing detail sections. Use the same card styling (white background, padding, section heading):

```tsx
{/* Payment Link Section */}
<div style={{ background: "var(--white)", padding: "1.5rem", marginBottom: "1.5rem" }}>
  <SectionHeading>Payment Link</SectionHeading>

  {sponsor.status === "paid" ? (
    <p style={{ color: "#2e7d32", fontWeight: 600 }}>Paid via {sponsor.payment_method || "unknown"}</p>
  ) : !paymentToken ? (
    <button onClick={handleGenerateToken} disabled={generatingToken}
      style={{ padding: "0.6rem 1.5rem", background: "var(--gold)", color: "var(--charcoal)", border: "none", fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}>
      {generatingToken ? "Generating..." : "Generate Payment Link"}
    </button>
  ) : (
    <div>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
        <input readOnly value={paymentUrl || ""} style={{ flex: 1, padding: "0.5rem", fontSize: "0.85rem", border: "1px solid #ddd", background: "#f8f5f0" }} />
        <button onClick={handleCopyLink}
          style={{ padding: "0.5rem 1rem", background: copied ? "#2e7d32" : "var(--charcoal)", color: "#fff", border: "none", fontSize: "0.8rem", cursor: "pointer" }}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <button onClick={handleSendPaymentEmail} disabled={sendingEmail}
        style={{ padding: "0.6rem 1.5rem", background: "var(--gold)", color: "var(--charcoal)", border: "none", fontWeight: 600, fontSize: "0.85rem", letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}>
        {sendingEmail ? "Sending..." : emailSent ? "Email Sent ✓" : "Send Payment Email"}
      </button>
    </div>
  )}

  {/* Check pending badge */}
  {sponsor.payment_method === "check" && sponsor.status !== "paid" && (
    <div style={{ marginTop: "1rem", background: "#fff3e0", border: "1px solid #ffe0b2", padding: "0.75rem 1rem", fontSize: "0.85rem", color: "#e65100" }}>
      <strong>Check Pending</strong>
      {sponsor.check_note && <span> — {sponsor.check_note}</span>}
    </div>
  )}

  {/* Upgrade indicator */}
  {sponsor.original_level && sponsor.original_level !== sponsor.sponsorship_level && (
    <div style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "#666" }}>
      Upgraded from <strong>{sponsor.original_level}</strong> → <strong>{sponsor.sponsorship_level}</strong>
    </div>
  )}
</div>
```

- [ ] **Step 2: Add Stripe payment details section**

Add Stripe details state and fetch logic (same pattern as `app/admin/registrations/[id]/page.tsx`):

```typescript
import type { StripePaymentDetails } from "@/types/database";

const [stripeDetails, setStripeDetails] = useState<StripePaymentDetails | null>(null);
const [stripeLoading, setStripeLoading] = useState(false);
const [stripeError, setStripeError] = useState<string | null>(null);

const fetchStripeDetails = useCallback(async (opts: { paymentIntentId?: string; sessionId?: string }) => {
  setStripeLoading(true);
  setStripeError(null);
  try {
    const params = new URLSearchParams();
    if (opts.paymentIntentId) params.set("payment_intent_id", opts.paymentIntentId);
    else if (opts.sessionId) params.set("session_id", opts.sessionId);
    const res = await fetch(`/api/admin/stripe-details?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch Stripe details");
    setStripeDetails(data);
  } catch (err) {
    setStripeError(err instanceof Error ? err.message : "Failed to load payment details");
  } finally {
    setStripeLoading(false);
  }
}, []);

useEffect(() => {
  if (sponsor?.stripe_payment_intent_id) {
    fetchStripeDetails({ paymentIntentId: sponsor.stripe_payment_intent_id });
  } else if (sponsor?.stripe_session_id) {
    fetchStripeDetails({ sessionId: sponsor.stripe_session_id });
  }
}, [sponsor?.stripe_payment_intent_id, sponsor?.stripe_session_id, fetchStripeDetails]);
```

Add the Stripe details display section after the Payment Link section. Mirror the exact layout from the registration detail page — card info, payment date, receipt/dashboard links, billing info, risk level. Use the same `DetailRow` and `formatCard`/`formatAddress` helpers (copy the pattern from registrations).

- [ ] **Step 3: Commit**

```bash
git add app/admin/sponsors/[id]/page.tsx
git commit -m "feat: add payment link management and Stripe details to sponsor admin page"
```

---

### Task 12: Admin Sponsor List Page — Payment Method Indicator

**Files:**
- Modify: `app/admin/sponsors/page.tsx`

- [ ] **Step 1: Add payment method column to sponsor list**

In `app/admin/sponsors/page.tsx`, add a "Payment" column header after the existing "Amount Paid" column:

```tsx
<th style={thStyle}>Payment</th>
```

Add the corresponding table cell in each row:

```tsx
<td style={tdStyle}>
  {s.payment_method === "stripe" ? (
    <span style={{ fontSize: "0.8rem", background: "#e8f5e9", color: "#2e7d32", padding: "2px 8px", borderRadius: 4 }}>
      Card
    </span>
  ) : s.payment_method === "check" ? (
    <span style={{ fontSize: "0.8rem", background: "#fff3e0", color: "#e65100", padding: "2px 8px", borderRadius: 4 }}>
      Check {s.status !== "paid" ? "(pending)" : ""}
    </span>
  ) : (
    <span style={{ fontSize: "0.8rem", color: "#999" }}>—</span>
  )}
</td>
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/sponsors/page.tsx
git commit -m "feat: add payment method indicator to sponsor list"
```

---

### Task 13: End-to-End Testing & Polish

- [ ] **Step 1: Run the SQL migration**

Present the SQL to the user to run in Supabase SQL Editor (from Task 1).

- [ ] **Step 2: Verify the dev server starts**

```bash
npm run dev
```

Check for TypeScript errors. Fix any import issues.

- [ ] **Step 3: Test the tiers admin page**

Navigate to `/admin/sponsors/tiers`. Verify:
- Three seeded tiers appear with correct names, prices, benefits
- Edit a tier, change the price, save — verify it persists
- Add a new tier, verify it appears
- Toggle a tier to hidden, verify it disappears from public endpoints

- [ ] **Step 4: Test the payment link flow**

1. Go to `/admin/sponsors` and pick/create a test sponsor
2. On the detail page, click "Generate Payment Link"
3. Copy the link and open it in an incognito window
4. Verify: sponsor info pre-filled, tier + benefits shown, editable fields work
5. Try upgrading the tier — verify price changes
6. Test "Pay by Check" flow — verify success page shows check instructions
7. Test "Pay with Card" flow — use Stripe test card `4242 4242 4242 4242`
8. Verify success page shows receipt with charity details

- [ ] **Step 5: Test emails**

Verify in Resend dashboard or email log:
- Payment link email sent when admin clicks "Send Payment Email"
- Receipt email sent after Stripe payment
- Admin notification sent after both payment methods
- Upgrade noted in admin notification when sponsor upgrades tier

- [ ] **Step 6: Test admin Stripe details**

After a test Stripe payment, go to the sponsor detail page and verify the Stripe details section shows card info, receipt link, and dashboard link.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "fix: polish and integration fixes for sponsor payment workflow"
```
