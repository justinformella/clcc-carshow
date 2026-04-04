# Road Race Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken `/arcade` pseudo-3D race with a top-down road racing game through real Crystal Lake, IL locations.

**Architecture:** Delete RaceScene, physics.ts, road.ts, and horizon.ts from /arcade. Keep Boot/Title/Select/Matchup scenes. Build new top-down physics engine, track renderer, AI system, HUD, effects, and audio — all as focused modules in `components/arcade/`. Add a TrackSelectScene between car select and matchup. PhaserGame.tsx accepts optional `selectedCar` prop for future /race integration.

**Tech Stack:** Phaser 3, TypeScript, Web Audio API, Next.js dynamic import

**Spec:** `docs/superpowers/specs/2026-04-03-road-race-game-design.md`

---

### Task 1: Clean Up — Delete Old Race Files and Update Imports

**Files:**
- Delete: `components/arcade/scenes/RaceScene.ts`
- Delete: `components/arcade/road.ts`
- Delete: `components/arcade/horizon.ts`
- Modify: `components/arcade/PhaserGame.tsx`

This task removes the broken pseudo-3D code and creates a minimal placeholder RaceScene so /arcade still boots without crashing.

- [ ] **Step 1: Delete the old files**

```bash
rm components/arcade/scenes/RaceScene.ts
rm components/arcade/road.ts
rm components/arcade/horizon.ts
```

- [ ] **Step 2: Create the RaceCar type file**

The old `physics.ts` exports the `RaceCar` type that BootScene, SelectScene, and MatchupScene all import. We need to preserve that type but remove the drag-race physics. Create a new shared types file:

Create `components/arcade/types.ts`:
```typescript
/**
 * Car data from /api/race — shared across all arcade scenes.
 */
export type RaceCar = {
  id: string;
  carNumber: number;
  year: number;
  name: string;
  color: string;
  owner: string;
  hp: number;
  weight: number;
  pwr: number;
  displacement: number;
  cylinders: number;
  engineType: string;
  category: string;
  driveType: string;
  bodyStyle: string;
  origin: string;
  era: string;
  production: number;
  redline: number;
  topSpeed: number;
  gears: number;
  trans: string;
  pixelArt: string | null;
  pixelDash: string | null;
  pixelRear: string | null;
  aiImage: string | null;
};
```

- [ ] **Step 3: Delete old physics.ts**

```bash
rm components/arcade/physics.ts
```

- [ ] **Step 4: Update imports in existing scenes**

In `components/arcade/scenes/BootScene.ts`, change line 2:
```typescript
// Old:
import { RaceCar } from "../physics";
// New:
import { RaceCar } from "../types";
```

In `components/arcade/scenes/SelectScene.ts`, change line 2:
```typescript
// Old:
import { RaceCar } from "../physics";
// New:
import { RaceCar } from "../types";
```

In `components/arcade/scenes/MatchupScene.ts`, change line 2:
```typescript
// Old:
import { RaceCar, quarterMileET } from "../physics";
// New:
import { RaceCar } from "../types";
```

Also in MatchupScene.ts, the stats comparison uses `quarterMileET()` on line 60. Replace the 1/4 MI stat with top speed for the road race context. Change the stats array (lines 57-61):
```typescript
    const stats = [
      { label: "HP", p: playerCar.hp, o: opponentCar.hp },
      { label: "LBS", p: playerCar.weight, o: opponentCar.weight },
      { label: "TOP", p: (playerCar.topSpeed || 150) + " mph", o: (opponentCar.topSpeed || 150) + " mph" },
    ];
```

- [ ] **Step 5: Create placeholder RaceScene**

Create `components/arcade/scenes/RaceScene.ts`:
```typescript
import Phaser from "phaser";

export class RaceScene extends Phaser.Scene {
  constructor() {
    super({ key: "RaceScene" });
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0d0d1a");

    this.add.text(width / 2, height / 2, "ROAD RACE\nCOMING SOON", {
      fontFamily: "'Press Start 2P'",
      fontSize: "24px",
      color: "#ffd700",
      align: "center",
      lineSpacing: 12,
    }).setOrigin(0.5);

    const backText = this.add.text(width / 2, height / 2 + 80, "BACK TO SELECT", {
      fontFamily: "'Press Start 2P'",
      fontSize: "14px",
      color: "#555555",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backText.on("pointerover", () => backText.setColor("#aaaaaa"));
    backText.on("pointerout", () => backText.setColor("#555555"));
    backText.on("pointerdown", () => this.scene.start("SelectScene"));
  }
}
```

- [ ] **Step 6: Verify /arcade boots**

```bash
# Open http://localhost:3002/arcade in browser
# Should show title screen → enter garage → pick car → matchup → placeholder "COMING SOON"
```

- [ ] **Step 7: Commit**

```bash
git add components/arcade/types.ts components/arcade/scenes/RaceScene.ts components/arcade/scenes/BootScene.ts components/arcade/scenes/SelectScene.ts components/arcade/scenes/MatchupScene.ts components/arcade/PhaserGame.tsx
git add -u  # stages deletions
git commit -m "refactor: remove old pseudo-3D race, create type file and placeholder RaceScene"
```

---

### Task 2: Top-Down Physics Engine

**Files:**
- Create: `components/arcade/topdown-physics.ts`

The core 2D car physics — acceleration, braking, steering with rotation, drift, surface friction, and car-to-car/wall collisions. Framework-agnostic (pure math, no Phaser dependency) so it's testable.

- [ ] **Step 1: Create the physics engine**

Create `components/arcade/topdown-physics.ts`:
```typescript
import { RaceCar } from "./types";

/** Surface types affecting friction and speed */
export type Surface = "road" | "grass" | "dirt" | "sidewalk";

const SURFACE_FRICTION: Record<Surface, number> = {
  road: 0.98,      // very low drag on road
  sidewalk: 0.96,  // slightly more friction
  grass: 0.90,     // heavy slowdown
  dirt: 0.92,      // moderate slowdown
};

const SURFACE_MAX_SPEED_MULT: Record<Surface, number> = {
  road: 1.0,
  sidewalk: 0.85,
  grass: 0.5,
  dirt: 0.6,
};

/** Derive gameplay stats from car data */
export function carStats(car: RaceCar) {
  const pwrRatio = car.hp / (car.weight / 1000); // HP per 1000 lbs
  // Acceleration: higher power-to-weight = faster acceleration
  // Range: ~2.0 (slow truck) to ~8.0 (supercar)
  const acceleration = Math.min(8.0, Math.max(2.0, pwrRatio * 0.04));

  // Top speed in pixels/frame at 60fps
  // Range: ~4.0 (slow) to ~9.0 (fast)
  const topSpeed = Math.min(9.0, Math.max(4.0, (car.topSpeed || 150) / 25));

  // Steering rate: lighter cars turn faster
  // Range: ~0.025 (heavy) to ~0.050 (light)
  const steerRate = Math.min(0.050, Math.max(0.025, 3000 / car.weight * 0.035));

  // Mass for collision: normalized 0.5–1.5
  const mass = Math.min(1.5, Math.max(0.5, car.weight / 3500));

  // Drift tendency: RWD drifts easy, AWD resists, FWD understeers
  const dt = (car.driveType || "RWD").toUpperCase();
  const driftFactor = dt === "RWD" ? 1.2 : dt === "AWD" ? 0.7 : 1.0;

  return { acceleration, topSpeed, steerRate, mass, driftFactor };
}

export type CarPhysics = ReturnType<typeof carStats>;

/** State for any car (player or AI) during a race */
export class CarState {
  x: number;
  y: number;
  angle: number;        // radians, 0 = pointing up (north)
  speed = 0;            // pixels per frame
  angularVel = 0;       // radians per frame
  driftAngle = 0;       // angle offset when sliding
  stats: CarPhysics;
  car: RaceCar;
  surface: Surface = "road";
  finished = false;
  finishTime = 0;       // ms
  elapsedMs = 0;
  topSpeedReached = 0;
  driftCount = 0;
  isDrifting = false;

  constructor(car: RaceCar, x: number, y: number, angle: number) {
    this.car = car;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.stats = carStats(car);
  }

  /** Update car physics for one frame. Returns true if car is drifting. */
  update(input: { accel: boolean; brake: boolean; steerLeft: boolean; steerRight: boolean }): boolean {
    if (this.finished) return false;
    this.elapsedMs += 1000 / 60;

    const surfaceFriction = SURFACE_FRICTION[this.surface];
    const surfaceMaxMult = SURFACE_MAX_SPEED_MULT[this.surface];
    const effectiveTopSpeed = this.stats.topSpeed * surfaceMaxMult;

    // --- Acceleration / Braking ---
    if (input.accel && this.speed < effectiveTopSpeed) {
      this.speed += this.stats.acceleration * (1 / 60);
      if (this.speed > effectiveTopSpeed) this.speed = effectiveTopSpeed;
    } else if (input.brake) {
      this.speed -= this.stats.acceleration * 1.5 * (1 / 60); // brakes are stronger than accel
      if (this.speed < -1.0) this.speed = -1.0; // slight reverse
    }

    // Friction
    this.speed *= surfaceFriction;
    if (Math.abs(this.speed) < 0.01) this.speed = 0;

    // --- Steering ---
    // Steering effectiveness scales with speed: no turning when stopped, tight at low speed, wider at high
    const speedFactor = Math.min(1, this.speed / 2.0);
    const steerAmount = this.stats.steerRate * speedFactor;

    if (input.steerLeft) this.angularVel -= steerAmount;
    if (input.steerRight) this.angularVel += steerAmount;

    // Angular friction
    this.angularVel *= 0.85;
    this.angle += this.angularVel;

    // --- Drift detection ---
    const turnIntensity = Math.abs(this.angularVel);
    const speedThreshold = this.stats.topSpeed * 0.6;
    const wasDrifting = this.isDrifting;

    if (this.speed > speedThreshold && turnIntensity > 0.015) {
      this.driftAngle = this.angularVel * this.stats.driftFactor * 2.0;
      this.isDrifting = true;
      // Drift costs a little speed
      this.speed *= 0.995;
    } else {
      this.driftAngle *= 0.85; // ease out of drift
      if (Math.abs(this.driftAngle) < 0.01) {
        this.driftAngle = 0;
        this.isDrifting = false;
      }
    }

    if (this.isDrifting && !wasDrifting) this.driftCount++;

    // --- Position update ---
    // Move in the direction the car faces (minus some drift)
    const moveAngle = this.angle + this.driftAngle * 0.3;
    this.x += Math.sin(moveAngle) * this.speed;
    this.y -= Math.cos(moveAngle) * this.speed; // y decreases going "up"

    // Track top speed
    if (this.speed > this.topSpeedReached) this.topSpeedReached = this.speed;

    return this.isDrifting;
  }

  /** Get speed in MPH for display */
  get mph(): number {
    // Map pixel speed to real speed. topSpeed pixels/frame ≈ car's actual top speed MPH
    return Math.round((this.speed / this.stats.topSpeed) * (this.car.topSpeed || 150));
  }
}

/** Check and resolve collision between two cars */
export function resolveCarCollision(a: CarState, b: CarState): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = 28; // approximate car collision radius in pixels

  if (dist < minDist && dist > 0) {
    // Normalize collision vector
    const nx = dx / dist;
    const ny = dy / dist;

    // Separate cars so they don't overlap
    const overlap = minDist - dist;
    const totalMass = a.stats.mass + b.stats.mass;
    a.x -= nx * overlap * (b.stats.mass / totalMass);
    a.y -= ny * overlap * (b.stats.mass / totalMass);
    b.x += nx * overlap * (a.stats.mass / totalMass);
    b.y += ny * overlap * (a.stats.mass / totalMass);

    // Exchange momentum (simplified elastic collision)
    const relSpeed = (a.speed - b.speed) * 0.3;
    a.speed -= relSpeed * (b.stats.mass / totalMass);
    b.speed += relSpeed * (a.stats.mass / totalMass);

    // Both lose a bit of speed from impact
    a.speed *= 0.92;
    b.speed *= 0.92;

    return true;
  }
  return false;
}

/** Check if a car is colliding with a wall boundary and bounce it */
export function resolveWallCollision(car: CarState, wallX: number, wallY: number, wallNx: number, wallNy: number): boolean {
  // Project car position onto wall normal to check distance
  // wallNx/wallNy = outward normal of the wall
  // wallX/wallY = a point on the wall
  const dx = car.x - wallX;
  const dy = car.y - wallY;
  const dist = dx * wallNx + dy * wallNy;
  const carRadius = 14;

  if (dist < carRadius) {
    // Push car out of wall
    car.x += wallNx * (carRadius - dist);
    car.y += wallNy * (carRadius - dist);

    // Reflect velocity component along wall normal
    const velAlongNormal = Math.sin(car.angle) * wallNx - Math.cos(car.angle) * wallNy;
    if (velAlongNormal < 0) {
      // Car is moving into wall — bounce
      car.angle += Math.PI * velAlongNormal * 0.5; // deflect angle
      car.speed *= 0.6; // heavy speed loss on wall hit
    }
    return true;
  }
  return false;
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit components/arcade/topdown-physics.ts 2>&1 | head -20
```

