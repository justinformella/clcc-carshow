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
// Centerline waypoints — Downtown Dash grid route
// ---------------------------------------------------------------------------

const HALF_ROAD = 32;

const centerline: Waypoint[] = [
  // Start: heading south from Route 14
  { x: 500, y: 120 },
  { x: 500, y: 200 },
  { x: 500, y: 300 },
  { x: 500, y: 400 },
  // 90° turn east onto Williams Street
  { x: 520, y: 440 },
  { x: 580, y: 460 },
  { x: 660, y: 460 },
  // Past Raue Center
  { x: 760, y: 460 },
  { x: 860, y: 460 },
  { x: 940, y: 460 },
  // 90° turn south on cross street
  { x: 970, y: 490 },
  { x: 980, y: 560 },
  { x: 980, y: 640 },
  { x: 980, y: 720 },
  // 90° turn east onto Crystal Lake Ave
  { x: 1010, y: 750 },
  { x: 1080, y: 760 },
  { x: 1180, y: 760 },
  { x: 1280, y: 760 },
  { x: 1380, y: 760 },
  // 90° turn south
  { x: 1410, y: 790 },
  { x: 1420, y: 860 },
  { x: 1420, y: 940 },
  // 90° turn east onto Virginia Street toward finish
  { x: 1450, y: 970 },
  { x: 1520, y: 980 },
  { x: 1600, y: 980 },
  // Finish
  { x: 1680, y: 980 },
  { x: 1760, y: 980 },
];

// ---------------------------------------------------------------------------
// Road segments — one continuous polygon from the centerline
// ---------------------------------------------------------------------------

const roadSegments: Polygon[] = [roadFromCenter(centerline, HALF_ROAD)];

// ---------------------------------------------------------------------------
// Downtown Dash track definition
// ---------------------------------------------------------------------------

export const downtownTrack: TrackData = {
  name: "Downtown Dash",
  subtitle: "Historic Downtown Crystal Lake IL — Night Sprint",
  width: 1800,
  height: 1100,

  roadSegments,
  waypoints: centerline,

  spawnPoints: [
    // 2×2 grid near (500, 130–160), all facing south (Math.PI)
    { x: 485, y: 130, angle: Math.PI },
    { x: 515, y: 130, angle: Math.PI },
    { x: 485, y: 160, angle: Math.PI },
    { x: 515, y: 160, angle: Math.PI },
  ],

  finishLine: {
    x: 1700,
    y: 980,
    angle: Math.PI / 2,
    width: 80,
  },

  // -------------------------------------------------------------------
  // Boundaries — buildings lining downtown streets
  // -------------------------------------------------------------------
  boundaries: [
    // North side buildings along Route 14 / start corridor
    { x: 540, y: 80,  width: 180, height: 80 },
    { x: 380, y: 80,  width: 100, height: 80 },

    // Raue Center for the Arts (south side of Williams St)
    { x: 680, y: 500, width: 220, height: 120, label: "RAUE CENTER" },
    // Storefronts north side of Williams St
    { x: 560, y: 360, width: 180, height: 80 },
    { x: 780, y: 360, width: 160, height: 80 },
    { x: 980, y: 360, width: 120, height: 80 },

    // Cross-street east side buildings
    { x: 1020, y: 480, width: 120, height: 240 },

    // Crystal Lake Ave — north row buildings
    { x: 1060, y: 680, width: 300, height: 60 },
    { x: 1380, y: 680, width: 80,  height: 60 },

    // Crystal Lake Ave — south row buildings
    { x: 1020, y: 800, width: 360, height: 80 },

    // South cross-street east buildings
    { x: 1460, y: 800, width: 120, height: 120 },

    // Virginia Street — north side storefronts
    { x: 1460, y: 900, width: 80,  height: 60 },
    { x: 1560, y: 900, width: 260, height: 60 },

    // Virginia Street — south side buildings
    { x: 1460, y: 1010, width: 360, height: 80 },
  ],

  // -------------------------------------------------------------------
  // Scenery
  // -------------------------------------------------------------------
  scenery: [
    // Street lamps along start corridor
    { type: "lamp", x: 470, y: 180 },
    { type: "lamp", x: 470, y: 300 },
    { type: "lamp", x: 530, y: 380 },

    // Raue Center marquee building label
    { type: "building", x: 685, y: 505, label: "RAUE CENTER", width: 210, height: 110 },

    // Café tables outside storefronts on Williams St
    { type: "bench", x: 600, y: 490 },
    { type: "bench", x: 640, y: 490 },
    { type: "bench", x: 860, y: 490 },
    { type: "bench", x: 900, y: 490 },

    // Street lamps on Williams Street
    { type: "lamp", x: 580, y: 440 },
    { type: "lamp", x: 700, y: 440 },
    { type: "lamp", x: 820, y: 440 },
    { type: "lamp", x: 940, y: 440 },

    // Parked cars (trees standing in for parked car silhouettes)
    { type: "tree", x: 620, y: 495 },
    { type: "tree", x: 780, y: 495 },
    { type: "tree", x: 900, y: 495 },

    // Cross-street lamps
    { type: "lamp", x: 950, y: 560 },
    { type: "lamp", x: 950, y: 660 },
    { type: "lamp", x: 950, y: 730 },

    // Shop signs on Crystal Lake Ave (north side)
    { type: "building", x: 1065, y: 685, label: "CAFE", width: 90, height: 50 },
    { type: "building", x: 1175, y: 685, label: "BOOKS", width: 90, height: 50 },
    { type: "building", x: 1285, y: 685, label: "GIFTS", width: 90, height: 50 },

    // Street lamps on Crystal Lake Ave
    { type: "lamp", x: 1100, y: 740 },
    { type: "lamp", x: 1220, y: 740 },
    { type: "lamp", x: 1340, y: 740 },

    // Parked cars on Crystal Lake Ave south side
    { type: "tree", x: 1120, y: 800 },
    { type: "tree", x: 1260, y: 800 },
    { type: "tree", x: 1380, y: 800 },

    // South cross-street lamps
    { type: "lamp", x: 1390, y: 860 },
    { type: "lamp", x: 1390, y: 940 },

    // Virginia Street lamps and parked cars near finish
    { type: "lamp", x: 1510, y: 960 },
    { type: "lamp", x: 1620, y: 960 },
    { type: "lamp", x: 1730, y: 960 },
    { type: "tree", x: 1540, y: 1015 },
    { type: "tree", x: 1660, y: 1015 },
  ],

  // -------------------------------------------------------------------
  // Colour palette — night downtown, warm gold street lamps
  // -------------------------------------------------------------------
  palette: {
    sky: 0x0a0e1f,       // very dark night blue
    road: 0x2a2a2e,      // dark asphalt
    roadLine: 0xffcc44,  // warm gold lane markings
    grass: 0x1a2a18,     // very dark grass / tree pits
    sidewalk: 0x4a4440,  // dark stone sidewalk
    water: 0x111833,     // barely-visible water
    building: 0x3d3020,  // dark warm brick
  },

  targetTimeSec: 75,
};
