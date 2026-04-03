# Phaser Arcade — Sub-Project 1: Core Engine + Track Scene

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phaser 3 running inside Next.js at `/arcade` with a Mode 7-style pseudo-3D scrolling road, parallax background, trackside scenery, two-lane road, player car rear sprite, and dashboard overlay — controllable with space/up arrow.

**Architecture:** A Next.js page at `app/arcade/page.tsx` dynamically imports a `PhaserGame` client component that creates and mounts a Phaser 3 game instance. The game has a single `RaceScene` that renders the road using the classic SNES pseudo-3D row-by-row technique (projecting road segments from a top-down map onto the screen with perspective scaling). Parallax sky/horizon layers scroll behind the road. The player car rear sprite and dashboard image sit at fixed screen positions.

**Tech Stack:** Phaser 3, Next.js 16, TypeScript

---

### Task 1: Install Phaser and create the route shell

**Files:**
- Modify: `package.json` (add phaser dependency)
- Create: `app/arcade/layout.tsx`
- Create: `app/arcade/page.tsx`

- [ ] **Step 1: Install Phaser**

```bash
npm install phaser
```

- [ ] **Step 2: Create the arcade layout**

Create `app/arcade/layout.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CLCC Arcade | Crystal Lake Cars & Caffeine",
  description: "Race registered show cars in a retro arcade-style drag race powered by Phaser.",
  openGraph: {
    title: "CLCC Arcade",
    description: "Race registered show cars in a retro arcade drag race.",
    type: "website",
  },
};

export default function ArcadeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      <style>{`
        .arcade-page {
          background-color: #0d0d1a;
          min-height: 100vh;
          font-family: 'Press Start 2P', monospace;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
      `}</style>
      <div className="arcade-page">{children}</div>
    </>
  );
}
```

- [ ] **Step 3: Create the page that will host the Phaser game**

Create `app/arcade/page.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";

const PhaserGame = dynamic(() => import("@/components/arcade/PhaserGame"), { ssr: false });

export default function ArcadePage() {
  return <PhaserGame />;
}
```

- [ ] **Step 4: Create a placeholder PhaserGame component**

Create `components/arcade/PhaserGame.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let game: Phaser.Game | null = null;

    import("phaser").then((Phaser) => {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: containerRef.current!,
        backgroundColor: "#0d0d1a",
        pixelArt: true,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [],
      });
    });

    return () => {
      if (game) game.destroy(true);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", maxWidth: "800px", aspectRatio: "800/600" }}
    />
  );
}
```

- [ ] **Step 5: Verify the page loads**

```bash
npx next build 2>&1 | grep -i error; echo "exit: $?"
```

Expected: No errors. Visiting `/arcade` shows a dark canvas.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json app/arcade/ components/arcade/
git commit -m "feat: scaffold Phaser 3 game at /arcade route"
```

---

### Task 2: Create the pseudo-3D road renderer

**Files:**
- Create: `components/arcade/scenes/RaceScene.ts`
- Create: `components/arcade/road.ts`
- Modify: `components/arcade/PhaserGame.tsx`

The road renderer uses the classic SNES pseudo-3D technique: for each horizontal row of pixels from the horizon down, project a road segment with perspective scaling. This produces a vanishing-point road without shaders.

- [ ] **Step 1: Create the road rendering module**

Create `components/arcade/road.ts`:

```ts
/**
 * Pseudo-3D road renderer using the classic SNES row-projection technique.
 * Each frame, draws the road onto a Phaser RenderTexture line by line
 * from the horizon to the bottom of the screen.
 */

export type RoadColors = {
  skyTop: string;
  skyBottom: string;
  grassA: string;
  grassB: string;
  roadA: string;
  roadB: string;
  shoulderA: string;
  shoulderB: string;
  laneMarker: string;
  centerLine: string;
};

export const DEFAULT_COLORS: RoadColors = {
  skyTop: "#050510",
  skyBottom: "#0d0d2a",
  grassA: "#0a3a0a",
  grassB: "#0d4a0d",
  roadA: "#1a1a2e",
  roadB: "#222240",
  shoulderA: "#cc2222",
  shoulderB: "#ffffff",
  laneMarker: "#ffd700",
  centerLine: "#ffd700",
};

export function drawRoad(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  roadOffset: number,
  colors: RoadColors = DEFAULT_COLORS
) {
  const horizonY = Math.floor(height * 0.35);
  const vanishX = width / 2;

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, colors.skyTop);
  skyGrad.addColorStop(1, colors.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, horizonY);

  // Stars
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 40; i++) {
    const sx = (Math.sin(i * 127.1) * 0.5 + 0.5) * width;
    const sy = (Math.sin(i * 269.5) * 0.5 + 0.5) * horizonY * 0.85;
    ctx.fillRect(Math.floor(sx), Math.floor(sy), i % 3 === 0 ? 2 : 1, 1);
  }

  // Road rows
  const totalRows = height - horizonY;
  const roadWidthBottom = width * 0.85;
  const roadWidthTop = width * 0.08;

  for (let row = 0; row < totalRows; row++) {
    const y = horizonY + row;
    const t = row / totalRows;
    const perspective = t * t;

    const roadW = roadWidthTop + (roadWidthBottom - roadWidthTop) * perspective;
    const shoulderW = 2 + 40 * perspective;
    const roadLeft = vanishX - roadW / 2;
    const roadRight = vanishX + roadW / 2;

    const z = 1 / (t + 0.01);
    const stripePhase = (z + roadOffset * 0.3) % 20;
    const stripeBand = stripePhase < 10;

    // Grass
    ctx.fillStyle = stripeBand ? colors.grassA : colors.grassB;
    ctx.fillRect(0, y, roadLeft - shoulderW, 1);
    ctx.fillRect(roadRight + shoulderW, y, width - (roadRight + shoulderW), 1);

    // Shoulders
    ctx.fillStyle = stripeBand ? colors.shoulderA : colors.shoulderB;
    ctx.fillRect(roadLeft - shoulderW, y, shoulderW, 1);
    ctx.fillRect(roadRight, y, shoulderW, 1);

    // Road surface
    ctx.fillStyle = stripeBand ? colors.roadA : colors.roadB;
    ctx.fillRect(roadLeft, y, roadW, 1);

    // Center dashed line (divides two lanes)
    if (stripePhase > 2 && stripePhase < 8) {
      const lineW = Math.max(2, 4 * perspective);
      ctx.fillStyle = colors.centerLine;
      ctx.fillRect(vanishX - lineW / 2, y, lineW, 1);
    }

    // Lane quarter lines (subtle)
    const laneOffset = roadW / 4;
    if (stripePhase > 3 && stripePhase < 6) {
      const lineW = Math.max(1, 2 * perspective);
      ctx.fillStyle = colors.laneMarker + "26";
      ctx.fillRect(vanishX - laneOffset - lineW / 2, y, lineW, 1);
      ctx.fillRect(vanishX + laneOffset - lineW / 2, y, lineW, 1);
    }
  }
}
```

- [ ] **Step 2: Create the RaceScene**

Create `components/arcade/scenes/RaceScene.ts`:

```ts
import { drawRoad, DEFAULT_COLORS } from "../road";

