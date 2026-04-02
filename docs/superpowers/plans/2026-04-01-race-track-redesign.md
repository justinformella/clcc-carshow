# Race Track Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat CSS road in the racing game with a pseudo-3D arcade racer track (OutRun-style) and add rear-view pixel art generation for opponent cars.

**Architecture:** Extend the existing pixel art pipeline to generate a third image (rear view) per car. Replace the CSS-based road rendering with a Canvas 2D pseudo-3D road. Overlay the opponent's rear-view sprite as a DOM element positioned based on relative race distance. Dashboard and race physics remain unchanged.

**Tech Stack:** Next.js App Router, Canvas 2D API, Supabase Storage, Gemini Imagen / OpenAI image generation

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `types/database.ts` | Modify | Add `pixel_rear_url` field to Registration type |
| `lib/generate-pixel-art.ts` | Modify | Add rear-view generation as third parallel image |
| `app/api/registrations/pixel-art/route.ts` | Modify | Add `batch_rear` mode for backfilling rear views only |
| `app/api/race/route.ts` | Modify | Include `pixel_rear_url` in select, expose as `pixelRear` |
| `app/race/page.tsx` | Modify | Replace CSS road with Canvas 2D pseudo-3D, use rear sprite for opponent |

---

### Task 1: Add `pixel_rear_url` to Registration Type

**Files:**
- Modify: `types/database.ts:34-35`

- [ ] **Step 1: Add the field to the Registration type**

In `types/database.ts`, add `pixel_rear_url` after `pixel_dashboard_url`:

```typescript
  pixel_art_url: string | null;
  pixel_dashboard_url: string | null;
  pixel_rear_url: string | null;
```

- [ ] **Step 2: Commit**

```bash
git add types/database.ts
git commit -m "feat: add pixel_rear_url field to Registration type"
```

---

### Task 2: Extend Pixel Art Generation to Include Rear View

**Files:**
- Modify: `lib/generate-pixel-art.ts`

- [ ] **Step 1: Update generatePixelArt to generate three images in parallel**

Replace the function to generate side, dash, AND rear views. The key changes:
- Add a third prompt for rear view
- Generate all three in parallel with `Promise.all`
- Upload the rear image alongside the others
- Update the registration with all three URLs
- Return all three URLs

```typescript
import { createServerClient } from "@/lib/supabase-server";

export async function generatePixelArt(registrationId: string): Promise<{ sideUrl: string; dashUrl: string; rearUrl: string }> {
  const supabase = createServerClient();

  const { data: reg, error } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", registrationId)
    .single();

  if (error || !reg) throw new Error("Registration not found");

  const carDesc = `${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`;
  const color = reg.vehicle_color || "silver";

  // Generate all three images in parallel
  const [sideBuffer, dashBuffer, rearBuffer] = await Promise.all([
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
    generateImage(
      `8-bit retro pixel art rear view of a ${carDesc} in ${color}. ` +
      `The car is seen from directly behind, showing taillights, rear bumper, and rear window. ` +
      `Style like a 1990s DOS racing game (OutRun, Rad Racer). ` +
      `Black background, car fills the frame. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic.`
    ),
  ]);

  // Upload all to storage
  await supabase.storage.createBucket("pixel-art", {
    public: true,
    allowedMimeTypes: ["image/png"],
  });

  const sideFileName = `side-${registrationId}.png`;
  const dashFileName = `dash-${registrationId}.png`;
  const rearFileName = `rear-${registrationId}.png`;

  await Promise.all([
    supabase.storage.from("pixel-art").upload(sideFileName, sideBuffer, { contentType: "image/png", upsert: true }),
    supabase.storage.from("pixel-art").upload(dashFileName, dashBuffer, { contentType: "image/png", upsert: true }),
    supabase.storage.from("pixel-art").upload(rearFileName, rearBuffer, { contentType: "image/png", upsert: true }),
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/generate-pixel-art.ts
git commit -m "feat: add rear-view pixel art generation alongside side and dash"
```

---

### Task 3: Add Rear-View Backfill to Pixel Art API

**Files:**
- Modify: `app/api/registrations/pixel-art/route.ts`

- [ ] **Step 1: Add `batch_rear` mode and standalone `generateRearOnly` function**

The existing `batch` mode generates all three views for cars missing `pixel_art_url`. The new `batch_rear` mode generates ONLY the rear view for cars that already have side+dash but are missing the rear. This avoids regenerating existing images.

Replace the full file:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generatePixelArt } from "@/lib/generate-pixel-art";

