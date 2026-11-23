import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { resolveEvent } from "@/lib/events";

// GET: List active tiers (public — for payment page and inquiry form)
// Defaults to the current event; accepts ?event=<id> (e.g. a sponsor's own event).
export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const event = await resolveEvent(supabase, request.nextUrl.searchParams.get("event"));
  const { data, error } = await supabase
    .from("sponsorship_tiers")
    .select("id, name, price_cents, benefits, display_order")
    .eq("event_id", event.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tiers: data });
}
