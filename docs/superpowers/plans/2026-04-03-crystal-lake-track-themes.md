# Crystal Lake Track Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the 2 empty "COMING SOON" track slots in the arcade's TrackSelectScene with Downtown Williams Street and Route 14 Strip tracks, and show the track name on the MatchupScene.

**Architecture:** The top-down circuit race system is already built — `track.ts` defines types, `track-renderer.ts` renders scenery, `TrackSelectScene.ts` shows a 3-slot picker. We add 2 new track data files following the exact pattern of `tracks/lakefront.ts`, add new scenery types to the renderer, wire them into the scene, and display the track name on the matchup screen.

**Tech Stack:** Phaser 3, TypeScript, existing arcade module infrastructure

---

### Task 1: Add new scenery types to track.ts

**Files:**
- Modify: `components/arcade/track.ts:14-21`

The existing `SceneryItem.type` union only has `"tree" | "lamp" | "building" | "water" | "bench" | "pier"`. The new tracks need additional types for downtown and commercial scenery.

- [ ] **Step 1: Expand the SceneryItem type union**

In `components/arcade/track.ts`, change line 15 from:

```typescript
  type: "tree" | "lamp" | "building" | "water" | "bench" | "pier";
```

to:

```typescript
  type: "tree" | "lamp" | "building" | "water" | "bench" | "pier" | "awning" | "parked-car" | "traffic-light" | "gas-station" | "sign" | "fence" | "power-pole";
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors (new union members are additive)

- [ ] **Step 3: Commit**

```bash
git add components/arcade/track.ts
git commit -m "feat(arcade): expand SceneryItem types for new tracks"
```

---

### Task 2: Add scenery renderers for new types in track-renderer.ts

**Files:**
- Modify: `components/arcade/track-renderer.ts:94-234`

Add rendering cases for the new scenery types inside the existing switch statement in `renderTrack()`.

- [ ] **Step 1: Add rendering cases after the existing `fence` case (line 224)**

Insert before the `default` case in `components/arcade/track-renderer.ts`:

```typescript
        case "awning": {
          // Colored rectangle awning over storefront
          const awning = scene.add.graphics();
          awning.setDepth(5);
          awning.fillStyle(color ? hexToNum(color) : 0xcc4444, 0.8);
          awning.fillRect(x - w / 2, y - h / 2, w, h);
          // Striped effect
          const stripeGfx = scene.add.graphics();
          stripeGfx.setDepth(5);
          stripeGfx.fillStyle(0xffffff, 0.15);
          for (let sx = 0; sx < w; sx += 8) {
            stripeGfx.fillRect(x - w / 2 + sx, y - h / 2, 4, h);
          }
          sceneryObjects.push(awning, stripeGfx);
          break;
        }

        case "parked-car": {
          // Small rectangle representing a parked car
          const pcar = scene.add.graphics();
          pcar.setDepth(4);
          pcar.fillStyle(color ? hexToNum(color) : 0x444466, 1);
          pcar.fillRoundedRect(x - w / 2, y - h / 2, w, h, 3);
          // Windshield
          const windshield = scene.add.graphics();
          windshield.setDepth(5);
          windshield.fillStyle(0x88bbdd, 0.5);
          windshield.fillRect(x - w / 4, y - h / 2 + 2, w / 2, h * 0.25);
          sceneryObjects.push(pcar, windshield);
          break;
        }

        case "traffic-light": {
          // Tall pole with signal box
          const tlPole = scene.add.graphics();
          tlPole.setDepth(5);
          tlPole.fillStyle(0x333333, 1);
          tlPole.fillRect(x - 2, y - h, 4, h);
          // Signal box
          tlPole.fillStyle(0x222222, 1);
          tlPole.fillRect(x - 5, y - h - 16, 10, 16);
          // Lights
          tlPole.fillStyle(0xff0000, 0.8);
          tlPole.fillCircle(x, y - h - 12, 2);
          tlPole.fillStyle(0xffff00, 0.8);
          tlPole.fillCircle(x, y - h - 8, 2);
          tlPole.fillStyle(0x00ff00, 0.8);
          tlPole.fillCircle(x, y - h - 4, 2);
          sceneryObjects.push(tlPole);
          break;
        }

        case "gas-station": {
          // Wide flat canopy
          const canopy = scene.add.graphics();
          canopy.setDepth(4);
          canopy.fillStyle(color ? hexToNum(color) : 0xeeeeee, 0.9);
          canopy.fillRect(x - w / 2, y - h / 2, w, h);
          // Support poles at corners
          canopy.fillStyle(0x888888, 1);
          canopy.fillRect(x - w / 2 + 4, y - h / 2, 4, h);
          canopy.fillRect(x + w / 2 - 8, y - h / 2, 4, h);
          // Overhead lights
          const glowGfx = scene.add.graphics();
          glowGfx.setDepth(4);
          glowGfx.fillStyle(0xffffff, 0.12);
          glowGfx.fillRect(x - w / 2, y + h / 2, w, h * 0.6);
          sceneryObjects.push(canopy, glowGfx);
          break;
        }

        case "power-pole": {
          // Tall thin pole with crossbar
          const pole = scene.add.graphics();
          pole.setDepth(4);
          pole.fillStyle(0x6b4226, 1);
          pole.fillRect(x - 2, y - h, 4, h);
          // Crossbar
          pole.fillRect(x - 12, y - h, 24, 3);
          sceneryObjects.push(pole);
          break;
        }
