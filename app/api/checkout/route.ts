import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase-server";
import { REGISTRATION_PRICE_CENTS, MAX_REGISTRATIONS } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      first_name,
      last_name,
      email,
      phone,
      hometown,
      vehicle_year,
      vehicle_make,
      vehicle_model,
      vehicle_color,
      engine_specs,
      modifications,
      story,
      utm_source,
      utm_medium,
      utm_campaign,
    } = body;

    // Validate required fields
    if (
      !first_name ||
      !last_name ||
      !email ||
      !vehicle_year ||
      !vehicle_make ||
      !vehicle_model
    ) {
      return NextResponse.json(
        { error: "Please fill in all required fields." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check capacity
    const { count } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "paid");

    if ((count || 0) >= MAX_REGISTRATIONS) {
      return NextResponse.json(
        { error: "Registration is full. All spots have been taken." },
        { status: 400 }
      );
    }

    // Save registration with pending status
    const { data: registration, error: insertError } = await supabase
      .from("registrations")
      .insert({
        first_name,
        last_name,
        email,
        phone: phone || null,
        hometown: hometown || null,
        vehicle_year,
        vehicle_make,
        vehicle_model,
        vehicle_color: vehicle_color || null,
        engine_specs: engine_specs || null,
        modifications: modifications || null,
        story: story || null,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        payment_status: "pending",
      })
      .select()
      .single();

    if (insertError || !registration) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json(
        { error: `Failed to save registration: ${insertError?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // Create Stripe Checkout Session
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "CLCC Car Show Registration",
              description: `${vehicle_year} ${vehicle_make} ${vehicle_model}`,
            },
            unit_amount: REGISTRATION_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${siteUrl}/register/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/register/cancel?registration_id=${registration.id}`,
      customer_email: email,
      metadata: {
        registration_id: registration.id,
      },
    });

    // Update registration with Stripe session ID
    await supabase
      .from("registrations")
      .update({ stripe_session_id: session.id })
      .eq("id", registration.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