If there are import path issues, the noEmit check on a single file may not resolve aliases. Instead verify via the full build:

```bash
npx next build 2>&1 | tail -20
```

Or just check for TypeScript syntax errors:
```bash
npx tsc --noEmit --skipLibCheck 2>&1 | grep topdown-physics || echo "No errors in topdown-physics"
```

- [ ] **Step 3: Commit**

```bash
git add components/arcade/topdown-physics.ts
git commit -m "feat: add top-down 2D car physics engine with drift, surface friction, collisions"
```

---

### Task 3: Track Data Format and First Track (Lakefront Sprint)

**Files:**
- Create: `components/arcade/track.ts`
- Create: `components/arcade/tracks/lakefront.ts`

Defines the track data structure and builds the first playable track — the Lakefront Sprint from Redline Motor Condos to Main Beach.

- [ ] **Step 1: Create the track data format**

Create `components/arcade/track.ts`:
```typescript
import { Surface } from "./topdown-physics";

/** A single waypoint along the track path */
export type Waypoint = {
  x: number;
  y: number;
};

/** A decorative scenery object placed on the track */
export type SceneryItem = {
  x: number;
  y: number;
  type: "tree" | "lamp" | "building" | "sign" | "bench" | "car-parked" | "water" | "pier" | "fence";
  width: number;
  height: number;
  color: string;        // fill color for the object
  detail?: string;      // optional secondary color or label
};

/** Track collision boundary — a rectangle for simplicity */
export type Boundary = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Full track definition */
export type TrackData = {
  name: string;
  subtitle: string;       // e.g. "Crystal Lake Ave → Main Beach"
  /** Track dimensions in pixels */
  widthPx: number;
  heightPx: number;
  /** Road segments — list of polygons defining road surface areas */
  roadSegments: { points: { x: number; y: number }[] }[];
  /** Ordered waypoints from start to finish (for AI pathfinding + minimap) */
  waypoints: Waypoint[];
  /** 4 spawn positions for the starting grid (2x2) */
  spawnPoints: { x: number; y: number; angle: number }[];
  /** Finish line */
  finishLine: { x: number; y: number; angle: number; width: number };
  /** Collision boundaries (buildings, walls, water edges) */
  boundaries: Boundary[];
  /** Decorative scenery items */
  scenery: SceneryItem[];
  /** Color palette for this track */
  palette: {
    sky: string;
    grass: string;
    road: string;
    roadLine: string;
    roadEdge: string;
    ambient: string;     // overall lighting tint
  };
  /** Estimated race time in seconds (for AI calibration) */
  targetTimeSec: number;
};

/**
 * Determine what surface type a point is on, given the track data.
 * Uses a simple point-in-polygon test against road segments.
 */
export function getSurfaceAt(track: TrackData, x: number, y: number): Surface {
  // Check if point is within any road segment
  for (const seg of track.roadSegments) {
    if (pointInPolygon(x, y, seg.points)) return "road";
  }
  // Check if near a boundary (sidewalk zone)
  for (const b of track.boundaries) {
    const margin = 20;
    if (x >= b.x - margin && x <= b.x + b.width + margin &&
        y >= b.y - margin && y <= b.y + b.height + margin) {
      return "sidewalk";
    }
  }
  return "grass";
}

/** Simple ray-casting point-in-polygon test */
function pointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Find the nearest waypoint index to a position.
 * Used for determining race progress and AI targeting.
 */
export function nearestWaypointIndex(track: TrackData, x: number, y: number): number {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < track.waypoints.length; i++) {
    const wp = track.waypoints[i];
    const d = (wp.x - x) ** 2 + (wp.y - y) ** 2;
    if (d < minDist) { minDist = d; minIdx = i; }
  }
  return minIdx;
}

/** Calculate race progress as 0..1 based on nearest waypoint */
export function raceProgress(track: TrackData, x: number, y: number): number {
  const idx = nearestWaypointIndex(track, x, y);
  return idx / (track.waypoints.length - 1);
}

/** Check if a car has crossed the finish line */
export function hasCrossedFinish(track: TrackData, x: number, y: number): boolean {
  const fl = track.finishLine;
  const dx = x - fl.x;
  const dy = y - fl.y;
  // Distance along finish line normal
  const dist = Math.abs(dx * Math.cos(fl.angle) + dy * Math.sin(fl.angle));
  // Distance along finish line width
  const lateral = Math.abs(-dx * Math.sin(fl.angle) + dy * Math.cos(fl.angle));
  return dist < 20 && lateral < fl.width / 2;
}
```

- [ ] **Step 2: Create the Lakefront Sprint track**

Create `components/arcade/tracks/lakefront.ts`:
```typescript
import { TrackData } from "../track";

/**
 * Lakefront Sprint — the signature intro track.
 * Teckler Blvd → Route 14 → Crystal Lake Ave → Dole Ave → Lakeshore Drive → Main Beach
 *
 * Layout: Starts heading south from an industrial area, curves east onto a wider road,
 * then winds south-southeast through tree-lined residential streets, finishing at the lake.
 *
 * Total track: ~3200px tall, ~1600px wide
 * Road width: ~80px (2 lanes)
 */

// Helper to build a road polygon from a centerline + width
function roadFromCenter(centerline: { x: number; y: number }[], halfWidth: number): { x: number; y: number }[] {
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];

  for (let i = 0; i < centerline.length; i++) {
    const curr = centerline[i];
    const prev = centerline[Math.max(0, i - 1)];
    const next = centerline[Math.min(centerline.length - 1, i + 1)];

    // Direction vector
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    // Perpendicular (left normal)
    const nx = -dy / len;
    const ny = dx / len;

    left.push({ x: curr.x + nx * halfWidth, y: curr.y + ny * halfWidth });
    right.push({ x: curr.x - nx * halfWidth, y: curr.y - ny * halfWidth });
  }

  // Return as a closed polygon: left side forward, right side backward
  return [...left, ...right.reverse()];
}

const ROAD_HALF_WIDTH = 40;

// Centerline waypoints — these define both the road shape and the AI path
const centerline: { x: number; y: number }[] = [
  // Start: Teckler Blvd (industrial area, heading south)
  { x: 400, y: 100 },
  { x: 400, y: 200 },
  { x: 400, y: 300 },
  // Curve east onto Route 14
  { x: 420, y: 380 },
  { x: 460, y: 440 },
  { x: 520, y: 480 },
  { x: 600, y: 500 },
  { x: 700, y: 510 },
  // Continue east on Route 14 (wide commercial road)
  { x: 800, y: 520 },
  { x: 900, y: 530 },
  // Turn south onto Crystal Lake Ave
  { x: 950, y: 560 },
  { x: 970, y: 620 },
  { x: 970, y: 720 },
  { x: 960, y: 820 },
  // Curve onto Dole Ave (heading southwest)
  { x: 930, y: 900 },
  { x: 880, y: 960 },
  { x: 820, y: 1020 },
  { x: 760, y: 1080 },
  // Dole Ave continues south
  { x: 720, y: 1160 },
  { x: 700, y: 1260 },
  { x: 700, y: 1360 },
  // Curve east onto Lakeshore Drive
  { x: 720, y: 1440 },
  { x: 760, y: 1500 },
  { x: 820, y: 1540 },
  { x: 900, y: 1560 },
  // Along the lake to Main Beach (finish)
  { x: 1000, y: 1560 },
  { x: 1100, y: 1550 },
  { x: 1200, y: 1540 },
];

const roadPolygon = roadFromCenter(centerline, ROAD_HALF_WIDTH);

export const lakefrontTrack: TrackData = {
  name: "LAKEFRONT SPRINT",
  subtitle: "Teckler Blvd → Main Beach",
  widthPx: 1600,
  heightPx: 1700,

  roadSegments: [{ points: roadPolygon }],

  waypoints: centerline,

  spawnPoints: [
    { x: 380, y: 140, angle: Math.PI },   // P1 — left of road, facing south
    { x: 420, y: 140, angle: Math.PI },   // P2 — right of road
    { x: 380, y: 180, angle: Math.PI },   // P3 — left, row 2
    { x: 420, y: 180, angle: Math.PI },   // P4 — right, row 2
  ],

  finishLine: {
    x: 1200, y: 1540, angle: 0, width: 100,
  },

  boundaries: [
    // Buildings along Teckler Blvd (industrial)
    { x: 300, y: 80, width: 60, height: 120 },
    { x: 460, y: 80, width: 80, height: 100 },
    // Buildings along Route 14
    { x: 550, y: 420, width: 100, height: 40 },
    { x: 700, y: 440, width: 120, height: 40 },
    { x: 850, y: 450, width: 80, height: 40 },
    // Buildings along Crystal Lake Ave
    { x: 1020, y: 600, width: 60, height: 160 },
    { x: 1020, y: 800, width: 50, height: 100 },
    // Dole Mansion (near finish)
    { x: 1040, y: 1480, width: 100, height: 60 },
  ],

  scenery: [
    // Industrial area (start)
    { x: 310, y: 100, type: "building", width: 50, height: 100, color: "#3a3a4e", detail: "TECKLER" },
    { x: 470, y: 90, type: "building", width: 70, height: 80, color: "#2a2a3e" },
    { x: 340, y: 250, type: "lamp", width: 4, height: 20, color: "#888888" },
    { x: 460, y: 250, type: "lamp", width: 4, height: 20, color: "#888888" },

    // Route 14 commercial
    { x: 560, y: 430, type: "building", width: 90, height: 30, color: "#4a4a5e", detail: "SHOP" },
    { x: 710, y: 450, type: "building", width: 110, height: 30, color: "#3a3a4e", detail: "MARKET" },
    { x: 560, y: 550, type: "sign", width: 12, height: 24, color: "#ffd700", detail: "14" },

    // Trees along Crystal Lake Ave
    { x: 920, y: 640, type: "tree", width: 24, height: 24, color: "#2d5a27" },
    { x: 1020, y: 680, type: "tree", width: 20, height: 20, color: "#3a7a33" },
    { x: 920, y: 760, type: "tree", width: 22, height: 22, color: "#2d5a27" },
    { x: 1020, y: 840, type: "tree", width: 20, height: 20, color: "#3a7a33" },
    { x: 920, y: 920, type: "tree", width: 24, height: 24, color: "#2d5a27" },

    // Trees along Dole Ave
    { x: 660, y: 1020, type: "tree", width: 22, height: 22, color: "#2d5a27" },
    { x: 850, y: 1060, type: "tree", width: 20, height: 20, color: "#3a7a33" },
    { x: 660, y: 1160, type: "tree", width: 24, height: 24, color: "#2d5a27" },
    { x: 740, y: 1260, type: "tree", width: 20, height: 20, color: "#3a7a33" },
    { x: 660, y: 1360, type: "tree", width: 22, height: 22, color: "#2d5a27" },

    // Lakeshore Drive — lake water
    { x: 600, y: 1600, type: "water", width: 400, height: 100, color: "#1a3a5e" },
    { x: 1000, y: 1620, type: "water", width: 600, height: 80, color: "#1a3a5e" },

    // Main Beach area (finish)
    { x: 1180, y: 1480, type: "bench", width: 16, height: 8, color: "#8B4513" },
    { x: 1220, y: 1480, type: "bench", width: 16, height: 8, color: "#8B4513" },
    { x: 1060, y: 1490, type: "building", width: 80, height: 50, color: "#4a3a2e", detail: "DOLE MANSION" },
    { x: 1260, y: 1580, type: "pier", width: 8, height: 40, color: "#8B4513" },

    // Lampposts along the route
    { x: 600, y: 560, type: "lamp", width: 4, height: 20, color: "#888888" },
    { x: 800, y: 580, type: "lamp", width: 4, height: 20, color: "#888888" },
    { x: 1010, y: 720, type: "lamp", width: 4, height: 20, color: "#888888" },
    { x: 700, y: 1420, type: "lamp", width: 4, height: 20, color: "#888888" },
    { x: 900, y: 1520, type: "lamp", width: 4, height: 20, color: "#888888" },
  ],

  palette: {
    sky: "#2a1a0a",       // warm sunset sky
    grass: "#3a5a27",     // rich green
    road: "#444444",      // standard asphalt
    roadLine: "#ffd700",  // yellow center line
    roadEdge: "#cccccc",  // white edge line
    ambient: "#ffddaa",   // golden hour tint
  },

  targetTimeSec: 60,
};
```

