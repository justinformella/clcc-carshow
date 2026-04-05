import { createServerClient } from "@/lib/supabase-server";
import sharp from "sharp";

/**
 * Ask Gemini Flash to describe the car so pixel art prompts are accurate
 * even for obscure models.
 */
async function describeCarForPixelArt(
  apiKey: string,
  carDesc: string,
  color: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    `You are an automotive expert. Describe the visual appearance of a ${carDesc} in ${color} in 1-2 sentences. ` +
                    `Focus on the silhouette, body shape, and most distinctive styling features ` +
                    `that would help an 8-bit pixel artist accurately depict this specific vehicle. ` +
                    `Do NOT include any preamble — just the description.`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 150,
            temperature: 0.2,
          },
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

export function buildRearPrompt(carDesc: string, color: string, visualDetails?: string): string {
  const detail = visualDetails ? ` ${visualDetails}` : "";
  return `8-bit retro pixel art rear view of a ${carDesc} in ${color}.${detail} The car is seen from directly behind, showing taillights, rear bumper, and rear window. Style like a 1990s DOS racing game (OutRun, Rad Racer). Solid bright magenta (#FF00FF) background. All windows must be dark tinted black — not see-through. No shadow, no ground, no floor — the car floats on the flat magenta background. Car fills the frame. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic.`;
}

export async function generatePixelArt(registrationId: string): Promise<{ sideUrl: string; dashUrl: string; rearUrl: string }> {
  const supabase = createServerClient();

  const { data: reg, error } = await supabase
    .from("registrations")
    .select("vehicle_year, vehicle_make, vehicle_model, vehicle_color")
    .eq("id", registrationId)
    .single();

  if (error || !reg) throw new Error("Registration not found");

  const carDesc = `${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`;
  const color = reg.vehicle_color || "silver";

  // Pre-call: get a visual description to enrich prompts
  const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
  const visualDetails = geminiKey
    ? await describeCarForPixelArt(geminiKey, carDesc, color)
    : null;
  const detail = visualDetails ? ` ${visualDetails}` : "";

  // Generate all three images in parallel
  const [sideBuffer, dashBuffer, rearBuffer] = await Promise.all([
    generateImage(
      `8-bit retro pixel art side profile view of a ${carDesc} in ${color}.${detail} ` +
      `The car should be facing right, detailed pixel art style like a 1990s DOS racing game. ` +
      `Solid bright magenta (#FF00FF) background. All windows must be dark tinted black — not see-through. ` +
      `No shadow, no ground, no floor — the car floats on the flat magenta background. ` +
      `The car should fill most of the frame. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic.`
    ),
    generateImage(
      `8-bit retro pixel art interior dashboard view from the driver seat of a ${carDesc}.${detail} ` +
      `Show the steering wheel, instrument cluster with speedometer and tachometer, and windshield. ` +
      `Style like a 1990s DOS racing game (Test Drive, Street Rod). ` +
      `Detailed pixel art with authentic retro video game aesthetic. View should be from behind the steering wheel looking forward.`
    ),
    generateImage(buildRearPrompt(carDesc, color, visualDetails ?? undefined)),
  ]);

  // Remove green chroma key background from side and rear views
  const [cleanSide, cleanRear] = await Promise.all([
    removeChromaKey(sideBuffer),
    removeChromaKey(rearBuffer),
  ]);

  // Upload all three to storage
  await supabase.storage.createBucket("pixel-art", {
    public: true,
    allowedMimeTypes: ["image/png"],
  });

  const sideFileName = `side-${registrationId}.png`;
  const dashFileName = `dash-${registrationId}.png`;
  const rearFileName = `rear-${registrationId}.png`;

  await Promise.all([
    supabase.storage.from("pixel-art").upload(sideFileName, cleanSide, { contentType: "image/png", upsert: true }),
    supabase.storage.from("pixel-art").upload(dashFileName, dashBuffer, { contentType: "image/png", upsert: true }),
    supabase.storage.from("pixel-art").upload(rearFileName, cleanRear, { contentType: "image/png", upsert: true }),
  ]);

  const sideUrl = `${supabase.storage.from("pixel-art").getPublicUrl(sideFileName).data.publicUrl}?v=${Date.now()}`;
  const dashUrl = `${supabase.storage.from("pixel-art").getPublicUrl(dashFileName).data.publicUrl}?v=${Date.now()}`;
  const rearUrl = `${supabase.storage.from("pixel-art").getPublicUrl(rearFileName).data.publicUrl}?v=${Date.now()}`;

  await supabase
    .from("registrations")
    .update({ pixel_art_url: sideUrl, pixel_dashboard_url: dashUrl, pixel_rear_url: rearUrl })
    .eq("id", registrationId);

  return { sideUrl, dashUrl, rearUrl };
}

/**
 * Remove magenta (#FF00FF) chroma key background from an image buffer.
 * Magenta never appears naturally in car imagery, so simple per-pixel
 * detection is safe — including through windows and under the car.
 */
export async function removeChromaKey(input: Buffer): Promise<Buffer> {
  const image = sharp(input).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];

    // Core magenta: R and B high, G low
    if (r > 180 && b > 180 && g < 100) {
      data[i + 3] = 0;
    }
    // Near-magenta from anti-aliasing: R and B still dominant, G suppressed
    else if (r > 140 && b > 140 && g < 130 && (r + b) > g * 3) {
      const magentaness = (r + b - g * 2) / (r + b);
      data[i + 3] = Math.round(255 * (1 - magentaness));
    }
  }

  return sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

export async function generateImage(prompt: string): Promise<Buffer> {
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
