import { createServerClient } from "@/lib/supabase-server";

export async function generateCarImage(registrationId: string): Promise<string> {
  const supabase = createServerClient();

  // Fetch the registration
  const { data: reg, error: fetchError } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", registrationId)
    .single();

  if (fetchError || !reg) {
    throw new Error("Registration not found");
  }

  // Build a descriptive prompt
  const parts = [
    `A photorealistic photograph of a ${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`,
  ];
  if (reg.vehicle_color) {
    parts[0] += ` in ${reg.vehicle_color}`;
  }
  parts.push(
    "facing left in a three-quarter front view, parked at an outdoor car show on a sunny day, on green grass with other classic and modern cars softly blurred in the background."
  );
  parts.push(
    "Wide landscape composition with the full car visible and generous space on the sides. Professional automotive photography, natural lighting, slight low-angle perspective, shallow depth of field."
  );

  const prompt = parts.join(" ");

  // Generate image — try Imagen 3 first, fall back to OpenAI
  let buffer: Buffer;
  const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (geminiKey) {
    buffer = await generateWithImagen(geminiKey, prompt);
  } else {
    buffer = await generateWithOpenAI(prompt);
  }

  const fileName = `${registrationId}.png`;

  // Ensure the storage bucket exists (idempotent)
  await supabase.storage.createBucket("car-images", {
    public: true,
    allowedMimeTypes: ["image/png"],
  });

  // Upload to Supabase Storage (upsert to allow regeneration)
  const { error: uploadError } = await supabase.storage
    .from("car-images")
    .upload(fileName, buffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from("car-images")
    .getPublicUrl(fileName);

  const imageUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  // Save the URL to the registration record
  const { error: updateError } = await supabase
    .from("registrations")
    .update({ ai_image_url: imageUrl })
    .eq("id", registrationId);

  if (updateError) {
    throw new Error(`Failed to save image URL: ${updateError.message}`);
  }

  return imageUrl;
}

async function generateWithImagen(apiKey: string, prompt: string): Promise<Buffer> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "3:2",
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Imagen API error:", err);
    // Fall back to OpenAI
    return generateWithOpenAI(prompt);
  }

  const data = await res.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) {
    console.error("Imagen returned no image, falling back to OpenAI");
    return generateWithOpenAI(prompt);
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
