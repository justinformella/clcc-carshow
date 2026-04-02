import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Vercel sends an array of events (JSON format) or single objects (NDJSON)
    const events = Array.isArray(body) ? body : [body];

    const supabase = createServerClient();

    // Group pageviews by date
    const dailyCounts: Record<string, { views: number; sessions: Set<number> }> = {};
    // Group by date+path
    const pathCounts: Record<string, number> = {};
    // Group by date+referrer
    const referrerCounts: Record<string, number> = {};

    for (const event of events) {
      if (event.eventType !== "pageview") continue;
      if (event.vercelEnvironment && event.vercelEnvironment !== "production") continue;

      const date = new Date(event.timestamp).toISOString().split("T")[0];

      // Daily aggregate
      if (!dailyCounts[date]) {
        dailyCounts[date] = { views: 0, sessions: new Set() };
      }
      dailyCounts[date].views++;
      if (event.sessionId) {
        dailyCounts[date].sessions.add(event.sessionId);
      }

      // Per-path
      const path: string = event.path || "/";
      const pathKey = `${date}||${path}`;
      pathCounts[pathKey] = (pathCounts[pathKey] ?? 0) + 1;

      // Per-referrer
      const referrer: string =
        event.referrer && event.referrer.trim() !== "" ? event.referrer.trim() : "Direct";
      const referrerKey = `${date}||${referrer}`;
      referrerCounts[referrerKey] = (referrerCounts[referrerKey] ?? 0) + 1;
    }

    // Upsert daily counts
    for (const [date, data] of Object.entries(dailyCounts)) {
      // Try to increment existing row
      const { data: existing } = await supabase
        .from("page_views")
        .select("id, views, visitors")
        .eq("date", date)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("page_views")
          .update({
            views: existing.views + data.views,
            visitors: existing.visitors + data.sessions.size,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("page_views").insert({
          date,
          views: data.views,
          visitors: data.sessions.size,
        });
      }
    }

    // Upsert per-path counts
    for (const [key, count] of Object.entries(pathCounts)) {
      const [date, path] = key.split("||");
      const { data: existing } = await supabase
        .from("page_view_paths")
        .select("id, views")
        .eq("date", date)
        .eq("path", path)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("page_view_paths")
          .update({ views: existing.views + count })
          .eq("id", existing.id);
      } else {
        await supabase.from("page_view_paths").insert({ date, path, views: count });
      }
    }

    // Upsert per-referrer counts
    for (const [key, count] of Object.entries(referrerCounts)) {
      const [date, referrer] = key.split("||");
      const { data: existing } = await supabase
        .from("page_view_referrers")
        .select("id, visitors")
        .eq("date", date)
        .eq("referrer", referrer)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("page_view_referrers")
          .update({ visitors: existing.visitors + count })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("page_view_referrers")
          .insert({ date, referrer, visitors: count });
      }
    }

    return NextResponse.json({ ok: true, processed: events.length });
  } catch (err) {
    console.error("Analytics drain error:", err);
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}
