import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServerClient } from "@/lib/supabase-server";

const SPEC_SCHEMA = {
  body_style: "coupe, sedan, convertible, truck, SUV, wagon, hatchback, roadster, van, or other",
  country_of_origin: "American, Japanese, German, Italian, British, Korean, Swedish, French, or other",
  category: "muscle car, sports car, luxury, classic, exotic, truck, hot rod, import tuner, pony car, grand tourer, economy, or other",
  cylinders: "number of cylinders (integer), 0 for electric",
  displacement_liters: "engine displacement in liters (decimal), 0 for electric",
  horsepower: "estimated stock horsepower (integer)",
  drive_type: "RWD, FWD, AWD, or 4WD",
  engine_type: "V8, V6, V10, V12, Inline-4, Inline-6, Flat-4, Flat-6, Rotary, Electric, or other",
  weight_lbs: "curb weight in pounds (integer)",
  original_msrp: "original MSRP in USD when new (integer, inflation-adjusted is NOT needed — use the actual sticker price)",
  production_numbers: "approximate total production numbers for this specific year/model, 0 if unknown",
  era: "Pre-War, Classic 50s, Muscle Era, Malaise Era, Modern Classic, Contemporary",
  notable_features: "comma-separated list of 2-4 notable features like pop-up headlights, T-tops, gullwing doors, etc.",
};

export async function POST(request: NextRequest) {
  try {
    const { registration_id, batch } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const supabase = createServerClient();
    const openai = new OpenAI({ apiKey });

    // Get registrations to enrich
    let registrations;
    if (batch) {
      // Batch mode: enrich all registrations that don't have specs yet
      const { data } = await supabase
        .from("registrations")
        .select("id, vehicle_year, vehicle_make, vehicle_model")
        .in("payment_status", ["paid", "comped"])
        .order("car_number", { ascending: true });

      const { data: existingSpecs } = await supabase
        .from("vehicle_specs")
        .select("registration_id");

      const enrichedIds = new Set((existingSpecs || []).map((s) => s.registration_id));
      registrations = (data || []).filter((r) => !enrichedIds.has(r.id));
    } else if (registration_id) {
      const { data } = await supabase
        .from("registrations")
        .select("id, vehicle_year, vehicle_make, vehicle_model")
        .eq("id", registration_id)
        .single();

      registrations = data ? [data] : [];
    } else {
      return NextResponse.json({ error: "Provide registration_id or batch: true" }, { status: 400 });
    }

    if (registrations.length === 0) {
      return NextResponse.json({ enriched: 0, message: "Nothing to enrich" });
    }

    let enriched = 0;
    const errors: string[] = [];

    for (const reg of registrations) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are a car encyclopedia. Given a vehicle year, make, and model, return a JSON object with estimated specs. Use your best knowledge for the most common variant of that model year. Return ONLY valid JSON with these fields:\n${Object.entries(SPEC_SCHEMA).map(([k, v]) => `  "${k}": ${v}`).join("\n")}`,
            },
            {
              role: "user",
              content: `${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`,
            },
          ],
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          errors.push(`${reg.id}: No response`);
          continue;
        }

        const specs = JSON.parse(content);

        await supabase.from("vehicle_specs").upsert({
          registration_id: reg.id,
          body_style: specs.body_style || null,
          country_of_origin: specs.country_of_origin || null,
          category: specs.category || null,
          cylinders: specs.cylinders != null ? Number(specs.cylinders) : null,
          displacement_liters: specs.displacement_liters != null ? Number(specs.displacement_liters) : null,
          horsepower: specs.horsepower != null ? Number(specs.horsepower) : null,
          drive_type: specs.drive_type || null,
          engine_type: specs.engine_type || null,
          weight_lbs: specs.weight_lbs != null ? Number(specs.weight_lbs) : null,
          original_msrp: specs.original_msrp != null ? Number(specs.original_msrp) : null,
          production_numbers: specs.production_numbers != null ? Number(specs.production_numbers) : null,
          era: specs.era || null,
          notable_features: specs.notable_features || null,
        }, { onConflict: "registration_id" });

        enriched++;
      } catch (err) {
        errors.push(`${reg.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({ enriched, total: registrations.length, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    console.error("Enrich error:", err);
    return NextResponse.json({ error: "Failed to enrich" }, { status: 500 });
  }
}
