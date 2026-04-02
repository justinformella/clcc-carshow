import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import OpenAI from "openai";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface InsightsResult {
  trend: "improving" | "declining" | "stable";
  insights: string[];
  recommendations: string[];
  cached_at: string;
}

export async function POST() {
  try {
    const supabase = createServerClient();

    // 1. Check cache in app_settings
    const { data: cacheRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "analytics_insights_cache")
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

    // 2. Fetch last 30 days of page_views
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const { data: pageViews } = await supabase
      .from("page_views")
      .select("date, views, visitors")
      .gte("date", thirtyDaysAgo)
      .order("date", { ascending: true });

    // 3. Fetch last 30 days of paid registrations grouped by date
    const { data: regRows } = await supabase
      .from("registrations")
      .select("paid_at")
      .in("payment_status", ["paid", "comped"])
      .not("paid_at", "is", null)
      .gte("paid_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

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
    const eventDate = new Date("2026-05-17");
    const daysAway = Math.ceil(
      (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // 5. Build prompt
    const prompt = `You are an analytics advisor for a charity car show event (Crystal Lake Cars & Caffeine, May 17, 2026).

Here is the daily website traffic and registration data:
${JSON.stringify(dailyData)}

Current total registrations: ${totalRegs ?? 0} of ${maxRegs} max capacity.
Event date: May 17, 2026 (${daysAway} days away).

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
      { key: "analytics_insights_cache", value: JSON.stringify(finalResult) },
      { onConflict: "key" }
    );

    return NextResponse.json(finalResult);
  } catch (err) {
    console.error("Analytics insights error:", err);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
