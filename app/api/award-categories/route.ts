import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createServerClient } from "@/lib/supabase-server";
import { getCurrentEvent, getEventByYear, resolveEvent } from "@/lib/events";

// Award categories are per event. GET takes an optional `?event=<id>` (admin)
// or `?year=<yyyy>` (public pages showing a specific show); default is the
// current event. Writes only touch the current event's categories.

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const searchParams = request.nextUrl.searchParams;
  const activeOnly = searchParams.get("activeOnly") === "true";

  let eventId: string;
  try {
    const yearParam = searchParams.get("year");
    const year = yearParam && /^\d{4}$/.test(yearParam) ? parseInt(yearParam, 10) : null;
    const byYear = year ? await getEventByYear(supabase, year) : null;
    eventId = (byYear ?? (await resolveEvent(supabase, searchParams.get("event")))).id;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  let query = supabase
    .from("award_categories")
    .select("*")
    .eq("event_id", eventId)
    .order("display_order", { ascending: true });

  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerClient();
  const body = await request.json();
  const { name, display_order, is_active } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  let current;
  try {
    current = await getCurrentEvent(supabase);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
  if (body.event_id && body.event_id !== current.id) {
    return NextResponse.json({ error: "Past shows are read only" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("award_categories")
    .insert({
      event_id: current.id,
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
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerClient();
  const body = await request.json();
  const { id, name, display_order, is_active } = body;

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = String(name).trim();
  if (display_order !== undefined) updates.display_order = display_order;
  if (is_active !== undefined) updates.is_active = is_active;

  const readOnlyError = await rejectPastEventCategory(supabase, id);
  if (readOnlyError) return readOnlyError;

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
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerClient();
  const id = request.nextUrl.searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const readOnlyError = await rejectPastEventCategory(supabase, id);
  if (readOnlyError) return readOnlyError;

  // If any registration in this category's show currently holds this award,
  // clear it before deleting the category. Other years keep their winners.
  const { data: category } = await supabase
    .from("award_categories")
    .select("name, event_id")
    .eq("id", id)
    .single();

  if (category?.name && category.event_id) {
    await supabase
      .from("registrations")
      .update({ award_category: null })
      .eq("event_id", category.event_id)
      .eq("award_category", category.name);
  }

  const { error } = await supabase.from("award_categories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Categories belonging to a past show can't be changed.
async function rejectPastEventCategory(
  supabase: ReturnType<typeof createServerClient>,
  id: string
): Promise<NextResponse | null> {
  const { data: category } = await supabase
    .from("award_categories")
    .select("event_id")
    .eq("id", id)
    .maybeSingle();
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  try {
    const current = await getCurrentEvent(supabase);
    if (category.event_id !== current.id) {
      return NextResponse.json({ error: "Past shows are read only" }, { status: 403 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
  return null;
}