export class RaceScene extends Phaser.Scene {
  private roadCanvas!: HTMLCanvasElement;
  private roadCtx!: CanvasRenderingContext2D;
  private roadTexture!: Phaser.Textures.CanvasTexture;
  private roadOffset = 0;
  private speed = 0;
  private maxSpeed = 5;
  private accelHeld = false;

  // Scenery sprites
  private sceneryItems: { sprite: Phaser.GameObjects.Rectangle; baseX: number; z: number }[] = [];

  constructor() {
    super({ key: "RaceScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Create offscreen canvas for road rendering
    this.roadCanvas = document.createElement("canvas");
    this.roadCanvas.width = width;
    this.roadCanvas.height = height;
    this.roadCtx = this.roadCanvas.getContext("2d")!;

    // Create a Phaser texture from the canvas
    this.roadTexture = this.textures.createCanvas("road", width, height)!;
    this.add.image(width / 2, height / 2, "road");

    // Trackside scenery (simple colored rectangles as placeholder trees/buildings)
    this.createScenery(width, height);

    // Player car placeholder (rectangle for now, replaced by sprite in later sub-project)
    this.add.rectangle(width / 2, height * 0.82, 60, 30, 0xdc2626)
      .setDepth(10);

    // Dashboard area placeholder
    this.add.rectangle(width / 2, height * 0.93, width, height * 0.15, 0x111111)
      .setDepth(9);
    this.add.text(width / 2, height * 0.93, "DASHBOARD", {
      fontFamily: "'Press Start 2P'",
      fontSize: "10px",
      color: "#555555",
    }).setOrigin(0.5).setDepth(11);

    // Speed display
    this.add.text(16, height - 30, "SPEED: 0", {
      fontFamily: "'Press Start 2P'",
      fontSize: "12px",
      color: "#ffd700",
    }).setDepth(12).setName("speedText");

    // Input
    this.input.keyboard!.on("keydown-SPACE", () => { this.accelHeld = true; });
    this.input.keyboard!.on("keyup-SPACE", () => { this.accelHeld = false; });
    this.input.keyboard!.on("keydown-UP", () => { this.accelHeld = true; });
    this.input.keyboard!.on("keyup-UP", () => { this.accelHeld = false; });
  }

  private createScenery(width: number, height: number) {
    // Create trees/poles along both sides of the road
    const horizonY = height * 0.35;
    for (let i = 0; i < 12; i++) {
      const z = 0.1 + Math.random() * 0.9; // depth: 0=far, 1=near
      const perspective = z * z;
      const roadW = width * 0.08 + (width * 0.85 - width * 0.08) * perspective;
      const shoulderW = 2 + 40 * perspective;
      const side = i % 2 === 0 ? -1 : 1;
      const baseX = width / 2 + side * (roadW / 2 + shoulderW + 10 + Math.random() * 30);
      const y = horizonY + (height - horizonY) * z;
      const h = 8 + 40 * perspective;
      const w = 4 + 12 * perspective;

      const color = i % 3 === 0 ? 0x0a4a0a : i % 3 === 1 ? 0x0d5a0d : 0x084008;
      const sprite = this.add.rectangle(baseX, y - h / 2, w, h, color)
        .setDepth(3);

      this.sceneryItems.push({ sprite, baseX, z });
    }
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;

    // Acceleration
    if (this.accelHeld) {
      this.speed = Math.min(this.speed + this.maxSpeed * dt * 0.8, this.maxSpeed);
    } else {
      this.speed = Math.max(this.speed - this.maxSpeed * dt * 0.5, 0);
    }

    // Scroll road
    this.roadOffset += this.speed * dt * 30;

    // Redraw road onto the canvas texture
    drawRoad(this.roadCtx, this.roadCanvas.width, this.roadCanvas.height, this.roadOffset);
    this.roadTexture.refresh();

    // Animate scenery (scroll toward player based on speed)
    const { height } = this.scale;
    const horizonY = height * 0.35;
    for (const item of this.sceneryItems) {
      item.z += this.speed * dt * 0.15;
      if (item.z > 1.1) {
        item.z = 0.05 + Math.random() * 0.1; // reset to far distance
      }
      const perspective = item.z * item.z;
      const roadW = this.scale.width * 0.08 + (this.scale.width * 0.85 - this.scale.width * 0.08) * perspective;
      const shoulderW = 2 + 40 * perspective;
      const side = item.baseX > this.scale.width / 2 ? 1 : -1;
      const x = this.scale.width / 2 + side * (roadW / 2 + shoulderW + 10 + Math.random() * 5);
      const y = horizonY + (height - horizonY) * item.z;
      const h = 8 + 40 * perspective;
      const w = 4 + 12 * perspective;

      item.sprite.setPosition(x, y - h / 2);
      item.sprite.setSize(w, h);
      item.sprite.setAlpha(Math.min(1, item.z * 3));
    }

    // Update speed display
    const speedText = this.children.getByName("speedText") as Phaser.GameObjects.Text;
    if (speedText) {
      speedText.setText(`SPEED: ${Math.round(this.speed * 40)}`);
    }
  }
}
```

- [ ] **Step 3: Register the scene in PhaserGame**

Update `components/arcade/PhaserGame.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let game: Phaser.Game | null = null;

    Promise.all([
      import("phaser"),
      import("@/components/arcade/scenes/RaceScene"),
    ]).then(([Phaser, { RaceScene }]) => {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: containerRef.current!,
        backgroundColor: "#0d0d1a",
        pixelArt: true,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [RaceScene],
      });
    });

    return () => {
      if (game) game.destroy(true);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", maxWidth: "800px", aspectRatio: "800/600" }}
    />
  );
}
```

- [ ] **Step 4: Verify build and test**

```bash
npx next build 2>&1 | grep -i error; echo "exit: $?"
```

Expected: No errors. Visiting `/arcade` shows a scrolling pseudo-3D road with stars, grass, shoulders, and lane markings. Holding space makes the road scroll faster. Placeholder scenery trees appear along the road sides.

- [ ] **Step 5: Commit**

```bash
git add components/arcade/road.ts components/arcade/scenes/RaceScene.ts components/arcade/PhaserGame.tsx
git commit -m "feat: pseudo-3D road renderer with parallax scenery in Phaser"
```

---

### Task 3: Add parallax horizon layer

**Files:**
- Modify: `components/arcade/scenes/RaceScene.ts`
- Create: `components/arcade/horizon.ts`

- [ ] **Step 1: Create the horizon renderer**

Create `components/arcade/horizon.ts`:

```ts
/**
 * Draws a pixel art horizon onto a canvas — blocky trees/buildings
 * that will scroll slowly behind the road for parallax depth.
 */