```

Note: `sign` and `fence` cases already exist in the renderer.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/arcade/track-renderer.ts
git commit -m "feat(arcade): add scenery renderers for downtown and commercial track objects"
```

---

### Task 3: Create Downtown Williams Street track

**Files:**
- Create: `components/arcade/tracks/downtown.ts`

Follow the exact pattern of `tracks/lakefront.ts` — define centerline waypoints, use `roadFromCenter()` to build road polygons, specify boundaries, scenery, and palette.

- [ ] **Step 1: Create the track data file**

Create `components/arcade/tracks/downtown.ts`:

```typescript
import type { TrackData, Waypoint, Polygon } from "../track";

// ---------------------------------------------------------------------------
// Road-building helper (same as lakefront)
// ---------------------------------------------------------------------------

function roadFromCenter(centerline: Waypoint[], halfWidth: number): Polygon {
  if (centerline.length < 2) return [];
  const left: Waypoint[] = [];
  const right: Waypoint[] = [];
  for (let i = 0; i < centerline.length; i++) {
    const prev = centerline[Math.max(0, i - 1)];
    const next = centerline[Math.min(centerline.length - 1, i + 1)];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.sqrt(tx * tx + ty * ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    left.push({ x: centerline[i].x + nx * halfWidth, y: centerline[i].y + ny * halfWidth });
    right.push({ x: centerline[i].x - nx * halfWidth, y: centerline[i].y - ny * halfWidth });
  }
  return [...left, ...right.reverse()];
}

// ---------------------------------------------------------------------------
// Centerline waypoints — Williams St through downtown Crystal Lake
// ---------------------------------------------------------------------------

const HALF_ROAD = 36;

const centerline: Waypoint[] = [
  // Start on Williams St heading south
  { x: 500, y: 80 },
  { x: 500, y: 180 },
  { x: 500, y: 280 },
  { x: 500, y: 380 },
  // Past Raue Center, slight jog east
  { x: 510, y: 460 },
  { x: 530, y: 540 },
  // Cross railroad tracks
  { x: 540, y: 620 },
  { x: 540, y: 700 },
  // Turn east onto Virginia St
  { x: 560, y: 760 },
  { x: 600, y: 810 },
  { x: 680, y: 840 },
  { x: 780, y: 850 },
  { x: 880, y: 850 },
  // Turn south on Main St
  { x: 940, y: 870 },
  { x: 960, y: 920 },
  { x: 960, y: 1020 },
  { x: 960, y: 1120 },
  // Turn west onto Crystal Lake Ave
  { x: 940, y: 1180 },
  { x: 900, y: 1220 },
  { x: 820, y: 1240 },
  { x: 720, y: 1240 },
  { x: 620, y: 1240 },
  // Turn north on Walkway/Brink St
  { x: 560, y: 1220 },
  { x: 540, y: 1180 },
  { x: 520, y: 1100 },
  { x: 510, y: 1000 },
  // Rejoin Williams St heading north
  { x: 500, y: 900 },
  { x: 500, y: 800 },
];

const roadSegments: Polygon[] = [roadFromCenter(centerline, HALF_ROAD)];

// ---------------------------------------------------------------------------
// Downtown Williams Street track definition
// ---------------------------------------------------------------------------

export const downtownTrack: TrackData = {
  name: "Downtown Sprint",
  subtitle: "Williams St — Historic Downtown Crystal Lake",
  width: 1400,
  height: 1400,

  roadSegments,
  waypoints: centerline,

  spawnPoints: [
    { x: 485, y: 120, angle: Math.PI },
    { x: 515, y: 120, angle: Math.PI },
    { x: 485, y: 160, angle: Math.PI },
    { x: 515, y: 160, angle: Math.PI },
  ],

  finishLine: {
    x: 500,
    y: 800,
    angle: 0,
    width: 80,
  },

  boundaries: [
    // Raue Center (west side of Williams)
    { x: 340, y: 350, width: 120, height: 140, label: "RAUE CENTER" },
    // Shops east of Williams
    { x: 560, y: 200, width: 100, height: 160 },
    // Train station
    { x: 560, y: 580, width: 160, height: 60, label: "METRA" },
    // Buildings along Virginia St (north side)
    { x: 620, y: 760, width: 200, height: 60 },
    // Buildings along Main St (east side)
    { x: 1000, y: 880, width: 100, height: 280 },
    // Buildings along Crystal Lake Ave (south side)
    { x: 620, y: 1280, width: 340, height: 80 },
    // Buildings west of Brink St
    { x: 380, y: 1060, width: 120, height: 200 },
    // Corner building NW
    { x: 340, y: 160, width: 110, height: 100 },
  ],

  scenery: [
    // Street lamps along Williams St
    { type: "lamp", x: 470, y: 150 },
    { type: "lamp", x: 470, y: 280 },
    { type: "lamp", x: 470, y: 420 },
    { type: "lamp", x: 530, y: 200 },
    { type: "lamp", x: 530, y: 340 },
    { type: "lamp", x: 530, y: 500 },

    // Shop awnings east of Williams
    { type: "awning", x: 555, y: 220, width: 20, height: 30 },
    { type: "awning", x: 555, y: 270, width: 20, height: 25 },
    { type: "awning", x: 555, y: 310, width: 20, height: 28 },

    // Raue Center marquee
    { type: "building", x: 345, y: 355, label: "RAUE CENTER", width: 110, height: 130 },

    // Parked cars along Williams
    { type: "parked-car", x: 465, y: 240, width: 16, height: 28 },
    { type: "parked-car", x: 465, y: 360, width: 16, height: 28 },
    { type: "parked-car", x: 540, y: 440, width: 16, height: 28 },

    // Railroad crossing signs
    { type: "sign", x: 520, y: 590, width: 12, height: 20, label: "RR" },
    { type: "sign", x: 560, y: 590, width: 12, height: 20, label: "RR" },

    // Train station building
    { type: "building", x: 565, y: 585, label: "METRA", width: 150, height: 50 },

    // Lamps along Virginia St
    { type: "lamp", x: 640, y: 820 },
    { type: "lamp", x: 760, y: 830 },
    { type: "lamp", x: 880, y: 835 },

    // Trees along Main St
    { type: "tree", x: 990, y: 920 },
    { type: "tree", x: 990, y: 1020 },
    { type: "tree", x: 990, y: 1100 },

    // Buildings along Main St
    { type: "building", x: 1005, y: 885, width: 90, height: 270 },

    // Lamps on Crystal Lake Ave
    { type: "lamp", x: 840, y: 1260 },
    { type: "lamp", x: 720, y: 1260 },
    { type: "lamp", x: 620, y: 1260 },

    // Trees in residential area near Brink St
    { type: "tree", x: 410, y: 1080 },
    { type: "tree", x: 410, y: 1180 },
    { type: "tree", x: 530, y: 1140 },

    // Benches near downtown
    { type: "bench", x: 480, y: 500 },
    { type: "bench", x: 920, y: 860 },
  ],

  palette: {
    sky: 0x060820,       // deep navy night
    road: 0x2a2a30,      // dark wet asphalt
    roadLine: 0xffffff,  // white lane markings
    grass: 0x2a2a2a,     // sidewalk gray (no grass downtown)
    sidewalk: 0x444444,  // concrete
    water: 0x1a1a3a,     // dark (no water on this track)
    building: 0x5a4a3a,  // warm brown brick
  },

  targetTimeSec: 75,
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/arcade/tracks/downtown.ts
git commit -m "feat(arcade): add Downtown Williams Street track"
```

