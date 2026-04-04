import type { TrackData, Waypoint, Polygon } from "../track";

// ---------------------------------------------------------------------------
// Road-building helper
// ---------------------------------------------------------------------------

/**
 * Builds a road polygon from an ordered centerline array and a half-width.
 * For each segment between consecutive waypoints we compute perpendicular
 * offsets, producing a quad strip that is returned as a single polygon.
 */
function roadFromCenter(
  centerline: Waypoint[],
  halfWidth: number
): Polygon {
  if (centerline.length < 2) return [];

  const left: Waypoint[] = [];
  const right: Waypoint[] = [];

  for (let i = 0; i < centerline.length; i++) {
    const prev = centerline[Math.max(0, i - 1)];
    const next = centerline[Math.min(centerline.length - 1, i + 1)];

    // Tangent direction
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.sqrt(tx * tx + ty * ty) || 1;

    // Perpendicular (normal) — rotate tangent 90°
    const nx = -ty / len;
    const ny = tx / len;

    left.push({ x: centerline[i].x + nx * halfWidth, y: centerline[i].y + ny * halfWidth });
    right.push({ x: centerline[i].x - nx * halfWidth, y: centerline[i].y - ny * halfWidth });
  }

  // Polygon: left side forward, right side reversed
  return [...left, ...right.reverse()];
}

// ---------------------------------------------------------------------------
// Centerline waypoints — Route 14 Blitz highway run east
// ---------------------------------------------------------------------------

const HALF_ROAD = 60;

const centerline: Waypoint[] = [
  // Start: Teckler Blvd on-ramp, heading east
  { x: 80,   y: 500 },
  { x: 200,  y: 500 },
  { x: 400,  y: 500 },
  { x: 600,  y: 500 },
  // Gentle S-curve #1 — slight drift north
  { x: 800,  y: 490 },
  { x: 1000, y: 470 },
  { x: 1200, y: 460 },
  // Back toward center
  { x: 1400, y: 470 },
  { x: 1600, y: 490 },
  { x: 1800, y: 500 },
  { x: 2000, y: 500 },
  // Gentle S-curve #2 — slight drift south
  { x: 2200, y: 510 },
  { x: 2400, y: 530 },
  { x: 2600, y: 530 },
  // Back toward center
  { x: 2800, y: 520 },
  { x: 3000, y: 510 },
  { x: 3200, y: 500 },
  // Final straight to Randall Road
  { x: 3400, y: 500 },
  { x: 3600, y: 500 },
  { x: 3800, y: 500 },
];

// ---------------------------------------------------------------------------
// Road segments — one continuous polygon from the centerline
// ---------------------------------------------------------------------------

const roadSegments: Polygon[] = [roadFromCenter(centerline, HALF_ROAD)];

// ---------------------------------------------------------------------------
// Route 14 Blitz track definition
// ---------------------------------------------------------------------------

