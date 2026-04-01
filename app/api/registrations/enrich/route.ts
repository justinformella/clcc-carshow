import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServerClient } from "@/lib/supabase-server";

const SPEC_SCHEMA = {
  body_style: "Title Case. One of: Coupe, Sedan, Convertible, Truck, SUV, Wagon, Hatchback, Roadster, Van, or Other",
  country_of_origin: "Title Case. One of: American, Japanese, German, Italian, British, Korean, Swedish, French, or Other",
  category: "Title Case. One of: Muscle Car, Sports Car, Luxury, Classic, Exotic, Truck, Hot Rod, Import Tuner, Pony Car, Grand Tourer, Economy, or Other",
  cylinders: "number of cylinders (integer), 0 for electric",
  displacement_liters: "engine displacement in liters (decimal), 0 for electric",
  horsepower: "estimated stock horsepower for the base or most common engine option (integer)",
  drive_type: "One of: RWD, FWD, AWD, or 4WD",
  engine_type: "Title Case. One of: V8, V6, V10, V12, Inline-4, Inline-6, Flat-4, Flat-6, Rotary, Electric, or Other",
  weight_lbs: "approximate curb weight in pounds (integer)",
  original_msrp: "original base MSRP in USD when new (integer). Use the actual sticker price from that year, NOT inflation-adjusted",
  production_numbers: "TOTAL production numbers for this model name in this model year across ALL trims and variants. For example, ALL 1966 Mustangs made that year, not just the GT trim. Use 0 if truly unknown. This should typically be in the tens of thousands or hundreds of thousands for popular cars.",
  era: "One of: Pre-War (before 1946), Post-War (1946-1959), Muscle Era (1960-1973), Malaise Era (1974-1989), Modern Classic (1990-2009), Contemporary (2010+). Choose based on the vehicle year.",
  notable_features: "Title Case. Comma-separated list of 2-3 features that are FACTORY STANDARD for this model — things that defined this car when it was sold new. Examples: Dual Exhaust, Pop-Up Headlights, T-Tops, Gullwing Doors, Fastback Design. Do NOT guess features that vary by individual car.",
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
              content: `You are an authoritative automotive encyclopedia. Given a vehicle year, make, and model, return a JSON object with factory specs for the most common variant.

CRITICAL RULES:
- All string values must be in Title Case (e.g., "Pony Car" not "pony car", "Coupe" not "coupe")
- The "era" field must be chosen based on the VEHICLE YEAR, not subjective opinion
- The "production_numbers" field must be the TOTAL for that model name in that year across ALL trims (e.g., total 1966 Mustangs, not just GTs)
- The "notable_features" must only include features that were FACTORY STANDARD on this model — do not guess aftermarket modifications
- Use 0 for production_numbers only if the data is truly unknown

Return ONLY valid JSON with these fields:
${Object.entries(SPEC_SCHEMA).map(([k, v]) => `  "${k}": ${v}`).join("\n")}`,
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
