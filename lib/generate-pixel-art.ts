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
  return `8-bit retro pixel art rear view of a ${carDesc} in ${color}.${detail} The car is seen from directly behind, showing taillights, rear bumper, and rear window. Style like a 1990s DOS racing game (OutRun, Rad Racer). Black background, car fills the frame. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic.`;
}

/**
 * Remove background via Modal rembg API.
 * Falls back to original image if Modal is unavailable.
 */
export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const modalUrl = process.env.MODAL_REMBG_URL;
  if (!modalUrl) {
    console.warn("MODAL_REMBG_URL not set — skipping background removal");
    return imageBuffer;
  }

  try {
    const b64 = imageBuffer.toString("base64");
    const res = await fetch(modalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: b64 }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      console.error(`Modal rembg failed: ${res.status} ${res.statusText}`);
      return imageBuffer;
    }

    const data = await res.json();
    return Buffer.from(data.image, "base64");
  } catch (err) {
    console.error("Modal rembg error:", err);
    return imageBuffer;
  }
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

  // Generate all three images with Imagen
  const [sideRaw, dashBuffer, rearRaw] = await Promise.all([
    generateImage(
      `8-bit retro pixel art side profile view of a ${carDesc} in ${color}.${detail} ` +
      `The car should be facing right, detailed pixel art style like a 1990s DOS racing game. ` +
      `Black background. The car should fill most of the frame. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic.`
    ),
    generateImage(
      `8-bit retro pixel art interior dashboard view from the driver seat of a ${carDesc}.${detail} ` +
      `Show the steering wheel, instrument cluster with speedometer and tachometer, and windshield. ` +
      `Style like a 1990s DOS racing game (Test Drive, Street Rod). ` +
      `Detailed pixel art with authentic retro video game aesthetic. View should be from behind the steering wheel looking forward.`
    ),
    generateImage(buildRearPrompt(carDesc, color, visualDetails ?? undefined)),
  ]);

  // Upload raw originals to storage
  await supabase.storage.createBucket("pixel-art", {
    public: true,
    allowedMimeTypes: ["image/png"],
  });

  const sideOrigName = `side-${registrationId}.png`;
  const dashOrigName = `dash-${registrationId}.png`;
  const rearOrigName = `rear-${registrationId}.png`;

  await Promise.all([
    supabase.storage.from("pixel-art").upload(sideOrigName, sideRaw, { contentType: "image/png", upsert: true }),
    supabase.storage.from("pixel-art").upload(dashOrigName, dashBuffer, { contentType: "image/png", upsert: true }),
    supabase.storage.from("pixel-art").upload(rearOrigName, rearRaw, { contentType: "image/png", upsert: true }),
  ]);

  const ts = Date.now();
  const sideOrigUrl = `${supabase.storage.from("pixel-art").getPublicUrl(sideOrigName).data.publicUrl}?v=${ts}`;
  const dashOrigUrl = `${supabase.storage.from("pixel-art").getPublicUrl(dashOrigName).data.publicUrl}?v=${ts}`;
  const rearOrigUrl = `${supabase.storage.from("pixel-art").getPublicUrl(rearOrigName).data.publicUrl}?v=${ts}`;

  // Detect car direction + strip backgrounds in parallel
  const [sideClean, rearClean, facingLeft] = await Promise.all([
    removeBackground(sideRaw),
    removeBackground(rearRaw),
    detectCarFacingLeft(sideRaw),
  ]);

  // Upload transparent versions
  const sideTransName = `side-${registrationId}-transparent.png`;
  const rearTransName = `rear-${registrationId}-transparent.png`;

  await Promise.all([
    supabase.storage.from("pixel-art").upload(sideTransName, sideClean, { contentType: "image/png", upsert: true }),
    supabase.storage.from("pixel-art").upload(rearTransName, rearClean, { contentType: "image/png", upsert: true }),
  ]);

  const sideUrl = `${supabase.storage.from("pixel-art").getPublicUrl(sideTransName).data.publicUrl}?v=${ts}`;
  const dashUrl = dashOrigUrl;
  const rearUrl = `${supabase.storage.from("pixel-art").getPublicUrl(rearTransName).data.publicUrl}?v=${ts}`;

  // Auto-crop dashboard: remove top 40% (windshield area)
  const metadata = await sharp(dashBuffer).metadata();
  const cropY = Math.round((metadata.height || 768) * 0.40);
  const croppedBuffer = await sharp(dashBuffer)
    .extract({ left: 0, top: cropY, width: metadata.width || 1408, height: (metadata.height || 768) - cropY })
    .png()
    .toBuffer();
  const croppedName = `dash-${registrationId}-cropped.png`;
  await supabase.storage.from("pixel-art").upload(croppedName, croppedBuffer, { contentType: "image/png", upsert: true });
  const croppedUrl = `${supabase.storage.from("pixel-art").getPublicUrl(croppedName).data.publicUrl}?v=${ts}`;

  await supabase
    .from("registrations")
    .update({
      pixel_art_url: sideUrl,
      pixel_dashboard_url: dashUrl,
      pixel_rear_url: rearUrl,
      pixel_art_original_url: sideOrigUrl,
      pixel_dashboard_original_url: dashOrigUrl,
      pixel_rear_original_url: rearOrigUrl,
      pixel_dash_cropped_url: croppedUrl,
      pixel_art_flipped: facingLeft,
    })
    .eq("id", registrationId);

  return { sideUrl, dashUrl, rearUrl };
}

/**
 * Use OpenAI vision to detect if a car's side-view pixel art faces left.
 * Returns true if the car faces left (needs flipping), false if it faces right.
 */
export async function detectCarFacingLeft(imageBuffer: Buffer): Promise<boolean> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.warn("No OpenAI key — skipping car direction detection");
    return false;
  }

  try {
    const b64 = imageBuffer.toString("base64");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 10,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${b64}`,
                },
              },
              {
                type: "text",
                text:
                  `This is a pixel art side-view of a car. ` +
                  `Which direction is the FRONT (hood/headlights) of the car pointing — left or right? ` +
                  `Reply with ONLY "left" or "right".`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error(`OpenAI direction detection failed: ${res.status} ${await res.text()}`);
      return false;
    }

    const data = await res.json();
    const answer = (data.choices?.[0]?.message?.content ?? "").trim().toLowerCase();
    console.log(`Car direction detected: "${answer}"`);
    return answer.includes("left");
  } catch (err) {
    console.error("Car direction detection error:", err);
    return false;
  }
}

export async function generateImage(prompt: string, aspectRatio: string = "16:9"): Promise<Buffer> {
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
            parameters: { sampleCount: 1, aspectRatio },
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