- [ ] **Step 3: Commit**

```bash
git add components/arcade/track.ts components/arcade/tracks/lakefront.ts
git commit -m "feat: add track data format and Lakefront Sprint track"
```

---

### Task 4: Track Renderer

**Files:**
- Create: `components/arcade/track-renderer.ts`

Renders a track using Phaser graphics — draws the road, scenery, boundaries, start/finish line. This is the visual layer that takes TrackData and draws it on screen.

- [ ] **Step 1: Create the track renderer**

Create `components/arcade/track-renderer.ts`:
```typescript
import Phaser from "phaser";
import { TrackData } from "./track";

/**
 * Renders a track as Phaser game objects.
 * Call once in RaceScene.create() — objects are added to the scene and managed by Phaser.
 */
export function renderTrack(scene: Phaser.Scene, track: TrackData): {
  roadGraphics: Phaser.GameObjects.Graphics;
  sceneryObjects: Phaser.GameObjects.GameObject[];
} {
  const sceneryObjects: Phaser.GameObjects.GameObject[] = [];

  // --- Ground (grass) fill ---
  const ground = scene.add.rectangle(
    track.widthPx / 2, track.heightPx / 2,
    track.widthPx, track.heightPx,
    Phaser.Display.Color.HexStringToColor(track.palette.grass).color
  ).setDepth(0);

  // --- Road surface ---
  const roadGraphics = scene.add.graphics().setDepth(1);
  const roadColor = Phaser.Display.Color.HexStringToColor(track.palette.road).color;
  const lineColor = Phaser.Display.Color.HexStringToColor(track.palette.roadLine).color;
  const edgeColor = Phaser.Display.Color.HexStringToColor(track.palette.roadEdge).color;

  for (const seg of track.roadSegments) {
    // Fill road polygon
    roadGraphics.fillStyle(roadColor, 1);
    roadGraphics.beginPath();
    roadGraphics.moveTo(seg.points[0].x, seg.points[0].y);
    for (let i = 1; i < seg.points.length; i++) {
      roadGraphics.lineTo(seg.points[i].x, seg.points[i].y);
    }
    roadGraphics.closePath();
    roadGraphics.fillPath();
  }

  // --- Center line dashes along waypoints ---
  const dashGraphics = scene.add.graphics().setDepth(2);
  dashGraphics.lineStyle(2, lineColor, 0.6);
  for (let i = 0; i < track.waypoints.length - 1; i += 2) {
    const a = track.waypoints[i];
    const b = track.waypoints[Math.min(i + 1, track.waypoints.length - 1)];
    dashGraphics.beginPath();
    dashGraphics.moveTo(a.x, a.y);
    dashGraphics.lineTo(b.x, b.y);
    dashGraphics.strokePath();
  }

  // --- Finish line ---
  const fl = track.finishLine;
  const finishGraphics = scene.add.graphics().setDepth(3);
  // Checkerboard pattern
  const checkerSize = 10;
  const numCheckers = Math.ceil(fl.width / checkerSize);
  for (let i = 0; i < numCheckers; i++) {
    for (let row = 0; row < 2; row++) {
      const isWhite = (i + row) % 2 === 0;
      const color = isWhite ? 0xffffff : 0x000000;
      const offsetX = (i - numCheckers / 2) * checkerSize;
      const offsetY = (row - 0.5) * checkerSize;
      // Rotate around finish line angle
      const cos = Math.cos(fl.angle);
      const sin = Math.sin(fl.angle);
      const rx = offsetX * cos - offsetY * sin + fl.x;
      const ry = offsetX * sin + offsetY * cos + fl.y;
      finishGraphics.fillStyle(color, 0.8);
      finishGraphics.fillRect(rx - checkerSize / 2, ry - checkerSize / 2, checkerSize, checkerSize);
    }
  }

  // --- Scenery objects ---
  for (const item of track.scenery) {
    const color = Phaser.Display.Color.HexStringToColor(item.color).color;

    switch (item.type) {
      case "tree": {
        // Shadow
        const shadow = scene.add.ellipse(item.x + 3, item.y + 3, item.width, item.height * 0.5, 0x000000, 0.2).setDepth(4);
        // Canopy
        const tree = scene.add.circle(item.x, item.y, item.width / 2, color).setDepth(5);
        sceneryObjects.push(shadow, tree);
        break;
      }
      case "building": {
        const bld = scene.add.rectangle(item.x, item.y, item.width, item.height, color).setDepth(4);
        // Windows
        const winColor = 0xffd700;
        for (let wx = item.x - item.width / 2 + 8; wx < item.x + item.width / 2 - 4; wx += 12) {
          for (let wy = item.y - item.height / 2 + 6; wy < item.y + item.height / 2 - 4; wy += 10) {
            const win = scene.add.rectangle(wx, wy, 5, 5, winColor, 0.4).setDepth(5);
            sceneryObjects.push(win);
          }
        }
        if (item.detail) {
          const label = scene.add.text(item.x, item.y + item.height / 2 + 8, item.detail, {
            fontFamily: "'Press Start 2P'", fontSize: "6px", color: "#aaaaaa",
          }).setOrigin(0.5).setDepth(5);
          sceneryObjects.push(label);
        }
        sceneryObjects.push(bld);
        break;
      }
      case "lamp": {
        const pole = scene.add.rectangle(item.x, item.y, item.width, item.height, color).setDepth(4);
        // Light glow
        const glow = scene.add.circle(item.x, item.y - item.height / 2, 8, 0xffd700, 0.15).setDepth(4);
        sceneryObjects.push(pole, glow);
        break;
      }
      case "sign": {
        const signBg = scene.add.rectangle(item.x, item.y, item.width, item.height, color).setDepth(5);
        if (item.detail) {
          const signText = scene.add.text(item.x, item.y, item.detail, {
            fontFamily: "'Press Start 2P'", fontSize: "8px", color: "#000000",
          }).setOrigin(0.5).setDepth(6);
          sceneryObjects.push(signText);
        }
        sceneryObjects.push(signBg);
        break;
      }
      case "water": {
        const water = scene.add.rectangle(item.x, item.y, item.width, item.height, color, 0.7).setDepth(1);
        sceneryObjects.push(water);
        break;
      }
      case "bench": {
        const bench = scene.add.rectangle(item.x, item.y, item.width, item.height, color).setDepth(4);
        sceneryObjects.push(bench);
        break;
      }
      case "pier": {
        const pier = scene.add.rectangle(item.x, item.y, item.width, item.height, color).setDepth(4);
        sceneryObjects.push(pier);
        break;
      }
      case "fence": {
        const fence = scene.add.rectangle(item.x, item.y, item.width, item.height, color, 0.6).setDepth(4);
        sceneryObjects.push(fence);
        break;
      }
      default: {
        const generic = scene.add.rectangle(item.x, item.y, item.width, item.height, color).setDepth(4);
        sceneryObjects.push(generic);
      }
    }
  }

  // --- Boundary debug outlines (only visible in debug mode) ---
  // Uncomment for debugging:
  // const debugGfx = scene.add.graphics().setDepth(100);
  // debugGfx.lineStyle(1, 0xff0000, 0.3);
  // for (const b of track.boundaries) {
  //   debugGfx.strokeRect(b.x, b.y, b.width, b.height);
  // }

  return { roadGraphics, sceneryObjects };
}
```

- [ ] **Step 2: Commit**

```bash
git add components/arcade/track-renderer.ts
git commit -m "feat: add Phaser track renderer for top-down road, scenery, finish line"
```

---

### Task 5: AI Opponent System

**Files:**
- Create: `components/arcade/ai.ts`

AI drivers that follow track waypoints with varying skill levels. Pure logic — takes a CarState and track data, returns input decisions.

- [ ] **Step 1: Create the AI system**

Create `components/arcade/ai.ts`:
```typescript
import { CarState } from "./topdown-physics";
import { TrackData, nearestWaypointIndex } from "./track";

export type AIInput = {
  accel: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
};

/**
 * AI driver — follows waypoints with configurable skill.
 * skill: 0.85 (sloppy) to 1.0 (precise)
 */
export class AIDriver {
  skill: number;
  targetWpIdx: number;
  reactionDelayMs: number;
  private startDelayMs: number;
  private elapsed = 0;

  constructor(skill: number) {
    this.skill = skill;
    this.targetWpIdx = 0;
    // Worse skill = slower reactions
    this.reactionDelayMs = 150 + (1 - skill) * 500;
    // Stagger starts slightly
    this.startDelayMs = 200 + Math.random() * 300;
  }

  /** Get AI input for this frame */
  update(car: CarState, track: TrackData): AIInput {
    this.elapsed += 1000 / 60;

    // Start delay — AI doesn't react instantly to green light
    if (this.elapsed < this.startDelayMs) {
      return { accel: false, brake: false, steerLeft: false, steerRight: false };
    }

    // Find current nearest waypoint and target the one 2-3 ahead
    const currentIdx = nearestWaypointIndex(track, car.x, car.y);
    const lookAhead = Math.max(2, Math.round(car.speed * 0.8)); // faster = look further ahead
    this.targetWpIdx = Math.min(currentIdx + lookAhead, track.waypoints.length - 1);
    const target = track.waypoints[this.targetWpIdx];

    // Angle to target
    const dx = target.x - car.x;
    const dy = target.y - car.y;
    const targetAngle = Math.atan2(dx, -dy); // atan2(sin, cos) for our coord system

    // Angle difference (normalized to -PI..PI)
    let angleDiff = targetAngle - car.angle;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    // Add some imprecision based on skill
    const noise = (1 - this.skill) * (Math.sin(this.elapsed * 0.003) * 0.15);
    angleDiff += noise;

    // Steering
    const steerThreshold = 0.05;
    const steerLeft = angleDiff < -steerThreshold;
    const steerRight = angleDiff > steerThreshold;

    // Throttle: ease off in sharp turns, full throttle on straights
    const turnSeverity = Math.abs(angleDiff);
    const shouldBrake = turnSeverity > 0.8 && car.speed > car.stats.topSpeed * 0.7;
    const shouldAccel = !shouldBrake;

    // Skill affects max speed — worse AI doesn't push as hard
    const speedLimit = car.stats.topSpeed * this.skill;
    const accel = shouldAccel && car.speed < speedLimit;

    return { accel, brake: shouldBrake, steerLeft, steerRight };
  }
}

/** Create 3 AI drivers with random skill levels */
export function createAIDrivers(): AIDriver[] {
  return [
    new AIDriver(0.90 + Math.random() * 0.10), // 0.90–1.00 (good)
    new AIDriver(0.85 + Math.random() * 0.10), // 0.85–0.95 (decent)
    new AIDriver(0.85 + Math.random() * 0.08), // 0.85–0.93 (slightly worse)
  ];
}
```

