import type { Surface } from "./topdown-physics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Waypoint {
  x: number;
  y: number;
}

export type Polygon = { x: number; y: number }[];

export interface SceneryItem {
  type: "tree" | "lamp" | "building" | "water" | "bench" | "pier" | "awning" | "parked-car" | "traffic-light" | "gas-station" | "sign" | "fence" | "power-pole";
  x: number;
  y: number;
  label?: string;
  width?: number;
  height?: number;
  color?: string;
}

export interface Boundary {
  /** Axis-aligned rectangle defining a collidable boundary (building, wall, etc.) */
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface SpawnPoint {
  x: number;
  y: number;
  angle: number; // radians, direction car faces
}

export interface FinishLine {
  x: number;
  y: number;
  angle: number; // radians – perpendicular to road direction
  width: number;
}

export interface TrackPalette {
  sky: number;
  road: number;
  roadLine: number;
  grass: number;
  sidewalk: number;
  water: number;
  building: number;
}

export interface TrackData {
  name: string;
  subtitle: string;
  width: number;
  height: number;
  /** Road surface polygons (closed, convex or simple). Used for surface detection. */
  roadSegments: Polygon[];
  waypoints: Waypoint[];
  spawnPoints: SpawnPoint[];
  finishLine: FinishLine;
  boundaries: Boundary[];
  scenery: SceneryItem[];
  palette: TrackPalette;
  /** Par time in seconds */
  targetTimeSec: number;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/**
 * Ray-casting point-in-polygon test.
 * Returns true if (px, py) lies inside the polygon.
 */
export function pointInPolygon(
  px: number,
  py: number,
  polygon: { x: number; y: number }[]
): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Determines the surface type at world coordinates (x, y).
 * - "road"     — inside any road polygon
 * - "sidewalk" — within 16 px of any boundary rectangle
 * - "grass"    — everywhere else
 */
export function getSurfaceAt(track: TrackData, x: number, y: number): Surface {
  for (const poly of track.roadSegments) {
    if (pointInPolygon(x, y, poly)) return "road";
  }

  const SIDEWALK_MARGIN = 16;
  for (const b of track.boundaries) {
    if (
      x >= b.x - SIDEWALK_MARGIN &&
      x <= b.x + b.width + SIDEWALK_MARGIN &&
      y >= b.y - SIDEWALK_MARGIN &&
      y <= b.y + b.height + SIDEWALK_MARGIN
    ) {
      return "sidewalk";
    }
  }

  return "grass";
}

// ---------------------------------------------------------------------------
// Waypoint / progress helpers
// ---------------------------------------------------------------------------

/** Returns the index of the waypoint closest to (x, y). */
export function nearestWaypointIndex(
  track: TrackData,
  x: number,
  y: number
): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < track.waypoints.length; i++) {
    const wp = track.waypoints[i];
    const dx = wp.x - x;
    const dy = wp.y - y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Returns a value in [0, 1] representing how far along the track the car is,
 * based on the nearest waypoint index.
 */
export function raceProgress(track: TrackData, x: number, y: number): number {
  const idx = nearestWaypointIndex(track, x, y);
  return idx / Math.max(track.waypoints.length - 1, 1);
}

/**
 * Returns true if (x, y) is within 20 px of the finish line centre and
 * within half the finish-line width laterally.
 */
export function hasCrossedFinish(
  track: TrackData,
  x: number,
  y: number
): boolean {
  const fl = track.finishLine;
  const dx = x - fl.x;
  const dy = y - fl.y;
  // Distance along finish-line normal (perpendicular to road)
  const along = dx * Math.cos(fl.angle) + dy * Math.sin(fl.angle);
  // Distance across finish-line (lateral)
  const across = -dx * Math.sin(fl.angle) + dy * Math.cos(fl.angle);
  return Math.abs(along) <= 20 && Math.abs(across) <= fl.width / 2;
}
