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
    .select("car_number, vehicle_year, vehicle_make, vehicle_model")
    .eq("stripe_session_id", sessionId)
    .order("car_number", { ascending: true });

  if (error) {
    console.error("Failed to fetch registrations by session:", error);
    return NextResponse.json(
      { error: "Failed to fetch registrations" },
      { status: 500 }
    );
  }

  return NextResponse.json({ vehicles: data || [] });
}