- [ ] **Step 2: Commit**

```bash
git add components/arcade/ai.ts
git commit -m "feat: add waypoint-following AI driver system with skill variance"
```

---

### Task 6: HUD Overlay System

**Files:**
- Create: `components/arcade/hud.ts`

The cockpit HUD overlay and race info (position, timer, minimap).

- [ ] **Step 1: Create the HUD system**

Create `components/arcade/hud.ts`:
```typescript
import Phaser from "phaser";
import { CarState } from "./topdown-physics";
import { TrackData, raceProgress } from "./track";
import { RaceCar } from "./types";

/**
 * Race HUD — renders position, timer, minimap, and cockpit overlay.
 * All elements are added to a fixed-camera UI layer.
 */
export class RaceHUD {
  private scene: Phaser.Scene;
  private positionText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private gearText!: Phaser.GameObjects.Text;

  // Minimap
  private minimapGraphics!: Phaser.GameObjects.Graphics;
  private minimapX: number;
  private minimapY: number;
  private minimapSize = 120;

  // Cockpit
  private cockpitBg!: Phaser.GameObjects.Rectangle;
  private tachGraphics!: Phaser.GameObjects.Graphics;

  private track: TrackData;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene, track: TrackData) {
    this.scene = scene;
    this.track = track;
    this.minimapX = 0;
    this.minimapY = 0;
  }

  create() {
    const { width, height } = this.scene.scale;

    // Create a UI camera that ignores world scroll
    this.uiCamera = this.scene.cameras.add(0, 0, width, height);
    this.uiCamera.setScroll(0, 0);

    // --- Position indicator (top-left) ---
    this.positionText = this.scene.add.text(16, 16, "1st / 4", {
      fontFamily: "'Press Start 2P'",
      fontSize: "14px",
      color: "#ffd700",
    }).setDepth(200).setScrollFactor(0);

    // --- Timer (top-center) ---
    this.timerText = this.scene.add.text(width / 2, 16, "0.00", {
      fontFamily: "'Press Start 2P'",
      fontSize: "14px",
      color: "#ffffff",
    }).setOrigin(0.5, 0).setDepth(200).setScrollFactor(0);

    // --- Minimap (top-right) ---
    this.minimapX = width - this.minimapSize - 16;
    this.minimapY = 16;
    // Minimap background
    this.scene.add.rectangle(
      this.minimapX + this.minimapSize / 2,
      this.minimapY + this.minimapSize / 2,
      this.minimapSize, this.minimapSize,
      0x000000, 0.5
    ).setDepth(199).setScrollFactor(0);

    this.minimapGraphics = this.scene.add.graphics().setDepth(200).setScrollFactor(0);

    // --- Cockpit overlay (bottom strip) ---
    const cockpitH = height * 0.12;
    this.cockpitBg = this.scene.add.rectangle(
      width / 2, height - cockpitH / 2,
      width, cockpitH,
      0x1a1a1a, 0.8
    ).setDepth(198).setScrollFactor(0);

    // Speed display
    this.speedText = this.scene.add.text(width / 2 - 80, height - cockpitH + 10, "0 MPH", {
      fontFamily: "'Press Start 2P'",
      fontSize: "16px",
      color: "#ffd700",
    }).setDepth(200).setScrollFactor(0);

    // Tachometer
    this.tachGraphics = this.scene.add.graphics().setDepth(200).setScrollFactor(0);

    // Gear indicator
    this.gearText = this.scene.add.text(width / 2 + 80, height - cockpitH + 10, "", {
      fontFamily: "'Press Start 2P'",
      fontSize: "12px",
      color: "#aaaaaa",
    }).setDepth(200).setScrollFactor(0);

    // Make main camera ignore UI elements
    const mainCam = this.scene.cameras.main;
    mainCam.ignore([
      this.positionText, this.timerText, this.minimapGraphics,
      this.cockpitBg, this.speedText, this.tachGraphics, this.gearText,
    ]);
  }

  update(player: CarState, allCars: CarState[], elapsedMs: number) {
    const { width, height } = this.scene.scale;

    // --- Position ---
    const playerProgress = raceProgress(this.track, player.x, player.y);
    let position = 1;
    for (const car of allCars) {
      if (car === player) continue;
      const otherProgress = raceProgress(this.track, car.x, car.y);
      if (otherProgress > playerProgress) position++;
    }
    const suffix = position === 1 ? "st" : position === 2 ? "nd" : position === 3 ? "rd" : "th";
    this.positionText.setText(`${position}${suffix} / ${allCars.length}`);

    // --- Timer ---
    const secs = elapsedMs / 1000;
    this.timerText.setText(secs.toFixed(2));

    // --- Speed ---
    this.speedText.setText(`${player.mph} MPH`);

    // --- Minimap ---
    this.minimapGraphics.clear();

    // Scale track to fit minimap
    const scaleX = this.minimapSize / this.track.widthPx;
    const scaleY = this.minimapSize / this.track.heightPx;
    const scale = Math.min(scaleX, scaleY) * 0.9;
    const offsetX = this.minimapX + (this.minimapSize - this.track.widthPx * scale) / 2;
    const offsetY = this.minimapY + (this.minimapSize - this.track.heightPx * scale) / 2;

    // Draw track path
    this.minimapGraphics.lineStyle(2, 0x444444, 0.8);
    this.minimapGraphics.beginPath();
    for (let i = 0; i < this.track.waypoints.length; i++) {
      const wp = this.track.waypoints[i];
      const mx = offsetX + wp.x * scale;
      const my = offsetY + wp.y * scale;
      if (i === 0) this.minimapGraphics.moveTo(mx, my);
      else this.minimapGraphics.lineTo(mx, my);
    }
    this.minimapGraphics.strokePath();

    // Draw car dots
    const colors = [0xffd700, 0xff4444, 0x4488ff, 0x44cc44];
    allCars.forEach((car, i) => {
      const mx = offsetX + car.x * scale;
      const my = offsetY + car.y * scale;
      this.minimapGraphics.fillStyle(colors[i] || 0xffffff, 1);
      this.minimapGraphics.fillCircle(mx, my, i === 0 ? 4 : 3);
    });
  }

  /** Show race result as "1st / 4" locked in */
  showFinishPosition(position: number, total: number) {
    const suffix = position === 1 ? "st" : position === 2 ? "nd" : position === 3 ? "rd" : "th";
    this.positionText.setText(`${position}${suffix} / ${total}`);
    this.positionText.setColor(position === 1 ? "#ffd700" : "#ff4444");
    this.positionText.setFontSize(18);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add components/arcade/hud.ts
git commit -m "feat: add race HUD with position, timer, minimap, cockpit overlay"
```

---

### Task 7: Effects System (Exhaust, Tire Marks, Drift Smoke)

**Files:**
- Create: `components/arcade/effects.ts`

Particle effects per car type — exhaust trails, tire marks on drift, drift smoke clouds.

- [ ] **Step 1: Create the effects system**

Create `components/arcade/effects.ts`:
```typescript
import Phaser from "phaser";
import { CarState } from "./topdown-physics";
import { RaceCar } from "./types";

/** Per-car effect configuration based on car type */
function getExhaustConfig(car: RaceCar): { color: number; alpha: number; scale: number; lifespan: number } {
  const engine = (car.engineType || "").toLowerCase();
  const category = (car.category || "").toLowerCase();

  if (engine.includes("electric") || engine === "ev") {
    return { color: 0x4488ff, alpha: 0.3, scale: 0.3, lifespan: 200 };
  }
  if (engine.includes("diesel")) {
    return { color: 0x222222, alpha: 0.6, scale: 0.8, lifespan: 600 };
  }
  if (engine.includes("turbo") || category.includes("turbo")) {
    return { color: 0x6688cc, alpha: 0.4, scale: 0.5, lifespan: 300 };
  }
  // Default: V8 / muscle / generic
  return { color: 0x555555, alpha: 0.4, scale: 0.5, lifespan: 400 };
}

/**
 * Manages visual effects for one car.
 * Create one CarEffects per car in the race.
 */
export class CarEffects {
  private scene: Phaser.Scene;
  private car: RaceCar;
  private exhaustConfig: ReturnType<typeof getExhaustConfig>;

  // Tire marks: drawn as permanent graphics on the track surface
  private tireMarkGraphics: Phaser.GameObjects.Graphics;
  private lastTireMarkPos: { x: number; y: number } | null = null;

  constructor(scene: Phaser.Scene, car: RaceCar) {
    this.scene = scene;
    this.car = car;
    this.exhaustConfig = getExhaustConfig(car);
    this.tireMarkGraphics = scene.add.graphics().setDepth(2);
  }

  /** Call each frame to update effects based on car state */
  update(state: CarState) {
    // --- Exhaust puffs ---
    if (state.speed > 0.5) {
      // Emit exhaust behind the car
      const behindX = state.x - Math.sin(state.angle) * 16;
      const behindY = state.y + Math.cos(state.angle) * 16;

      // Only emit every few frames to avoid spam
      if (Math.random() < 0.3) {
        const puff = this.scene.add.circle(
          behindX + (Math.random() - 0.5) * 6,
          behindY + (Math.random() - 0.5) * 6,
          3 * this.exhaustConfig.scale,
          this.exhaustConfig.color,
          this.exhaustConfig.alpha
        ).setDepth(3);

        this.scene.tweens.add({
          targets: puff,
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          duration: this.exhaustConfig.lifespan,
          onComplete: () => puff.destroy(),
        });
      }
    }

    // --- Tire marks on drift ---
    if (state.isDrifting) {
      const driveType = (this.car.driveType || "RWD").toUpperCase();
      this.tireMarkGraphics.lineStyle(2, 0x222222, 0.3);

      if (driveType === "RWD" || driveType === "AWD") {
        // Rear tire marks
        this.drawTireMark(state, -6, 10); // left rear
        this.drawTireMark(state, 6, 10);  // right rear
      }
      if (driveType === "FWD" || driveType === "AWD") {
        // Front tire marks
        this.drawTireMark(state, -6, -10); // left front
        this.drawTireMark(state, 6, -10);  // right front
      }

      // --- Drift smoke ---
      if (Math.random() < 0.4) {
        const smokeX = state.x - Math.sin(state.angle) * 10 + (Math.random() - 0.5) * 12;
        const smokeY = state.y + Math.cos(state.angle) * 10 + (Math.random() - 0.5) * 12;
        const smoke = this.scene.add.circle(smokeX, smokeY, 4, 0xcccccc, 0.3).setDepth(3);
        this.scene.tweens.add({
          targets: smoke,
          alpha: 0,
          scaleX: 3,
          scaleY: 3,
          duration: 500,
          onComplete: () => smoke.destroy(),
        });
      }
    } else {
      this.lastTireMarkPos = null;
    }
  }

  private drawTireMark(state: CarState, offsetX: number, offsetY: number) {
    const cos = Math.cos(state.angle);
    const sin = Math.sin(state.angle);
    const wx = state.x + offsetX * cos - offsetY * sin;
    const wy = state.y + offsetX * sin + offsetY * cos;

    if (this.lastTireMarkPos) {
      this.tireMarkGraphics.beginPath();
      this.tireMarkGraphics.moveTo(this.lastTireMarkPos.x, this.lastTireMarkPos.y);
      this.tireMarkGraphics.lineTo(wx, wy);
      this.tireMarkGraphics.strokePath();
    }
    this.lastTireMarkPos = { x: wx, y: wy };
  }

  destroy() {
    this.tireMarkGraphics.destroy();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add components/arcade/effects.ts
git commit -m "feat: add per-car exhaust, tire marks, and drift smoke effects"
```

