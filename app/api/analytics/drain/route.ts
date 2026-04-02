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

    // Upsert daily counts — use device IDs to deduplicate visitors across batches
    for (const [date, data] of Object.entries(dailyCounts)) {
      const { data: existing } = await supabase
        .from("page_views")
        .select("id, views, visitors, seen_devices")
        .eq("date", date)
        .maybeSingle();

      if (existing) {
        // Merge new device IDs with previously seen ones
        const previousDevices: string[] = existing.seen_devices || [];
        const previousSet = new Set(previousDevices);
        let newVisitors = 0;
        for (const deviceId of data.deviceIds) {
          if (!previousSet.has(deviceId)) {
            previousSet.add(deviceId);
            newVisitors++;
          }
        }

        await supabase
          .from("page_views")
          .update({
            views: existing.views + data.views,
            visitors: existing.visitors + newVisitors,
            seen_devices: Array.from(previousSet),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("page_views").insert({
          date,
          views: data.views,
          visitors: data.deviceIds.size,
          seen_devices: Array.from(data.deviceIds),
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
