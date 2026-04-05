import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateImage } from "@/lib/generate-pixel-art";

export async function POST() {
  try {
    const supabase = createServerClient();

    const prompt =
      `8-bit retro pixel art side view of an automotive dyno room interior. ` +
      `Clean white walls, polished gray concrete floor. A chassis dynamometer (roller dyno) is embedded in the floor ` +
      `with two large metal rollers visible. On the left side, a dyno computer kiosk/control station ` +
      `with a monitor showing a graph display. A technician in a dark uniform stands next to the kiosk ` +
      `holding a clipboard. On the back wall, the text "URW AUTOMOTIVE" is painted in large bold black ` +
      `letters. Fluorescent ceiling lights. An open garage door on the right side showing daylight outside. ` +
      `Style like a 1990s DOS racing game. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic. ` +
      `Side-on view, no perspective distortion. No car on the dyno — the rollers are empty.`;

    const buffer = await generateImage(prompt);

    await supabase.storage.createBucket("pixel-art", { public: true, allowedMimeTypes: ["image/png"] });

    const fileName = "urw-dyno-room.png";
    await supabase.storage.from("pixel-art").upload(fileName, buffer, { contentType: "image/png", upsert: true });

    const url = `${supabase.storage.from("pixel-art").getPublicUrl(fileName).data.publicUrl}?v=${Date.now()}`;

    return NextResponse.json({ url });
  } catch (err) {
    console.error("Dyno room generation error:", err);
    return NextResponse.json({ error: "Failed to generate dyno room" }, { status: 500 });
  }
}
