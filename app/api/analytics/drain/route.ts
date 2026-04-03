import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const events = Array.isArray(body) ? body : [body];
    const supabase = createServerClient();

    // Group pageviews by date
    const dailyCounts: Record<string, { views: number; deviceIds: Set<string> }> = {};
    const pathCounts: Record<string, number> = {};
    const referrerCounts: Record<string, number> = {};

    for (const event of events) {
      if (event.eventType !== "pageview") continue;
      if (event.vercelEnvironment && event.vercelEnvironment !== "production") continue;

      const date = new Date(event.timestamp).toISOString().split("T")[0];

      if (!dailyCounts[date]) {
        dailyCounts[date] = { views: 0, deviceIds: new Set() };
      }
      dailyCounts[date].views++;
      // Use deviceId for visitor deduplication (more stable than sessionId)
      const deviceKey = String(event.deviceId || event.sessionId || "");
      if (deviceKey) {
        dailyCounts[date].deviceIds.add(deviceKey);
      }

      const path: string = event.path || "/";
      const pathKey = `${date}||${path}`;
      pathCounts[pathKey] = (pathCounts[pathKey] ?? 0) + 1;

      const referrer: string =
        event.referrer && event.referrer.trim() !== "" ? event.referrer.trim() : "Direct";
      const referrerKey = `${date}||${referrer}`;
      referrerCounts[referrerKey] = (referrerCounts[referrerKey] ?? 0) + 1;
    }

    // Atomic upsert daily counts — row-level lock prevents concurrent batch races
    for (const [date, data] of Object.entries(dailyCounts)) {
      const deviceIds = Array.from(data.deviceIds);
      await supabase.rpc("upsert_page_views", {
        p_date: date,
        p_views: data.views,
        p_device_ids: deviceIds,
      });
    }

    // Atomic upsert per-path counts
    for (const [key, count] of Object.entries(pathCounts)) {
      const [date, path] = key.split("||");
      await supabase.rpc("upsert_page_view_paths", {
        p_date: date,
        p_path: path,
        p_views: count,
      });
    }

    // Atomic upsert per-referrer counts
    for (const [key, count] of Object.entries(referrerCounts)) {
      const [date, referrer] = key.split("||");
      await supabase.rpc("upsert_page_view_referrers", {
        p_date: date,
        p_referrer: referrer,
        p_visitors: count,
      });
    }

    return NextResponse.json({ ok: true, processed: events.length });
  } catch (err) {
    console.error("Analytics drain error:", err);
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}
