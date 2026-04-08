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
