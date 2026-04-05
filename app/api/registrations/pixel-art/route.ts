import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generatePixelArt, generateImage, buildRearPrompt, removeChromaKey } from "@/lib/generate-pixel-art";

async function generateRearOnly(registrationId: string): Promise<void> {
  const supabase = createServerClient();

  const { data: reg, error } = await supabase
    .from("registrations")
    .select("vehicle_year, vehicle_make, vehicle_model, vehicle_color")
    .eq("id", registrationId)
    .single();

  if (error || !reg) throw new Error("Registration not found");

  const carDesc = `${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`;
  const color = reg.vehicle_color || "silver";

  const rearBuffer = await generateImage(buildRearPrompt(carDesc, color));
  const cleanRear = await removeChromaKey(rearBuffer);

  const rearFileName = `rear-${registrationId}.png`;
  await supabase.storage.from("pixel-art").upload(rearFileName, cleanRear, { contentType: "image/png", upsert: true });

  const rearUrl = `${supabase.storage.from("pixel-art").getPublicUrl(rearFileName).data.publicUrl}?v=${Date.now()}`;

  await supabase
    .from("registrations")
    .update({ pixel_rear_url: rearUrl })
    .eq("id", registrationId);
}

export async function POST(request: NextRequest) {
  try {
    const { registration_id, batch, batch_rear } = await request.json();

    if (batch_rear) {
      const supabase = createServerClient();
      const { data } = await supabase
        .from("registrations")
        .select("id")
        .in("payment_status", ["paid", "comped"])
        .not("pixel_art_url", "is", null)
        .is("pixel_rear_url", null)
        .order("car_number", { ascending: true });

      const toGenerate = data || [];
      let generated = 0;
      const errors: string[] = [];

      for (const reg of toGenerate) {
        try {
          await generateRearOnly(reg.id);
          generated++;
        } catch (err) {
          errors.push(`${reg.id}: ${err instanceof Error ? err.message : "Unknown"}`);
        }
      }

      return NextResponse.json({ generated, total: toGenerate.length, errors: errors.length > 0 ? errors : undefined });
    }

    if (batch) {
      const supabase = createServerClient();
      const { data } = await supabase
        .from("registrations")
        .select("id")
        .in("payment_status", ["paid", "comped"])
        .is("pixel_art_url", null)
        .order("car_number", { ascending: true });

      const toGenerate = data || [];
      let generated = 0;
      const errors: string[] = [];

      for (const reg of toGenerate) {
        try {
          await generatePixelArt(reg.id);
          generated++;
        } catch (err) {
          errors.push(`${reg.id}: ${err instanceof Error ? err.message : "Unknown"}`);
        }
      }

      return NextResponse.json({ generated, total: toGenerate.length, errors: errors.length > 0 ? errors : undefined });
    }

    if (!registration_id) {
      return NextResponse.json({ error: "Provide registration_id, batch: true, or batch_rear: true" }, { status: 400 });
    }

    const result = await generatePixelArt(registration_id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Pixel art generation error:", err);
    return NextResponse.json({ error: "Failed to generate pixel art" }, { status: 500 });
  }
}
