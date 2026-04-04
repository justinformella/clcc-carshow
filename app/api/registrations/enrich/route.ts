import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServerClient } from "@/lib/supabase-server";

// US CPI-U annual averages (Bureau of Labor Statistics). 2026 estimated.
const CPI: Record<number, number> = {
  1920: 20.0, 1925: 17.5, 1930: 16.7, 1935: 13.7, 1940: 14.0, 1941: 14.7, 1942: 16.3, 1943: 17.3,
  1944: 17.6, 1945: 18.0, 1946: 19.5, 1947: 22.3, 1948: 24.1, 1949: 23.8, 1950: 24.1, 1951: 26.0,
  1952: 26.5, 1953: 26.7, 1954: 26.9, 1955: 26.8, 1956: 27.2, 1957: 28.1, 1958: 28.9, 1959: 29.1,
  1960: 29.6, 1961: 29.9, 1962: 30.2, 1963: 30.6, 1964: 31.0, 1965: 31.5, 1966: 32.4, 1967: 33.4,
  1968: 34.8, 1969: 36.7, 1970: 38.8, 1971: 40.5, 1972: 41.8, 1973: 44.4, 1974: 49.3, 1975: 53.8,
  1976: 56.9, 1977: 60.6, 1978: 65.2, 1979: 72.6, 1980: 82.4, 1981: 90.9, 1982: 96.5, 1983: 99.6,
  1984: 103.9, 1985: 107.6, 1986: 109.6, 1987: 113.6, 1988: 118.3, 1989: 124.0, 1990: 130.7,
  1991: 136.2, 1992: 140.3, 1993: 144.5, 1994: 148.2, 1995: 152.4, 1996: 156.9, 1997: 160.5,
  1998: 163.0, 1999: 166.6, 2000: 172.2, 2001: 177.1, 2002: 179.9, 2003: 184.0, 2004: 188.9,
  2005: 195.3, 2006: 201.6, 2007: 207.3, 2008: 215.3, 2009: 214.5, 2010: 218.1, 2011: 224.9,
  2012: 229.6, 2013: 233.0, 2014: 236.7, 2015: 237.0, 2016: 240.0, 2017: 245.1, 2018: 251.1,
  2019: 255.7, 2020: 258.8, 2021: 271.0, 2022: 292.7, 2023: 304.7, 2024: 313.0, 2025: 319.0,
  2026: 325.0,
};

function adjustForInflation(originalMsrp: number, year: number): number {
  const yearCpi = CPI[year] || CPI[Math.min(...Object.keys(CPI).map(Number).filter((y) => y >= year))] || CPI[2026];
  const currentCpi = CPI[2026];
  return Math.round(originalMsrp * (currentCpi / yearCpi));
}

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
  era: "One of: Pre-War (before 1946), 1950s (1946-1959), 1960s-70s (1960-1979), 1980s-90s (1980-1999), 2000s (2000-2014), Modern (2015+). Choose based on the vehicle year.",
  notable_features: "Title Case. Comma-separated list of 2-3 features that are FACTORY STANDARD for this model — things that defined this car when it was sold new. Examples: Dual Exhaust, Pop-Up Headlights, T-Tops, Gullwing Doors, Fastback Design. Do NOT guess features that vary by individual car.",
  redline_rpm: "engine redline RPM (integer). The maximum RPM the tachometer redline begins at for this specific engine. Typically 5500-6500 for V8s, 6000-7000 for V6/I4, 7000-9000 for high-revving sports cars. Use 0 if electric.",
  top_speed_mph: "estimated top speed in MPH (integer). The manufacturer-claimed or commonly cited top speed for this specific model and trim. For speed-limited cars (e.g., German cars limited to 155mph), use the limited speed.",
  num_gears: "number of forward gears in the transmission (integer). Count only forward gears — a 4-speed manual is 4, a 6-speed manual is 6, a 3-speed automatic is 3.",
  transmission_type: "One of: Manual, Automatic, DCT, CVT, or Semi-Auto. Use the MOST COMMON factory transmission for this specific model year and trim.",
};

export async function POST(request: NextRequest) {
  try {
    const { registration_id, batch, force } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const supabase = createServerClient();
    const openai = new OpenAI({ apiKey });

    // Get registrations to enrich
    let registrations;
    if (batch) {
      // Force mode: delete all existing specs first so every vehicle gets re-enriched
      if (force) {
        await supabase.from("vehicle_specs").delete().neq("registration_id", "00000000-0000-0000-0000-000000000000");
      }

      // Batch mode: enrich all registrations that don't have specs yet
      const { data } = await supabase
        .from("registrations")
        .select("id, vehicle_year, vehicle_make, vehicle_model, vehicle_color")
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
        .select("id, vehicle_year, vehicle_make, vehicle_model, vehicle_color")
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
          model: "gpt-4o",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are an authoritative automotive encyclopedia. Given a vehicle year, make, and model (which may include a trim level like GT, SS, Z28, TRD, etc.), return a JSON object with factory specs.

CRITICAL RULES:
- Pay close attention to the FULL model name including any trim/package designation. A "Mustang GT" is NOT the same as a base "Mustang" — the GT has a V8, more horsepower, etc. Always match specs to the specific trim provided.
- All string values must be in Title Case (e.g., "Pony Car" not "pony car", "Coupe" not "coupe")
- The "era" field must be chosen based on the VEHICLE YEAR, not subjective opinion
- The "production_numbers" field must be the TOTAL for that model name in that year across ALL trims (e.g., total 1966 Mustangs, not just GTs). This is typically tens or hundreds of thousands for popular cars.
- The "notable_features" must only include features that were FACTORY STANDARD on this specific model/trim — do not guess aftermarket modifications
- Use 0 for production_numbers only if the data is truly unknown
- For horsepower, displacement, cylinders, and engine_type: use the specs for the SPECIFIC trim/variant named, not the base model

Return ONLY valid JSON with these fields:
${Object.entries(SPEC_SCHEMA).map(([k, v]) => `  "${k}": ${v}`).join("\n")}`,
            },
            {
              role: "user",
              content: `${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}${reg.vehicle_color ? ` (${reg.vehicle_color})` : ""}`,
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
          msrp_adjusted: specs.original_msrp != null && Number(specs.original_msrp) > 0
            ? adjustForInflation(Number(specs.original_msrp), reg.vehicle_year)
            : null,
          production_numbers: specs.production_numbers != null ? Number(specs.production_numbers) : null,
          era: specs.era || null,
          notable_features: specs.notable_features || null,
          redline_rpm: specs.redline_rpm != null ? Number(specs.redline_rpm) : null,
          top_speed_mph: specs.top_speed_mph != null ? Number(specs.top_speed_mph) : null,
          num_gears: specs.num_gears != null ? Number(specs.num_gears) : null,
          transmission_type: specs.transmission_type || null,
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
