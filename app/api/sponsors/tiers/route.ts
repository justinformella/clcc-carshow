import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { resolveEvent } from "@/lib/events";

// GET: List all tiers (admin — includes inactive). Accepts ?event=<id>, defaults to current.
export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const event = await resolveEvent(supabase, request.nextUrl.searchParams.get("event"));
  const { data, error } = await supabase
    .from("sponsorship_tiers")
    .select("*")
    .eq("event_id", event.id)
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
  // Event from body.event_id or ?event=<id>; defaults to the current event
  const event = await resolveEvent(supabase, body.event_id ?? request.nextUrl.searchParams.get("event"));

  if (!name || price_cents == null) {
    return NextResponse.json({ error: "Name and price are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sponsorship_tiers")
    .insert({ event_id: event.id, name, price_cents, benefits: benefits || "", display_order: display_order || 0, is_active: is_active ?? true })
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, event_id: _ignoredEventId, ...updates } = body;

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