---

### Task 4: Create Route 14 Strip track

**Files:**
- Create: `components/arcade/tracks/route14.ts`

- [ ] **Step 1: Create the track data file**

Create `components/arcade/tracks/route14.ts`:

```typescript
import type { TrackData, Waypoint, Polygon } from "../track";

// ---------------------------------------------------------------------------
// Road-building helper (same as other tracks)
// ---------------------------------------------------------------------------

function roadFromCenter(centerline: Waypoint[], halfWidth: number): Polygon {
  if (centerline.length < 2) return [];
  const left: Waypoint[] = [];
  const right: Waypoint[] = [];
  for (let i = 0; i < centerline.length; i++) {
    const prev = centerline[Math.max(0, i - 1)];
    const next = centerline[Math.min(centerline.length - 1, i + 1)];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.sqrt(tx * tx + ty * ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    left.push({ x: centerline[i].x + nx * halfWidth, y: centerline[i].y + ny * halfWidth });
    right.push({ x: centerline[i].x - nx * halfWidth, y: centerline[i].y - ny * halfWidth });
  }
  return [...left, ...right.reverse()];
}

// ---------------------------------------------------------------------------
// Centerline waypoints — Route 14 (Northwest Highway) commercial strip
// ---------------------------------------------------------------------------

const HALF_ROAD = 44; // wider highway

const centerline: Waypoint[] = [
  // Start heading east on Route 14
  { x: 100, y: 500 },
  { x: 200, y: 500 },
  { x: 320, y: 500 },
  { x: 440, y: 500 },
  { x: 560, y: 500 },
  // Gentle curve south past Crystal Lake Plaza
  { x: 660, y: 510 },
  { x: 740, y: 530 },
  { x: 800, y: 560 },
  { x: 840, y: 600 },
  // Turn south on Route 31
  { x: 860, y: 680 },
  { x: 860, y: 780 },
  { x: 860, y: 880 },
  // Curve west
  { x: 840, y: 940 },
  { x: 800, y: 980 },
  { x: 740, y: 1010 },
  { x: 660, y: 1020 },
  { x: 560, y: 1020 },
  { x: 440, y: 1020 },
  // Turn north on Rakow Rd
  { x: 380, y: 1000 },
  { x: 340, y: 960 },
  { x: 320, y: 900 },
  { x: 320, y: 800 },
  { x: 320, y: 700 },
  // Curve back east to rejoin Route 14
  { x: 330, y: 620 },
  { x: 360, y: 560 },
  { x: 400, y: 520 },
];

const roadSegments: Polygon[] = [roadFromCenter(centerline, HALF_ROAD)];

// ---------------------------------------------------------------------------
// Route 14 Strip track definition
// ---------------------------------------------------------------------------

export const route14Track: TrackData = {
  name: "Route 14 Strip",
  subtitle: "Northwest Hwy — Crystal Lake Commercial Corridor",
  width: 1200,
  height: 1200,

  roadSegments,
  waypoints: centerline,

  spawnPoints: [
    { x: 130, y: 485, angle: Math.PI / 2 },
    { x: 130, y: 515, angle: Math.PI / 2 },
    { x: 170, y: 485, angle: Math.PI / 2 },
    { x: 170, y: 515, angle: Math.PI / 2 },
  ],

  finishLine: {
    x: 400,
    y: 520,
    angle: Math.PI / 2,
    width: 100,
  },

  boundaries: [
    // Crystal Lake Plaza (north side of Route 14)
    { x: 200, y: 360, width: 240, height: 100, label: "CL PLAZA" },
    // Strip mall south of Route 14
    { x: 200, y: 560, width: 200, height: 80 },
    // Home Depot area (north side, east)
    { x: 520, y: 360, width: 180, height: 100, label: "HOME DEPOT" },
    // Gas station at Route 14/31 corner
    { x: 780, y: 420, width: 100, height: 80, label: "GAS" },
    // Shopping center south of Route 31
    { x: 920, y: 680, width: 120, height: 240 },
    // Strip mall along return road (south side)
    { x: 440, y: 1060, width: 280, height: 80 },
    // Big box store west side
    { x: 180, y: 720, width: 100, height: 160, label: "RETAIL" },
  ],

  scenery: [
    // Parking lot lights along Route 14 (north side)
    { type: "lamp", x: 240, y: 380 },
    { type: "lamp", x: 380, y: 380 },
    { type: "lamp", x: 500, y: 380 },
    { type: "lamp", x: 620, y: 390 },

    // Parking lot lights (south side)
    { type: "lamp", x: 260, y: 620 },
    { type: "lamp", x: 400, y: 620 },

    // Gas station canopy
    { type: "gas-station", x: 785, y: 425, width: 90, height: 70 },

    // Traffic lights
    { type: "traffic-light", x: 660, y: 490 },
    { type: "traffic-light", x: 840, y: 580 },
    { type: "traffic-light", x: 380, y: 510 },

    // Power poles along Route 14
    { type: "power-pole", x: 180, y: 470 },
    { type: "power-pole", x: 340, y: 470 },
    { type: "power-pole", x: 500, y: 470 },
    { type: "power-pole", x: 650, y: 480 },

    // Store signs (colored rectangles)
    { type: "sign", x: 220, y: 370, width: 30, height: 12, label: "JEWEL" },
    { type: "sign", x: 540, y: 370, width: 40, height: 12, label: "HOME DEPOT" },
    { type: "sign", x: 460, y: 1050, width: 30, height: 10, label: "CRUMBL" },

    // Parked cars in lots
    { type: "parked-car", x: 260, y: 410, width: 14, height: 24 },
    { type: "parked-car", x: 280, y: 410, width: 14, height: 24 },
    { type: "parked-car", x: 300, y: 410, width: 14, height: 24 },
    { type: "parked-car", x: 540, y: 410, width: 14, height: 24 },
    { type: "parked-car", x: 560, y: 410, width: 14, height: 24 },
    { type: "parked-car", x: 580, y: 410, width: 14, height: 24 },

    // Buildings rendered as scenery overlays
    { type: "building", x: 205, y: 365, label: "CL PLAZA", width: 230, height: 90 },
    { type: "building", x: 525, y: 365, label: "HOME DEPOT", width: 170, height: 90 },
    { type: "building", x: 925, y: 685, width: 110, height: 230 },
    { type: "building", x: 185, y: 725, label: "RETAIL", width: 90, height: 150 },

    // Sparse trees (commercial area, not many)
    { type: "tree", x: 460, y: 570 },
    { type: "tree", x: 300, y: 920 },
    { type: "tree", x: 420, y: 1060 },

    // Fences along back roads
    { type: "fence", x: 280, y: 860, width: 60, height: 4 },
    { type: "fence", x: 280, y: 760, width: 60, height: 4 },

    // Power poles along Route 31
    { type: "power-pole", x: 890, y: 700 },
    { type: "power-pole", x: 890, y: 840 },
  ],

  palette: {
    sky: 0x020208,       // near-black midnight
    road: 0x222228,      // dark blacktop
    roadLine: 0xffcc00,  // yellow highway markings
    grass: 0x0a1a0a,     // dark patchy ground
    sidewalk: 0x333333,  // parking lot edge
    water: 0x0a0a1a,     // dark (no water)
    building: 0x666666,  // commercial gray
  },

  targetTimeSec: 80,
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/arcade/tracks/route14.ts
git commit -m "feat(arcade): add Route 14 Strip track"
```

