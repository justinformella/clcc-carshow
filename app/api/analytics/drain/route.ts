import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const events = Array.isArray(body) ? body : [body];
    const supabase = createServerClient();

    // Store raw events (UTC timestamps) for accurate timezone-aware aggregation
    const rawRows: { timestamp: string; path: string; referrer: string | null; device_id: string | null; session_id: string | null }[] = [];

    // Also maintain legacy daily aggregation tables
    const dailyCounts: Record<string, { views: number; deviceIds: Set<string> }> = {};
    const pathCounts: Record<string, number> = {};
    const referrerCounts: Record<string, number> = {};

    for (const event of events) {
      if (event.eventType !== "pageview") continue;
      if (event.vercelEnvironment && event.vercelEnvironment !== "production") continue;

      const ts = event.timestamp || new Date().toISOString();
      const path: string = event.path || "/";
      const referrer: string | null =
        event.referrer && event.referrer.trim() !== "" ? event.referrer.trim() : null;
      const deviceId = event.deviceId ? String(event.deviceId) : null;
      const sessionId = event.sessionId ? String(event.sessionId) : null;

      // Raw event
      rawRows.push({ timestamp: ts, path, referrer, device_id: deviceId, session_id: sessionId });

      // Legacy aggregation (keep using UTC for existing data consistency)
      const date = new Date(ts).toISOString().split("T")[0];

      if (!dailyCounts[date]) {
        dailyCounts[date] = { views: 0, deviceIds: new Set() };
      }
      dailyCounts[date].views++;
      const deviceKey = String(deviceId || sessionId || "");
      if (deviceKey) {
        dailyCounts[date].deviceIds.add(deviceKey);
      }

      const pathKey = `${date}||${path}`;
      pathCounts[pathKey] = (pathCounts[pathKey] ?? 0) + 1;

      const referrerDisplay = referrer || "Direct";
      const referrerKey = `${date}||${referrerDisplay}`;
      referrerCounts[referrerKey] = (referrerCounts[referrerKey] ?? 0) + 1;
    }

    // Insert raw events in batch
    if (rawRows.length > 0) {
      await supabase.from("page_view_events").insert(rawRows);
    }

    // Legacy: Atomic upsert daily counts
    for (const [date, data] of Object.entries(dailyCounts)) {
      const deviceIds = Array.from(data.deviceIds);
      await supabase.rpc("upsert_page_views", {
        p_date: date,
        p_views: data.views,
        p_device_ids: deviceIds,
      });
    }

    // Legacy: Atomic upsert per-path counts
    for (const [key, count] of Object.entries(pathCounts)) {
      const [date, path] = key.split("||");
      await supabase.rpc("upsert_page_view_paths", {
        p_date: date,
        p_path: path,
        p_views: count,
      });
    }

    // Legacy: Atomic upsert per-referrer counts
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
