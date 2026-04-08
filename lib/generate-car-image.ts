import { createServerClient } from "@/lib/supabase-server";

/**
 * Ask Gemini Flash to describe the car's visual appearance so the image
 * generation prompt is accurate even for obscure models (e.g. Jaguar Project 7).
 */
async function describeCarWithGemini(
  apiKey: string,
  year: string,
  make: string,
  model: string,
  color: string | null
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
                    `You are an automotive expert. Describe the visual appearance of a ${year} ${make} ${model}` +
                    `${color ? ` in ${color}` : ""} in 2-3 sentences. ` +
                    `Focus on distinctive body shape, design cues, proportions, and any unique styling features ` +
                    `that would help an image generator accurately depict this specific vehicle. ` +
                    `Do NOT include any preamble — just the description.`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.2,
          },
        }),
      }
    );

    if (!res.ok) {
      console.error("Gemini describe failed:", await res.text());
      return null;
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch (err) {
    console.error("Gemini describe error:", err);
    return null;
  }
}

export async function generateCarImage(registrationId: string, preferredModel?: string): Promise<string> {
  const supabase = createServerClient();

  const { data: reg, error: fetchError } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", registrationId)
    .single();

  if (fetchError || !reg) {
    throw new Error("Registration not found");
  }

  const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;

  // Pre-call: ask Gemini to describe the car so the image prompt is accurate
  const carLabel = `${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`;
  const carDescription = geminiKey
    ? await describeCarWithGemini(
        geminiKey,
        reg.vehicle_year,
        reg.vehicle_make,
        reg.vehicle_model,
        reg.vehicle_color
      )
    : null;

  const parts = [
    `A photorealistic photograph of a ${carLabel}`,
  ];
  if (reg.vehicle_color) {
    parts[0] += ` in ${reg.vehicle_color}`;
  }
  if (carDescription) {
    parts.push(carDescription);
  }
  parts.push(
    "facing left in a three-quarter front view, parked at an outdoor car show on a sunny day, on green grass with other classic and modern cars softly blurred in the background."
  );
  parts.push(
    "Wide landscape composition with the full car visible and generous space on the sides. Professional automotive photography, natural lighting, slight low-angle perspective, shallow depth of field."
  );

  const prompt = parts.join(" ");

  // Generate image with model selection (same pattern as pixel art)
  let buffer: Buffer | null = null;

  if (preferredModel === "openai") {
    buffer = await generateWithOpenAI(prompt);
  } else if (preferredModel && geminiKey) {
    try {
      buffer = await generateWithImagen(geminiKey, prompt, preferredModel);
    } catch (err) {
      console.error(`${preferredModel} failed, falling back to OpenAI:`, err);
      buffer = await generateWithOpenAI(prompt);
    }
  } else if (geminiKey) {
    // Default fallback chain
    const models = [
      "imagen-4.0-generate-001",
      "imagen-4.0-fast-generate-001",
      "imagen-4.0-ultra-generate-001",
    ];
    for (const model of models) {
      try {
        buffer = await generateWithImagen(geminiKey, prompt, model);
        break;
      } catch (err) {
        console.warn(`${model} failed:`, err);
      }
    }
    if (!buffer) {
      console.log("All Imagen models failed, falling back to OpenAI");
      buffer = await generateWithOpenAI(prompt);
    }
  } else {
    buffer = await generateWithOpenAI(prompt);
  }

  const fileName = `${registrationId}.png`;

  await supabase.storage.createBucket("car-images", {
    public: true,
    allowedMimeTypes: ["image/png"],
  });

  const { error: uploadError } = await supabase.storage
    .from("car-images")
    .upload(fileName, buffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("car-images")
    .getPublicUrl(fileName);

  const imageUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("registrations")
    .update({ ai_image_url: imageUrl })
    .eq("id", registrationId);

  if (updateError) {
    throw new Error(`Failed to save image URL: ${updateError.message}`);
  }

  return imageUrl;
}

async function generateWithImagen(apiKey: string, prompt: string, model: string = "imagen-4.0-generate-001"): Promise<Buffer> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9",
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Imagen API error: ${err}`);
  }

  const data = await res.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) {
    throw new Error("Imagen returned no image data");
  }

  return Buffer.from(b64, "base64");
}

async function generateWithOpenAI(prompt: string): Promise<Buffer> {
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    n: 1,
    size: "1536x1024",
    quality: "high",
  });

  const imageData = response.data?.[0];
  if (!imageData?.b64_json) {
    throw new Error("No image generated");
  }

  return Buffer.from(imageData.b64_json, "base64");
}