async function generateRearOnly(registrationId: string): Promise<{ rearUrl: string }> {
  const supabase = createServerClient();

  const { data: reg, error } = await supabase
    .from("registrations")
    .select("vehicle_year, vehicle_make, vehicle_model, vehicle_color")
    .eq("id", registrationId)
    .single();

  if (error || !reg) throw new Error("Registration not found");

  const carDesc = `${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`;
  const color = reg.vehicle_color || "silver";

  const prompt =
    `8-bit retro pixel art rear view of a ${carDesc} in ${color}. ` +
    `The car is seen from directly behind, showing taillights, rear bumper, and rear window. ` +
    `Style like a 1990s DOS racing game (OutRun, Rad Racer). ` +
    `Black background, car fills the frame. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic.`;

  // Use the same image generation pipeline
  const { generateImage } = await import("@/lib/generate-pixel-art");
  const rearBuffer = await generateImage(prompt);

  await supabase.storage.createBucket("pixel-art", {
    public: true,
    allowedMimeTypes: ["image/png"],
  });

  const rearFileName = `rear-${registrationId}.png`;
  await supabase.storage.from("pixel-art").upload(rearFileName, rearBuffer, { contentType: "image/png", upsert: true });

  const rearUrl = `${supabase.storage.from("pixel-art").getPublicUrl(rearFileName).data.publicUrl}?v=${Date.now()}`;

  await supabase
    .from("registrations")
    .update({ pixel_rear_url: rearUrl })
    .eq("id", registrationId);

  return { rearUrl };
}

