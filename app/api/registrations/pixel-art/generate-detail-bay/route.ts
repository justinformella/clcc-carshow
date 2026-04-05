import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateImage } from "@/lib/generate-pixel-art";

export async function POST() {
  try {
    const supabase = createServerClient();

    const bayPrompt =
      `8-bit retro pixel art side view of an automotive detailing bay interior. ` +
      `Clean white tile walls, polished gray concrete floor with a drain grate. ` +
      `Bright overhead fluorescent strip lights. On the left wall, a pegboard with hanging spray bottles, ` +
      `microfiber towels, and a buffer/polisher. A rolling red tool cart with detailing supplies. ` +
      `A pressure washer on the right side. The floor is wet with a subtle shine. ` +
      `Open garage door on the right side showing daylight outside. ` +
      `Style like a 1990s DOS racing game. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic. ` +
      `Side-on view, no perspective distortion. No car in the bay — the floor is empty.`;

    const logoPrompt =
      `8-bit retro pixel art logo for "DETAIL TECH" automotive detailing shop. ` +
      `Bold blocky pixel letters spelling "DETAIL TECH" with a subtle shine/sparkle effect on the letters. ` +
      `Color scheme: gold text on transparent/black background. ` +
      `A small pixel art spray bottle icon next to the text. ` +
      `Style like a 1990s DOS game title screen logo. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic.`;

    const [bayBuffer, logoBuffer] = await Promise.all([
      generateImage(bayPrompt, "16:9"),
      generateImage(logoPrompt, "4:1"),
    ]);

    await supabase.storage.createBucket("pixel-art", { public: true, allowedMimeTypes: ["image/png"] });

    const bayFileName = "detail-bay.png";
    const logoFileName = "detail-tech-logo.png";

    await Promise.all([
      supabase.storage.from("pixel-art").upload(bayFileName, bayBuffer, { contentType: "image/png", upsert: true }),
      supabase.storage.from("pixel-art").upload(logoFileName, logoBuffer, { contentType: "image/png", upsert: true }),
    ]);

    const ts = Date.now();
    const bayUrl = `${supabase.storage.from("pixel-art").getPublicUrl(bayFileName).data.publicUrl}?v=${ts}`;
    const logoUrl = `${supabase.storage.from("pixel-art").getPublicUrl(logoFileName).data.publicUrl}?v=${ts}`;

    return NextResponse.json({ bayUrl, logoUrl });
  } catch (err) {
    console.error("Detail bay generation error:", err);
    return NextResponse.json({ error: "Failed to generate detail bay assets" }, { status: 500 });
  }
}
