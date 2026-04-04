import type { TrackData, Waypoint, Polygon } from "../track";

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

const HALF_ROAD = 36;

const centerline: Waypoint[] = [
  { x: 500, y: 80 },
  { x: 500, y: 180 },
  { x: 500, y: 280 },
  { x: 500, y: 380 },
  { x: 510, y: 460 },
  { x: 530, y: 540 },
  { x: 540, y: 620 },
  { x: 540, y: 700 },
  { x: 560, y: 760 },
  { x: 600, y: 810 },
  { x: 680, y: 840 },
  { x: 780, y: 850 },
  { x: 880, y: 850 },
  { x: 940, y: 870 },
  { x: 960, y: 920 },
  { x: 960, y: 1020 },
  { x: 960, y: 1120 },
  { x: 940, y: 1180 },
  { x: 900, y: 1220 },
  { x: 820, y: 1240 },
  { x: 720, y: 1240 },
  { x: 620, y: 1240 },
  { x: 560, y: 1220 },
  { x: 540, y: 1180 },
  { x: 520, y: 1100 },
  { x: 510, y: 1000 },
  { x: 500, y: 900 },
  { x: 500, y: 800 },
];

const roadSegments: Polygon[] = [roadFromCenter(centerline, HALF_ROAD)];

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
  finishLine: { x: 500, y: 800, angle: 0, width: 80 },
  boundaries: [
    { x: 340, y: 350, width: 120, height: 140, label: "RAUE CENTER" },
    { x: 560, y: 200, width: 100, height: 160 },
    { x: 560, y: 580, width: 160, height: 60, label: "METRA" },
    { x: 620, y: 760, width: 200, height: 60 },
    { x: 1000, y: 880, width: 100, height: 280 },
    { x: 620, y: 1280, width: 340, height: 80 },
    { x: 380, y: 1060, width: 120, height: 200 },
    { x: 340, y: 160, width: 110, height: 100 },
  ],
  scenery: [
    { type: "lamp", x: 470, y: 150 },
    { type: "lamp", x: 470, y: 280 },
    { type: "lamp", x: 470, y: 420 },
    { type: "lamp", x: 530, y: 200 },
    { type: "lamp", x: 530, y: 340 },
    { type: "lamp", x: 530, y: 500 },
    { type: "awning", x: 555, y: 220, width: 20, height: 30 },
    { type: "awning", x: 555, y: 270, width: 20, height: 25 },
    { type: "awning", x: 555, y: 310, width: 20, height: 28 },
    { type: "building", x: 345, y: 355, label: "RAUE CENTER", width: 110, height: 130 },
    { type: "parked-car", x: 465, y: 240, width: 16, height: 28 },
    { type: "parked-car", x: 465, y: 360, width: 16, height: 28 },
    { type: "parked-car", x: 540, y: 440, width: 16, height: 28 },
    { type: "sign", x: 520, y: 590, width: 12, height: 20, label: "RR" },
    { type: "sign", x: 560, y: 590, width: 12, height: 20, label: "RR" },
    { type: "building", x: 565, y: 585, label: "METRA", width: 150, height: 50 },
    { type: "lamp", x: 640, y: 820 },
    { type: "lamp", x: 760, y: 830 },
    { type: "lamp", x: 880, y: 835 },
    { type: "tree", x: 990, y: 920 },
    { type: "tree", x: 990, y: 1020 },
    { type: "tree", x: 990, y: 1100 },
    { type: "building", x: 1005, y: 885, width: 90, height: 270 },
    { type: "lamp", x: 840, y: 1260 },
    { type: "lamp", x: 720, y: 1260 },
    { type: "lamp", x: 620, y: 1260 },
    { type: "tree", x: 410, y: 1080 },
    { type: "tree", x: 410, y: 1180 },
    { type: "tree", x: 530, y: 1140 },
    { type: "bench", x: 480, y: 500 },
    { type: "bench", x: 920, y: 860 },
  ],
  palette: {
    sky: 0x060820,
    road: 0x2a2a30,
    roadLine: 0xffffff,
    grass: 0x2a2a2a,
    sidewalk: 0x444444,
    water: 0x1a1a3a,
    building: 0x5a4a3a,
  },
  targetTimeSec: 75,
};
