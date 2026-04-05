import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { removeBackground } from "@/lib/generate-pixel-art";

export async function POST(request: NextRequest) {
  try {
    const { registration_id, type } = await request.json();

    if (!registration_id || !["side", "rear"].includes(type)) {
      return NextResponse.json({ error: "Provide registration_id and type (side|rear)" }, { status: 400 });
    }

    const supabase = createServerClient();
    const origCol = type === "side" ? "pixel_art_original_url" : "pixel_rear_original_url";

    const { data: reg, error } = await supabase
      .from("registrations")
      .select(origCol)
      .eq("id", registration_id)
      .single();

    if (error || !reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const origUrl = (reg as Record<string, string | null>)[origCol];
    if (!origUrl) {
      return NextResponse.json({ error: "No original image to strip" }, { status: 400 });
    }

    const imgRes = await fetch(origUrl);
    if (!imgRes.ok) {
      return NextResponse.json({ error: "Failed to download original image" }, { status: 500 });
    }
    const rawBuffer = Buffer.from(await imgRes.arrayBuffer());
    const cleanBuffer = await removeBackground(rawBuffer);

    const ts = Date.now();
    const transName = `${type}-${registration_id}-transparent.png`;
    await supabase.storage.from("pixel-art").upload(transName, cleanBuffer, { contentType: "image/png", upsert: true });
    const mainUrl = `${supabase.storage.from("pixel-art").getPublicUrl(transName).data.publicUrl}?v=${ts}`;

    const mainCol = type === "side" ? "pixel_art_url" : "pixel_rear_url";
    await supabase
      .from("registrations")
      .update({ [mainCol]: mainUrl })
      .eq("id", registration_id);

    return NextResponse.json({ url: mainUrl });
  } catch (err) {
    console.error("Strip BG error:", err);
    return NextResponse.json({ error: "Failed to strip background" }, { status: 500 });
  }
}
