import { createServerClient } from "@/lib/supabase-server";

export async function generatePixelArt(registrationId: string): Promise<{ sideUrl: string; dashUrl: string }> {
  const supabase = createServerClient();

  const { data: reg, error } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", registrationId)
    .single();

  if (error || !reg) throw new Error("Registration not found");

  const carDesc = `${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`;
  const color = reg.vehicle_color || "silver";

  // Generate both images in parallel
  const [sideBuffer, dashBuffer] = await Promise.all([
    generateImage(
      `8-bit retro pixel art side profile view of a ${carDesc} in ${color}. ` +
      `The car should be facing right, detailed pixel art style like a 1990s DOS racing game. ` +
      `Black background. The car should fill most of the frame. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic.`
    ),
    generateImage(
      `8-bit retro pixel art interior dashboard view from the driver seat of a ${carDesc}. ` +
      `Show the steering wheel, instrument cluster with speedometer and tachometer, and windshield. ` +
      `Style like a 1990s DOS racing game (Test Drive, Street Rod). ` +
      `Detailed pixel art with authentic retro video game aesthetic. View should be from behind the steering wheel looking forward.`
    ),
  ]);

  // Upload both to storage
  await supabase.storage.createBucket("pixel-art", {
    public: true,
    allowedMimeTypes: ["image/png"],
  });

  const sideFileName = `side-${registrationId}.png`;
  const dashFileName = `dash-${registrationId}.png`;

  await Promise.all([
    supabase.storage.from("pixel-art").upload(sideFileName, sideBuffer, { contentType: "image/png", upsert: true }),
    supabase.storage.from("pixel-art").upload(dashFileName, dashBuffer, { contentType: "image/png", upsert: true }),
  ]);

  const sideUrl = `${supabase.storage.from("pixel-art").getPublicUrl(sideFileName).data.publicUrl}?v=${Date.now()}`;
  const dashUrl = `${supabase.storage.from("pixel-art").getPublicUrl(dashFileName).data.publicUrl}?v=${Date.now()}`;

  await supabase
    .from("registrations")
    .update({ pixel_art_url: sideUrl, pixel_dashboard_url: dashUrl })
    .eq("id", registrationId);

  return { sideUrl, dashUrl };
}

async function generateImage(prompt: string): Promise<Buffer> {
  const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: { sampleCount: 1, aspectRatio: "16:9" },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const b64 = data.predictions?.[0]?.bytesBase64Encoded;
        if (b64) return Buffer.from(b64, "base64");
      }
    } catch (err) {
      console.error("Imagen pixel art failed:", err);
    }
  }

  // Fallback to OpenAI
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    n: 1,
    size: "1536x1024",
    quality: "medium",
  });

  const imageData = response.data?.[0];
  if (!imageData?.b64_json) throw new Error("No image generated");
  return Buffer.from(imageData.b64_json, "base64");
}
