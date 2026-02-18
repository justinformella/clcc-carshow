import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing session_id parameter" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("registrations")
    .select("car_number, vehicle_year, vehicle_make, vehicle_model, donation_cents")
    .eq("stripe_session_id", sessionId)
    .order("car_number", { ascending: true });

  if (error) {
    console.error("Failed to fetch registrations by session:", error);
    return NextResponse.json(
      { error: "Failed to fetch registrations" },
      { status: 500 }
    );
  }

  const vehicles = data || [];
  const donationCents = vehicles.reduce(
    (sum: number, v: { donation_cents?: number }) => sum + (v.donation_cents || 0),
    0
  );

  return NextResponse.json({ vehicles, donation_cents: donationCents });
}
