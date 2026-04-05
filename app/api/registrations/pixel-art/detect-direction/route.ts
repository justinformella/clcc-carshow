import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { detectCarFacingLeft } from "@/lib/generate-pixel-art";

/**
 * Detect car direction from side-view pixel art and update pixel_art_flipped.
 *
 * POST { registration_id: "uuid" }           — detect one car
 * POST { backfill: true }                    — detect all cars with pixel art
 * POST { backfill: true, dry_run: true }     — preview without updating
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Single car
    if (body.registration_id) {
      const { data: reg, error } = await supabase
        .from("registrations")
        .select("id, car_number, vehicle_year, vehicle_make, vehicle_model, pixel_art_original_url, pixel_art_url")
        .eq("id", body.registration_id)
        .single();

      if (error || !reg) {
        return NextResponse.json({ error: "Registration not found" }, { status: 404 });
      }

      const imageUrl = reg.pixel_art_url || reg.pixel_art_original_url;
      if (!imageUrl) {
        return NextResponse.json({ error: "No pixel art found" }, { status: 400 });
      }

      const imageRes = await fetch(imageUrl);
      if (!imageRes.ok) {
        return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
      }
      const buffer = Buffer.from(await imageRes.arrayBuffer());
      const facingLeft = await detectCarFacingLeft(buffer);

      await supabase
        .from("registrations")
        .update({ pixel_art_flipped: facingLeft })
        .eq("id", reg.id);

      return NextResponse.json({
        car_number: reg.car_number,
        name: `${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`,
        facing_left: facingLeft,
        flipped: facingLeft,
      });
    }

    // Backfill all
    if (body.backfill) {
      const dryRun = body.dry_run === true;

      const { data: regs, error } = await supabase
        .from("registrations")
        .select("id, car_number, vehicle_year, vehicle_make, vehicle_model, pixel_art_original_url, pixel_art_url, pixel_art_flipped")
        .not("pixel_art_url", "is", null)
        .order("car_number", { ascending: true });

      if (error || !regs) {
        return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 500 });
      }

      const results: { car_number: number; name: string; facing_left: boolean; updated: boolean }[] = [];

      for (const reg of regs) {
        const imageUrl = reg.pixel_art_url || reg.pixel_art_original_url;
        if (!imageUrl) continue;

        try {
          const imageRes = await fetch(imageUrl);
          if (!imageRes.ok) {
            results.push({ car_number: reg.car_number, name: `${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`, facing_left: false, updated: false });
            continue;
          }

          const buffer = Buffer.from(await imageRes.arrayBuffer());
          const facingLeft = await detectCarFacingLeft(buffer);

          if (!dryRun) {
            await supabase
              .from("registrations")
              .update({ pixel_art_flipped: facingLeft })
              .eq("id", reg.id);
          }

          results.push({
            car_number: reg.car_number,
            name: `${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`,
            facing_left: facingLeft,
            updated: !dryRun,
          });
        } catch (err) {
          console.error(`Direction detect failed for #${reg.car_number}:`, err);
          results.push({ car_number: reg.car_number, name: `${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`, facing_left: false, updated: false });
        }
      }

      const leftCount = results.filter((r) => r.facing_left).length;
      return NextResponse.json({
        dry_run: dryRun,
        total: results.length,
        facing_left: leftCount,
        facing_right: results.length - leftCount,
        results,
      });
    }

    return NextResponse.json({ error: "Provide registration_id or backfill: true" }, { status: 400 });
  } catch (err) {
    console.error("Detect direction error:", err);
    return NextResponse.json({ error: "Failed to detect direction" }, { status: 500 });
  }
}