---

### Task 8: TrackSelectScene

**Files:**
- Create: `components/arcade/scenes/TrackSelectScene.ts`
- Modify: `components/arcade/PhaserGame.tsx`
- Modify: `components/arcade/scenes/SelectScene.ts`

New scene between car select and matchup — pick your track. Also update the scene flow so SelectScene → TrackSelectScene → MatchupScene.

- [ ] **Step 1: Create TrackSelectScene**

Create `components/arcade/scenes/TrackSelectScene.ts`:
```typescript
import Phaser from "phaser";
import { lakefrontTrack } from "../tracks/lakefront";
import { TrackData } from "../track";

const TRACKS: TrackData[] = [lakefrontTrack];
// Future: import and add downtown, route14 tracks here

export class TrackSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "TrackSelectScene" });
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0d0d1a");

    // Header
    this.add.text(width / 2, 20, "CLCC ARCADE", {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#aaaaaa", letterSpacing: 3,
    }).setOrigin(0.5);

    this.add.text(width / 2, 50, "CHOOSE YOUR TRACK", {
      fontFamily: "'Press Start 2P'", fontSize: "20px", color: "#ffd700",
    }).setOrigin(0.5);

    // Track cards
    const cardW = Math.min(350, width * 0.8);
    const cardH = 120;
    const startY = 120;

    TRACKS.forEach((track, i) => {
      const y = startY + i * (cardH + 20);

      // Card background
      const bg = this.add.rectangle(width / 2, y, cardW, cardH, 0x1a1a2e)
        .setStrokeStyle(2, 0x333333)
        .setInteractive({ useHandCursor: true });

      // Track name
      this.add.text(width / 2 - cardW / 2 + 16, y - cardH / 2 + 16, track.name, {
        fontFamily: "'Press Start 2P'", fontSize: "16px", color: "#ffd700",
      });

      // Subtitle (route)
      this.add.text(width / 2 - cardW / 2 + 16, y - cardH / 2 + 42, track.subtitle, {
        fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#aaaaaa",
      });

      // Mini track preview — draw the waypoints as a simple line
      const previewSize = 60;
      const previewX = width / 2 + cardW / 2 - previewSize - 16;
      const previewY = y;
      const previewGfx = this.add.graphics();

      const scaleX = previewSize / track.widthPx;
      const scaleY = previewSize / track.heightPx;
      const scale = Math.min(scaleX, scaleY) * 0.8;
      const ox = previewX - (track.widthPx * scale) / 2;
      const oy = previewY - (track.heightPx * scale) / 2;

      // Background
      this.add.rectangle(previewX, previewY, previewSize + 8, previewSize + 8, 0x000000, 0.3);

      previewGfx.lineStyle(2, Phaser.Display.Color.HexStringToColor(track.palette.road).color, 0.8);
      previewGfx.beginPath();
      track.waypoints.forEach((wp, j) => {
        const mx = ox + wp.x * scale;
        const my = oy + wp.y * scale;
        if (j === 0) previewGfx.moveTo(mx, my);
        else previewGfx.lineTo(mx, my);
      });
      previewGfx.strokePath();

      // Start dot
      const startWp = track.waypoints[0];
      previewGfx.fillStyle(0x44ff44, 1);
      previewGfx.fillCircle(ox + startWp.x * scale, oy + startWp.y * scale, 3);

      // End dot
      const endWp = track.waypoints[track.waypoints.length - 1];
      previewGfx.fillStyle(0xff4444, 1);
      previewGfx.fillCircle(ox + endWp.x * scale, oy + endWp.y * scale, 3);

      // Target time
      this.add.text(width / 2 - cardW / 2 + 16, y + cardH / 2 - 28,
        `TARGET: ${track.targetTimeSec}s`, {
        fontFamily: "'Press Start 2P'", fontSize: "9px", color: "#555555",
      });

      // Hover/click
      bg.on("pointerover", () => bg.setStrokeStyle(2, 0xffd700));
      bg.on("pointerout", () => bg.setStrokeStyle(2, 0x333333));
      bg.on("pointerdown", () => {
        this.registry.set("selectedTrack", track);
        this.scene.start("MatchupScene");
      });
    });

    // "COMING SOON" for future tracks
    if (TRACKS.length < 3) {
      const nextY = startY + TRACKS.length * (cardH + 20);
      for (let i = TRACKS.length; i < 3; i++) {
        const y = nextY + (i - TRACKS.length) * (cardH + 20);
        this.add.rectangle(width / 2, y, cardW, cardH, 0x111122)
          .setStrokeStyle(1, 0x222233);
        this.add.text(width / 2, y, "COMING SOON", {
          fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#333344",
        }).setOrigin(0.5);
      }
    }

    // Back button
    const backText = this.add.text(width / 2, height - 40, "PICK DIFFERENT CAR", {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#555555",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backText.on("pointerover", () => backText.setColor("#aaaaaa"));
    backText.on("pointerout", () => backText.setColor("#555555"));
    backText.on("pointerdown", () => this.scene.start("SelectScene"));
  }
}
```

- [ ] **Step 2: Update SelectScene to go to TrackSelectScene**

In `components/arcade/scenes/SelectScene.ts`, change line 157:
```typescript
// Old:
this.scene.start("MatchupScene");
// New:
this.scene.start("TrackSelectScene");
```

- [ ] **Step 3: Update PhaserGame.tsx to include TrackSelectScene**

Replace the contents of `components/arcade/PhaserGame.tsx`:
```typescript
"use client";

import { useEffect, useRef } from "react";
import { RaceCar } from "./types";

type Props = {
  selectedCar?: RaceCar;  // Phase 2: passed from /race car picker
};

export default function PhaserGame({ selectedCar }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let game: Phaser.Game | null = null;

    Promise.all([
      import("phaser"),
      import("@/components/arcade/scenes/BootScene"),
      import("@/components/arcade/scenes/TitleScene"),
      import("@/components/arcade/scenes/SelectScene"),
      import("@/components/arcade/scenes/TrackSelectScene"),
      import("@/components/arcade/scenes/MatchupScene"),
      import("@/components/arcade/scenes/RaceScene"),
    ]).then(([Phaser, { BootScene }, { TitleScene }, { SelectScene }, { TrackSelectScene }, { MatchupScene }, { RaceScene }]) => {
      const w = containerRef.current!.clientWidth;
      const h = containerRef.current!.clientHeight;

      game = new Phaser.Game({
        type: Phaser.AUTO,
        width: w,
        height: h,
        parent: containerRef.current!,
        backgroundColor: "#0d0d1a",
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [BootScene, TitleScene, SelectScene, TrackSelectScene, MatchupScene, RaceScene],
      });

      game.registry.set("supabaseUrl", process.env.NEXT_PUBLIC_SUPABASE_URL || "");

      // Phase 2: if a car was passed in, skip title/select
      if (selectedCar) {
        game.registry.set("playerCar", selectedCar);
        // BootScene will still load car data, then we jump to TrackSelectScene
        game.registry.set("skipToTrackSelect", true);
      }
    });

    return () => {
      if (game) game.destroy(true);
    };
  }, [selectedCar]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
```

- [ ] **Step 4: Update MatchupScene for 4 cars**

In `components/arcade/scenes/MatchupScene.ts`, update the `create()` method to select 3 opponents instead of 1 and store them. Replace the opponent selection logic. Change the RACE button to pass data correctly.

In the `create()` method, after getting `playerCar` (line 11), replace the single `opponentCar` with an array:

```typescript
    const playerCar: RaceCar = this.registry.get("playerCar");
    const allCars: RaceCar[] = this.registry.get("cars") || [];
    const others = allCars.filter((c) => c.id !== playerCar.id);

    // Pick 3 random opponents
    const shuffled = [...others].sort(() => Math.random() - 0.5);
    const opponents = shuffled.slice(0, Math.min(3, shuffled.length));
    this.registry.set("opponentCars", opponents);
```

The rest of MatchupScene can keep showing P1 vs the first opponent for now — the full 4-car display is a polish item. The important thing is that `opponentCars` (array of 3) is in the registry for RaceScene to use.

- [ ] **Step 5: Verify the scene flow works**

```bash
# Open http://localhost:3002/arcade
# Click through: Title → Select car → TrackSelectScene should appear
# Pick Lakefront Sprint → Matchup should appear → RACE → placeholder
```

- [ ] **Step 6: Commit**

```bash
git add components/arcade/scenes/TrackSelectScene.ts components/arcade/PhaserGame.tsx components/arcade/scenes/SelectScene.ts components/arcade/scenes/MatchupScene.ts
git commit -m "feat: add TrackSelectScene, update scene flow, support 3 AI opponents"
```

---

### Task 9: The New RaceScene — Core Game Loop

**Files:**
- Modify: `components/arcade/scenes/RaceScene.ts` (replace placeholder with full implementation)

This is the big one — the actual top-down racing game. Ties together physics, track renderer, AI, HUD, and effects into a playable race.

- [ ] **Step 1: Replace the placeholder RaceScene with the full implementation**

