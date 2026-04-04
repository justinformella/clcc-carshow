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
// Centerline waypoints
// ---------------------------------------------------------------------------

const HALF_ROAD = 40;

const centerline: Waypoint[] = [
  // Teckler Blvd heading south
  { x: 400, y: 100 },
  { x: 400, y: 200 },
  { x: 400, y: 300 },
  // Curve east onto Route 14
  { x: 420, y: 380 },
  { x: 460, y: 440 },
  { x: 520, y: 480 },
  { x: 600, y: 500 },
  { x: 700, y: 510 },
  // Continue east
  { x: 800, y: 520 },
  { x: 900, y: 530 },
  // Turn south onto Crystal Lake Ave
  { x: 950, y: 560 },
  { x: 970, y: 620 },
  { x: 970, y: 720 },
  { x: 960, y: 820 },
  // Curve onto Dole Ave southwest
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
  // Along lake to Main Beach
  { x: 1000, y: 1560 },
  { x: 1100, y: 1550 },
  { x: 1200, y: 1540 },
];

// ---------------------------------------------------------------------------
// Road segments — one continuous polygon from the centerline
// ---------------------------------------------------------------------------

const roadSegments: Polygon[] = [roadFromCenter(centerline, HALF_ROAD)];

// ---------------------------------------------------------------------------
// Lakefront Sprint track definition
// ---------------------------------------------------------------------------

export const lakefrontTrack: TrackData = {
  name: "Lakefront Sprint",
  subtitle: "Redline Motor Condos → Main Beach, Crystal Lake IL",
  width: 1600,
  height: 1700,

  roadSegments,
  waypoints: centerline,

  spawnPoints: [
    // 2×2 grid around (400, 140–180), all facing south (Math.PI)
    { x: 385, y: 140, angle: Math.PI },
    { x: 415, y: 140, angle: Math.PI },
    { x: 385, y: 175, angle: Math.PI },
    { x: 415, y: 175, angle: Math.PI },
  ],

  finishLine: {
    x: 1200,
    y: 1540,
    angle: 0,
    width: 100,
  },

  // -------------------------------------------------------------------
  // Boundaries — buildings and walls along the route
  // -------------------------------------------------------------------
  boundaries: [
    // Redline Motor Condos (start — east side of Teckler Blvd)
    { x: 450, y: 80, width: 140, height: 100, label: "TECKLER" },
    // Small shop block on west side
    { x: 260, y: 110, width: 100, height: 80, label: "SHOP" },
    // Corner market near Route 14 turn
    { x: 250, y: 370, width: 120, height: 90, label: "MARKET" },
    // Building block east of Route 14
    { x: 700, y: 420, width: 160, height: 70 },
    // Crystal Lake Ave — east-side building strip
    { x: 1020, y: 550, width: 120, height: 300 },
    // Crystal Lake Ave — west-side building strip
    { x: 820, y: 580, width: 100, height: 250 },
    // Dole Mansion
    { x: 970, y: 880, width: 180, height: 140, label: "DOLE MANSION" },
    // Row houses along Dole Ave west side
    { x: 560, y: 1000, width: 140, height: 200 },
    // Lakeshore Drive — lakeside wall / promenade edge
    { x: 600, y: 1580, width: 700, height: 40 },
    // Main Beach parking structure
    { x: 1220, y: 1480, width: 160, height: 100 },
  ],

  // -------------------------------------------------------------------
  // Scenery
  // -------------------------------------------------------------------
  scenery: [
    // Trees along Teckler Blvd
    { type: "tree", x: 360, y: 130 },
    { type: "tree", x: 360, y: 230 },
    { type: "tree", x: 440, y: 250 },
    { type: "tree", x: 360, y: 310 },

    // Street lamps on Route 14
    { type: "lamp", x: 470, y: 460 },
    { type: "lamp", x: 590, y: 480 },
    { type: "lamp", x: 710, y: 490 },
    { type: "lamp", x: 830, y: 505 },

    // Trees lining Crystal Lake Ave
    { type: "tree", x: 1010, y: 580 },
    { type: "tree", x: 1010, y: 680 },
    { type: "tree", x: 1010, y: 780 },
    { type: "tree", x: 820, y: 600 },
    { type: "tree", x: 820, y: 720 },

    // Lamps on Dole Ave
    { type: "lamp", x: 870, y: 940 },
    { type: "lamp", x: 790, y: 1010 },
    { type: "lamp", x: 730, y: 1090 },
    { type: "lamp", x: 710, y: 1180 },

    // Trees in residential area along Dole Ave
    { type: "tree", x: 640, y: 1050 },
    { type: "tree", x: 640, y: 1150 },
    { type: "tree", x: 640, y: 1250 },
    { type: "tree", x: 640, y: 1340 },

    // Dole Mansion grounds
    { type: "tree", x: 950, y: 870 },
    { type: "tree", x: 1070, y: 870 },
    { type: "bench", x: 1000, y: 870 },

    // Water — Crystal Lake itself (south portion of map)
    { type: "water", x: 400, y: 1650, width: 1100, height: 200 },
    { type: "water", x: 900, y: 1580, width: 600, height: 120 },

    // Lakeshore Drive — benches and pier
    { type: "bench", x: 750, y: 1570 },
    { type: "bench", x: 900, y: 1572 },
    { type: "bench", x: 1050, y: 1570 },
    { type: "pier", x: 850, y: 1620 },
    { type: "pier", x: 1050, y: 1625 },

    // Lamps on Lakeshore Drive
    { type: "lamp", x: 730, y: 1510 },
    { type: "lamp", x: 820, y: 1555 },
    { type: "lamp", x: 940, y: 1563 },
    { type: "lamp", x: 1060, y: 1558 },
    { type: "lamp", x: 1160, y: 1548 },

    // Trees near Main Beach
    { type: "tree", x: 1130, y: 1510 },
    { type: "tree", x: 1180, y: 1510 },

    // Buildings with labels (rendered as scenery overlays, not collidable)
    { type: "building", x: 455, y: 85, label: "TECKLER", width: 130, height: 90 },
    { type: "building", x: 265, y: 115, label: "SHOP", width: 90, height: 70 },
    { type: "building", x: 255, y: 375, label: "MARKET", width: 110, height: 80 },
    { type: "building", x: 975, y: 885, label: "DOLE MANSION", width: 170, height: 130 },
  ],

  // -------------------------------------------------------------------
  // Colour palette — sunset over the lake
  // -------------------------------------------------------------------
  palette: {
    sky: 0xf4a460,       // sandy sunset orange
    road: 0x4a4a4a,      // dark asphalt
    roadLine: 0xffee88,  // warm yellow lane markings
    grass: 0x5a8a3c,     // mid green
    sidewalk: 0xc8b89a,  // pale stone
    water: 0x2255aa,     // deep lake blue
    building: 0x8b7355,  // warm brown brick
  },

  targetTimeSec: 90,
};
