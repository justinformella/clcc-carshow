import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createServerClient } from "@/lib/supabase-server";
import { AWARD_CATEGORIES } from "@/types/database";

type Recommendation = {
  category: string;
  car_number: number;
  justification: string;
  registration_id?: string;
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

    // Fetch all active registrations with their specs
    const { data: registrations } = await supabase
      .from("registrations")
      .select("id, car_number, vehicle_year, vehicle_make, vehicle_model, vehicle_color, story, first_name, last_name, award_category")
      .in("payment_status", ["paid", "comped"])
      .order("car_number", { ascending: true });

    const { data: specs } = await supabase
      .from("vehicle_specs")
      .select("*");

    if (!registrations || registrations.length === 0) {
      return NextResponse.json({ error: "No registrations to evaluate" }, { status: 400 });
    }

    const specMap = new Map((specs || []).map((s) => [s.registration_id, s]));

    // Build vehicle descriptions for GPT
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

    const categories = AWARD_CATEGORIES.join(", ");

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a car show judge for a charity car show in Crystal Lake, Illinois. You need to recommend ONE winner for each award category based on the registered vehicles.

Award categories: ${categories}

Rules:
- Each vehicle can only win ONE award (no duplicates)
- "Best of Show" should go to the most impressive overall vehicle
- "Best Classic (Pre-2000)" must be a pre-2000 vehicle
- "Best Modern (2000+)" must be a 2000 or newer vehicle
- "Best European" must be from a European country
- "Best Japanese" must be from a Japanese manufacturer
- "Best Domestic" must be an American-made vehicle
- "Best Vanity Plate", "Best Interior", and "Best Custom" — since you can't see these, pick the vehicle most likely to excel in that category based on its type, era, and features. Note that these are more subjective and event-day judges will make the final call.
- For each recommendation, provide a brief 1-sentence justification

Return JSON with this structure:
{
  "recommendations": [
    {
      "category": "category name",
      "car_number": number,
      "justification": "brief reason"
    }
  ]
}`,
        },
        {
          role: "user",
          content: `Here are the registered vehicles:\n\n${vehicleList}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const result = JSON.parse(content);

    // Enrich recommendations with full vehicle data
    const enriched = (result.recommendations || []).map((rec: { category: string; car_number: number; justification: string }) => {
      const reg = registrations.find((r) => r.car_number === rec.car_number);
      return {
        ...rec,
        registration_id: reg?.id,
        vehicle: reg ? `${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}` : "Unknown",
        color: reg?.vehicle_color || null,
        owner: reg ? `${reg.first_name} ${reg.last_name}` : "Unknown",
      };
    });

    // Save to DB — clear old recommendations first
    await supabase.from("award_recommendations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (enriched.length > 0) {
      await supabase.from("award_recommendations").insert(
        enriched.map((r: Recommendation) => ({
          category: r.category,
          car_number: r.car_number,
          registration_id: r.registration_id || null,
          vehicle: r.vehicle,
          color: r.color || null,
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