Replace `components/arcade/scenes/RaceScene.ts`:
```typescript
import Phaser from "phaser";
import { RaceCar } from "../types";
import { CarState, resolveCarCollision, Surface } from "../topdown-physics";
import { TrackData, getSurfaceAt, hasCrossedFinish, raceProgress } from "../track";
import { renderTrack } from "../track-renderer";
import { AIDriver, createAIDrivers } from "../ai";
import { RaceHUD } from "../hud";
import { CarEffects } from "../effects";

type RacePhase = "countdown" | "racing" | "finished";

export class RaceScene extends Phaser.Scene {
  private player!: CarState;
  private opponents: CarState[] = [];
  private allCars: CarState[] = [];
  private aiDrivers: AIDriver[] = [];
  private effects: CarEffects[] = [];
  private hud!: RaceHUD;
  private track!: TrackData;
  private phase: RacePhase = "countdown";
  private raceElapsedMs = 0;
  private countdownTimer = 3;
  private countdownText!: Phaser.GameObjects.Text;
  private carSprites: Phaser.GameObjects.Rectangle[] = [];
  private finishOrder: CarState[] = [];

  constructor() {
    super({ key: "RaceScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Get selected track and cars from registry
    this.track = this.registry.get("selectedTrack");
    const playerCar: RaceCar = this.registry.get("playerCar");
    const opponentCars: RaceCar[] = this.registry.get("opponentCars") || [];

    if (!this.track || !playerCar) {
      this.scene.start("SelectScene");
      return;
    }

    // Reset state
    this.phase = "countdown";
    this.raceElapsedMs = 0;
    this.countdownTimer = 3;
    this.finishOrder = [];

    // --- Create car physics states from spawn points ---
    const sp = this.track.spawnPoints;
    this.player = new CarState(playerCar, sp[0].x, sp[0].y, sp[0].angle);
    this.opponents = opponentCars.slice(0, 3).map((car, i) => {
      const spawn = sp[Math.min(i + 1, sp.length - 1)];
      return new CarState(car, spawn.x, spawn.y, spawn.angle);
    });
    this.allCars = [this.player, ...this.opponents];

    // --- AI drivers ---
    this.aiDrivers = createAIDrivers();

    // --- Render track ---
    renderTrack(this, this.track);

    // --- Car sprites ---
    // For now, simple colored rectangles. Will be replaced with pixel art sprites later.
    this.carSprites = [];
    const carColors = [0xffd700, 0xff4444, 0x4488ff, 0x44cc44];
    this.allCars.forEach((car, i) => {
      const sprite = this.add.rectangle(car.x, car.y, 20, 32, carColors[i])
        .setDepth(10)
        .setStrokeStyle(1, 0x000000);
      this.carSprites.push(sprite);
    });

    // --- Effects ---
    this.effects = this.allCars.map((car) => new CarEffects(this, car.car));

    // --- HUD ---
    this.hud = new RaceHUD(this, this.track);
    this.hud.create();

    // --- Camera setup ---
    this.cameras.main.setBounds(0, 0, this.track.widthPx, this.track.heightPx);
    this.cameras.main.startFollow(this.carSprites[0], true, 0.08, 0.08);
    this.cameras.main.setZoom(1.5);

    // --- Countdown text ---
    this.countdownText = this.add.text(width / 2, height / 2, "3", {
      fontFamily: "'Press Start 2P'",
      fontSize: "64px",
      color: "#ffd700",
    }).setOrigin(0.5).setDepth(300).setScrollFactor(0);

    // Start countdown
    this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        this.countdownTimer--;
        if (this.countdownTimer > 0) {
          this.countdownText.setText(String(this.countdownTimer));
        } else {
          this.countdownText.setText("GO!");
          this.phase = "racing";
          this.time.delayedCall(500, () => this.countdownText.setAlpha(0));
        }
      },
    });

    // --- Input ---
    this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE");
  }

  update(_time: number, delta: number) {
    if (this.phase === "countdown") {
      // Update sprite positions (they're stationary, but keeps things consistent)
      this.updateSprites();
      return;
    }

    if (this.phase === "finished") {
      this.updateSprites();
      return;
    }

    // --- Racing phase ---
    this.raceElapsedMs += delta;

    const keys = this.input.keyboard!;
    const cursors = keys.addKeys("UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE") as Record<string, Phaser.Input.Keyboard.Key>;

    // --- Player input ---
    const playerInput = {
      accel: cursors.UP.isDown || cursors.W.isDown || cursors.SPACE.isDown,
      brake: cursors.DOWN.isDown || cursors.S.isDown,
      steerLeft: cursors.LEFT.isDown || cursors.A.isDown,
      steerRight: cursors.RIGHT.isDown || cursors.D.isDown,
    };

    // Update surface for all cars
    for (const car of this.allCars) {
      car.surface = getSurfaceAt(this.track, car.x, car.y) as Surface;
    }

    // Player physics
    this.player.update(playerInput);

    // AI physics
    this.opponents.forEach((opp, i) => {
      if (i < this.aiDrivers.length) {
        const aiInput = this.aiDrivers[i].update(opp, this.track);
        opp.update(aiInput);
      }
    });

    // --- Collisions: car-to-car ---
    for (let i = 0; i < this.allCars.length; i++) {
      for (let j = i + 1; j < this.allCars.length; j++) {
        resolveCarCollision(this.allCars[i], this.allCars[j]);
      }
    }

    // --- Collisions: car-to-boundary ---
    for (const car of this.allCars) {
      for (const b of this.track.boundaries) {
        // Simple AABB check — push car out of boundary rectangles
        const carR = 14;
        const bLeft = b.x;
        const bRight = b.x + b.width;
        const bTop = b.y;
        const bBottom = b.y + b.height;

        // Find nearest point on boundary to car
        const nearX = Math.max(bLeft, Math.min(car.x, bRight));
        const nearY = Math.max(bTop, Math.min(car.y, bBottom));
        const dx = car.x - nearX;
        const dy = car.y - nearY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < carR && dist > 0) {
          // Push car out
          const nx = dx / dist;
          const ny = dy / dist;
          car.x = nearX + nx * carR;
          car.y = nearY + ny * carR;
          car.speed *= 0.6;
        }
      }

      // Keep cars within track bounds
      car.x = Math.max(14, Math.min(car.x, this.track.widthPx - 14));
      car.y = Math.max(14, Math.min(car.y, this.track.heightPx - 14));
    }

    // --- Finish detection ---
    for (const car of this.allCars) {
      if (!car.finished && hasCrossedFinish(this.track, car.x, car.y)) {
        // Only count if car has made progress (prevent false finish at start)
        if (raceProgress(this.track, car.x, car.y) > 0.8) {
          car.finished = true;
          car.finishTime = this.raceElapsedMs;
          this.finishOrder.push(car);
        }
      }
    }

    // Check if race is over (all finished or player finished)
    if (this.player.finished && this.phase === "racing") {
      this.phase = "finished";
      // Give AI a moment to finish too
      this.time.delayedCall(2000, () => this.showResults());
    }
    // Also end race if all AI finished (player loses)
    if (this.opponents.every((o) => o.finished) && !this.player.finished && this.phase === "racing") {
      this.phase = "finished";
      this.player.finished = true;
      this.player.finishTime = this.raceElapsedMs;
      this.finishOrder.push(this.player);
      this.time.delayedCall(1000, () => this.showResults());
    }

    // --- Effects ---
    this.allCars.forEach((car, i) => {
      if (i < this.effects.length) this.effects[i].update(car);
    });

    // --- HUD ---
    this.hud.update(this.player, this.allCars, this.raceElapsedMs);

    // --- Sprites ---
    this.updateSprites();
  }

  private updateSprites() {
    this.allCars.forEach((car, i) => {
      if (i < this.carSprites.length) {
        this.carSprites[i].setPosition(car.x, car.y);
        this.carSprites[i].setRotation(car.angle + car.driftAngle * 0.5);
      }
    });
  }

  private showResults() {
    const { width, height } = this.scale;

    // Dark overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x0d0d1a, 0.85)
      .setDepth(250).setScrollFactor(0);

    // Player position
    const playerIdx = this.finishOrder.indexOf(this.player);
    const position = playerIdx >= 0 ? playerIdx + 1 : this.allCars.length;
    const isWin = position === 1;

    // Header
    this.add.text(width / 2, height * 0.15, isWin ? "YOU WIN!" : "YOU LOSE", {
      fontFamily: "'Press Start 2P'",
      fontSize: "32px",
      color: isWin ? "#ffd700" : "#ff4444",
    }).setOrigin(0.5).setDepth(260).setScrollFactor(0);

    // Results table
    const resultY = height * 0.30;
    const lineH = 36;

    // Sort all cars by finish time (unfinished last)
    const sorted = [...this.allCars].sort((a, b) => {
      if (!a.finished) return 1;
      if (!b.finished) return -1;
      return a.finishTime - b.finishTime;
    });

    sorted.forEach((car, i) => {
      const y = resultY + i * lineH;
      const isPlayer = car === this.player;
      const color = isPlayer ? "#ffd700" : "#cccccc";
      const posStr = `${i + 1}${i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"}`;
      const timeStr = car.finished ? (car.finishTime / 1000).toFixed(2) + "s" : "DNF";

      this.add.text(width * 0.2, y, posStr, {
        fontFamily: "'Press Start 2P'", fontSize: "14px", color,
      }).setDepth(260).setScrollFactor(0);

      this.add.text(width * 0.35, y, car.car.name, {
        fontFamily: "'Press Start 2P'", fontSize: "11px", color,
        wordWrap: { width: width * 0.35 },
      }).setDepth(260).setScrollFactor(0);

      this.add.text(width * 0.78, y, timeStr, {
        fontFamily: "'Press Start 2P'", fontSize: "12px", color,
      }).setOrigin(1, 0).setDepth(260).setScrollFactor(0);
    });

    // Player stats
    const statsY = resultY + sorted.length * lineH + 20;
    this.add.text(width / 2, statsY,
      `TOP SPEED: ${this.player.mph} MPH  |  DRIFTS: ${this.player.driftCount}`, {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#aaaaaa",
    }).setOrigin(0.5).setDepth(260).setScrollFactor(0);

    // Buttons
    const btnY = height * 0.78;

    const raceAgainBtn = this.add.rectangle(width * 0.35, btnY, 200, 45, 0xffd700)
      .setInteractive({ useHandCursor: true }).setDepth(260).setScrollFactor(0);
    this.add.text(width * 0.35, btnY, "RACE AGAIN", {
      fontFamily: "'Press Start 2P'", fontSize: "14px", color: "#0d0d1a",
    }).setOrigin(0.5).setDepth(261).setScrollFactor(0);
    raceAgainBtn.on("pointerover", () => raceAgainBtn.setFillStyle(0xffe066));
    raceAgainBtn.on("pointerout", () => raceAgainBtn.setFillStyle(0xffd700));
    raceAgainBtn.on("pointerdown", () => this.scene.restart());

    const newTrackBtn = this.add.rectangle(width * 0.65, btnY, 200, 45, 0x1a1a2e)
      .setStrokeStyle(2, 0x333333)
      .setInteractive({ useHandCursor: true }).setDepth(260).setScrollFactor(0);
    this.add.text(width * 0.65, btnY, "NEW TRACK", {
      fontFamily: "'Press Start 2P'", fontSize: "14px", color: "#cccccc",
    }).setOrigin(0.5).setDepth(261).setScrollFactor(0);
    newTrackBtn.on("pointerover", () => newTrackBtn.setStrokeStyle(2, 0xffd700));
    newTrackBtn.on("pointerout", () => newTrackBtn.setStrokeStyle(2, 0x333333));
    newTrackBtn.on("pointerdown", () => this.scene.start("TrackSelectScene"));

    const newCarBtn = this.add.text(width / 2, btnY + 50, "NEW CAR", {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#555555",
    }).setOrigin(0.5).setDepth(260).setScrollFactor(0).setInteractive({ useHandCursor: true });
    newCarBtn.on("pointerover", () => newCarBtn.setColor("#aaaaaa"));
    newCarBtn.on("pointerout", () => newCarBtn.setColor("#555555"));
    newCarBtn.on("pointerdown", () => this.scene.start("SelectScene"));
  }
}
```

- [ ] **Step 2: Verify the full game loop works**

```bash
# Open http://localhost:3002/arcade
# Flow: Title → Select car → Pick Lakefront Sprint → Matchup → RACE
# Should see: countdown 3-2-1-GO, top-down track, car responds to arrow keys
# AI cars should move along waypoints, minimap visible, HUD shows speed/position
# Cross finish line → results screen with placements
```

- [ ] **Step 3: Commit**

```bash
git add components/arcade/scenes/RaceScene.ts
git commit -m "feat: implement full top-down RaceScene with physics, AI, HUD, effects"
```

---

### Task 10: Downtown Dash and Route 14 Blitz Tracks

**Files:**
- Create: `components/arcade/tracks/downtown.ts`
- Create: `components/arcade/tracks/route14.ts`
- Modify: `components/arcade/scenes/TrackSelectScene.ts`

Add the remaining two launch tracks.

- [ ] **Step 1: Create Downtown Dash track**

Create `components/arcade/tracks/downtown.ts`:
```typescript
import { TrackData } from "../track";