export function createHorizonTexture(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  // Make it 2x wide so we can tile-scroll it
  canvas.width = width * 2;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0d0d2a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw blocky buildings/trees across the full width (repeating pattern)
  for (let x = 0; x < canvas.width; x += 25) {
    const type = (x * 7) % 5;
    if (type < 2) {
      // Building
      const h = 15 + ((x * 3) % 25);
      const w = 15 + ((x * 5) % 10);
      ctx.fillStyle = (x * 11) % 3 === 0 ? "#151530" : "#121225";
      ctx.fillRect(x, canvas.height - h, w, h);
      // Windows
      ctx.fillStyle = "#ffd70044";
      for (let wy = canvas.height - h + 4; wy < canvas.height - 4; wy += 6) {
        for (let wx = x + 3; wx < x + w - 3; wx += 5) {
          if (Math.random() > 0.4) {
            ctx.fillRect(wx, wy, 2, 3);
          }
        }
      }
    } else {
      // Tree
      const h = 10 + ((x * 7) % 15);
      ctx.fillStyle = "#0a1a0a";
      ctx.fillRect(x + 5, canvas.height - h, 12, h);
      // Canopy
      ctx.fillStyle = "#0d2a0d";
      ctx.fillRect(x, canvas.height - h - 6, 22, 8);
    }
  }

  return canvas;
}
```

- [ ] **Step 2: Integrate the horizon into RaceScene**

Add to `RaceScene.ts` — in the `create()` method, after creating the road texture:

Add these imports at the top of `RaceScene.ts`:

```ts
import { createHorizonTexture } from "../horizon";
```

Add new class properties:

```ts
  private horizonImage!: Phaser.GameObjects.TileSprite;
