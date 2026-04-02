import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/generate-pixel-art";
import { createServerClient } from "@/lib/supabase-server";

const HERO_PROMPT =
  "8-bit retro pixel art scene of a charity car show in a downtown small-town American setting. " +
  "Multiple classic and modern cars parked along tree-lined streets with brick buildings. " +
  "Crowd of people walking between vehicles. Bright sunny day. " +
  "Style like a 1990s DOS or NES game screenshot with sharp pixels and authentic retro video game aesthetic.";

const GALLERY_PROMPTS = [
  "8-bit pixel art of a classic green Jaguar XK sports car at a car show. Side profile. NES retro game style. Black background.",
  "8-bit pixel art of a red Ferrari California convertible at a car show. NES retro game style. Black background.",
  "8-bit pixel art of classic hot rod cars lined up on a small town street. NES retro game style. Black background.",
  "8-bit pixel art of a blue Mazda Miata convertible at a car show. NES retro game style. Black background.",
  "8-bit pixel art of a downtown street filled with classic cars and spectators. NES retro game style. Black background.",
  "8-bit pixel art of a classic white Corvette C1 at a car show. NES retro game style. Black background.",
  "8-bit pixel art of a convertible Chevy Blazer at an outdoor car show. NES retro game style. Black background.",
  "8-bit pixel art of a blue Shelby GT350 Mustang at a car show. NES retro game style. Black background.",
];

async function ensureBucket(supabase: ReturnType<typeof createServerClient>) {
  await supabase.storage.createBucket("pixel-art", {
    public: true,
    allowedMimeTypes: ["image/png"],
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const type: "hero" | "gallery" | "sponsors" | "all" = body.type ?? "all";

  const supabase = createServerClient();
  const errors: string[] = [];

  let heroResult: string | null = null;
  let galleryGenerated = 0;
  const galleryTotal = GALLERY_PROMPTS.length;
  let sponsorsGenerated = 0;
  let sponsorsTotal = 0;

  try {
    await ensureBucket(supabase);
  } catch {
    // Bucket may already exist — ignore
  }

  // ── Hero ────────────────────────────────────────────────────────────────────
  if (type === "hero" || type === "all") {
    try {
      const buffer = await generateImage(HERO_PROMPT);
      const { error } = await supabase.storage
        .from("pixel-art")
        .upload("8bit/hero.png", buffer, {
          contentType: "image/png",
          upsert: true,
        });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("pixel-art")
        .getPublicUrl("8bit/hero.png");
      heroResult = urlData.publicUrl;
    } catch (err) {
      errors.push(`hero: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Gallery ─────────────────────────────────────────────────────────────────
  if (type === "gallery" || type === "all") {
    for (let i = 0; i < GALLERY_PROMPTS.length; i++) {
      try {
        const buffer = await generateImage(GALLERY_PROMPTS[i]);
        const path = `8bit/gallery-${i}.png`;
        const { error } = await supabase.storage
          .from("pixel-art")
          .upload(path, buffer, { contentType: "image/png", upsert: true });
        if (error) throw error;
        galleryGenerated++;
      } catch (err) {
        errors.push(
          `gallery-${i}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  // ── Sponsors ────────────────────────────────────────────────────────────────
  if (type === "sponsors" || type === "all") {
    const { data: sponsorRows, error: fetchErr } = await supabase
      .from("sponsors")
      .select("id, company, logo_url, pixel_logo_url")
      .eq("status", "paid")
      .not("logo_url", "is", null)
      .is("pixel_logo_url", null);

    if (fetchErr) {
      errors.push(`sponsors fetch: ${fetchErr.message}`);
    } else {
      sponsorsTotal = (sponsorRows ?? []).length;
      for (const sponsor of sponsorRows ?? []) {
        try {
          const prompt = `8-bit retro pixel art version of a company logo for ${sponsor.company}. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic. Black background.`;
          const buffer = await generateImage(prompt);
          const path = `8bit/sponsor-${sponsor.id}.png`;

          const { error: uploadErr } = await supabase.storage
            .from("pixel-art")
            .upload(path, buffer, { contentType: "image/png", upsert: true });
          if (uploadErr) throw uploadErr;

          const { data: urlData } = supabase.storage
            .from("pixel-art")
            .getPublicUrl(path);
          const pixelLogoUrl = urlData.publicUrl;

          const { error: updateErr } = await supabase
            .from("sponsors")
            .update({ pixel_logo_url: pixelLogoUrl })
            .eq("id", sponsor.id);
          if (updateErr) throw updateErr;

          sponsorsGenerated++;
        } catch (err) {
          errors.push(
            `sponsor-${sponsor.id}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }
  }

  return NextResponse.json({
    hero: heroResult,
    gallery: { generated: galleryGenerated, total: galleryTotal },
    sponsors: { generated: sponsorsGenerated, total: sponsorsTotal },
    errors,
  });
}
