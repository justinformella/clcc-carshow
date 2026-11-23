import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createServerClient } from "@/lib/supabase-server";
import OpenAI from "openai";
import { fetchEvents, resolveEvent } from "@/lib/events";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface InsightsResult {
  trend: "improving" | "declining" | "stable";
  insights: string[];
  recommendations: string[];
  cached_at: string;
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = createServerClient();
    const ev = await resolveEvent(supabase, new URL(request.url).searchParams.get("event"));
    // Insights are cached per event so 2026 and 2027 never share a result
    const cacheKey = `analytics_insights_cache:${ev.id}`;

    // 1. Check cache in app_settings
    const { data: cacheRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", cacheKey)
      .maybeSingle();

    if (cacheRow?.value) {
      try {
        const cached: InsightsResult =
          typeof cacheRow.value === "string"
            ? JSON.parse(cacheRow.value)
            : cacheRow.value;
        if (cached.cached_at) {
          const age = Date.now() - new Date(cached.cached_at).getTime();
          if (age < CACHE_TTL_MS) {
            return NextResponse.json(cached);
          }
        }
      } catch {
        // Invalid cache — continue to regenerate
      }
    }

    // 2. Fetch 30 days of page_views (no event_id; scoped by date). Window
    // ends now for the current show, or the day after show day for a past
    // show, and never starts before the day after the previous show.
    const showEnd = new Date(ev.event_date + "T00:00:00");
    showEnd.setDate(showEnd.getDate() + 1);
    const windowEnd = ev.is_current ? new Date() : new Date(Math.min(Date.now(), showEnd.getTime()));
    let windowStart = new Date(windowEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prevEvent = (await fetchEvents(supabase)).find((e) => e.year < ev.year);
    if (prevEvent) {
      const seasonStart = new Date(prevEvent.event_date + "T00:00:00");
      seasonStart.setDate(seasonStart.getDate() + 1);
      if (seasonStart > windowStart) windowStart = seasonStart;
    }
    const thirtyDaysAgo = windowStart.toISOString().split("T")[0];
    const windowEndDate = windowEnd.toISOString().split("T")[0];

    const { data: pageViews } = await supabase
      .from("page_views")
      .select("date, views, visitors")
      .gte("date", thirtyDaysAgo)
      .lte("date", windowEndDate)
      .order("date", { ascending: true });

    // 3. Fetch this event's paid registrations in the same window, grouped by date
    const { data: regRows } = await supabase
      .from("registrations")
      .select("paid_at")
      .eq("event_id", ev.id)
      .in("payment_status", ["paid", "comped"])
      .not("paid_at", "is", null)
      .gte("paid_at", windowStart.toISOString())
      .lte("paid_at", windowEnd.toISOString());

    // Group registrations by date
    const regByDate: Record<string, number> = {};
    for (const row of regRows ?? []) {
      const d = new Date(row.paid_at).toISOString().split("T")[0];
      regByDate[d] = (regByDate[d] ?? 0) + 1;
    }

    // 4. Total registration count + max_registrations from app_settings
    const { count: totalRegs } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", ev.id)
      .in("payment_status", ["paid", "comped"])
      .not("paid_at", "is", null);

    const { data: maxRegRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "max_registrations")
      .maybeSingle();

    const maxRegs = maxRegRow?.value ? Number(maxRegRow.value) : 200;

    // Build combined daily data
    const allDates = new Set<string>([
      ...(pageViews ?? []).map((r) => r.date),
      ...Object.keys(regByDate),
    ]);

    const dailyData = Array.from(allDates)
      .sort()
      .map((date) => {
        const pv = (pageViews ?? []).find((r) => r.date === date);
        return {
          date,
          views: pv?.views ?? 0,
          visitors: pv?.visitors ?? 0,
          registrations: regByDate[date] ?? 0,
        };
      });

    // Days until event
    const eventDate = new Date(ev.event_date + "T12:00:00");
    const eventDateLabel = eventDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const daysAway = Math.ceil(
      (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const daysLabel = daysAway >= 0 ? `${daysAway} days away` : `took place ${-daysAway} days ago`;

    // 5. Build prompt
    const prompt = `You are an analytics advisor for a charity car show event (Crystal Lake Cars & Caffeine, ${eventDateLabel}).

Here is the daily website traffic and registration data:
${JSON.stringify(dailyData)}

Current total registrations: ${totalRegs ?? 0} of ${maxRegs} max capacity.
Event date: ${eventDateLabel} (${daysLabel}).

Provide:
1. TREND: One word — "improving", "declining", or "stable"
2. INSIGHTS: 3-5 bullet points about what the data shows
3. RECOMMENDATIONS: 1-2 specific actionable recommendations

Respond ONLY with valid JSON, no markdown:
{"trend":"...","insights":["..."],"recommendations":["..."]}`;

    let result: Omit<InsightsResult, "cached_at"> | null = null;

    // 5. Try Gemini first
    const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const text: string =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          // Strip markdown code fences if present
          const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
          result = JSON.parse(cleaned);
        }
      } catch (err) {
        console.error("Gemini insights error:", err);
      }
    }

    // 6. Fall back to OpenAI if Gemini failed
    if (!result) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const text = completion.choices[0].message.content ?? "{}";
      result = JSON.parse(text);
    }

    if (!result) {
      return NextResponse.json(
        { error: "Failed to generate insights" },
        { status: 502 }
      );
    }

    const finalResult: InsightsResult = {
      ...result,
      cached_at: new Date().toISOString(),
    };

    // 7. Cache the result in app_settings
    await supabase.from("app_settings").upsert(
      { key: cacheKey, value: JSON.stringify(finalResult) },
      { onConflict: "key" }
    );

    return NextResponse.json(finalResult);
  } catch (err) {
    console.error("Analytics insights error:", err);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