```

Add to `create()`, after the road image is added but before scenery:

```ts
    // Horizon — parallax city/tree skyline
    const horizonY = height * 0.35;
    const horizonHeight = 50;
    const horizonCanvas = createHorizonTexture(width, horizonHeight);
    this.textures.addCanvas("horizon", horizonCanvas);
    this.horizonImage = this.add.tileSprite(
      width / 2, horizonY - horizonHeight / 2, width, horizonHeight, "horizon"
    ).setDepth(1);
```

Add to `update()`, after the road offset update:

```ts
    // Scroll horizon at 20% of road speed for parallax
    this.horizonImage.tilePositionX += this.speed * dt * 6;
```

- [ ] **Step 3: Verify build**

```bash
npx next build 2>&1 | grep -i error; echo "exit: $?"
```

Expected: No errors. A pixel art cityscape/treeline slowly scrolls behind the road as you accelerate.

- [ ] **Step 4: Commit**

```bash
git add components/arcade/horizon.ts components/arcade/scenes/RaceScene.ts
git commit -m "feat: parallax horizon layer with pixel art buildings and trees"
```

---

### Task 4: Add mobile touch support

**Files:**
- Modify: `components/arcade/scenes/RaceScene.ts`

- [ ] **Step 1: Add touch input to RaceScene**

In `create()`, after the keyboard input setup, add:

```ts
    // Touch input for mobile
    this.input.on("pointerdown", () => { this.accelHeld = true; });
    this.input.on("pointerup", () => { this.accelHeld = false; });
```

- [ ] **Step 2: Commit**

```bash
git add components/arcade/scenes/RaceScene.ts
git commit -m "feat: add touch input for mobile arcade controls"
```

---

### Task 5: Verify full integration

**Files:** None (verification only)

- [ ] **Step 1: Build check**

```bash
npx next build 2>&1 | grep -i error; echo "exit: $?"
```

Expected: Clean build, no errors.

- [ ] **Step 2: Manual verification checklist**

Run `npx next dev` and open `http://localhost:3000/arcade`:

1. ✅ Phaser canvas renders at 800×600, scales to fit the viewport
2. ✅ Stars visible in the dark sky
3. ✅ Pixel art horizon (buildings + trees) scrolls slowly
4. ✅ Road has two lanes with center dashed line, shoulders, grass
5. ✅ Trackside scenery objects (trees) scroll toward player with perspective
6. ✅ Holding space or up arrow increases speed — road scrolls faster, scenery moves
7. ✅ Releasing input — speed decreases, road slows
8. ✅ Red placeholder car rectangle at bottom center
9. ✅ Dashboard placeholder at very bottom
10. ✅ Speed text updates in real-time
11. ✅ Touch/tap on mobile triggers acceleration
12. ✅ Original `/race` page still works unchanged

- [ ] **Step 3: Push**

```bash
git push origin main
```
