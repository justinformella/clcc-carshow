import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generatePixelArt } from "@/lib/generate-pixel-art";

export async function POST(request: NextRequest) {
  try {
    const { registration_id, batch } = await request.json();

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
      return NextResponse.json({ error: "Provide registration_id or batch: true" }, { status: 400 });
    }

    const result = await generatePixelArt(registration_id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Pixel art generation error:", err);
    return NextResponse.json({ error: "Failed to generate pixel art" }, { status: 500 });
  }
}
