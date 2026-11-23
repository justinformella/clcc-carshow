import type { SupabaseClient } from "@supabase/supabase-js";

// One row per car show. Event-scoped tables (registrations, sponsors,
// show_expenses, award_recommendations, award_categories, sponsorship_tiers,
// promo_codes, ad_campaigns, help_requests) carry an event_id. New rows
// default to the current event in the database, so code that forgets to
// set event_id still lands in the right year.
export type ShowEvent = {
  id: string;
  year: number;
  name: string;
  event_date: string; // YYYY-MM-DD
  rain_date: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  registration_price_cents: number;
  charity_goal_cents: number | null;
  is_current: boolean;
};

const EVENT_COLUMNS =
  "id, year, name, event_date, rain_date, registration_opens_at, registration_closes_at, registration_price_cents, charity_goal_cents, is_current";

export async function fetchEvents(supabase: SupabaseClient): Promise<ShowEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .order("year", { ascending: false });
  if (error) throw new Error(`Failed to load events: ${error.message}`);
  return (data ?? []) as ShowEvent[];
}

export async function getCurrentEvent(supabase: SupabaseClient): Promise<ShowEvent> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("is_current", true)
    .single();
  if (error || !data) throw new Error(`No current event: ${error?.message ?? "none marked current"}`);
  return data as ShowEvent;
}

export async function getEventByYear(supabase: SupabaseClient, year: number): Promise<ShowEvent | null> {
  const { data } = await supabase.from("events").select(EVENT_COLUMNS).eq("year", year).maybeSingle();
  return (data as ShowEvent) ?? null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * For API routes that accept an optional `?event=<id>` from the admin.
 * Returns that event if it exists, otherwise the current event.
 */
export async function resolveEvent(
  supabase: SupabaseClient,
  requestedId: string | null | undefined
): Promise<ShowEvent> {
  if (requestedId && UUID_RE.test(requestedId)) {
    const { data } = await supabase.from("events").select(EVENT_COLUMNS).eq("id", requestedId).maybeSingle();
    if (data) return data as ShowEvent;
  }
  return getCurrentEvent(supabase);
}
