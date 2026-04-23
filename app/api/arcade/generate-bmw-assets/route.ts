import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateImage, removeBackground } from "@/lib/generate-pixel-art";

const BMW_ASSETS = [
  // Exterior 3/4 angle shots
  {
    slug: "bmw-2002",
    prompt: "8-bit pixel art of a 1974 BMW 2002 at a 3/4 front angle, round headlights, classic boxy shape, orange, as if displayed in a car dealership showroom, retro video game sprite style, clean transparent background, 16-bit era aesthetic",
    removeBg: true,
  },
  {
    slug: "bmw-e24-m6",
    prompt: "8-bit pixel art of a 1987 BMW M6 E24 coupe at a 3/4 front angle, shark nose design, red, as if displayed in a car dealership showroom, retro video game sprite style, clean transparent background, 16-bit era aesthetic",
    removeBg: true,
  },
  {
    slug: "bmw-e46-m3",
    prompt: "8-bit pixel art of a 2003 BMW M3 E46 coupe at a 3/4 front angle, Laguna Seca Blue, as if displayed in a car dealership showroom, retro video game sprite style, clean transparent background, 16-bit era aesthetic",
    removeBg: true,
  },
  {
    slug: "bmw-m2",
    prompt: "8-bit pixel art of a stock 2026 BMW M2 G87 two door coupe at a 3/4 front angle, short wheelbase, wide hips, black kidney grille, angular LED headlights, muscular rear fenders, Grigio Telesto Metallic gray, no body kit, stock BMW M2 design, as if displayed in a car dealership showroom, retro video game sprite style, clean transparent background, 16-bit era aesthetic",
    removeBg: true,
  },
  {
    slug: "bmw-x5m",
    prompt: "8-bit pixel art of a 2026 BMW X5 M Competition large SUV at a 3/4 front angle, aggressive M front bumper, large kidney grille with black surround, quad exhaust tips, wide fenders, Marina Bay Blue, tall SUV stance, as if displayed in a car dealership showroom, retro video game sprite style, clean transparent background, 16-bit era aesthetic",
    removeBg: true,
  },
  {
    slug: "bmw-m5",
    prompt: "8-bit pixel art of a 2026 BMW M5 G90 sedan at a 3/4 front angle, aggressive M front bumper, large kidney grille, quad exhaust tips, wide body, Isle of Man Green, four door sedan, as if displayed in a car dealership showroom, retro video game sprite style, clean transparent background, 16-bit era aesthetic",
    removeBg: true,
  },
  // Interior shots
  {
    slug: "bmw-2002-interior",
    prompt: "8-bit pixel art interior view from driver's seat of a 1974 BMW 2002, simple dashboard, round gauges, thin steering wheel, vintage car interior, retro video game style, 16-bit era aesthetic",
    removeBg: false,
  },
  {
    slug: "bmw-e24-m6-interior",
    prompt: "8-bit pixel art interior view from driver's seat of a 1987 BMW M6 E24, leather seats, analog gauges, sport steering wheel, 1980s luxury car interior, retro video game style, 16-bit era aesthetic",
    removeBg: false,
  },
  {
    slug: "bmw-e46-m3-interior",
    prompt: "8-bit pixel art interior view from driver's seat of a 2003 BMW M3 E46, sport seats, center console with manual shifter, round gauges, retro video game style, 16-bit era aesthetic",
    removeBg: false,
  },
  {
    slug: "bmw-m2-interior",
    prompt: "8-bit pixel art interior view from driver's seat of a 2026 BMW M2 G87, modern curved digital display, sport seats, M steering wheel with red buttons, carbon fiber trim, retro video game style, 16-bit era aesthetic",
    removeBg: false,
  },
  {
    slug: "bmw-x5m-interior",
    prompt: "8-bit pixel art interior view from driver's seat of a 2026 BMW X5 M Competition, luxury SUV interior, curved digital display, M sport steering wheel, leather and carbon fiber, panoramic sunroof, retro video game style, 16-bit era aesthetic",
    removeBg: false,
  },
  {
    slug: "bmw-m5-interior",
    prompt: "8-bit pixel art interior view from driver's seat of a 2026 BMW M5 G90 sedan, curved digital display, M sport steering wheel with red buttons, sport seats, ambient lighting, retro video game style, 16-bit era aesthetic",
    removeBg: false,
  },
  // Dealership assets
  {
    slug: "anderson-bmw-exterior",
    prompt: "8-bit pixel art of the Anderson BMW car dealership building exterior, modern white building with large glass windows, BMW roundel logo and Anderson text on facade, service entrance on left side, dark parking lot in front with yellow parking lines, blue sky with clouds, wide angle view, retro video game background style, 16-bit era aesthetic",
    removeBg: false,
    aspectRatio: "16:9",
  },
  {
    slug: "anderson-bmw-showroom",
    prompt: "8-bit pixel art of a BMW car dealership showroom interior, distinctive curved white mezzanine balcony overhead with classic vintage cars displayed on top level, dark gray tile floor, glass block accent walls, 2026 BMW X3 and BMW M3 and BMW i4 on showroom floor, reception desk area, high ceilings with track lighting, wide angle view, retro video game background style, 16-bit era aesthetic",
    removeBg: false,
    aspectRatio: "16:9",
  },
  {
    slug: "sponsor-anderson-bmw",
    prompt: "8-bit pixel art logo for Anderson BMW car dealership, BMW roundel logo with Anderson text, clean design on dark background, retro video game style, 16-bit era aesthetic",
    removeBg: true,
    aspectRatio: "1:1",
  },
  {
    slug: "icon-anderson-bmw",
    prompt: "8-bit pixel art icon of a BMW car dealership building, small square icon, BMW logo on building, retro video game style, 16-bit era aesthetic, solid pure black background",
    removeBg: true,
    aspectRatio: "1:1",
  },
  // CIDEAS Wind Tunnel
  {
    slug: "cideas-windtunnel",
    prompt: "8-bit pixel art simple dark wind tunnel background, minimal design, dark navy blue solid walls, subtle horizontal grid lines on floor, very clean and uncluttered, no cars, no equipment, flat 2D side-scrolling game background style, 16-bit era aesthetic",
    removeBg: false,
    aspectRatio: "16:9",
  },
  {
    slug: "icon-cideas",
    prompt: "8-bit pixel art icon of a wind tunnel with airflow lines and a car silhouette inside, retro video game style, 16-bit era aesthetic, solid black background",
    removeBg: true,
    aspectRatio: "1:1",
  },
  // Spoilers (3 variants) - flat 2D side-view
  { slug: "aero-spoiler-1", prompt: "simple flat 2D pixel art of a small car lip spoiler, pure side view silhouette, matte black, very simple shape, pixel art sprite on transparent background", removeBg: true, aspectRatio: "1:1" },
  { slug: "aero-spoiler-2", prompt: "simple flat 2D pixel art of a tall GT rear wing on two stands, pure side view silhouette, carbon fiber dark gray, very simple shape, pixel art sprite on transparent background", removeBg: true, aspectRatio: "1:1" },
  { slug: "aero-spoiler-3", prompt: "simple flat 2D pixel art of a swan neck rear wing spoiler, pure side view silhouette, red, very simple shape, pixel art sprite on transparent background", removeBg: true, aspectRatio: "1:1" },
  // Front Splitters (3 variants)
  { slug: "aero-splitter-1", prompt: "simple flat 2D pixel art of a thin front lip splitter, pure side view silhouette, black, very simple flat shape, pixel art sprite on transparent background", removeBg: true, aspectRatio: "1:1" },
  { slug: "aero-splitter-2", prompt: "simple flat 2D pixel art of a front splitter with small vertical fins, pure side view silhouette, dark gray, very simple flat shape, pixel art sprite on transparent background", removeBg: true, aspectRatio: "1:1" },
  { slug: "aero-splitter-3", prompt: "simple flat 2D pixel art of a deep front air dam, pure side view silhouette, red, very simple flat shape, pixel art sprite on transparent background", removeBg: true, aspectRatio: "1:1" },
  // Side Skirts (3 variants)
  { slug: "aero-sideskirts-1", prompt: "simple flat 2D pixel art of thin side skirt extensions, pure side view, black horizontal strip, very simple flat shape, pixel art sprite on transparent background", removeBg: true, aspectRatio: "1:1" },
  { slug: "aero-sideskirts-2", prompt: "simple flat 2D pixel art of side skirts with vents, pure side view, dark gray, very simple flat shape, pixel art sprite on transparent background", removeBg: true, aspectRatio: "1:1" },
  { slug: "aero-sideskirts-3", prompt: "simple flat 2D pixel art of wide body side skirts, pure side view, red accent, very simple flat shape, pixel art sprite on transparent background", removeBg: true, aspectRatio: "1:1" },
  // Rear Diffusers (3 variants)
  { slug: "aero-diffuser-1", prompt: "simple flat 2D pixel art of a small rear diffuser with 3 fins, pure side view silhouette, black, very simple flat shape, pixel art sprite on transparent background", removeBg: true, aspectRatio: "1:1" },
  { slug: "aero-diffuser-2", prompt: "simple flat 2D pixel art of a rear diffuser with 5 fins, pure side view silhouette, dark gray, very simple flat shape, pixel art sprite on transparent background", removeBg: true, aspectRatio: "1:1" },
  { slug: "aero-diffuser-3", prompt: "simple flat 2D pixel art of a large F1 rear diffuser, pure side view silhouette, red, very simple flat shape, pixel art sprite on transparent background", removeBg: true, aspectRatio: "1:1" },
  // Canards (3 variants)
  { slug: "aero-canards-1", prompt: "simple flat 2D pixel art of small front canard winglets, pure side view silhouette, black, very simple flat shape, pixel art sprite on transparent background", removeBg: true, aspectRatio: "1:1" },
  { slug: "aero-canards-2", prompt: "simple flat 2D pixel art of medium front dive plane canards, pure side view silhouette, dark gray, very simple flat shape, pixel art sprite on transparent background", removeBg: true, aspectRatio: "1:1" },
  { slug: "aero-canards-3", prompt: "simple flat 2D pixel art of large aggressive front canards, pure side view silhouette, red, very simple flat shape, pixel art sprite on transparent background", removeBg: true, aspectRatio: "1:1" },
  // Grasslot Boys Detailing
  {
    slug: "sponsor-grasslot-boys",
    prompt: "8-bit pixel art logo for Grasslot Boys Detailing, a car detailing business, bold text with detailing imagery like a sponge or spray bottle, retro video game style, 16-bit era aesthetic, clean transparent background",
    removeBg: true,
    aspectRatio: "1:1",
  },
  {
    slug: "icon-grasslot-boys",
    prompt: "8-bit pixel art icon of a car being detailed and polished, sponge and soap bubbles, retro video game style, 16-bit era aesthetic, solid black background",
    removeBg: true,
    aspectRatio: "1:1",
  },
];

