import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: registrations } = await supabase
      .from("registrations")
      .select("id, car_number, vehicle_year, vehicle_make, vehicle_model, vehicle_color, first_name, last_name, ai_image_url, pixel_art_url, pixel_dashboard_url, pixel_rear_url, pixel_dash_cropped_url")
      .in("payment_status", ["paid", "comped"])
      .order("car_number", { ascending: true });

    const { data: specs } = await supabase
      .from("vehicle_specs")
      .select("registration_id, horsepower, weight_lbs, displacement_liters, cylinders, engine_type, category, drive_type, body_style, country_of_origin, era, production_numbers, redline_rpm, top_speed_mph, num_gears, transmission_type");

    if (!registrations || registrations.length === 0) {
      return NextResponse.json({ cars: [] });
    }

    const specMap = new Map((specs || []).map((s) => [s.registration_id, s]));

    const cars = registrations
      .filter((r) => specMap.has(r.id))
      .map((r) => {
        const spec = specMap.get(r.id)!;
        const hp = spec.horsepower || 150;
        const weight = spec.weight_lbs || 3000;
        const pwr = hp / (weight / 1000); // HP per 1000 lbs

        return {
          id: r.id,
          carNumber: r.car_number,
          year: r.vehicle_year || 2000,
          name: `${r.vehicle_year} ${r.vehicle_make} ${r.vehicle_model}`,
          color: r.vehicle_color || "Silver",
          owner: `${r.first_name} ${r.last_name[0]}.`,
          hp,
          weight,
          displacement: spec.displacement_liters || 0,
          cylinders: spec.cylinders || 0,
          engineType: spec.engine_type || "Unknown",
          category: spec.category || "Unknown",
          driveType: spec.drive_type || "RWD",
          bodyStyle: spec.body_style || "",
          origin: spec.country_of_origin || "",
          era: spec.era || "",
          production: spec.production_numbers || 0,
          redline: spec.redline_rpm || 6500,
          topSpeed: spec.top_speed_mph || 0,
          gears: spec.num_gears || 5,
          trans: spec.transmission_type || "Manual",
          pwr: Math.round(pwr * 10) / 10,
          pixelArt: r.pixel_art_url || null,
          pixelDash: r.pixel_dash_cropped_url || r.pixel_dashboard_url || null,
          pixelRear: r.pixel_rear_url || null,
          aiImage: r.ai_image_url || null,
        };
      });

    return NextResponse.json({ cars });
  } catch {
    return NextResponse.json({ cars: [] });
  }
}