---

### Task 5: Wire new tracks into TrackSelectScene

**Files:**
- Modify: `components/arcade/scenes/TrackSelectScene.ts:1-5`

- [ ] **Step 1: Import new tracks and add to TRACKS array**

In `components/arcade/scenes/TrackSelectScene.ts`, change lines 1-5 from:

```typescript
import Phaser from "phaser";
import { TrackData } from "../track";
import { lakefrontTrack } from "../tracks/lakefront";

const TRACKS: TrackData[] = [lakefrontTrack];
const TOTAL_SLOTS = 3;
```

to:

```typescript
import Phaser from "phaser";
import { TrackData } from "../track";
import { lakefrontTrack } from "../tracks/lakefront";
import { downtownTrack } from "../tracks/downtown";
import { route14Track } from "../tracks/route14";

const TRACKS: TrackData[] = [lakefrontTrack, downtownTrack, route14Track];
const TOTAL_SLOTS = 3;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/arcade/scenes/TrackSelectScene.ts
git commit -m "feat(arcade): wire downtown and route14 tracks into TrackSelectScene"
```

---

### Task 6: Show track name on MatchupScene

**Files:**
- Modify: `components/arcade/scenes/MatchupScene.ts:9-17,29-40`

- [ ] **Step 1: Read selectedTrack from registry and display it**

