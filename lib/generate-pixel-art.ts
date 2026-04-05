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
  return `8-bit retro pixel art rear view of a ${carDesc} in ${color}.${detail} The car is seen from directly behind, showing taillights, rear bumper, and rear window. Style like a 1990s DOS racing game (OutRun, Rad Racer). Solid bright green (#00FF00) background, car fills the frame. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic.`;
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
      `Solid bright green (#00FF00) background. The car should fill most of the frame. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic.`
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
 * Remove bright green (#00FF00) chroma key background from an image buffer.
 * Uses flood-fill from image borders so only the outer background is removed —
 * green visible through windows or glass stays intact.
 */
export async function removeChromaKey(input: Buffer): Promise<Buffer> {
  const image = sharp(input).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const isGreen = (i: number) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return g > 140 && r < 130 && b < 130;
  };

  // Flood-fill from all border pixels to find connected green regions
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  // Seed with all border pixels that are green
  for (let x = 0; x < width; x++) {
    if (isGreen(x * 4)) queue.push(x);
    const bottom = (height - 1) * width + x;
    if (isGreen(bottom * 4)) queue.push(bottom);
  }
  for (let y = 1; y < height - 1; y++) {
    if (isGreen(y * width * 4)) queue.push(y * width);
    const right = y * width + width - 1;
    if (isGreen(right * 4)) queue.push(right);
  }

  // BFS flood fill
  while (queue.length > 0) {
    const idx = queue.pop()!;
    if (visited[idx]) continue;
    visited[idx] = 1;

    const pi = idx * 4;
    if (!isGreen(pi)) continue;

    data[pi + 3] = 0; // make transparent

    const x = idx % width;
    const y = (idx - x) / width;
    if (x > 0) queue.push(idx - 1);
    if (x < width - 1) queue.push(idx + 1);
    if (y > 0) queue.push(idx - width);
    if (y < height - 1) queue.push(idx + width);
  }

  // Second pass: soften edges — any non-transparent pixel adjacent to
  // a transparent pixel gets partial transparency if it's near-green
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const pi = idx * 4;
      if (data[pi + 3] === 0) continue; // already transparent

      // Check if any neighbor is transparent
      const hasTransparentNeighbor =
        data[(idx - 1) * 4 + 3] === 0 ||
        data[(idx + 1) * 4 + 3] === 0 ||
        data[(idx - width) * 4 + 3] === 0 ||
        data[(idx + width) * 4 + 3] === 0;

      if (hasTransparentNeighbor) {
        const r = data[pi], g = data[pi + 1], b = data[pi + 2];
        if (g > 100 && g > r * 1.2 && g > b * 1.2) {
          const greenness = (g - Math.max(r, b)) / g;
          data[pi + 3] = Math.round(255 * (1 - greenness * 0.8));
        }
      }
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
