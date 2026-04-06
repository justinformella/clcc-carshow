import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateImage, buildRearPrompt, removeBackground, detectCarFacingLeft } from "@/lib/generate-pixel-art";
import sharp from "sharp";

export async function POST(request: NextRequest) {
  try {
    const { registration_id, type, model } = await request.json();

    if (!registration_id || !["side", "dashboard", "rear"].includes(type)) {
      return NextResponse.json({ error: "Provide registration_id and type (side|dashboard|rear)" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: reg, error } = await supabase
      .from("registrations")
      .select("vehicle_year, vehicle_make, vehicle_model, vehicle_color")
      .eq("id", registration_id)
      .single();

    if (error || !reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const carDesc = `${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`;
    const color = reg.vehicle_color || "silver";

    let prompt: string;
    if (type === "side") {
      prompt = `8-bit retro pixel art side profile view of a ${carDesc} in ${color}. ` +
        `The car should be facing right, detailed pixel art style like a 1990s DOS racing game. ` +
        `Black background. The car should fill most of the frame. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic.`;
    } else if (type === "rear") {
      prompt = buildRearPrompt(carDesc, color);
    } else {
      prompt = `8-bit retro pixel art interior dashboard view from the driver seat of a ${carDesc}. ` +
        `Show the steering wheel, instrument cluster with speedometer and tachometer, and windshield. ` +
        `Style like a 1990s DOS racing game (Test Drive, Street Rod). ` +
        `Detailed pixel art with authentic retro video game aesthetic. View should be from behind the steering wheel looking forward.`;
    }

    const aspectRatio = type === "dashboard" ? "16:9" : "16:9";
    const timing: Record<string, number> = {};

    let t0 = Date.now();
    const rawBuffer = await generateImage(prompt, aspectRatio, model || undefined);
    timing.generateMs = Date.now() - t0;

    const ts = Date.now();
    const origName = `${type}-${registration_id}.png`;

    t0 = Date.now();
    await supabase.storage.from("pixel-art").upload(origName, rawBuffer, { contentType: "image/png", upsert: true });
    timing.uploadOriginalMs = Date.now() - t0;

    const origUrl = `${supabase.storage.from("pixel-art").getPublicUrl(origName).data.publicUrl}?v=${ts}`;

    let mainUrl = origUrl;
    if (type === "side" || type === "rear") {
      t0 = Date.now();
      const cleanBuffer = await removeBackground(rawBuffer);
      timing.removeBackgroundMs = Date.now() - t0;

      t0 = Date.now();
      const transName = `${type}-${registration_id}-transparent.png`;
      await supabase.storage.from("pixel-art").upload(transName, cleanBuffer, { contentType: "image/png", upsert: true });
      timing.uploadTransparentMs = Date.now() - t0;

      mainUrl = `${supabase.storage.from("pixel-art").getPublicUrl(transName).data.publicUrl}?v=${ts}`;
    }

    // Auto-crop dashboard to remove windshield
    let croppedUrl: string | null = null;
    if (type === "dashboard") {
      t0 = Date.now();
      const metadata = await sharp(rawBuffer).metadata();
      const cropY = Math.round((metadata.height || 768) * 0.40);
      const croppedBuffer = await sharp(rawBuffer)
        .extract({ left: 0, top: cropY, width: metadata.width || 1408, height: (metadata.height || 768) - cropY })
        .png()
        .toBuffer();
      timing.cropMs = Date.now() - t0;

      const croppedName = `dash-${registration_id}-cropped.png`;
      await supabase.storage.from("pixel-art").upload(croppedName, croppedBuffer, { contentType: "image/png", upsert: true });
      croppedUrl = `${supabase.storage.from("pixel-art").getPublicUrl(croppedName).data.publicUrl}?v=${ts}`;
    }

    // Detect car direction for side views
    let facingLeft = false;
    if (type === "side") {
      const t1 = Date.now();
      facingLeft = await detectCarFacingLeft(rawBuffer);
      timing.detectDirectionMs = Date.now() - t1;
    }

    const mainCol = type === "side" ? "pixel_art_url" : type === "rear" ? "pixel_rear_url" : "pixel_dashboard_url";
    const origCol = type === "side" ? "pixel_art_original_url" : type === "rear" ? "pixel_rear_original_url" : "pixel_dashboard_original_url";

    const updateData: Record<string, string | boolean> = { [mainCol]: mainUrl, [origCol]: origUrl };
    if (croppedUrl) updateData.pixel_dash_cropped_url = croppedUrl;
    if (type === "side") updateData.pixel_art_flipped = facingLeft;

    await supabase
      .from("registrations")
      .update(updateData)
      .eq("id", registration_id);

    console.log(`Regenerate ${type} timing:`, timing);
    return NextResponse.json({ url: mainUrl, originalUrl: origUrl, croppedUrl, timing });
  } catch (err) {
    console.error("Regenerate error:", err);
    return NextResponse.json({ error: "Failed to regenerate" }, { status: 500 });
  }
}