export async function POST(req: Request) {
  try {
    const { slug: onlySlug } = await req.json().catch(() => ({ slug: null }));
    const supabase = createServerClient();

    const toGenerate = onlySlug
      ? BMW_ASSETS.filter((a) => a.slug === onlySlug)
      : BMW_ASSETS;

    if (toGenerate.length === 0) {
      return NextResponse.json({ error: "Unknown slug" }, { status: 400 });
    }

    const results: { slug: string; url: string; error?: string }[] = [];

    for (const asset of toGenerate) {
      try {
        console.log(`Generating: ${asset.slug}`);
        const aspectRatio = (asset as { aspectRatio?: string }).aspectRatio || "16:9";
        let buffer = await generateImage(asset.prompt, aspectRatio);

        if (asset.removeBg) {
          buffer = await removeBackground(buffer);
        }

        const filename = `8bit/${asset.slug}.png`;
        const { error: uploadErr } = await supabase.storage
          .from("pixel-art")
          .upload(filename, buffer, { contentType: "image/png", upsert: true });

        if (uploadErr) {
          console.error(`Upload failed for ${asset.slug}:`, uploadErr);
          results.push({ slug: asset.slug, url: "", error: uploadErr.message });
          continue;
        }

        const url = supabase.storage.from("pixel-art").getPublicUrl(filename).data.publicUrl;
        results.push({ slug: asset.slug, url: `${url}?v=${Date.now()}` });
        console.log(`Done: ${asset.slug}`);
      } catch (err) {
        console.error(`Error generating ${asset.slug}:`, err);
        results.push({ slug: asset.slug, url: "", error: String(err) });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
