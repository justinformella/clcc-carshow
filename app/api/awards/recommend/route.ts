import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createServerClient } from "@/lib/supabase-server";

const OPTIONS_PER_CATEGORY = 3;

type AIRec = { category: string; rank: number; car_number: number; justification: string };

type Recommendation = AIRec & {
  registration_id: string | null;
  vehicle: string;
  color: string | null;
  owner: string;
};

export async function POST() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI not configured" }, { status: 500 });
    }

    const supabase = createServerClient();

    const { data: registrations } = await supabase
      .from("registrations")
      .select("id, car_number, vehicle_year, vehicle_make, vehicle_model, vehicle_color, story, first_name, last_name, award_category")
      .in("payment_status", ["paid", "comped"])
      .order("car_number", { ascending: true });

    const { data: specs } = await supabase
      .from("vehicle_specs")
      .select("*");

    const { data: categoryRows } = await supabase
      .from("award_categories")
      .select("name")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    const activeCategories = (categoryRows ?? []).map((c) => c.name);

    if (!registrations || registrations.length === 0) {
      return NextResponse.json({ error: "No registrations to evaluate" }, { status: 400 });
    }
    if (activeCategories.length === 0) {
      return NextResponse.json({ error: "No active award categories configured" }, { status: 400 });
    }

    const specMap = new Map((specs || []).map((s) => [s.registration_id, s]));

    const vehicleList = registrations.map((r) => {
      const spec = specMap.get(r.id);
      let desc = `#${r.car_number}: ${r.vehicle_year} ${r.vehicle_make} ${r.vehicle_model}`;
      if (r.vehicle_color) desc += ` (${r.vehicle_color})`;
      desc += ` — Owner: ${r.first_name} ${r.last_name}`;
      if (spec) {
        const details = [];
        if (spec.category) details.push(spec.category);
        if (spec.country_of_origin) details.push(spec.country_of_origin);
        if (spec.horsepower) details.push(`${spec.horsepower} HP`);
        if (spec.engine_type) details.push(spec.engine_type);
        if (spec.era) details.push(spec.era);
        if (spec.production_numbers) details.push(`${spec.production_numbers.toLocaleString()} produced`);
        if (spec.notable_features) details.push(`Features: ${spec.notable_features}`);
        if (details.length > 0) desc += ` [${details.join(", ")}]`;
      }
      if (r.story) desc += ` Story: "${r.story}"`;
      return desc;
    }).join("\n");

    const categories = activeCategories.join(", ");

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a car show judge for a charity car show in Crystal Lake, Illinois. For each award category, recommend the TOP ${OPTIONS_PER_CATEGORY} candidates so a human judge can choose.

Award categories: ${categories}

Rules:
- Return exactly ${OPTIONS_PER_CATEGORY} candidates per category, ranked best-first (rank 1 = your top pick).
- Use category names exactly as written above.
- Within a single category, do not list the same vehicle twice.
- A vehicle MAY appear in multiple categories (the human will resolve overlaps when assigning).
- Use the category name to infer eligibility: "Classic (Pre-2000)" = pre-2000; "Modern (2000+)" = 2000 or newer; origin categories like "European Import", "Asian Import", "Japanese", "Domestic" should match the vehicle's country of origin; "in Show"/"of Show" goes to the most impressive overall; "Motorcycle" should be motorcycles only.
- For subjective categories you can't directly verify (interior, vanity plate), pick the vehicles most likely to excel based on type, era, and notable features. Event-day judges make the final call.
- Each candidate needs a brief 1-sentence justification.

Return JSON:
{
  "recommendations": [
    { "category": "category name", "rank": 1, "car_number": 12, "justification": "brief reason" }
  ]
}`,
        },
        {
          role: "user",
          content: `Registered vehicles:\n\n${vehicleList}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const result = JSON.parse(content);

    const enriched: Recommendation[] = (result.recommendations || []).map((rec: AIRec) => {
      const reg = registrations.find((r) => r.car_number === rec.car_number);
      return {
        category: rec.category,
        rank: rec.rank || 1,
        car_number: rec.car_number,
        justification: rec.justification,
        registration_id: reg?.id ?? null,
        vehicle: reg ? `${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}` : "Unknown",
        color: reg?.vehicle_color || null,
        owner: reg ? `${reg.first_name} ${reg.last_name}` : "Unknown",
      };
    });

    enriched.sort((a, b) => {
      if (a.category !== b.category) {
        return activeCategories.indexOf(a.category) - activeCategories.indexOf(b.category);
      }
      return a.rank - b.rank;
    });

    await supabase.from("award_recommendations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (enriched.length > 0) {
      await supabase.from("award_recommendations").insert(
        enriched.map((r) => ({
          category: r.category,
          rank: r.rank,
          car_number: r.car_number,
          registration_id: r.registration_id,
          vehicle: r.vehicle,
          color: r.color,
          owner: r.owner,
          justification: r.justification,
        }))
      );
    }

    return NextResponse.json({ recommendations: enriched });
  } catch (err) {
    console.error("Award recommendation error:", err);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}