In `components/arcade/scenes/MatchupScene.ts`, after line 17 (`const opponentCar = opponents[0] || playerCar;`), add:

```typescript
    const selectedTrack = this.registry.get("selectedTrack");
```

Then after the "Choose Your Ride" text block (after line 40), add the track name display:

```typescript
    // Track name
    if (selectedTrack) {
      this.add.text(width / 2, 82, selectedTrack.name.toUpperCase(), {
        fontFamily: "'Press Start 2P'", fontSize: "14px", color: "#ffd700",
      }).setOrigin(0.5);
      this.add.text(width / 2, 100, selectedTrack.subtitle, {
        fontFamily: "'Press Start 2P'", fontSize: "9px", color: "#666666",
      }).setOrigin(0.5);
    }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/arcade/scenes/MatchupScene.ts
git commit -m "feat(arcade): display track name on matchup screen"
```

---

### Task 7: Extract shared roadFromCenter helper

**Files:**
- Modify: `components/arcade/track.ts`
- Modify: `components/arcade/tracks/lakefront.ts`
- Modify: `components/arcade/tracks/downtown.ts`
- Modify: `components/arcade/tracks/route14.ts`

The `roadFromCenter` function is duplicated in all 3 track files. Move it to `track.ts` and import it.

- [ ] **Step 1: Export roadFromCenter from track.ts**

