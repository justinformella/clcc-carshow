import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase-server";
import {
  REGISTRATION_PRICE_CENTS,
  MAX_REGISTRATIONS,
  MAX_VEHICLES_PER_CHECKOUT,
} from "@/types/database";

type VehicleInput = {
  vehicle_year: number;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color?: string;
  engine_specs?: string;
  modifications?: string;
  story?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      first_name,
      last_name,
      email,
      phone,
      hometown,
      utm_source,
      utm_medium,
      utm_campaign,
    } = body;

    // Validate required owner fields
    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { error: "Please fill in all required fields." },
        { status: 400 }
      );
    }

    // Support both new multi-vehicle format and legacy single-vehicle format
    let vehicles: VehicleInput[];
    if (Array.isArray(body.vehicles) && body.vehicles.length > 0) {
      vehicles = body.vehicles;
    } else if (body.vehicle_year && body.vehicle_make && body.vehicle_model) {
      // Legacy single-vehicle format
      vehicles = [
        {
          vehicle_year: body.vehicle_year,
          vehicle_make: body.vehicle_make,
          vehicle_model: body.vehicle_model,
          vehicle_color: body.vehicle_color,
          engine_specs: body.engine_specs,
          modifications: body.modifications,
          story: body.story,
        },
      ];
    } else {
      return NextResponse.json(
        { error: "Please fill in all required vehicle fields." },
        { status: 400 }
      );
    }

    // Validate vehicle count
    if (vehicles.length > MAX_VEHICLES_PER_CHECKOUT) {
      return NextResponse.json(
        { error: `You can register at most ${MAX_VEHICLES_PER_CHECKOUT} vehicles at once.` },
        { status: 400 }
      );
    }

    // Validate required fields per vehicle
    for (const v of vehicles) {
      if (!v.vehicle_year || !v.vehicle_make || !v.vehicle_model) {
        return NextResponse.json(
          { error: "Please fill in year, make, and model for every vehicle." },
          { status: 400 }
        );
      }
    }

    const supabase = createServerClient();

    // Check capacity
    const { count } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "paid");

    const paidCount = count || 0;
    const spotsRemaining = MAX_REGISTRATIONS - paidCount;

    if (spotsRemaining <= 0) {
      return NextResponse.json(
        { error: "Registration is full. All spots have been taken." },
        { status: 400 }
      );
    }

    if (vehicles.length > spotsRemaining) {
      return NextResponse.json(
        {
          error:
            spotsRemaining === 1
              ? "Only 1 spot remaining. Please register a single vehicle."
              : `Only ${spotsRemaining} spots remaining. Please reduce to ${spotsRemaining} vehicle(s).`,
        },
        { status: 400 }
      );
    }

    // Build rows to insert
    const rows = vehicles.map((v) => ({
      first_name,
      last_name,
      email,
      phone: phone || null,
      hometown: hometown || null,
      vehicle_year: v.vehicle_year,
      vehicle_make: v.vehicle_make,
      vehicle_model: v.vehicle_model,
      vehicle_color: v.vehicle_color || null,
      engine_specs: v.engine_specs || null,
      modifications: v.modifications || null,
      story: v.story || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      payment_status: "pending",
    }));

    // Insert all registration rows
    const { data: registrations, error: insertError } = await supabase
      .from("registrations")
      .insert(rows)
      .select();

    if (insertError || !registrations || registrations.length === 0) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json(
        { error: `Failed to save registration: ${insertError?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // Create Stripe Checkout Session with one line item per vehicle
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const lineItems = registrations.map((reg) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: "CLCC Car Show Registration",
          description: `${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`,
        },
        unit_amount: REGISTRATION_PRICE_CENTS,
      },
      quantity: 1,
    }));

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${siteUrl}/register/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/register/cancel`,
      customer_email: email,
      metadata: {
        registration_ids: registrations.map((r) => r.id).join(","),
      },
    });

    // Update all registration rows with the Stripe session ID
    const regIds = registrations.map((r) => r.id);
    await supabase
      .from("registrations")
      .update({ stripe_session_id: session.id })
      .in("id", regIds);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