export const route14Track: TrackData = {
  name: "Route 14 Blitz",
  subtitle: "Teckler Blvd → Randall Rd — Commercial Highway, Crystal Lake IL",
  width: 4000,
  height: 1000,

  roadSegments,
  waypoints: centerline,

  spawnPoints: [
    // 2×2 grid near (90–120, 480–520), all facing east (Math.PI / 2)
    { x: 90,  y: 480, angle: Math.PI / 2 },
    { x: 90,  y: 520, angle: Math.PI / 2 },
    { x: 120, y: 480, angle: Math.PI / 2 },
    { x: 120, y: 520, angle: Math.PI / 2 },
  ],

  finishLine: {
    x: 3800,
    y: 500,
    angle: Math.PI / 2,
    width: 140,
  },

  // -------------------------------------------------------------------
  // Boundaries — strip mall blocks and gas stations along the highway
  // -------------------------------------------------------------------
  boundaries: [
    // ---- North side (y ~ 200-360) ----

    // Best Buy strip mall
    { x: 300,  y: 200, width: 260, height: 140, label: "BEST BUY" },
    // Gas station A (north)
    { x: 700,  y: 220, width: 120, height: 100 },
    // TJ Maxx strip mall
    { x: 900,  y: 190, width: 240, height: 130, label: "TJMAXX" },
    // Market / grocery
    { x: 1240, y: 200, width: 200, height: 120, label: "MARKET" },
    // Gas station B (north)
    { x: 1560, y: 220, width: 120, height: 100 },
    // Ross strip mall
    { x: 1760, y: 190, width: 220, height: 130, label: "ROSS" },
    // Large strip mall center-north
    { x: 2100, y: 200, width: 360, height: 150 },
    // Gas station C (north)
    { x: 2600, y: 210, width: 120, height: 110 },
    // Strip mall east section
    { x: 2850, y: 200, width: 280, height: 130 },
    // Gas station D (north)
    { x: 3300, y: 220, width: 130, height: 100 },
    // Randall Road corner buildings
    { x: 3600, y: 180, width: 300, height: 160, label: "RANDALL" },

    // ---- South side (y ~ 620-800) ----

    // Gas station A (south)
    { x: 400,  y: 640, width: 120, height: 100 },
    // Strip mall south A
    { x: 600,  y: 660, width: 240, height: 120 },
    // Strip mall south B (Market)
    { x: 1000, y: 640, width: 260, height: 130, label: "MARKET" },
    // Gas station B (south)
    { x: 1380, y: 650, width: 120, height: 100 },
    // Large strip mall south
    { x: 1600, y: 640, width: 320, height: 140 },
    // Strip mall south C
    { x: 2050, y: 650, width: 200, height: 120 },
    // Gas station C (south)
    { x: 2400, y: 650, width: 120, height: 100 },
    // Strip mall south D
    { x: 2650, y: 640, width: 280, height: 130 },
    // Delivery truck depot (south)
    { x: 3100, y: 650, width: 300, height: 140 },
    // Randall Road corner buildings (south)
    { x: 3600, y: 640, width: 300, height: 160, label: "RANDALL" },
  ],

  // -------------------------------------------------------------------
  // Scenery
  // -------------------------------------------------------------------
  scenery: [
    // RT 14 highway sign at start
    { type: "building", x: 160, y: 390, label: "RT 14", width: 80, height: 40 },

    // ---- North side strip mall labels ----
    { type: "building", x: 305,  y: 205, label: "BEST BUY",  width: 250, height: 130 },
    { type: "building", x: 905,  y: 195, label: "TJMAXX",    width: 230, height: 120 },
    { type: "building", x: 1245, y: 205, label: "MARKET",    width: 190, height: 110 },
    { type: "building", x: 1765, y: 195, label: "ROSS",      width: 210, height: 120 },
    { type: "building", x: 3605, y: 185, label: "RANDALL",   width: 290, height: 150 },

    // ---- South side strip mall labels ----
    { type: "building", x: 1005, y: 645, label: "MARKET",    width: 250, height: 120 },
    { type: "building", x: 3605, y: 645, label: "RANDALL",   width: 290, height: 150 },

    // Street lights spaced every ~200 px along north shoulder
    { type: "lamp", x: 200,  y: 435 },
    { type: "lamp", x: 400,  y: 425 },
    { type: "lamp", x: 600,  y: 420 },
    { type: "lamp", x: 800,  y: 420 },
    { type: "lamp", x: 1000, y: 400 },
    { type: "lamp", x: 1200, y: 395 },
    { type: "lamp", x: 1400, y: 400 },
    { type: "lamp", x: 1600, y: 420 },
    { type: "lamp", x: 1800, y: 430 },
    { type: "lamp", x: 2000, y: 430 },
    { type: "lamp", x: 2200, y: 440 },
    { type: "lamp", x: 2400, y: 460 },
    { type: "lamp", x: 2600, y: 460 },
    { type: "lamp", x: 2800, y: 455 },
    { type: "lamp", x: 3000, y: 445 },
    { type: "lamp", x: 3200, y: 435 },
    { type: "lamp", x: 3400, y: 435 },
    { type: "lamp", x: 3600, y: 435 },
    { type: "lamp", x: 3800, y: 435 },

    // Street lights along south shoulder
    { type: "lamp", x: 200,  y: 565 },
    { type: "lamp", x: 600,  y: 580 },
    { type: "lamp", x: 1000, y: 600 },
    { type: "lamp", x: 1400, y: 600 },
    { type: "lamp", x: 1800, y: 580 },
    { type: "lamp", x: 2200, y: 570 },
    { type: "lamp", x: 2600, y: 580 },
    { type: "lamp", x: 3000, y: 560 },
    { type: "lamp", x: 3400, y: 560 },
    { type: "lamp", x: 3800, y: 560 },

    // Gas station canopies (benches approximate the overhead canopy shape)
    { type: "bench", x: 720,  y: 260 },
    { type: "bench", x: 420,  y: 700 },
    { type: "bench", x: 1575, y: 265 },
    { type: "bench", x: 1395, y: 700 },
    { type: "bench", x: 2620, y: 260 },
    { type: "bench", x: 2415, y: 700 },
    { type: "bench", x: 3315, y: 265 },

    // Delivery / semi trucks parked on south side (trees as vehicle silhouettes)
    { type: "tree", x: 3140, y: 700 },
    { type: "tree", x: 3230, y: 700 },
    { type: "tree", x: 3320, y: 700 },

    // Neon signs (benches as colorful small props near storefronts)
    { type: "bench", x: 310,  y: 340 },
    { type: "bench", x: 910,  y: 318 },
    { type: "bench", x: 1250, y: 320 },
    { type: "bench", x: 2120, y: 348 },
    { type: "bench", x: 660,  y: 758 },
    { type: "bench", x: 1640, y: 778 },
    { type: "bench", x: 2680, y: 768 },
  ],

  // -------------------------------------------------------------------
  // Colour palette — late night highway, bright neon signs
  // -------------------------------------------------------------------
  palette: {
    sky: 0x050810,       // near-black night sky
    road: 0x1e1e22,      // very dark asphalt
    roadLine: 0xffffff,  // bright white lane dividers
    grass: 0x141a10,     // almost-black grass median
    sidewalk: 0x2e2c28,  // dark concrete curb strips
    water: 0x0a0c14,     // invisible / irrelevant
    building: 0x252018,  // very dark warm building walls
  },

  targetTimeSec: 90,
};