Add at the end of `components/arcade/track.ts` (after the `hasCrossedFinish` function):

```typescript
/**
 * Builds a road polygon from an ordered centerline array and a half-width.
 */
export function roadFromCenter(
  centerline: Waypoint[],
  halfWidth: number
): Polygon {
  if (centerline.length < 2) return [];
  const left: Waypoint[] = [];
  const right: Waypoint[] = [];
  for (let i = 0; i < centerline.length; i++) {
    const prev = centerline[Math.max(0, i - 1)];
    const next = centerline[Math.min(centerline.length - 1, i + 1)];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.sqrt(tx * tx + ty * ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    left.push({ x: centerline[i].x + nx * halfWidth, y: centerline[i].y + ny * halfWidth });
    right.push({ x: centerline[i].x - nx * halfWidth, y: centerline[i].y - ny * halfWidth });
  }
  return [...left, ...right.reverse()];
}
```

- [ ] **Step 2: Update all 3 track files to import instead of defining locally**

In each of `lakefront.ts`, `downtown.ts`, and `route14.ts`:
- Change the import to include `roadFromCenter`: `import { type TrackData, type Waypoint, type Polygon, roadFromCenter } from "../track";`
- Remove the local `roadFromCenter` function definition

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add components/arcade/track.ts components/arcade/tracks/lakefront.ts components/arcade/tracks/downtown.ts components/arcade/tracks/route14.ts
git commit -m "refactor(arcade): extract shared roadFromCenter to track.ts"
```
