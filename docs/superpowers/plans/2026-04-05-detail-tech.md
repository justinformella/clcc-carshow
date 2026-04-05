# Detail Tech Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Detail Tech" scratch-off detailing mini-game to the /race page where players clean their car inside and out, earning a showroom score.

**Architecture:** New `"detail"` phase in the existing `/race` page, following the same canvas-based pattern as the dyno. Grime overlay uses an offscreen canvas with `destination-out` compositing for the scratch-off effect. Sparkle particles reuse the dyno exhaust particle system pattern. A new API endpoint generates the detail bay background and logo via Imagen.

**Tech Stack:** React (existing page), HTML5 Canvas, Web Audio API (OscillatorNode), Imagen API, Supabase Storage

**Spec:** `docs/superpowers/specs/2026-04-05-detail-tech-design.md`

---

### Task 1: Generate Detail Bay Assets API Endpoint

**Files:**
- Create: `app/api/registrations/pixel-art/generate-detail-bay/route.ts`

- [ ] **Step 1: Create the endpoint**

```typescript
// app/api/registrations/pixel-art/generate-detail-bay/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateImage } from "@/lib/generate-pixel-art";

export async function POST() {
  try {
    const supabase = createServerClient();

    await supabase.storage.createBucket("pixel-art", { public: true, allowedMimeTypes: ["image/png"] });

    const ts = Date.now();
    const results: Record<string, string> = {};

    // Detail bay background
    const bayPrompt =
      `8-bit retro pixel art side view of an automotive detailing bay interior. ` +
      `Clean white tile walls, polished gray concrete floor with a drain grate. ` +
      `Bright overhead fluorescent strip lights. On the left wall, a pegboard with hanging spray bottles, ` +
      `microfiber towels, and a buffer/polisher. A rolling red tool cart with detailing supplies. ` +
      `A pressure washer on the right side. The floor is wet with a subtle shine. ` +
      `Open garage door on the right side showing daylight outside. ` +
      `Style like a 1990s DOS racing game. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic. ` +
      `Side-on view, no perspective distortion. No car in the bay — the floor is empty.`;

    const bayBuffer = await generateImage(bayPrompt);
    const bayName = "detail-bay.png";
    await supabase.storage.from("pixel-art").upload(bayName, bayBuffer, { contentType: "image/png", upsert: true });
    results.bayUrl = `${supabase.storage.from("pixel-art").getPublicUrl(bayName).data.publicUrl}?v=${ts}`;

    // Detail Tech logo
    const logoPrompt =
      `8-bit retro pixel art logo for "DETAIL TECH" automotive detailing shop. ` +
      `Bold blocky pixel letters spelling "DETAIL TECH" with a subtle shine/sparkle effect on the letters. ` +
      `Color scheme: gold text on transparent/black background. ` +
      `A small pixel art spray bottle icon next to the text. ` +
      `Style like a 1990s DOS game title screen logo. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic.`;

    const logoBuffer = await generateImage(logoPrompt, "4:1");
    const logoName = "detail-tech-logo.png";
    await supabase.storage.from("pixel-art").upload(logoName, logoBuffer, { contentType: "image/png", upsert: true });
    results.logoUrl = `${supabase.storage.from("pixel-art").getPublicUrl(logoName).data.publicUrl}?v=${ts}`;

    return NextResponse.json(results);
  } catch (err) {
    console.error("Detail bay generation error:", err);
    return NextResponse.json({ error: "Failed to generate detail bay assets" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test the endpoint**

Run the dev server and call:
```bash
curl -s -X POST http://localhost:3002/api/registrations/pixel-art/generate-detail-bay | python3 -m json.tool
```
Expected: JSON with `bayUrl` and `logoUrl` pointing to Supabase storage.

- [ ] **Step 3: Commit**

```bash
git add app/api/registrations/pixel-art/generate-detail-bay/route.ts
git commit -m "feat: add detail bay asset generation endpoint"
```

---

### Task 2: Update Action Menu — Add Detail Tech, Rename & Enable Cruise

**Files:**
- Modify: `app/race/page.tsx` (Phase type at line 59, action menu at lines 1085-1117)

- [ ] **Step 1: Update the Phase type**

In `app/race/page.tsx`, change the Phase type to include `"detail"`:

```typescript
type Phase = "loading" | "title" | "select" | "action-menu" | "dyno" | "detail" | "countdown" | "racing" | "finished";
```

- [ ] **Step 2: Update the action menu buttons**

Replace the existing action menu buttons section (the `<div>` containing DRAG RACE through PICK DIFFERENT CAR) with:

```tsx
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", maxWidth: "320px", margin: "0 auto" }}>
          <button onClick={() => { setupDragRace(); setPhase("select"); }} style={{ ...goldBtnStyle, width: "100%", padding: "1rem", fontSize: "1rem" }}>
            DRAG RACE
          </button>
          <button onClick={() => setPhase("dyno")} style={{ ...pixelBtnStyle, width: "100%", padding: "1rem", fontSize: "1rem", background: C.bgMid, color: C.gold, border: `2px solid ${C.goldDark}` }}>
            HIT THE DYNO AT URW
          </button>
          <button onClick={() => setPhase("detail")} style={{ ...pixelBtnStyle, width: "100%", padding: "1rem", fontSize: "1rem", background: C.bgMid, color: C.gold, border: `2px solid ${C.goldDark}` }}>
            DETAIL TECH
          </button>
          <button onClick={() => setPhase("cruise")} style={{ ...pixelBtnStyle, width: "100%", padding: "1rem", fontSize: "1rem", background: C.bgMid, color: C.gold, border: `2px solid ${C.goldDark}` }}>
            CRUISE ROUTE 14
          </button>
          <button onClick={() => { setPlayerCar(null); setOpponentCar(null); setPhase("select"); }} style={{ background: "none", border: "none", color: C.midGray, fontFamily: FONT, fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline", marginTop: "1rem" }}>
            PICK DIFFERENT CAR
          </button>
        </div>
```

Key changes: added DETAIL TECH button, renamed cruise to CRUISE ROUTE 14, removed `disabled` and the "COMING SOON" paragraph.

- [ ] **Step 3: Verify the action menu renders**

Load the race page, select a car, and confirm all four buttons appear. DETAIL TECH should navigate to a blank page (phase not yet implemented). CRUISE ROUTE 14 should be clickable (it will fail gracefully since the cruise phase doesn't exist yet — that's fine, the user is wiring it separately).

- [ ] **Step 4: Commit**

```bash
git add app/race/page.tsx
git commit -m "feat: add Detail Tech to action menu, enable Cruise Route 14"
```

---

### Task 3: Detail Phase — State, Refs, Asset Loading, and Idle Canvas

**Files:**
- Modify: `app/race/page.tsx`

This task adds the state variables, refs, asset preloading, and idle canvas drawing for the detail phase. The detail phase shows the car in the detail bay with a grime overlay before the player starts.

- [ ] **Step 1: Add state variables and refs**

Add these alongside the existing dyno state variables (near line 282):

```typescript
  // Detail Tech state
  const [detailState, setDetailState] = useState<"idle" | "exterior" | "interior" | "sweep" | "reveal">("idle");
  const [detailProgress, setDetailProgress] = useState(0);
  const [exteriorScore, setExteriorScore] = useState(0);
  const [interiorScore, setInteriorScore] = useState(0);
  const detailCanvasRef = useRef<HTMLCanvasElement>(null);
  const detailAnimRef = useRef<number>(0);
  const detailCarImgRef = useRef<HTMLImageElement | null>(null);
  const detailDashImgRef = useRef<HTMLImageElement | null>(null);
  const detailBayImgRef = useRef<HTMLImageElement | null>(null);
  const detailLogoImgRef = useRef<HTMLImageElement | null>(null);
  const grimeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const detailParticlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; star: boolean }[]>([]);
  const isDraggingRef = useRef(false);
  const lastDragPosRef = useRef<{ x: number; y: number } | null>(null);
```

- [ ] **Step 2: Add asset URL constants**

Add near the existing `DYNO_ROOM_URL` constant (line 245):

```typescript
const DETAIL_BAY_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pixel-art/detail-bay.png`;
const DETAIL_LOGO_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pixel-art/detail-tech-logo.png`;
```

- [ ] **Step 3: Add the idle drawing useEffect**

Add a useEffect that preloads images and draws the idle state when entering the detail phase. Place it after the dyno idle drawing useEffect:

```typescript
  // Draw idle detail canvas when entering detail phase
  useEffect(() => {
    if (phase !== "detail" || !playerCar) return;
    initAudio();
    setDetailState("idle");
    setDetailProgress(0);
    setExteriorScore(0);
    setInteriorScore(0);

    // Preload images
    const carImg = new Image();
    carImg.crossOrigin = "anonymous";
    if (playerCar.pixelArt) carImg.src = playerCar.pixelArt;
    detailCarImgRef.current = carImg;

    const dashImg = new Image();
    dashImg.crossOrigin = "anonymous";
    if (playerCar.pixelDash) dashImg.src = playerCar.pixelDash;
    detailDashImgRef.current = dashImg;

    const bayImg = new Image();
    bayImg.crossOrigin = "anonymous";
    bayImg.src = DETAIL_BAY_URL;
    detailBayImgRef.current = bayImg;

    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    logoImg.src = DETAIL_LOGO_URL;
    detailLogoImgRef.current = logoImg;

    const drawIdle = () => {
      const canvas = detailCanvasRef.current;
      if (!canvas) { requestAnimationFrame(drawIdle); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = canvas.width;
      const H = canvas.height;

      // Dark background
      ctx.fillStyle = "#0d0d1a";
      ctx.fillRect(0, 0, W, H);

      // Bay background
      if (bayImg.complete && bayImg.naturalWidth > 0) {
        ctx.globalAlpha = 0.8;
        ctx.drawImage(bayImg, 0, 0, W, H);
        ctx.globalAlpha = 1;
      } else {
        bayImg.onload = () => requestAnimationFrame(drawIdle);
        return;
      }

      // Car sprite
      const groundY = H * 0.95;
      const carCX = W * 0.5;
      if (carImg.complete && carImg.naturalWidth > 0) {
        const carW = W * 0.4;
        const carH = carW * (carImg.height / carImg.width);
        const carX = carCX - carW / 2;
        const carY = groundY - carH;
        ctx.save();
        if (playerCar.flipped) {
          ctx.translate(carX + carW, carY);
          ctx.scale(-1, 1);
          ctx.drawImage(carImg, 0, 0, carW, carH);
        } else {
          ctx.drawImage(carImg, carX, carY, carW, carH);
        }
        ctx.restore();

        // Draw grime overlay on top of car
        ctx.fillStyle = "rgba(80, 60, 30, 0.45)";
        ctx.fillRect(carX, carY, carW, carH);
      } else {
        carImg.onload = () => requestAnimationFrame(drawIdle);
      }
    };

    const waitForCanvas = () => {
      if (detailCanvasRef.current) drawIdle();
      else requestAnimationFrame(waitForCanvas);
    };
    waitForCanvas();
  }, [phase, playerCar]);
```

- [ ] **Step 4: Add the detail phase JSX**

Add the detail phase rendering block after the dyno phase block (after the `// ─── DYNO ROOM ───` section ends). This is the idle/container view:

```tsx
  // ─── DETAIL TECH ───
  if (phase === "detail" && playerCar) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.6rem", color: C.midGray, letterSpacing: "0.2em" }}>DETAIL TECH</p>
          {detailLogoImgRef.current?.complete && detailLogoImgRef.current.naturalWidth > 0 ? (
            <img src={DETAIL_LOGO_URL} alt="Detail Tech" style={{ maxWidth: "200px", margin: "0.5rem auto", display: "block", imageRendering: "pixelated" }} />
          ) : (
            <h1 style={{ fontFamily: FONT, fontSize: "clamp(0.9rem, 2.5vw, 1.3rem)", color: C.gold, margin: "0.25rem 0" }}>DETAIL TECH</h1>
          )}
        </div>

        <canvas
          ref={detailCanvasRef}
          width={800}
          height={400}
          style={{ width: "100%", maxWidth: "800px", display: "block", margin: "0 auto", imageRendering: "pixelated", border: `1px solid ${C.border}` }}
        />

        {/* Progress bar */}
        {(detailState === "exterior" || detailState === "interior") && (
          <div style={{ maxWidth: "800px", margin: "0.5rem auto", padding: "0 0.5rem" }}>
            <div style={{ background: "#1a1a1a", height: 8, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ background: C.gold, width: `${detailProgress}%`, height: "100%", transition: "width 0.1s" }} />
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.55rem", color: C.midGray, textAlign: "center", marginTop: "0.3rem" }}>
              {detailState === "exterior" ? "EXTERIOR" : "INTERIOR"} — {Math.round(detailProgress)}% CLEAN
            </p>
          </div>
        )}

        {/* Controls */}
        {detailState === "idle" && (
          <button onClick={() => startDetailExterior()} style={{ ...goldBtnStyle, padding: "0.8rem 2.5rem", fontSize: "1rem", display: "block", margin: "1rem auto" }}>
            START DETAIL
          </button>
        )}

        {(detailState === "exterior" || detailState === "interior") && (
          <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
            <p style={{ fontFamily: FONT, fontSize: "0.5rem", color: C.midGray }}>Click to spray · Drag to wipe</p>
            {detailProgress >= 50 && (
              <button
                onClick={() => finishDetailPass()}
                style={{ ...pixelBtnStyle, padding: "0.5rem 1.5rem", fontSize: "0.7rem", marginTop: "0.5rem", background: C.bgMid, color: C.gold, border: `1px solid ${C.goldDark}` }}
              >
                DONE
              </button>
            )}
          </div>
        )}

        {detailState === "reveal" && (
          <DetailReveal exteriorScore={exteriorScore} interiorScore={interiorScore} />
        )}

        <button
          onClick={() => { cancelAnimationFrame(detailAnimRef.current); stopAll(); setDetailState("idle"); setPhase("action-menu"); }}
          style={{ background: "none", border: "none", color: C.midGray, fontFamily: FONT, fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline", marginTop: "1.5rem", display: "block", margin: "1.5rem auto 0" }}
        >
          BACK TO GARAGE
        </button>
      </div>
    );
  }
```

- [ ] **Step 5: Verify idle state renders**

Load the race page, select a car, click DETAIL TECH. Verify:
- Header shows "DETAIL TECH"
- Canvas shows the car on the detail bay background with a brown grime overlay
- "START DETAIL" button is visible
- "BACK TO GARAGE" link works

- [ ] **Step 6: Commit**

```bash
git add app/race/page.tsx
git commit -m "feat: detail phase idle state with canvas, grime overlay, and asset loading"
```

---

### Task 4: Grime Canvas, Scratch-Off Interaction, and Progress Tracking

**Files:**
- Modify: `app/race/page.tsx`

This task implements the core scratch-off mechanic: an offscreen grime canvas, mouse/touch interaction to erase it, progress tracking, and sparkle particles.

- [ ] **Step 1: Add helper functions for grime and interaction**

Add these functions inside the `RacePage` component, before the phase rendering blocks:

```typescript
  // Initialize grime canvas with textured dirt overlay
  const initGrimeCanvas = useCallback((width: number, height: number) => {
    const grime = document.createElement("canvas");
    grime.width = width;
    grime.height = height;
    const gCtx = grime.getContext("2d")!;

    // Base grime color
    gCtx.fillStyle = "rgba(80, 60, 30, 0.45)";
    gCtx.fillRect(0, 0, width, height);

    // Noise texture — random spots for variation
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = 2 + Math.random() * 6;
      const alpha = 0.05 + Math.random() * 0.15;
      gCtx.fillStyle = Math.random() > 0.5
        ? `rgba(60, 40, 20, ${alpha})`
        : `rgba(100, 80, 40, ${alpha})`;
      gCtx.beginPath();
      gCtx.arc(x, y, r, 0, Math.PI * 2);
      gCtx.fill();
    }

    grimeCanvasRef.current = grime;
  }, []);

  // Erase grime at a point (spray/wipe)
  const eraseGrimeAt = useCallback((canvasX: number, canvasY: number, radius: number) => {
    const grime = grimeCanvasRef.current;
    if (!grime) return;
    const gCtx = grime.getContext("2d");
    if (!gCtx) return;

    gCtx.globalCompositeOperation = "destination-out";
    gCtx.beginPath();
    gCtx.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
    gCtx.fill();
    gCtx.globalCompositeOperation = "source-over";

    // Spawn sparkle particles
    const particles = detailParticlesRef.current;
    const count = radius > 20 ? 4 : 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2.5;
      particles.push({
        x: canvasX,
        y: canvasY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 18 + Math.random() * 10,
        maxLife: 28,
        star: Math.random() < 0.15,
      });
    }
  }, []);

  // Calculate percentage of grime removed
  const calcGrimeProgress = useCallback(() => {
    const grime = grimeCanvasRef.current;
    if (!grime) return 0;
    const gCtx = grime.getContext("2d");
    if (!gCtx) return 0;
    const data = gCtx.getImageData(0, 0, grime.width, grime.height).data;
    let cleared = 0;
    let total = 0;
    // Sample every 8th pixel for performance
    for (let i = 3; i < data.length; i += 32) {
      total++;
      if (data[i] === 0) cleared++;
    }
    return total > 0 ? (cleared / total) * 100 : 0;
  }, []);

  // Convert mouse/touch event to canvas coordinates
  const toCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);
```

- [ ] **Step 2: Add canvas interaction event handlers**

Add these handlers inside the `RacePage` component:

```typescript
  // Play spray sound (short white noise burst)
  const playSpraySound = useCallback(() => {
    try {
      const actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const bufferSize = actx.sampleRate * 0.08;
      const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
      const source = actx.createBufferSource();
      source.buffer = buffer;
      const filter = actx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 3000;
      source.connect(filter);
      filter.connect(actx.destination);
      source.start();
    } catch { /* audio may not be available */ }
  }, []);

  // Play sparkle ping
  const playSparkleSound = useCallback(() => {
    try {
      const actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.frequency.value = 1800 + Math.random() * 400;
      osc.type = "sine";
      gain.gain.value = 0.06;
      osc.start();
      osc.stop(actx.currentTime + 0.03);
    } catch { /* audio may not be available */ }
  }, []);

  const handleDetailPointerDown = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (detailState !== "exterior" && detailState !== "interior") return;
    e.preventDefault();
    const canvas = detailCanvasRef.current;
    if (!canvas) return;
    const pos = toCanvasCoords(e, canvas);
    isDraggingRef.current = true;
    lastDragPosRef.current = pos;
    eraseGrimeAt(pos.x, pos.y, 25);
    playSpraySound();
    playSparkleSound();
  }, [detailState, toCanvasCoords, eraseGrimeAt, playSpraySound, playSparkleSound]);

  const handleDetailPointerMove = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const canvas = detailCanvasRef.current;
    if (!canvas) return;
    const pos = toCanvasCoords(e, canvas);
    const last = lastDragPosRef.current;
    if (last) {
      const dx = pos.x - last.x;
      const dy = pos.y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.floor(dist / 8));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        eraseGrimeAt(last.x + dx * t, last.y + dy * t, 20);
      }
    }
    lastDragPosRef.current = pos;
  }, [toCanvasCoords, eraseGrimeAt]);

  const handleDetailPointerUp = useCallback(() => {
    isDraggingRef.current = false;
    lastDragPosRef.current = null;
    // Update progress
    const pct = calcGrimeProgress();
    setDetailProgress(pct);
    if (pct >= 95) {
      finishDetailPass();
    }
  }, [calcGrimeProgress]);
```

- [ ] **Step 3: Wire event handlers to the canvas element**

Update the canvas element in the detail phase JSX to include the event handlers:

```tsx
        <canvas
          ref={detailCanvasRef}
          width={800}
          height={400}
          onMouseDown={handleDetailPointerDown}
          onMouseMove={handleDetailPointerMove}
          onMouseUp={handleDetailPointerUp}
          onMouseLeave={handleDetailPointerUp}
          onTouchStart={handleDetailPointerDown}
          onTouchMove={handleDetailPointerMove}
          onTouchEnd={handleDetailPointerUp}
          style={{ width: "100%", maxWidth: "800px", display: "block", margin: "0 auto", imageRendering: "pixelated", border: `1px solid ${C.border}`, cursor: detailState === "exterior" || detailState === "interior" ? "crosshair" : "default", touchAction: "none" }}
        />
```

- [ ] **Step 4: Commit**

```bash
git add app/race/page.tsx
git commit -m "feat: grime canvas scratch-off mechanic with sparkle particles and audio"
```

---

### Task 5: Detail Animation Loop — Exterior and Interior Passes

**Files:**
- Modify: `app/race/page.tsx`

This task adds the animation loop that continuously redraws the detail canvas (car + grime + particles), and the functions to start/finish each pass.

- [ ] **Step 1: Add the startDetailExterior function**

```typescript
  const startDetailExterior = useCallback(() => {
    if (!playerCar) return;
    setDetailState("exterior");
    setDetailProgress(0);
    detailParticlesRef.current = [];

    const canvas = detailCanvasRef.current;
    if (!canvas) return;
    initGrimeCanvas(canvas.width, canvas.height);

    // Start animation loop
    const draw = () => {
      const cvs = detailCanvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext("2d");
      if (!ctx) return;
      const W = cvs.width;
      const H = cvs.height;

      // Background
      ctx.fillStyle = "#0d0d1a";
      ctx.fillRect(0, 0, W, H);
      if (detailBayImgRef.current?.complete && detailBayImgRef.current.naturalWidth > 0) {
        ctx.globalAlpha = 0.8;
        ctx.drawImage(detailBayImgRef.current, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      // Car sprite
      const carImg = detailCarImgRef.current;
      const groundY = H * 0.95;
      const carCX = W * 0.5;
      if (carImg?.complete && carImg.naturalWidth > 0) {
        const carW = W * 0.4;
        const carH = carW * (carImg.height / carImg.width);
        const carX = carCX - carW / 2;
        const carY = groundY - carH;
        ctx.save();
        if (playerCar.flipped) {
          ctx.translate(carX + carW, carY);
          ctx.scale(-1, 1);
          ctx.drawImage(carImg, 0, 0, carW, carH);
        } else {
          ctx.drawImage(carImg, carX, carY, carW, carH);
        }
        ctx.restore();
      }

      // Grime overlay
      const grime = grimeCanvasRef.current;
      if (grime) {
        ctx.drawImage(grime, 0, 0);
      }

      // Sparkle particles
      const particles = detailParticlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        if (p.star) {
          // 4-pointed star
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x - 4, p.y); ctx.lineTo(p.x + 4, p.y);
          ctx.moveTo(p.x, p.y - 4); ctx.lineTo(p.x, p.y + 4);
          ctx.stroke();
        } else {
          const radius = 1 + (1 - p.life / p.maxLife) * 2;
          ctx.fillStyle = Math.random() > 0.3 ? "#ffffff" : "#ffd700";
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      detailAnimRef.current = requestAnimationFrame(draw);
    };

    detailAnimRef.current = requestAnimationFrame(draw);
  }, [playerCar, initGrimeCanvas]);
```

- [ ] **Step 2: Add the startDetailInterior function**

```typescript
  const startDetailInterior = useCallback(() => {
    if (!playerCar) return;
    setDetailState("interior");
    setDetailProgress(0);
    detailParticlesRef.current = [];

    const canvas = detailCanvasRef.current;
    if (!canvas) return;
    initGrimeCanvas(canvas.width, canvas.height);

    cancelAnimationFrame(detailAnimRef.current);

    const draw = () => {
      const cvs = detailCanvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext("2d");
      if (!ctx) return;
      const W = cvs.width;
      const H = cvs.height;

      // Dark background
      ctx.fillStyle = "#0d0d1a";
      ctx.fillRect(0, 0, W, H);

      // Dashboard image — fill canvas
      const dashImg = detailDashImgRef.current;
      if (dashImg?.complete && dashImg.naturalWidth > 0) {
        ctx.drawImage(dashImg, 0, 0, W, H);
      }

      // Grime overlay
      const grime = grimeCanvasRef.current;
      if (grime) {
        ctx.drawImage(grime, 0, 0);
      }

      // Sparkle particles (same as exterior)
      const particles = detailParticlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        if (p.star) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x - 4, p.y); ctx.lineTo(p.x + 4, p.y);
          ctx.moveTo(p.x, p.y - 4); ctx.lineTo(p.x, p.y + 4);
          ctx.stroke();
        } else {
          const radius = 1 + (1 - p.life / p.maxLife) * 2;
          ctx.fillStyle = Math.random() > 0.3 ? "#ffffff" : "#ffd700";
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      detailAnimRef.current = requestAnimationFrame(draw);
    };

    detailAnimRef.current = requestAnimationFrame(draw);
  }, [playerCar, initGrimeCanvas]);
```

- [ ] **Step 3: Add the finishDetailPass function**

```typescript
  const finishDetailPass = useCallback(() => {
    const pct = calcGrimeProgress();

    if (detailState === "exterior") {
      setExteriorScore(pct);
      // Play shine sweep, then transition to interior
      setDetailState("sweep");

      // Shine sweep animation
      const canvas = detailCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = canvas.width;
      let sweepX = -W * 0.2;
      const sweepW = W * 0.2;

      // Shine sweep sound — rising tone
      try {
        const actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.frequency.setValueAtTime(200, actx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, actx.currentTime + 1);
        osc.type = "sine";
        gain.gain.value = 0.05;
        osc.start();
        osc.stop(actx.currentTime + 1);
      } catch { /* audio may not be available */ }

      cancelAnimationFrame(detailAnimRef.current);
      const sweepDraw = () => {
        sweepX += W * 0.015;
        if (sweepX > W * 1.2) {
          // Transition to interior
          setTimeout(() => startDetailInterior(), 300);
          return;
        }
        // Redraw last frame then overlay sweep
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const grad = ctx.createLinearGradient(sweepX, 0, sweepX + sweepW, 0);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.5, "rgba(255,255,255,0.2)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(sweepX, 0, sweepW, canvas.height);
        ctx.restore();
        detailAnimRef.current = requestAnimationFrame(sweepDraw);
      };
      detailAnimRef.current = requestAnimationFrame(sweepDraw);
    } else if (detailState === "interior") {
      setInteriorScore(pct);
      cancelAnimationFrame(detailAnimRef.current);

      // Shine sweep then reveal
      setDetailState("sweep");
      const canvas = detailCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = canvas.width;
      let sweepX = -W * 0.2;
      const sweepW = W * 0.2;

      try {
        const actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.frequency.setValueAtTime(200, actx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, actx.currentTime + 1);
        osc.type = "sine";
        gain.gain.value = 0.05;
        osc.start();
        osc.stop(actx.currentTime + 1);
      } catch { /* audio may not be available */ }

      const sweepDraw = () => {
        sweepX += W * 0.015;
        if (sweepX > W * 1.2) {
          setDetailState("reveal");
          return;
        }
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const grad = ctx.createLinearGradient(sweepX, 0, sweepX + sweepW, 0);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.5, "rgba(255,255,255,0.2)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(sweepX, 0, sweepW, canvas.height);
        ctx.restore();
        detailAnimRef.current = requestAnimationFrame(sweepDraw);
      };
      detailAnimRef.current = requestAnimationFrame(sweepDraw);
    }
  }, [detailState, calcGrimeProgress, startDetailInterior]);
```

- [ ] **Step 4: Verify the full exterior → interior flow**

Load the race page, select a car, click DETAIL TECH, then START DETAIL. Verify:
- Grime overlay appears on the car
- Clicking/dragging erases grime with sparkle particles
- Progress bar updates
- DONE button appears at 50%+
- Shine sweep plays when finishing exterior
- Transitions to interior (dashboard view) with fresh grime
- Same interaction works on interior
- After finishing interior, state transitions to reveal

- [ ] **Step 5: Commit**

```bash
git add app/race/page.tsx
git commit -m "feat: detail animation loop with exterior and interior passes"
```

---

### Task 6: Reveal Screen — Before/After, Score, and DetailReveal Component

**Files:**
- Modify: `app/race/page.tsx`

- [ ] **Step 1: Add the DetailReveal component**

Add this component near the existing `DynoResults` component (near the bottom of the file):

```typescript
function DetailReveal({ exteriorScore, interiorScore }: { exteriorScore: number; interiorScore: number }) {
  const [revealed, setRevealed] = useState(0);
  const [scoreDisplay, setScoreDisplay] = useState(0);
  const finalScore = Math.round(exteriorScore * 0.6 + interiorScore * 0.4);
  const label = finalScore >= 95 ? "SHOWROOM PERFECT" : finalScore >= 80 ? "SHOW READY" : finalScore >= 60 ? "STREET CLEAN" : "NEEDS WORK";
  const labelColor = finalScore >= 80 ? C.gold : finalScore >= 60 ? C.white : C.midGray;

  // Animate score count-up
  useEffect(() => {
    if (revealed < 1) {
      const timer = setTimeout(() => {
        // Score reveal sound
        try {
          const actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const osc = actx.createOscillator();
          const gain = actx.createGain();
          osc.connect(gain);
          gain.connect(actx.destination);
          osc.frequency.value = 80;
          osc.type = "square";
          gain.gain.value = 0.12;
          osc.start();
          osc.stop(actx.currentTime + 0.05);
        } catch { /* audio may not be available */ }
        setRevealed(1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [revealed]);

  // Count up animation
  useEffect(() => {
    if (revealed < 1) return;
    if (scoreDisplay >= finalScore) return;
    const timer = setTimeout(() => {
      setScoreDisplay((s) => Math.min(s + 2, finalScore));
    }, 16);
    return () => clearTimeout(timer);
  }, [revealed, scoreDisplay, finalScore]);

  return (
    <div style={{ textAlign: "center", marginTop: "1rem" }}>
      {revealed >= 1 && (
        <>
          <p style={{ fontFamily: FONT, fontSize: "2rem", color: C.gold, textShadow: finalScore >= 95 ? "0 0 15px rgba(255,215,0,0.5)" : "none" }}>
            {scoreDisplay}<span style={{ fontSize: "0.8rem", color: C.midGray }}>/100</span>
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: labelColor, marginTop: "0.3rem", letterSpacing: "0.15em" }}>
            {label}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", maxWidth: "300px", margin: "1rem auto 0" }}>
            <div style={{ padding: "0.5rem", background: "rgba(255,215,0,0.06)", border: `1px solid ${C.goldDark}` }}>
              <div style={{ fontFamily: FONT, fontSize: "0.5rem", color: C.midGray, marginBottom: "0.2rem" }}>EXTERIOR</div>
              <div style={{ fontFamily: FONT, fontSize: "0.8rem", color: C.gold }}>{Math.round(exteriorScore)}%</div>
            </div>
            <div style={{ padding: "0.5rem", background: "rgba(255,215,0,0.06)", border: `1px solid ${C.goldDark}` }}>
              <div style={{ fontFamily: FONT, fontSize: "0.5rem", color: C.midGray, marginBottom: "0.2rem" }}>INTERIOR</div>
              <div style={{ fontFamily: FONT, fontSize: "0.8rem", color: C.gold }}>{Math.round(interiorScore)}%</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the full flow end-to-end**

Complete the full detail flow: START DETAIL → clean exterior → DONE → clean interior → DONE → verify reveal shows:
- Score counting up to final value
- Correct label (SHOWROOM PERFECT / SHOW READY / etc.)
- Exterior and interior breakdowns
- BACK TO GARAGE returns to action menu

- [ ] **Step 3: Commit**

```bash
git add app/race/page.tsx
git commit -m "feat: detail reveal screen with showroom score and count-up animation"
```

---

### Task 7: Before/After Sliding Reveal on Canvas

**Files:**
- Modify: `app/race/page.tsx`

- [ ] **Step 1: Add the before/after reveal animation to the canvas**

When `detailState` transitions to `"reveal"`, draw a before/after comparison on the canvas. Add this useEffect:

```typescript
  // Before/after canvas reveal animation
  useEffect(() => {
    if (detailState !== "reveal" || !playerCar) return;
    const canvas = detailCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const carImg = detailCarImgRef.current;
    if (!carImg?.complete) return;

    const carW = W * 0.4;
    const carH = carW * (carImg.height / carImg.width);
    const groundY = H * 0.95;
    const carX = W * 0.5 - carW / 2;
    const carY = groundY - carH;

    // Create dirty snapshot
    const dirtyCanvas = document.createElement("canvas");
    dirtyCanvas.width = W;
    dirtyCanvas.height = H;
    const dCtx = dirtyCanvas.getContext("2d")!;
    dCtx.fillStyle = "#0d0d1a";
    dCtx.fillRect(0, 0, W, H);
    if (detailBayImgRef.current?.complete) {
      dCtx.globalAlpha = 0.8;
      dCtx.drawImage(detailBayImgRef.current, 0, 0, W, H);
      dCtx.globalAlpha = 1;
    }
    dCtx.save();
    if (playerCar.flipped) {
      dCtx.translate(carX + carW, carY);
      dCtx.scale(-1, 1);
      dCtx.drawImage(carImg, 0, 0, carW, carH);
    } else {
      dCtx.drawImage(carImg, carX, carY, carW, carH);
    }
    dCtx.restore();
    dCtx.fillStyle = "rgba(80, 60, 30, 0.45)";
    dCtx.fillRect(carX, carY, carW, carH);

    // Clean frame
    const cleanFrame = () => {
      ctx.fillStyle = "#0d0d1a";
      ctx.fillRect(0, 0, W, H);
      if (detailBayImgRef.current?.complete) {
        ctx.globalAlpha = 0.8;
        ctx.drawImage(detailBayImgRef.current, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }
      ctx.save();
      if (playerCar.flipped) {
        ctx.translate(carX + carW, carY);
        ctx.scale(-1, 1);
        ctx.drawImage(carImg, 0, 0, carW, carH);
      } else {
        ctx.drawImage(carImg, carX, carY, carW, carH);
      }
      ctx.restore();
    };

    const startTime = performance.now();
    const duration = 1500;

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const dividerX = eased * W;

      // Draw clean side (right of divider)
      cleanFrame();

      // Draw dirty side (left of divider)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, dividerX, H);
      ctx.clip();
      ctx.drawImage(dirtyCanvas, 0, 0);
      ctx.restore();

      // Divider line
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dividerX, 0);
      ctx.lineTo(dividerX, H);
      ctx.stroke();

      // Labels
      if (dividerX > 60) {
        ctx.fillStyle = C.midGray;
        ctx.font = `10px 'Press Start 2P', monospace`;
        ctx.fillText("BEFORE", dividerX - 55, 20);
      }
      if (dividerX < W - 60) {
        ctx.fillStyle = C.gold;
        ctx.font = `10px 'Press Start 2P', monospace`;
        ctx.fillText("AFTER", dividerX + 10, 20);
      }

      if (t < 1) {
        detailAnimRef.current = requestAnimationFrame(animate);
      }
    };

    detailAnimRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(detailAnimRef.current);
  }, [detailState, playerCar]);
```

- [ ] **Step 2: Verify the sliding reveal**

Complete a detail session. On the reveal screen, verify:
- Dirty version (with grime) slides across from left to right
- Clean car is revealed behind it
- Gold divider line separates the two
- BEFORE/AFTER labels appear
- Animation eases in/out over 1.5s

- [ ] **Step 3: Commit**

```bash
git add app/race/page.tsx
git commit -m "feat: before/after sliding reveal animation on detail canvas"
```

---

### Task 8: Final Polish and Full Flow Test

**Files:**
- Modify: `app/race/page.tsx`

- [ ] **Step 1: Clean up animation frames on phase exit**

Ensure the detail animation cleanup happens when leaving the phase. In the "BACK TO GARAGE" button onClick, `cancelAnimationFrame(detailAnimRef.current)` is already called. Verify the idle useEffect returns a cleanup function:

Add cleanup to the idle useEffect (at the end of the effect body):

```typescript
    return () => cancelAnimationFrame(detailAnimRef.current);
```

- [ ] **Step 2: Generate the detail bay assets**

Run:
```bash
curl -s -X POST http://localhost:3002/api/registrations/pixel-art/generate-detail-bay | python3 -m json.tool
```
Verify both `bayUrl` and `logoUrl` are returned.

- [ ] **Step 3: Full end-to-end test**

Test the complete flow:
1. Load race page → select a car → action menu shows all 4 buttons
2. Click DETAIL TECH → idle state with car + grime overlay
3. Click START DETAIL → exterior phase, click/drag to clean
4. Progress bar updates, sparkle particles appear
5. Click DONE (or reach 95%) → shine sweep → interior phase
6. Clean interior (dashboard view) → DONE → shine sweep → reveal
7. Before/after sliding animation plays
8. Score counts up with correct label
9. BACK TO GARAGE returns to action menu
10. All other action menu buttons still work (dyno, drag race)

- [ ] **Step 4: Commit final changes**

```bash
git add app/race/page.tsx
git commit -m "feat: Detail Tech mini-game complete — scratch-off detailing with showroom score"
```
