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
