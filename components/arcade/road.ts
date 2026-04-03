/**
 * Pseudo-3D road renderer — NES/SNES era style.
 * Split into static background (drawn once) and animated road (drawn per frame).
 */

export type RoadColors = {
  skyTop: string;
  skyBottom: string;
  stars: boolean;
  treeColor: string;
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
  { // Night
    skyTop: "#050510", skyBottom: "#0d0d2a", stars: true, treeColor: "#0a2a0a",
    grassA: "#0a3a0a", grassB: "#0d4a0d",
    roadA: "#1a1a2e", roadB: "#222240",
    shoulderA: "#cc2222", shoulderB: "#ffffff",
    laneMarker: "#ffd700", centerLine: "#ffd700",
  },
  { // Dusk
    skyTop: "#1a0a2e", skyBottom: "#3d1a4a", stars: true, treeColor: "#1a2a1a",
    grassA: "#1a3a1a", grassB: "#1d4a1d",
    roadA: "#2a2a3e", roadB: "#333348",
    shoulderA: "#ff6600", shoulderB: "#ffffff",
    laneMarker: "#ff9900", centerLine: "#ff9900",
  },
  { // Dawn
    skyTop: "#1a1a3a", skyBottom: "#4a2a1a", stars: false, treeColor: "#1a3a0a",
    grassA: "#1a4a0a", grassB: "#2a5a1a",
    roadA: "#252535", roadB: "#2e2e40",
    shoulderA: "#cc2222", shoulderB: "#ffcc00",
    laneMarker: "#ffcc00", centerLine: "#ffcc00",
  },
  { // Midnight
    skyTop: "#000008", skyBottom: "#000020", stars: true, treeColor: "#061a06",
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

/**
 * Draw static background — sky, stars, skyline, tree line.
 * Called ONCE per race, result is cached as a Phaser image.
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: RoadColors
) {
  const horizonY = Math.floor(height * 0.35);

  // --- Sky gradient (deeper, richer) ---
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, colors.skyTop);
  skyGrad.addColorStop(0.6, colors.skyBottom);
  skyGrad.addColorStop(1, colors.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, horizonY);

  // --- Stars ---
  if (colors.stars) {
    for (let i = 0; i < 50; i++) {
      const sx = (Math.sin(i * 127.1) * 0.5 + 0.5) * width;
      const sy = (Math.sin(i * 269.5) * 0.5 + 0.5) * horizonY * 0.7;
      const brightness = 150 + ((i * 31) % 105);
      ctx.fillStyle = `rgb(${brightness},${brightness},${Math.min(255, brightness + 40)})`;
      ctx.fillRect(Math.floor(sx), Math.floor(sy), i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }
  }

  // --- Distant mountains (layered silhouettes, NFS-style) ---
  // Back mountain range (darker, taller)
  ctx.fillStyle = "#0a0a18";
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  for (let x = 0; x <= width; x += 4) {
    const h = 30 + Math.sin(x * 0.008) * 20 + Math.sin(x * 0.003) * 35 + Math.sin(x * 0.02) * 8;
    ctx.lineTo(x, horizonY - h);
  }
  ctx.lineTo(width, horizonY);
  ctx.closePath();
  ctx.fill();

  // Front mountain range (slightly lighter, shorter)
  ctx.fillStyle = "#0e0e22";
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  for (let x = 0; x <= width; x += 4) {
    const h = 15 + Math.sin(x * 0.012 + 2) * 12 + Math.sin(x * 0.005 + 1) * 20 + Math.sin(x * 0.03) * 5;
    ctx.lineTo(x, horizonY - h);
  }
  ctx.lineTo(width, horizonY);
  ctx.closePath();
  ctx.fill();

  // --- Tree line at horizon (natural-looking pixel trees) ---
  // Dense tree canopy band
  const treeLineColor = colors.treeColor;
  ctx.fillStyle = treeLineColor;
  ctx.fillRect(0, horizonY - 12, width, 14); // solid tree band

  // Individual tree tops poking above the band
  for (let x = 0; x < width; x += 8) {
    const h = 4 + ((x * 7 + 3) % 10);
    const w = 6 + ((x * 3) % 5);
    ctx.fillStyle = ((x * 11) % 3 === 0) ? "#0d4a0d" : treeLineColor;
    // Triangular tree shape (pixel approximation)
    ctx.fillRect(x, horizonY - 12 - h, w, h);
    ctx.fillRect(x + 1, horizonY - 12 - h - 3, w - 2, 3);
    if (w > 7) ctx.fillRect(x + 2, horizonY - 12 - h - 5, w - 4, 2);
  }

  // --- Scattered lights in the tree line (distant houses/buildings) ---
  for (let x = 0; x < width; x += 20) {
    const hash = (x * 131 + 7) % 23;
    if (hash < 4) {
      ctx.fillStyle = hash < 2 ? "#ffcc44" : "#ff8844";
      ctx.fillRect(x + 6, horizonY - 6, 2, 2);
    }
  }

  // Fill below horizon with base grass color (overwritten by animated road)
  ctx.fillStyle = colors.grassA;
  ctx.fillRect(0, horizonY, width, height - horizonY);
}

/**
 * Draw animated road — called every frame. Only draws below the horizon.
 * Sky/stars/skyline are in the static background layer.
 */
export function drawRoad(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  roadOffset: number,
  colors: RoadColors = DEFAULT_COLORS,
  vanishOffset: number = 0
) {
  const horizonY = Math.floor(height * 0.35);
  const vanishX = width / 2 + vanishOffset;
  const totalRows = height - horizonY;
  const isDesktop = width >= 768;
  const roadWidthBottom = width * (isDesktop ? 1.30 : 1.10);
  const roadWidthTop = width * 0.08;
  const shoulderWidthBottom = width * (isDesktop ? 0.08 : 0.10);
  const shoulderWidthTop = 2;

  for (let row = 0; row < totalRows; row++) {
    const y = horizonY + row;
    const t = row / totalRows;
    const perspective = t * t;

    const roadW = roadWidthTop + (roadWidthBottom - roadWidthTop) * perspective;
    const shoulderW = shoulderWidthTop + (shoulderWidthBottom - shoulderWidthTop) * perspective;
    const roadLeft = vanishX - roadW / 2;
    const roadRight = vanishX + roadW / 2;

    const z = 1 / (t + 0.01);
    const stripePhase = (z + roadOffset * 0.3) % 20;
    const stripeBand = stripePhase < 10;

    // Grass (checkerboard)
    ctx.fillStyle = stripeBand ? colors.grassA : colors.grassB;
    ctx.fillRect(0, y, roadLeft - shoulderW, 1);
    ctx.fillRect(roadRight + shoulderW, y, width - (roadRight + shoulderW), 1);

    // Shoulder rumble strips
    ctx.fillStyle = stripeBand ? colors.shoulderA : colors.shoulderB;
    ctx.fillRect(roadLeft - shoulderW, y, shoulderW, 1);
    ctx.fillRect(roadRight, y, shoulderW, 1);

    // Road surface
    ctx.fillStyle = stripeBand ? colors.roadA : colors.roadB;
    ctx.fillRect(roadLeft, y, roadW, 1);

    // Center dashed line
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

    // Road edge white lines
    if (perspective > 0.02) {
      const edgeW = Math.max(1, 2 * perspective);
      ctx.fillStyle = "#ffffff40";
      ctx.fillRect(roadLeft, y, edgeW, 1);
      ctx.fillRect(roadRight - edgeW, y, edgeW, 1);
    }

    // (Roadside trees are drawn in the Phaser scenery layer for proper depth)
  }
}
