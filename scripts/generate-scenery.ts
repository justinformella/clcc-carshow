/**
 * Generate Crystal Lake scenery pixel art assets for the arcade racer.
 *
 * Usage:
 *   npx tsx scripts/generate-scenery.ts
 *   npx tsx scripts/generate-scenery.ts --only oak-tree,pine-tree
 *   npx tsx scripts/generate-scenery.ts --skip oak-tree
 *
 * Requires env vars: GOOGLE_GEMINI_API_KEY, MODAL_REMBG_URL,
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually (no dotenv dependency needed)
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = val;
  }
}

const GEMINI_KEY = process.env.GOOGLE_GEMINI_API_KEY!;
const REMBG_URL = process.env.MODAL_REMBG_URL || "https://justin-formella--clcc-rembg-remove-bg.modal.run";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Asset manifest ──────────────────────────────────────────────────────────

interface AssetDef {
  key: string;
  filename: string;
  prompt: string;
  aspect: string;   // Imagen aspect ratio
  removeBg: boolean; // whether to strip background
}

const STYLE_BASE = "8-bit retro pixel art, NES/SNES era style, sharp pixels, no anti-aliasing, limited color palette, dark outlines.";

const ASSETS: AssetDef[] = [
  // ─── Trees ───
  {
    key: "oak-tree",
    filename: "oak-tree.png",
    prompt: `${STYLE_BASE} A large white oak tree with a wide, round green canopy and thick brown trunk. The tree should be tall and majestic, typical of Illinois landscape. Viewed from the side as roadside scenery in a driving game. Bright green (#00FF00) solid background.`,
    aspect: "3:4",
    removeBg: true,
  },
  {
    key: "maple-tree",
    filename: "maple-tree.png",
    prompt: `${STYLE_BASE} A sugar maple tree with a full summer green canopy, slightly narrower and more pointed than an oak. Brown trunk. Viewed from the side as roadside scenery. Bright green (#00FF00) solid background.`,
    aspect: "3:4",
    removeBg: true,
  },
  {
    key: "maple-fall",
    filename: "maple-fall.png",
    prompt: `${STYLE_BASE} A sugar maple tree in autumn with vibrant orange, red, and gold foliage. Same shape as a summer maple but fall colors. Brown trunk. Viewed from the side as roadside scenery. Bright green (#00FF00) solid background.`,
    aspect: "3:4",
    removeBg: true,
  },
  {
    key: "pine-tree",
    filename: "pine-tree.png",
    prompt: `${STYLE_BASE} A tall evergreen pine tree (white pine), dark green, classic triangular/conical shape. Viewed from the side as roadside scenery. Bright green (#00FF00) solid background.`,
    aspect: "3:4",
    removeBg: true,
  },
  {
    key: "bush-midwest",
    filename: "bush-midwest.png",
    prompt: `${STYLE_BASE} A low rounded Midwest hedge bush, medium green, about waist-high. Simple roadside shrub. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },

  // ─── Downtown buildings ───
  {
    key: "raue-center",
    filename: "raue-center.png",
    prompt: `${STYLE_BASE} The Raue Center for the Arts — a 1920s movie theater facade with a vertical marquee sign reading "RAUE" with bulb lighting, and a horizontal show board below. Brick building, warm golden lighting on the marquee. Classic small-town theater. Viewed from the front as roadside scenery in a driving game. Bright green (#00FF00) solid background.`,
    aspect: "3:4",
    removeBg: true,
  },
  {
    key: "brick-storefront",
    filename: "brick-storefront.png",
    prompt: `${STYLE_BASE} A 2-story red brick downtown storefront with a green fabric awning over the ground floor, display windows, and a decorative cornice at the roofline. Classic small-town Main Street building. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "1:1",
    removeBg: true,
  },
  {
    key: "painted-storefront",
    filename: "painted-storefront.png",
    prompt: `${STYLE_BASE} A 2-story painted brick storefront in cream/white with a burgundy awning, a shop sign, and upper floor windows. Classic downtown building. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "1:1",
    removeBg: true,
  },
  {
    key: "dole-mansion",
    filename: "dole-mansion.png",
    prompt: `${STYLE_BASE} A large Victorian/Italianate mansion, cream colored with ornate details, peaked roof, tall windows, set in a parklike setting. Historic landmark. Viewed from the front as roadside scenery. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },

  // ─── Commercial (Route 14) ───
  {
    key: "strip-mall",
    filename: "strip-mall.png",
    prompt: `${STYLE_BASE} A long, low suburban strip mall with multiple storefronts, flat roof, various colored business signs, and a parking lot in front. Typical American commercial strip. Viewed from across the street. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "gas-station",
    filename: "gas-station.png",
    prompt: `${STYLE_BASE} A gas station with a canopy over fuel pumps, illuminated brand sign (green and yellow colors), convenience store attached. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },
  {
    key: "fast-food",
    filename: "fast-food.png",
    prompt: `${STYLE_BASE} A fast food restaurant building with a drive-thru lane, bright illuminated signage, and a distinctive roof shape. Generic design, not a specific brand. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },
  {
    key: "best-buy",
    filename: "best-buy.png",
    prompt: `${STYLE_BASE} A Best Buy electronics store building — large blue and yellow rectangular building with the Best Buy logo and distinctive yellow price tag logo. Big box retail store with large parking lot. Viewed from across the street. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "taco-bell",
    filename: "taco-bell.png",
    prompt: `${STYLE_BASE} A Taco Bell restaurant — distinctive purple and pink modern building with the bell logo, drive-thru lane. Fast food Mexican restaurant. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },
  {
    key: "chick-fil-a",
    filename: "chick-fil-a.png",
    prompt: `${STYLE_BASE} A Chick-fil-A restaurant — red brick building with a distinctive peaked roof, the Chick-fil-A logo with a chicken, drive-thru lane. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },
  {
    key: "exceed-flooring",
    filename: "exceed-flooring.png",
    prompt: `${STYLE_BASE} A flooring and home improvement retail store building — a medium commercial storefront with "EXCEED FLOORING" signage on the facade, showroom windows visible. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "jewel-osco",
    filename: "jewel-osco.png",
    prompt: `${STYLE_BASE} A Jewel-Osco grocery store — large supermarket building with the red Jewel-Osco logo sign, wide entrance, shopping carts visible outside. Big suburban grocery store. Viewed from across the street. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "target",
    filename: "target.png",
    prompt: `${STYLE_BASE} A Target store — large red and white big box retail building with the iconic red bullseye Target logo on the facade. Wide entrance, concrete exterior. Viewed from across the street. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "menards",
    filename: "menards.png",
    prompt: `${STYLE_BASE} A Menards home improvement store — large green and white building with the Menards logo and green roof/signage. Big box hardware store with lumber yard. Viewed from across the street. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "outback",
    filename: "outback.png",
    prompt: `${STYLE_BASE} An Outback Steakhouse restaurant — brown and tan building with the Outback logo sign, Australian-themed exterior, peaked roof. Casual dining restaurant. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },
  {
    key: "chipotle",
    filename: "chipotle.png",
    prompt: `${STYLE_BASE} A Chipotle Mexican Grill restaurant — modern building with dark exterior, the Chipotle logo with a chili pepper. Fast casual restaurant. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },
  {
    key: "raising-canes",
    filename: "raising-canes.png",
    prompt: `${STYLE_BASE} A Raising Cane's Chicken Fingers restaurant — red and yellow building with the Raising Cane's logo featuring a yellow dog, drive-thru lane. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },
  {
    key: "sams-club",
    filename: "sams-club.png",
    prompt: `${STYLE_BASE} A Sam's Club warehouse store — very large grey/blue warehouse building with the Sam's Club logo. Bulk retail warehouse with big entrance. Viewed from across the street. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "tj-maxx",
    filename: "tj-maxx.png",
    prompt: `${STYLE_BASE} A TJ Maxx discount retail store — medium commercial building with the red TJ Maxx logo sign on a tan/beige facade. Strip mall style storefront. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "ross",
    filename: "ross.png",
    prompt: `${STYLE_BASE} A Ross Dress for Less store — medium commercial building with the blue and red Ross logo sign. Discount retail storefront in a shopping center. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "hobby-lobby",
    filename: "hobby-lobby.png",
    prompt: `${STYLE_BASE} A Hobby Lobby arts and crafts store — large retail building with the orange Hobby Lobby logo on a tan facade. Big box craft store. Viewed from across the street. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "wendys",
    filename: "wendys.png",
    prompt: `${STYLE_BASE} A Wendy's fast food restaurant — modern building with the red Wendy's logo and sign, drive-thru lane visible. Fast food restaurant. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },
  {
    key: "panera",
    filename: "panera.png",
    prompt: `${STYLE_BASE} A Panera Bread restaurant — modern building with warm tan exterior and the green Panera Bread logo. Bakery-cafe with large windows. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },
  {
    key: "starbucks",
    filename: "starbucks.png",
    prompt: `${STYLE_BASE} A Starbucks coffee shop — small building with dark green awning and the green Starbucks circular logo, drive-thru lane. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },
  {
    key: "ihop",
    filename: "ihop.png",
    prompt: `${STYLE_BASE} An IHOP restaurant — blue roof building with the distinctive blue IHOP logo and sign. Pancake house with large windows. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },
  {
    key: "five-guys",
    filename: "five-guys.png",
    prompt: `${STYLE_BASE} A Five Guys Burgers and Fries restaurant — red and white striped awning, the Five Guys logo in red on a white building. Fast casual burger restaurant. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },
  {
    key: "petsmart",
    filename: "petsmart.png",
    prompt: `${STYLE_BASE} A PetSmart pet store — large blue and red retail building with the PetSmart logo. Pet supply store with wide entrance. Viewed from across the street. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "aldi",
    filename: "aldi.png",
    prompt: `${STYLE_BASE} An ALDI grocery store — compact modern building with the blue and orange ALDI logo. Budget grocery store with simple clean facade. Viewed from across the street. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "harbor-freight",
    filename: "harbor-freight.png",
    prompt: `${STYLE_BASE} A Harbor Freight Tools store — commercial building with the red and white Harbor Freight Tools logo and sign. Tool and hardware store. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "crumbl-cookies",
    filename: "crumbl-cookies.png",
    prompt: `${STYLE_BASE} A Crumbl Cookies shop — modern pink and white storefront with the Crumbl logo, signature pink branding. Small trendy bakery. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },
  {
    key: "jersey-mikes",
    filename: "jersey-mikes.png",
    prompt: `${STYLE_BASE} A Jersey Mike's Subs restaurant — storefront with the red, white and blue Jersey Mike's logo. Sub sandwich shop. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },
  {
    key: "noodles",
    filename: "noodles.png",
    prompt: `${STYLE_BASE} A Noodles & Company restaurant — modern casual restaurant with the orange Noodles & Company logo on a clean facade. Fast casual noodle restaurant. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },

  // ─── Street furniture ───
  {
    key: "street-lamp",
    filename: "street-lamp.png",
    prompt: `${STYLE_BASE} A single acorn/globe style street lamp on a dark green metal post. Classic downtown decorative street light. Tall and narrow. Bright green (#00FF00) solid background.`,
    aspect: "9:16",
    removeBg: true,
  },
  {
    key: "lamp-flowers",
    filename: "lamp-flowers.png",
    prompt: `${STYLE_BASE} A decorative street lamp post (dark green metal, acorn globe top) with a hanging flower basket attached to the pole, colorful flowers spilling out. Classic downtown summer look. Tall and narrow. Bright green (#00FF00) solid background.`,
    aspect: "9:16",
    removeBg: true,
  },
  {
    key: "park-bench",
    filename: "park-bench.png",
    prompt: `${STYLE_BASE} A simple wooden park bench with metal armrests, viewed from the front. Brown wood slats, black metal frame. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "planter",
    filename: "planter.png",
    prompt: `${STYLE_BASE} A concrete planter box with colorful flowers (red, purple, yellow) growing out of the top. Square/rectangular sidewalk planter. Bright green (#00FF00) solid background.`,
    aspect: "1:1",
    removeBg: true,
  },
  {
    key: "picnic-pavilion",
    filename: "picnic-pavilion.png",
    prompt: `${STYLE_BASE} An open wooden picnic shelter/pavilion with a peaked brown roof supported by wooden posts, picnic table underneath. Park structure. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },

  // ─── Signs ───
  {
    key: "welcome-sign",
    filename: "welcome-sign.png",
    prompt: `${STYLE_BASE} A green road sign that reads "Welcome to Crystal Lake" in white text, with a small lake graphic. Mounted on two metal posts. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "rr-crossing",
    filename: "rr-crossing.png",
    prompt: `${STYLE_BASE} A railroad crossing sign — white X-shaped crossbuck on a tall metal post with "RAILROAD CROSSING" text and flashing red signal lights. Tall and narrow. Bright green (#00FF00) solid background.`,
    aspect: "9:16",
    removeBg: true,
  },
  {
    key: "traffic-light",
    filename: "traffic-light.png",
    prompt: `${STYLE_BASE} A standard 3-light traffic signal (red, yellow, green) mounted on a tall metal pole. Tall and narrow. Bright green (#00FF00) solid background.`,
    aspect: "9:16",
    removeBg: true,
  },

  // ─── Lakefront ───
  {
    key: "lake-water",
    filename: "lake-water.png",
    prompt: `${STYLE_BASE} A section of calm lake water with subtle wave patterns, light blue with darker blue reflections and small white highlights. Horizontal strip of water surface. Bright green (#00FF00) solid background above the water.`,
    aspect: "16:9",
    removeBg: true, // strip green background
  },
  {
    key: "beach-section",
    filename: "beach-section.png",
    prompt: `${STYLE_BASE} A sandy beach strip with golden sand in the foreground transitioning to blue lake water at the top edge. A few small details like a beach towel or bucket. Horizontal section. Bright green (#00FF00) solid background behind it.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "boat-dock",
    filename: "boat-dock.png",
    prompt: `${STYLE_BASE} A small wooden boat dock/pier extending out over blue water. Brown wooden planks, simple post construction. Viewed from an angle. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },

  // ─── Transit ───
  {
    key: "metra-train",
    filename: "metra-train.png",
    prompt: `${STYLE_BASE} A Metra commuter train — silver/stainless steel double-decker passenger coaches with blue stripe, viewed from the side. 2-3 cars visible. Classic Chicago suburban commuter rail. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "metra-station",
    filename: "metra-station.png",
    prompt: `${STYLE_BASE} A small Metra commuter rail station shelter — a simple rectangular structure with a peaked roof/canopy over a platform. Modest single-story building with a bench. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },

  // ─── Misc ───
  {
    key: "utility-pole",
    filename: "utility-pole.png",
    prompt: `${STYLE_BASE} A wooden utility/telephone pole with crossarm and power lines attached. Tall, brown, simple. Bright green (#00FF00) solid background.`,
    aspect: "9:16",
    removeBg: true,
  },
  {
    key: "picket-fence",
    filename: "picket-fence.png",
    prompt: `${STYLE_BASE} A section of white picket fence, classic American residential style. About 4 feet tall with pointed white pickets and horizontal rails. Viewed from the front. Bright green (#00FF00) solid background.`,
    aspect: "16:9",
    removeBg: true,
  },
  {
    key: "prairie-grass",
    filename: "prairie-grass.png",
    prompt: `${STYLE_BASE} A patch of tall prairie grass, golden and green, swaying slightly. Native Illinois tallgrass prairie. Bright green (#00FF00) solid background.`,
    aspect: "4:3",
    removeBg: true,
  },
];

// ─── Image generation (Imagen 4.0) ──────────────────────────────────────────

async function generateImage(prompt: string, aspect: string): Promise<Buffer> {
  // Try Imagen first
  if (GEMINI_KEY) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: aspect },
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const b64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (b64) return Buffer.from(b64, "base64");
    } else {
      const err = await res.text();
      console.error(`  Imagen failed (${res.status}): ${err.slice(0, 200)}`);
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
  if (!imageData?.b64_json) throw new Error("No image from OpenAI");
  return Buffer.from(imageData.b64_json, "base64");
}

// ─── Background removal ─────────────────────────────────────────────────────

async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const b64 = imageBuffer.toString("base64");
    const res = await fetch(REMBG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: b64 }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      console.error(`  rembg failed: ${res.status}`);
      return imageBuffer;
    }

    const data = await res.json();
    return Buffer.from(data.image, "base64");
  } catch (err) {
    console.error(`  rembg error:`, err);
    return imageBuffer;
  }
}

// ─── Upload to Supabase ─────────────────────────────────────────────────────

async function uploadToSupabase(filename: string, buffer: Buffer): Promise<string> {
  const storagePath = `8bit/scenery/${filename}`;
  const { error } = await supabase.storage
    .from("pixel-art")
    .upload(storagePath, buffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) throw new Error(`Upload failed for ${storagePath}: ${error.message}`);

  const ts = Date.now();
  return `${SUPABASE_URL}/storage/v1/object/public/pixel-art/${storagePath}?v=${ts}`;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const onlyArg = args.find((a) => a.startsWith("--only="));
  const skipArg = args.find((a) => a.startsWith("--skip="));
  const onlyKeys = onlyArg ? onlyArg.replace("--only=", "").split(",") : null;
  const skipKeys = skipArg ? skipArg.replace("--skip=", "").split(",") : [];

  let assets = ASSETS;
  if (onlyKeys) assets = assets.filter((a) => onlyKeys.includes(a.key));
  if (skipKeys.length) assets = assets.filter((a) => !skipKeys.includes(a.key));

  console.log(`\n🎨 Generating ${assets.length} Crystal Lake scenery assets\n`);

  const results: { key: string; url?: string; error?: string }[] = [];

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    console.log(`[${i + 1}/${assets.length}] ${asset.key} ...`);

    try {
      // Generate
      console.log(`  Generating image...`);
      let buffer = await generateImage(asset.prompt, asset.aspect);
      console.log(`  Generated (${(buffer.length / 1024).toFixed(0)} KB)`);

      // Remove background
      if (asset.removeBg) {
        console.log(`  Removing background...`);
        buffer = await removeBackground(buffer);
        console.log(`  Background removed (${(buffer.length / 1024).toFixed(0)} KB)`);
      }

      // Upload
      console.log(`  Uploading to Supabase...`);
      const url = await uploadToSupabase(asset.filename, buffer);
      console.log(`  ✅ ${url}\n`);
      results.push({ key: asset.key, url });
    } catch (err: any) {
      console.error(`  ❌ FAILED: ${err.message}\n`);
      results.push({ key: asset.key, error: err.message });
    }

    // Small delay between API calls to avoid rate limits
    if (i < assets.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Summary
  console.log("\n═══════════════════════════════════════════");
  console.log("SUMMARY");
  console.log("═══════════════════════════════════════════");
  const success = results.filter((r) => r.url);
  const failed = results.filter((r) => r.error);
  console.log(`✅ ${success.length} succeeded`);
  if (failed.length) {
    console.log(`❌ ${failed.length} failed:`);
    failed.forEach((f) => console.log(`   - ${f.key}: ${f.error}`));
  }
  console.log(`\nAssets stored at: pixel-art/8bit/scenery/`);
  console.log(`Refresh the racer at /arcade/racer-classic/v5.carshow.html to see them.\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
