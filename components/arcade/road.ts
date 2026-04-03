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
