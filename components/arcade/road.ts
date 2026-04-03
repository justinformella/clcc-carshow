/**
 * Pseudo-3D road renderer using the classic SNES row-projection technique.
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

export const TRACK_SKINS: RoadColors[] = [
  { // Night (default)
    skyTop: "#050510", skyBottom: "#0d0d2a",
    grassA: "#0a3a0a", grassB: "#0d4a0d",
    roadA: "#1a1a2e", roadB: "#222240",
    shoulderA: "#cc2222", shoulderB: "#ffffff",
    laneMarker: "#ffd700", centerLine: "#ffd700",
  },
  { // Dusk
    skyTop: "#1a0a2e", skyBottom: "#3d1a4a",
    grassA: "#1a3a1a", grassB: "#1d4a1d",
    roadA: "#2a2a3e", roadB: "#333348",
    shoulderA: "#ff6600", shoulderB: "#ffffff",
    laneMarker: "#ff9900", centerLine: "#ff9900",
  },
  { // Dawn
    skyTop: "#1a1a3a", skyBottom: "#4a2a1a",
    grassA: "#1a4a0a", grassB: "#2a5a1a",
    roadA: "#252535", roadB: "#2e2e40",
    shoulderA: "#cc2222", shoulderB: "#ffcc00",
    laneMarker: "#ffcc00", centerLine: "#ffcc00",
  },
  { // Midnight blue
    skyTop: "#000008", skyBottom: "#000020",
    grassA: "#061a06", grassB: "#082a08",
    roadA: "#111122", roadB: "#181830",
    shoulderA: "#cc2222", shoulderB: "#cccccc",
    laneMarker: "#ffd700", centerLine: "#ffd700",
  },
];

export const DEFAULT_COLORS: RoadColors = TRACK_SKINS[0];

export function pickRandomSkin(): RoadColors {
  return TRACK_SKINS[Math.floor(Math.random() * TRACK_SKINS.length)];
}

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