function roadFromCenter(centerline: { x: number; y: number }[], halfWidth: number): { x: number; y: number }[] {
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  for (let i = 0; i < centerline.length; i++) {
    const prev = centerline[Math.max(0, i - 1)];
    const next = centerline[Math.min(centerline.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    left.push({ x: centerline[i].x + nx * halfWidth, y: centerline[i].y + ny * halfWidth });
    right.push({ x: centerline[i].x - nx * halfWidth, y: centerline[i].y - ny * halfWidth });
  }
  return [...left, ...right.reverse()];
}

const ROAD_HALF_WIDTH = 32; // Narrower downtown streets

const centerline: { x: number; y: number }[] = [
  // Start: heading south from Route 14
  { x: 500, y: 80 },
  { x: 500, y: 180 },
  // Turn east onto Williams Street
  { x: 520, y: 240 },
  { x: 580, y: 280 },
  { x: 680, y: 300 },
  { x: 780, y: 300 },
  // Continue east past Raue Center
  { x: 880, y: 300 },
  { x: 960, y: 300 },
  // Sharp right turn south onto a cross street
  { x: 1000, y: 320 },
  { x: 1020, y: 380 },
  { x: 1020, y: 480 },
  // Left turn east onto Crystal Lake Ave
  { x: 1040, y: 530 },
  { x: 1100, y: 560 },
  { x: 1200, y: 560 },
  // Continue east
  { x: 1300, y: 560 },
  // Sharp right south
  { x: 1340, y: 600 },
  { x: 1340, y: 700 },
  { x: 1340, y: 800 },
  // Left turn east toward Virginia Street
  { x: 1360, y: 860 },
  { x: 1420, y: 900 },
  { x: 1500, y: 900 },
  // Finish on Virginia Street
  { x: 1600, y: 900 },
];

export const downtownTrack: TrackData = {
  name: "DOWNTOWN DASH",
  subtitle: "Williams St → Virginia St",
  widthPx: 1800,
  heightPx: 1100,

  roadSegments: [{ points: roadFromCenter(centerline, ROAD_HALF_WIDTH) }],
  waypoints: centerline,

  spawnPoints: [
    { x: 485, y: 120, angle: Math.PI },
    { x: 515, y: 120, angle: Math.PI },
    { x: 485, y: 160, angle: Math.PI },
    { x: 515, y: 160, angle: Math.PI },
  ],

  finishLine: { x: 1600, y: 900, angle: Math.PI / 2, width: 80 },

  boundaries: [
    // Williams Street buildings (north side)
    { x: 580, y: 240, width: 80, height: 40 },
    { x: 700, y: 240, width: 100, height: 40 },
    { x: 840, y: 240, width: 90, height: 40 },  // Raue Center
    // Williams Street buildings (south side)
    { x: 600, y: 330, width: 70, height: 50 },
    { x: 720, y: 330, width: 80, height: 40 },
    { x: 860, y: 330, width: 90, height: 50 },
    // Cross street buildings
    { x: 960, y: 380, width: 40, height: 80 },
    { x: 1060, y: 380, width: 50, height: 80 },
    // Crystal Lake Ave buildings
    { x: 1100, y: 500, width: 80, height: 40 },
    { x: 1220, y: 500, width: 60, height: 40 },
    { x: 1100, y: 590, width: 70, height: 50 },
    { x: 1220, y: 590, width: 80, height: 50 },
    // South stretch buildings
    { x: 1280, y: 620, width: 40, height: 150 },
    { x: 1380, y: 620, width: 50, height: 150 },
    // Virginia Street buildings
    { x: 1420, y: 840, width: 60, height: 40 },
    { x: 1520, y: 840, width: 70, height: 40 },
    { x: 1420, y: 930, width: 80, height: 50 },
  ],

  scenery: [
    // Raue Center theater
    { x: 860, y: 255, type: "building", width: 80, height: 30, color: "#5a3a2e", detail: "RAUE CENTER" },
    // Street lamps along Williams
    { x: 620, y: 270, type: "lamp", width: 4, height: 16, color: "#ccaa44" },
    { x: 740, y: 270, type: "lamp", width: 4, height: 16, color: "#ccaa44" },
    { x: 900, y: 270, type: "lamp", width: 4, height: 16, color: "#ccaa44" },
    // Café tables
    { x: 640, y: 340, type: "bench", width: 8, height: 8, color: "#8B4513" },
    { x: 660, y: 340, type: "bench", width: 8, height: 8, color: "#8B4513" },
    // Parked cars as obstacles
    { x: 760, y: 340, type: "car-parked", width: 14, height: 24, color: "#666666" },
    { x: 910, y: 340, type: "car-parked", width: 14, height: 24, color: "#884444" },
    // Shop signs
    { x: 610, y: 250, type: "sign", width: 20, height: 10, color: "#ff6644", detail: "CAFE" },
    { x: 730, y: 250, type: "sign", width: 24, height: 10, color: "#4488ff", detail: "SHOP" },
    // Crystal Lake Ave lamps
    { x: 1140, y: 530, type: "lamp", width: 4, height: 16, color: "#ccaa44" },
    { x: 1260, y: 530, type: "lamp", width: 4, height: 16, color: "#ccaa44" },
    // Trees on side streets
    { x: 450, y: 200, type: "tree", width: 20, height: 20, color: "#1a3a1a" },
    { x: 1400, y: 850, type: "tree", width: 18, height: 18, color: "#1a3a1a" },
  ],

  palette: {
    sky: "#0a0a2e",       // night sky
    grass: "#1a2a1a",     // dark night grass
    road: "#3a3a3a",      // dark asphalt
    roadLine: "#ffd700",  // yellow center
    roadEdge: "#cccccc",  // white edge
    ambient: "#2233aa",   // cool night blue
  },

  targetTimeSec: 75,
};
```

- [ ] **Step 2: Create Route 14 Blitz track**

Create `components/arcade/tracks/route14.ts`:
```typescript
import { TrackData } from "../track";

function roadFromCenter(centerline: { x: number; y: number }[], halfWidth: number): { x: number; y: number }[] {
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  for (let i = 0; i < centerline.length; i++) {
    const prev = centerline[Math.max(0, i - 1)];
    const next = centerline[Math.min(centerline.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    left.push({ x: centerline[i].x + nx * halfWidth, y: centerline[i].y + ny * halfWidth });
    right.push({ x: centerline[i].x - nx * halfWidth, y: centerline[i].y - ny * halfWidth });
  }
  return [...left, ...right.reverse()];
}

const ROAD_HALF_WIDTH = 60; // Wide 4-lane highway

// Route 14 is a mostly straight east-west highway with gentle curves
const centerline: { x: number; y: number }[] = [
  // Start: Teckler Blvd heading east onto Route 14
  { x: 100, y: 500 },
  { x: 250, y: 500 },
  { x: 400, y: 500 },
  // Gentle curve south
  { x: 600, y: 510 },
  { x: 800, y: 530 },
  // Long straight through commercial strip
  { x: 1000, y: 530 },
  { x: 1200, y: 530 },
  { x: 1400, y: 530 },
  { x: 1600, y: 530 },
  // Gentle curve north
  { x: 1800, y: 520 },
  { x: 2000, y: 500 },
  { x: 2200, y: 490 },
  // More straight
  { x: 2400, y: 490 },
  { x: 2600, y: 490 },
  { x: 2800, y: 490 },
  // Gentle S-curve near Randall Road
  { x: 3000, y: 500 },
  { x: 3200, y: 520 },
  { x: 3400, y: 510 },
  // Finish near Randall Road intersection
  { x: 3600, y: 500 },
  { x: 3800, y: 500 },
];

export const route14Track: TrackData = {
  name: "ROUTE 14 BLITZ",
  subtitle: "Teckler Blvd → Randall Rd",
  widthPx: 4000,
  heightPx: 1000,

  roadSegments: [{ points: roadFromCenter(centerline, ROAD_HALF_WIDTH) }],
  waypoints: centerline,

  spawnPoints: [
    { x: 120, y: 480, angle: Math.PI / 2 },  // facing east
    { x: 120, y: 520, angle: Math.PI / 2 },
    { x: 80, y: 480, angle: Math.PI / 2 },
    { x: 80, y: 520, angle: Math.PI / 2 },
  ],

  finishLine: { x: 3800, y: 500, angle: 0, width: 140 },

  boundaries: [
    // Strip malls along Route 14 (north side)
    { x: 400, y: 400, width: 150, height: 50 },
    { x: 700, y: 410, width: 200, height: 50 },
    { x: 1050, y: 410, width: 180, height: 50 },
    { x: 1400, y: 410, width: 160, height: 50 },
    { x: 1750, y: 400, width: 200, height: 50 },
    { x: 2100, y: 380, width: 180, height: 50 },
    { x: 2500, y: 380, width: 150, height: 50 },
    { x: 2900, y: 390, width: 200, height: 50 },
    { x: 3300, y: 400, width: 180, height: 50 },
    // South side
    { x: 500, y: 580, width: 120, height: 50 },
    { x: 800, y: 590, width: 180, height: 50 },
    { x: 1150, y: 590, width: 150, height: 50 },
    { x: 1500, y: 590, width: 200, height: 50 },
    { x: 1900, y: 580, width: 160, height: 50 },
    { x: 2300, y: 560, width: 180, height: 50 },
    { x: 2700, y: 560, width: 140, height: 50 },
    { x: 3100, y: 570, width: 200, height: 50 },
  ],

  scenery: [
    // Commercial buildings with signs
    { x: 450, y: 415, type: "building", width: 130, height: 40, color: "#3a3a5e", detail: "BEST BUY" },
    { x: 770, y: 425, type: "building", width: 180, height: 40, color: "#4a4a5e", detail: "MARKET" },
    { x: 1120, y: 425, type: "building", width: 160, height: 40, color: "#3a3a4e", detail: "PLAZA" },
    { x: 1460, y: 425, type: "building", width: 140, height: 40, color: "#4a3a3e", detail: "TJMAXX" },
    { x: 1830, y: 415, type: "building", width: 180, height: 40, color: "#3a4a4e", detail: "ROSS" },
    { x: 2180, y: 395, type: "building", width: 160, height: 40, color: "#4a4a4e" },
    // Gas station
    { x: 2580, y: 395, type: "building", width: 100, height: 40, color: "#5a5a3e", detail: "GAS" },
    // Neon signs (just colored signs)
    { x: 480, y: 395, type: "sign", width: 30, height: 14, color: "#ff4444", detail: "OPEN" },
    { x: 1150, y: 400, type: "sign", width: 24, height: 14, color: "#44ff44", detail: "24H" },
    { x: 1850, y: 395, type: "sign", width: 28, height: 14, color: "#ff6644", detail: "FOOD" },
    // Street lights (spaced along the highway)
    { x: 300, y: 460, type: "lamp", width: 4, height: 20, color: "#888888" },
    { x: 600, y: 470, type: "lamp", width: 4, height: 20, color: "#888888" },
    { x: 900, y: 480, type: "lamp", width: 4, height: 20, color: "#888888" },
    { x: 1200, y: 480, type: "lamp", width: 4, height: 20, color: "#888888" },
    { x: 1500, y: 480, type: "lamp", width: 4, height: 20, color: "#888888" },
    { x: 1800, y: 470, type: "lamp", width: 4, height: 20, color: "#888888" },
    { x: 2100, y: 460, type: "lamp", width: 4, height: 20, color: "#888888" },
    { x: 2400, y: 450, type: "lamp", width: 4, height: 20, color: "#888888" },
    { x: 2700, y: 450, type: "lamp", width: 4, height: 20, color: "#888888" },
    { x: 3000, y: 460, type: "lamp", width: 4, height: 20, color: "#888888" },
    // South side buildings
    { x: 560, y: 595, type: "building", width: 100, height: 40, color: "#3a3a4e" },
    { x: 870, y: 605, type: "building", width: 160, height: 40, color: "#4a4a4e", detail: "MALL" },
    { x: 1210, y: 605, type: "building", width: 130, height: 40, color: "#3a4a4e" },
    // Parked delivery trucks
    { x: 650, y: 575, type: "car-parked", width: 18, height: 36, color: "#ffffff" },
    { x: 1350, y: 575, type: "car-parked", width: 18, height: 36, color: "#cccccc" },
    { x: 2050, y: 555, type: "car-parked", width: 18, height: 36, color: "#ffffff" },
    // Route 14 highway sign
    { x: 200, y: 440, type: "sign", width: 30, height: 20, color: "#44aa44", detail: "RT 14" },
    { x: 3700, y: 450, type: "sign", width: 40, height: 20, color: "#44aa44", detail: "RANDALL" },
  ],

  palette: {
    sky: "#060612",       // very dark late night
    grass: "#1a2a1a",     // dark grass
    road: "#333333",      // wet-look dark asphalt
    roadLine: "#ffd700",  // yellow center
    roadEdge: "#ffffff",  // bright white edge
    ambient: "#1a1a3e",   // deep blue night
  },

  targetTimeSec: 90,
};
```

- [ ] **Step 3: Update TrackSelectScene to include all 3 tracks**

In `components/arcade/scenes/TrackSelectScene.ts`, update the imports and TRACKS array at the top:
```typescript
import { lakefrontTrack } from "../tracks/lakefront";
import { downtownTrack } from "../tracks/downtown";
import { route14Track } from "../tracks/route14";
import { TrackData } from "../track";

const TRACKS: TrackData[] = [lakefrontTrack, downtownTrack, route14Track];
```

- [ ] **Step 4: Verify all 3 tracks appear in TrackSelectScene and are playable**

```bash
# Open http://localhost:3002/arcade
# Pick a car → TrackSelectScene should show all 3 tracks with previews
# Each track should be selectable and raceable
```

- [ ] **Step 5: Commit**

```bash
git add components/arcade/tracks/downtown.ts components/arcade/tracks/route14.ts components/arcade/scenes/TrackSelectScene.ts
git commit -m "feat: add Downtown Dash and Route 14 Blitz tracks"
```

---

### Task 11: Per-Car Engine Audio Profiles

**Files:**
- Create: `components/arcade/road-race-audio.ts`
- Modify: `components/arcade/scenes/RaceScene.ts`

Extend the Web Audio system with per-car engine sound profiles.

- [ ] **Step 1: Create the audio system**

Create `components/arcade/road-race-audio.ts`:
```typescript
/**
 * Per-car engine audio profiles using Web Audio API.
 * Each car type gets a distinct sound character.
 */

let ctx: AudioContext | null = null;

export function initRaceAudio() {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

type EngineProfile = {
  waveform: OscillatorType;
  baseFreq: number;      // Hz at idle
  maxFreq: number;       // Hz at top speed
  gainBase: number;       // volume at idle
  gainMax: number;        // volume at top speed
  harmonics: number[];    // frequency multipliers for richer sound
  harmonicGains: number[]; // relative volume of each harmonic
};

function getEngineProfile(engineType: string, cylinders: number): EngineProfile {
  const eng = (engineType || "").toLowerCase();

  if (eng.includes("electric") || eng === "ev") {
    return {
      waveform: "sine",
      baseFreq: 400, maxFreq: 900,
      gainBase: 0.03, gainMax: 0.08,
      harmonics: [2.0], harmonicGains: [0.3],
    };
  }
  if (eng.includes("diesel")) {
    return {
      waveform: "square",
      baseFreq: 55, maxFreq: 120,
      gainBase: 0.06, gainMax: 0.15,
      harmonics: [2.0, 3.0], harmonicGains: [0.4, 0.2],
    };
  }
  if (eng.includes("turbo") || eng.includes("inline")) {
    return {
      waveform: "triangle",
      baseFreq: 180, maxFreq: 450,
      gainBase: 0.04, gainMax: 0.12,
      harmonics: [2.0, 3.5], harmonicGains: [0.3, 0.15],
    };
  }
  if (eng.includes("flat") || eng.includes("boxer")) {
    return {
      waveform: "sawtooth",
      baseFreq: 100, maxFreq: 300,
      gainBase: 0.04, gainMax: 0.12,
      harmonics: [1.5, 2.5], harmonicGains: [0.4, 0.2],
    };
  }
  // Default: V8 / muscle
  const baseFreq = cylinders >= 8 ? 75 : cylinders >= 6 ? 100 : 140;
  return {
    waveform: "sawtooth",
    baseFreq, maxFreq: baseFreq * 3.5,
    gainBase: 0.05, gainMax: 0.15,
    harmonics: [2.0, 3.0, 4.0], harmonicGains: [0.3, 0.15, 0.08],
  };
}

export class EngineSound {
  private profile: EngineProfile;
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private masterGain: GainNode | null = null;
  private started = false;

  constructor(engineType: string, cylinders: number) {
    this.profile = getEngineProfile(engineType, cylinders);
  }

  start() {
    if (this.started || !ctx) return;
    this.started = true;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(ctx.destination);

    // Main oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = this.profile.waveform;
    osc.frequency.value = this.profile.baseFreq;
    gain.gain.value = 1.0;
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    this.oscillators.push(osc);
    this.gains.push(gain);

    // Harmonics
    this.profile.harmonics.forEach((mult, i) => {
      const hOsc = ctx!.createOscillator();
      const hGain = ctx!.createGain();
      hOsc.type = this.profile.waveform;
      hOsc.frequency.value = this.profile.baseFreq * mult;
      hGain.gain.value = this.profile.harmonicGains[i] || 0.1;
      hOsc.connect(hGain);
      hGain.connect(this.masterGain!);
      hOsc.start();
      this.oscillators.push(hOsc);
      this.gains.push(hGain);
    });
  }

  /** Update engine sound based on speed (0 to 1 normalized) */
  update(speedNormalized: number, isAccelerating: boolean) {
    if (!this.started || !ctx) return;

    const t = Math.max(0, Math.min(1, speedNormalized));
    const freq = this.profile.baseFreq + (this.profile.maxFreq - this.profile.baseFreq) * t;
    const vol = this.profile.gainBase + (this.profile.gainMax - this.profile.gainBase) * t;

    // Smoothly ramp frequency and volume
    const now = ctx.currentTime;
    this.oscillators[0]?.frequency.linearRampToValueAtTime(freq, now + 0.05);

    // Harmonics follow
    this.profile.harmonics.forEach((mult, i) => {
      this.oscillators[i + 1]?.frequency.linearRampToValueAtTime(freq * mult, now + 0.05);
    });

    // Volume: louder when accelerating
    const accelBoost = isAccelerating ? 1.0 : 0.6;
    this.masterGain?.gain.linearRampToValueAtTime(vol * accelBoost, now + 0.05);
  }

  stop() {
    this.oscillators.forEach((osc) => {
      try { osc.stop(); } catch { /* already stopped */ }
    });
    this.oscillators = [];
    this.gains = [];
    this.masterGain?.disconnect();
    this.masterGain = null;
    this.started = false;
  }
}
```

- [ ] **Step 2: Integrate audio into RaceScene**

In `components/arcade/scenes/RaceScene.ts`, add imports at the top:
```typescript
import { initRaceAudio, EngineSound } from "../road-race-audio";
```

Add a field to the class:
```typescript
  private engineSound: EngineSound | null = null;
```

In `create()`, after the countdown setup, initialize audio:
```typescript
    // Engine audio
    initRaceAudio();
    this.engineSound = new EngineSound(playerCar.engineType, playerCar.cylinders);
    this.engineSound.start();
```

In `update()`, inside the racing phase, after player physics update:
```typescript
    // Update engine audio
    const speedNorm = this.player.speed / this.player.stats.topSpeed;
    this.engineSound?.update(speedNorm, playerInput.accel);
```

In `showResults()`, stop the engine:
```typescript
    this.engineSound?.stop();
```

Add cleanup in a `shutdown()` method:
```typescript
  shutdown() {
    this.engineSound?.stop();
    this.effects.forEach((e) => e.destroy());
  }
```

- [ ] **Step 3: Commit**

```bash
git add components/arcade/road-race-audio.ts components/arcade/scenes/RaceScene.ts
git commit -m "feat: add per-car engine audio profiles with Web Audio API"
```

---

### Task 12: Polish — Car Sprite Colors, Camera Zoom, Input Feel

**Files:**
- Modify: `components/arcade/scenes/RaceScene.ts`
- Modify: `components/arcade/topdown-physics.ts`

Tuning pass — make the game feel good. Fix car sprite colors to match actual car colors, tune camera zoom and follow speed, adjust physics for better input feel.

- [ ] **Step 1: Color car sprites to match their actual car color**

In RaceScene `create()`, replace the hardcoded carColors with actual car colors. Change the car sprite creation loop:

```typescript
    this.carSprites = [];
    this.allCars.forEach((car) => {
      // Parse car color string to hex (fallback to gold for player, grey for AI)
      const colorHex = cssColorToHex(car.car.color) || (car === this.player ? 0xffd700 : 0x888888);
      const sprite = this.add.rectangle(car.x, car.y, 20, 32, colorHex)
        .setDepth(10)
        .setStrokeStyle(1, 0x000000);
      this.carSprites.push(sprite);
    });
```

Add this helper function at the top of RaceScene.ts (below imports):
```typescript
const CSS_COLORS: Record<string, number> = {
  red: 0xff0000, blue: 0x0000ff, green: 0x008000, black: 0x222222, white: 0xeeeeee,
  silver: 0xcccccc, grey: 0x888888, gray: 0x888888, yellow: 0xffff00, orange: 0xff8800,
  purple: 0x880088, gold: 0xffd700, brown: 0x8b4513, maroon: 0x800000, navy: 0x000080,
  burgundy: 0x800020, bronze: 0xcd7f32, beige: 0xf5f5dc, cream: 0xfffdd0,
  charcoal: 0x36454f, midnight: 0x191970,
};

function cssColorToHex(color: string): number | null {
  if (!color) return null;
  const lower = color.toLowerCase().trim();
  // Check named colors
  for (const [name, hex] of Object.entries(CSS_COLORS)) {
    if (lower.includes(name)) return hex;
  }
  // Check hex format
  if (lower.startsWith("#") && lower.length >= 7) {
    return parseInt(lower.slice(1, 7), 16);
  }
  return null;
}
```

- [ ] **Step 2: Tune physics for better feel**

In `components/arcade/topdown-physics.ts`, adjust these values in the `update()` method for snappier controls:

Change angular friction from `0.85` to `0.80` (snappier steering recovery):
```typescript
    // Angular friction
    this.angularVel *= 0.80;
```

Change drift speed cost from `0.995` to `0.997` (less punishing drift):
```typescript
      // Drift costs a little speed
      this.speed *= 0.997;
```

- [ ] **Step 3: Adjust camera for better gameplay view**

In RaceScene `create()`, change camera zoom from 1.5 to a value that shows more track:
```typescript
    this.cameras.main.setZoom(1.8);
```

And increase camera follow lerp for snappier tracking:
```typescript
    this.cameras.main.startFollow(this.carSprites[0], true, 0.12, 0.12);
```

- [ ] **Step 4: Test the full experience**

```bash
# Open http://localhost:3002/arcade
# Play through all 3 tracks
# Verify: car colors match, steering feels responsive, camera follows smoothly
# Verify: AI opponents drive reasonably, finish line detection works, results show correctly
```

- [ ] **Step 5: Commit**

```bash
git add components/arcade/scenes/RaceScene.ts components/arcade/topdown-physics.ts
git commit -m "polish: tune car colors, camera, physics feel for better gameplay"
```

---

## Summary

| Task | What It Does | Key Files |
|------|-------------|-----------|
| 1 | Clean up old pseudo-3D code | types.ts, delete old files |
| 2 | Top-down 2D physics engine | topdown-physics.ts |
| 3 | Track data format + Lakefront Sprint | track.ts, tracks/lakefront.ts |
| 4 | Phaser track renderer | track-renderer.ts |
| 5 | AI opponent waypoint following | ai.ts |
| 6 | HUD (position, timer, minimap, cockpit) | hud.ts |
| 7 | Exhaust, tire marks, drift smoke | effects.ts |
| 8 | Track select scene + scene flow update | TrackSelectScene.ts, PhaserGame.tsx |
| 9 | **Full RaceScene game loop** | RaceScene.ts |
| 10 | Downtown Dash + Route 14 Blitz tracks | tracks/downtown.ts, tracks/route14.ts |
| 11 | Per-car engine audio | road-race-audio.ts |
| 12 | Polish pass (colors, camera, physics tuning) | RaceScene.ts, topdown-physics.ts |