export async function POST(request: NextRequest) {
  try {
    const { registration_id, batch, batch_rear } = await request.json();

    // Batch rear-only: generate rear views for cars that have side+dash but no rear
    if (batch_rear) {
      const supabase = createServerClient();
      const { data } = await supabase
        .from("registrations")
        .select("id")
        .in("payment_status", ["paid", "comped"])
        .not("pixel_art_url", "is", null)
        .is("pixel_rear_url", null)
        .order("car_number", { ascending: true });

      const toGenerate = data || [];
      let generated = 0;
      const errors: string[] = [];

      for (const reg of toGenerate) {
        try {
          await generateRearOnly(reg.id);
          generated++;
        } catch (err) {
          errors.push(`${reg.id}: ${err instanceof Error ? err.message : "Unknown"}`);
        }
      }

      return NextResponse.json({ generated, total: toGenerate.length, errors: errors.length > 0 ? errors : undefined });
    }

    // Batch all: generate all three views for cars missing pixel art
    if (batch) {
      const supabase = createServerClient();
      const { data } = await supabase
        .from("registrations")
        .select("id")
        .in("payment_status", ["paid", "comped"])
        .is("pixel_art_url", null)
        .order("car_number", { ascending: true });

      const toGenerate = data || [];
      let generated = 0;
      const errors: string[] = [];

      for (const reg of toGenerate) {
        try {
          await generatePixelArt(reg.id);
          generated++;
        } catch (err) {
          errors.push(`${reg.id}: ${err instanceof Error ? err.message : "Unknown"}`);
        }
      }

      return NextResponse.json({ generated, total: toGenerate.length, errors: errors.length > 0 ? errors : undefined });
    }

    if (!registration_id) {
      return NextResponse.json({ error: "Provide registration_id, batch: true, or batch_rear: true" }, { status: 400 });
    }

    const result = await generatePixelArt(registration_id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Pixel art generation error:", err);
    return NextResponse.json({ error: "Failed to generate pixel art" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Export `generateImage` from `lib/generate-pixel-art.ts`**

The `generateRearOnly` function needs access to `generateImage`. Change it from a private function to an exported one in `lib/generate-pixel-art.ts`:

Change `async function generateImage(prompt: string)` to `export async function generateImage(prompt: string)`.

- [ ] **Step 3: Commit**

```bash
git add app/api/registrations/pixel-art/route.ts lib/generate-pixel-art.ts
git commit -m "feat: add batch_rear mode for backfilling rear-view pixel art"
```

---

### Task 4: Add `pixelRear` to Race API Response

**Files:**
- Modify: `app/api/race/route.ts`

- [ ] **Step 1: Add `pixel_rear_url` to the select query and response mapping**

In the registrations select (line 10), add `pixel_rear_url`:

```typescript
    const { data: registrations } = await supabase
      .from("registrations")
      .select("id, car_number, vehicle_year, vehicle_make, vehicle_model, vehicle_color, first_name, last_name, ai_image_url, pixel_art_url, pixel_dashboard_url, pixel_rear_url")
      .in("payment_status", ["paid", "comped"])
      .order("car_number", { ascending: true });
```

In the map return object (after line 47), add:

```typescript
          pixelRear: r.pixel_rear_url || null,
```

- [ ] **Step 2: Commit**

```bash
git add app/api/race/route.ts
git commit -m "feat: include pixelRear in race API response"
```

---

### Task 5: Rewrite Race Track View with Canvas 2D Pseudo-3D Road

**Files:**
- Modify: `app/race/page.tsx`

This is the largest task. We replace the Sky + Road CSS sections (lines 307-341) with a Canvas-based pseudo-3D road renderer, and overlay the opponent car as a DOM element positioned by perspective math.

- [ ] **Step 1: Add `pixelRear` to the RaceCar type**

At the top of the file, update the type:

```typescript
type RaceCar = {
  id: string;
  carNumber: number;
  name: string;
  color: string;
  owner: string;
  hp: number;
  weight: number;
  pwr: number;
  pixelArt: string | null;
  pixelDash: string | null;
  pixelRear: string | null;
  aiImage: string | null;
};
```

- [ ] **Step 2: Update the car fetch to include pixelRear**

In the `useEffect` that fetches cars (around line 50), update the mapping:

```typescript
        const raceCars: RaceCar[] = (data.cars || []).map((c: Record<string, unknown>) => ({
          ...c,
          pixelArt: c.pixelArt || null,
          pixelDash: c.pixelDash || null,
          pixelRear: c.pixelRear || null,
          aiImage: c.aiImage || null,
        }));
```

- [ ] **Step 3: Add canvas ref and replace roadRef**

Replace `const roadRef = useRef<HTMLDivElement>(null);` with:

```typescript
  const canvasRef = useRef<HTMLCanvasElement>(null);
```

- [ ] **Step 4: Add the drawRoad function**

Add this function inside the `RacePage` component, after the state declarations and before `selectCar`:

```typescript
  const drawRoad = useCallback((canvas: HTMLCanvasElement, roadOffset: number, playerSpd: number) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Horizon at 30% from top
    const horizonY = H * 0.3;

    // ─── SKY ───
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, "#0a1628");
    skyGrad.addColorStop(1, "#1a3a5c");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, horizonY);

    // Horizon tree line (simple pixel blocks)
    ctx.fillStyle = "#0d2a12";
    for (let x = 0; x < W; x += 30) {
      const treeH = 12 + Math.sin(x * 0.3) * 6;
      ctx.fillRect(x, horizonY - treeH, 20, treeH);
    }

    // ─── ROAD (perspective, row by row) ───
    const vanishX = W / 2;
    const roadWidthBottom = W * 0.7;  // road width at very bottom
    const roadWidthTop = W * 0.04;     // road width at horizon

    const shoulderWidthBottom = W * 0.12;
    const shoulderWidthTop = 2;

    const totalRows = H - horizonY;

    for (let row = 0; row < totalRows; row++) {
      const y = horizonY + row;
      const t = row / totalRows; // 0 at horizon, 1 at bottom

      // Use exponential scaling for more realistic perspective
      const perspective = t * t;

      const roadW = roadWidthTop + (roadWidthBottom - roadWidthTop) * perspective;
      const shoulderW = shoulderWidthTop + (shoulderWidthBottom - shoulderWidthTop) * perspective;

      const roadLeft = vanishX - roadW / 2;
      const roadRight = vanishX + roadW / 2;

      // Z-depth for stripe calculation (deeper = further)
      const z = 1 / (t + 0.01);
      const stripePhase = (z + roadOffset * 0.3) % 20;

      // ─── Grass / shoulder ───
      const grassDark = stripePhase < 10;
      ctx.fillStyle = grassDark ? "#1a5c1a" : "#1e6b1e";
      ctx.fillRect(0, y, roadLeft - shoulderW, 1);
      ctx.fillRect(roadRight + shoulderW, y, W - (roadRight + shoulderW), 1);

      // Shoulder (rumble strips)
      ctx.fillStyle = grassDark ? "#cc3333" : "#ffffff";
      ctx.fillRect(roadLeft - shoulderW, y, shoulderW, 1);
      ctx.fillRect(roadRight, y, shoulderW, 1);

      // ─── Road surface ───
      ctx.fillStyle = stripePhase < 10 ? "#333333" : "#3a3a3a";
      ctx.fillRect(roadLeft, y, roadW, 1);

      // ─── Center dashed line (between the two lanes) ───
      if (stripePhase < 8 && stripePhase > 2) {
        const lineW = Math.max(2, 4 * perspective);
        ctx.fillStyle = "#c9a84c";
        ctx.fillRect(vanishX - lineW / 2, y, lineW, 1);
      }

      // ─── Lane quarter lines (subtle) ───
      const laneOffset = roadW / 4;
      if (stripePhase < 6 && stripePhase > 3) {
        const lineW = Math.max(1, 2 * perspective);
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(vanishX - laneOffset - lineW / 2, y, lineW, 1);
        ctx.fillRect(vanishX + laneOffset - lineW / 2, y, lineW, 1);
      }
    }
  }, []);
```

- [ ] **Step 5: Update the animation loop to use canvas**

In the `startRace` callback, replace the road scroll logic. Remove:

```typescript
          // Road scroll
          roadOffset = (roadOffset + pSpeed * 2) % 40;
          if (roadRef.current) {
            roadRef.current.style.backgroundPosition = `0 ${roadOffset}px`;
          }
```

Replace with:

```typescript
          // Road scroll — update offset and draw
          roadOffset = roadOffset + pSpeed * 0.5;
          if (canvasRef.current) {
            drawRoad(canvasRef.current, roadOffset, pSpeed);
          }
```

- [ ] **Step 6: Add canvas resize handler**

Add this `useEffect` after the keyboard effect, to keep the canvas sized to its container:

```typescript
  // Keep canvas resolution matched to display size
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [phase]);
```

- [ ] **Step 7: Replace the Sky + Road JSX with canvas and opponent overlay**

Replace the entire race view section (from `{/* Race view */}` through the dashboard) with the new layout. The structure becomes:

```
Race view container (flex column)
  ├── Track area (65%, position relative)
  │   ├── <canvas> (fills the area — draws sky + road)
  │   └── Opponent sprite (absolute positioned DOM element on top of canvas)
  └── Dashboard area (35%, unchanged)
```

Replace from `{/* Race view */}` (line 306) through the end of the dashboard div (line 383) with:

```tsx
      {/* Race view */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        {/* Track area — canvas + opponent overlay */}
        <div style={{ height: "65%", position: "relative", overflow: "hidden", background: "#0a1628" }}>
          <canvas
            ref={canvasRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />

          {/* Opponent car sprite */}
          {phase !== "select" && opponentCar && (() => {
            // Map distance delta to visual position
            const delta = opponentPos - playerPos; // positive = opponent ahead
            // Normalize: at delta=0 they're even, at delta=50 they're at horizon
            const normalizedDist = Math.max(-30, Math.min(50, delta));

            // T: 0 = bottom of road (behind us), 1 = horizon (far ahead)
            // When even (delta=0), car is at about 60% up the road
            const t = Math.min(1, Math.max(0, 0.6 + normalizedDist / 120));

            // Scale: 1.0 at bottom, 0.15 at horizon
            const scale = 1.0 - t * 0.85;

            // Vertical position: 30% (horizon) to 95% (bottom of track area)
            const topPct = 30 + (1 - t) * 60;

            // Horizontal offset: opponent is in the left lane
            // At bottom (close), offset is large; at horizon, offset converges to center
            const laneOffset = 18 * scale;

            // Width of the sprite
            const spriteWidth = Math.round(140 * scale);

            // Hide if they've fallen way behind (off screen)
            const visible = normalizedDist > -25;

            return visible ? (
              <div style={{
                position: "absolute",
                top: `${topPct}%`,
                left: `calc(50% - ${laneOffset}%)`,
                transform: "translate(-50%, -100%)",
                zIndex: 2,
                transition: "top 0.05s linear, left 0.05s linear",
                pointerEvents: "none",
              }}>
                {opponentCar.pixelRear ? (
                  <img
                    src={opponentCar.pixelRear}
                    alt="opponent"
                    style={{
                      width: `${spriteWidth}px`,
                      imageRendering: "pixelated",
                      filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
                    }}
                  />
                ) : (
                  <div style={{
                    width: `${spriteWidth}px`,
                    height: `${Math.round(spriteWidth * 0.55)}px`,
                    background: "#dc2626",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: `${Math.max(8, 14 * scale)}px`,
                    fontWeight: 700,
                  }}>
                    #{opponentCar.carNumber}
                  </div>
                )}
              </div>
            ) : null;
          })()}
        </div>

        {/* Dashboard */}
        <div style={{
          height: "35%",
          background: "#1a1a1e",
          position: "relative",
          overflow: "hidden",
        }}>
          {playerCar?.pixelDash ? (
            <img src={playerCar.pixelDash} alt="dashboard" style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated", opacity: 0.7 }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(to bottom, #222, #111)" }} />
          )}

          {/* Gauges overlay */}
          <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "2rem", alignItems: "flex-end" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "monospace", fontSize: "2.5rem", fontWeight: 700, color: "#c9a84c", textShadow: "0 0 10px rgba(201,168,76,0.5)", lineHeight: 1 }}>
                {playerSpeed}
              </div>
              <div style={{ fontSize: "0.6rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>MPH</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "monospace", fontSize: "1.5rem", fontWeight: 700, color: rpm > 6000 ? "#dc2626" : "#ddd", textShadow: rpm > 6000 ? "0 0 10px rgba(220,38,38,0.5)" : "none", lineHeight: 1 }}>
                {rpm}
              </div>
              <div style={{ fontSize: "0.6rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>RPM</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "monospace", fontSize: "2rem", fontWeight: 700, color: "#16a34a", lineHeight: 1 }}>
                {gear}
              </div>
              <div style={{ fontSize: "0.6rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>GEAR</div>
            </div>
          </div>
        </div>
```

- [ ] **Step 8: Verify the build compiles**

```bash
cd /Users/justinformella/clcc-carshow && npx next build 2>&1 | tail -20
```

Expected: Build succeeds with no type errors.

- [ ] **Step 9: Commit**

```bash
git add app/race/page.tsx
git commit -m "feat: replace CSS road with Canvas 2D pseudo-3D arcade racer track"
```

---

### Task 6: Visual Testing and Tuning

- [ ] **Step 1: Run the dev server and test**

```bash
cd /Users/justinformella/clcc-carshow && npm run dev
```

Open `http://localhost:3000/race`, select a car, and run a race. Verify:
- The pseudo-3D road renders with perspective convergence
- Road stripes scroll when accelerating
- Grass shoulders have alternating stripe colors
- Opponent car sprite scales and moves based on relative position
- Dashboard is unchanged at the bottom
- Mobile accelerate button still works

- [ ] **Step 2: Tune perspective constants if needed**

Key values to adjust in `drawRoad` and the opponent positioning:
- `roadWidthBottom` / `roadWidthTop` — how wide the road appears
- `shoulderWidthBottom` — rumble strip width
- `horizonY` ratio — where the horizon sits
- Opponent `laneOffset` multiplier — how far into the adjacent lane
- Opponent `spriteWidth` base size — starting size of the car sprite

- [ ] **Step 3: Commit any tuning changes**

```bash
git add app/race/page.tsx
git commit -m "fix: tune pseudo-3D road perspective and opponent positioning"
```

---

### Task 7: SQL Migration and Backfill

This task is manual — provide the SQL for the user to run.

- [ ] **Step 1: Document the SQL migration**

Run in Supabase SQL Editor:

```sql
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS pixel_rear_url TEXT;
```

- [ ] **Step 2: Run the backfill**

After the column exists, trigger the backfill via:

```bash
curl -X POST http://localhost:3000/api/registrations/pixel-art \
  -H "Content-Type: application/json" \
  -d '{"batch_rear": true}'
```

Or from the browser console on the admin page:

```javascript
fetch("/api/registrations/pixel-art", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ batch_rear: true }),
}).then(r => r.json()).then(console.log)
```

- [ ] **Step 3: Verify backfill**

Check that cars now have `pixel_rear_url` populated in Supabase dashboard.
