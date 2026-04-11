import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, sponsor_id, name, company, email, phone, website, selected_level, donation_cents } = body;

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

  const donationCents = typeof donation_cents === "number" && donation_cents > 0 ? donation_cents : 0;

  const lineItems: Array<{ price_data: { currency: string; product_data: { name: string; description?: string }; unit_amount: number }; quantity: number }> = [
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
  ];

  if (donationCents > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Additional Donation — Crystal Lake Cars & Caffeine",
        },
        unit_amount: donationCents,
      },
      quantity: 1,
    });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    customer_email: email,
    metadata: {
      sponsor_id,
      payment_token: token,
      tier_name: selected_level,
      donation_cents: String(donationCents),
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
