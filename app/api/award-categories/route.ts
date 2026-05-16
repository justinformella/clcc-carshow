import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "true";

  let query = supabase
    .from("award_categories")
    .select("*")
    .order("display_order", { ascending: true });

  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data });
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();
  const { name, display_order, is_active } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("award_categories")
    .insert({
      name: name.trim(),
      display_order: display_order ?? 0,
      is_active: is_active ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();
  const { id, name, display_order, is_active } = body;

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = String(name).trim();
  if (display_order !== undefined) updates.display_order = display_order;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from("award_categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerClient();
  const id = request.nextUrl.searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // If any registration currently holds this award, clear it before deleting the category.
  const { data: category } = await supabase
    .from("award_categories")
    .select("name")
    .eq("id", id)
    .single();

  if (category?.name) {
    await supabase
      .from("registrations")
      .update({ award_category: null })
      .eq("award_category", category.name);
  }

  const { error } = await supabase.from("award_categories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
