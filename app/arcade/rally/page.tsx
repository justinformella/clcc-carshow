"use client";
import { useEffect, useRef } from "react";

// ── Map ──────────────────────────────────────────────────────────────────────
const COLS = 20, ROWS = 20, CELL = 32;
// 1 = road, 0 = building
const MAP_TEMPLATE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,0,0,1],
  [1,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,1,0,0,0,0,0,1,1,0,0,0,0,0,1,0,0,1],
  [1,0,0,1,0,0,0,0,0,1,1,0,0,0,0,0,1,0,0,1],
  [1,1,1,1,1,1,1,0,0,1,1,0,0,1,1,1,1,1,1,1],
  [1,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1],
  [1,0,0,0,0,1,0,0,0,1,1,0,0,1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,1,0,0,1,0,0,1,0,0,0,1,0,0,0,1],
  [1,0,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,1,0,0,0,0,0,1,1,0,0,0,0,1,0,0,0,1],
  [1,0,0,1,0,0,0,0,0,1,1,0,0,0,0,1,0,0,0,1],
  [1,1,1,1,1,1,1,0,0,1,1,0,0,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,1,1,0,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,1,1,0,0,1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

function isRoad(gx: number, gy: number) {
  if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return false;
  return MAP_TEMPLATE[gy][gx] === 1;
}

// ── Road cells list ───────────────────────────────────────────────────────────
const ROAD_CELLS: [number,number][] = [];
for (let r = 0; r < ROWS; r++)
  for (let c = 0; c < COLS; c++)
    if (MAP_TEMPLATE[r][c] === 1) ROAD_CELLS.push([c, r]);

// Pick spread-out flag positions (every ~4th road cell)
const FLAG_POS: [number,number][] = [
  [1,0],[7,0],[17,0],[1,3],[15,3],[3,6],[11,6],[3,9],[11,9],[17,9],
].map(([c,r]) => [c * CELL + CELL/2, r * CELL + CELL/2]);

// ── Helpers ───────────────────────────────────────────────────────────────────
function carCollides(x: number, y: number, halfW = 12, halfH = 10) {
  const corners = [
    [x - halfW, y - halfH],[x + halfW, y - halfH],
    [x + halfW, y + halfH],[x - halfW, y + halfH],
  ];
  for (const [cx, cy] of corners) {
    const gx = Math.floor(cx / CELL), gy = Math.floor(cy / CELL);
    if (!isRoad(gx, gy)) return true;
  }
  return false;
}

function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.fillRect(-10, -6, 20, 12);
  ctx.fillStyle = "#fff";
  ctx.fillRect(4, -4, 5, 4);
  ctx.fillRect(4, 1, 5, 4);
  ctx.fillStyle = "#222";
  ctx.fillRect(-12, -7, 4, 4);
  ctx.fillRect(-12, 3, 4, 4);
  ctx.fillRect(9, -7, 4, 4);
  ctx.fillRect(9, 3, 4, 4);
  ctx.restore();
}

// ── BFS pathfinding on grid ───────────────────────────────────────────────────
function bfsNext(fx: number, fy: number, tx: number, ty: number): [number,number] {
  const sc = Math.floor(fx / CELL), sr = Math.floor(fy / CELL);
  const ec = Math.floor(tx / CELL), er = Math.floor(ty / CELL);
  if (sc === ec && sr === er) return [tx, ty];
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
  const visited: boolean[][] = Array.from({length: ROWS}, () => Array(COLS).fill(false));
  const parent: ([number,number] | null)[][] = Array.from({length: ROWS}, () => Array(COLS).fill(null));
  const queue: [number,number][] = [[sc, sr]];
  visited[sr][sc] = true;
  let found = false;
  while (queue.length) {
    const [cc, cr] = queue.shift()!;
    if (cc === ec && cr === er) { found = true; break; }
    for (const [dc, dr] of dirs) {
      const nc = cc + dc, nr = cr + dr;
      if (isRoad(nc, nr) && !visited[nr][nc]) {
        visited[nr][nc] = true;
        parent[nr][nc] = [cc, cr];
        queue.push([nc, nr]);
      }
    }
  }
  if (!found) return [fx, fy];
  let cur: [number,number] = [ec, er];
  let prev: [number,number] = cur;
  while (true) {
    const p = parent[cur[1]][cur[0]];
    if (!p) break;
    if (p[0] === sc && p[1] === sr) { prev = cur; break; }
    prev = cur;
    cur = p;
  }
  return [prev[0] * CELL + CELL/2, prev[1] * CELL + CELL/2];
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RallyPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // ── State ──────────────────────────────────────────────────────────────
    let gameState: "playing" | "win" | "bust" = "playing";
    let elapsed = 0;
    let lastTime = performance.now();

    // Player
    let px = 1.5 * CELL, py = 0.5 * CELL;
    let pAngle = Math.PI / 2;
    let pvx = 0, pvy = 0, pAV = 0;

    // Flags
    let flags = FLAG_POS.map((pos, i) => ({ x: pos[0], y: pos[1], collected: false, id: i }));

    // Police
    type Cop = { x: number; y: number; angle: number; vx: number; vy: number; av: number; bfsTimer: number; _targetX?: number; _targetY?: number };
    const police: Cop[] = [
      { x: 17.5*CELL, y: 0.5*CELL, angle: Math.PI/2, vx: 0, vy: 0, av: 0, bfsTimer: 0 },
      { x: 1.5*CELL,  y: 19.5*CELL, angle: -Math.PI/2, vx: 0, vy: 0, av: 0, bfsTimer: 0 },
      { x: 17.5*CELL, y: 19.5*CELL, angle: Math.PI, vx: 0, vy: 0, av: 0, bfsTimer: 0 },
    ];

    const keys: Record<string, boolean> = {};
    const onKey = (e: KeyboardEvent, down: boolean) => {
      keys[e.key] = down;
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
    };
    window.addEventListener("keydown", e => onKey(e, true));
    window.addEventListener("keyup", e => onKey(e, false));

    // ── Map drawing (cached) ───────────────────────────────────────────────
    const mapCanvas = document.createElement("canvas");
    mapCanvas.width = COLS * CELL;
    mapCanvas.height = ROWS * CELL;
    const mc = mapCanvas.getContext("2d")!;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAP_TEMPLATE[r][c] === 1) {
          mc.fillStyle = "#2a2a3e";
          mc.fillRect(c*CELL, r*CELL, CELL, CELL);
          mc.strokeStyle = "#3a3a5e";
          mc.lineWidth = 0.5;
          mc.strokeRect(c*CELL, r*CELL, CELL, CELL);
        } else {
          mc.fillStyle = "#111120";
          mc.fillRect(c*CELL, r*CELL, CELL, CELL);
          mc.fillStyle = "#1a1a2e";
          mc.fillRect(c*CELL+2, r*CELL+2, CELL-4, CELL-4);
        }
      }
    }

    // ── Game loop ──────────────────────────────────────────────────────────
    let rafId: number;
    function loop(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      if (gameState === "playing") elapsed += dt;

      const W = canvas.width, H = canvas.height;

      // ── Player input ───────────────────────────────────────────────────
      if (gameState === "playing") {
        const left  = keys["ArrowLeft"]  || keys["a"] || keys["A"];
        const right = keys["ArrowRight"] || keys["d"] || keys["D"];
        const up    = keys["ArrowUp"]    || keys["w"] || keys["W"];
        const down  = keys["ArrowDown"]  || keys["s"] || keys["S"];

        const turnSpeed = 2.4;
        if (left)  pAV -= turnSpeed * dt;
        if (right) pAV += turnSpeed * dt;
        const power = 220;
        if (up) {
          pvx += Math.sin(pAngle) * power * dt;
          pvy -= Math.cos(pAngle) * power * dt;
        }
        if (down) {
          pvx -= Math.sin(pAngle) * power * dt * 0.5;
          pvy += Math.cos(pAngle) * power * dt * 0.5;
        }
        const drag = 0.94;
        pvx *= drag; pvy *= drag; pAV *= 0.94;
        pAngle += pAV * dt * 60;

        const nx = px + pvx * dt, ny = py + pvy * dt;
        if (!carCollides(nx, py)) px = nx; else pvx *= -0.3;
        if (!carCollides(px, ny)) py = ny; else pvy *= -0.3;
        px = Math.max(6, Math.min(COLS*CELL-6, px));
        py = Math.max(6, Math.min(ROWS*CELL-6, py));

        // Collect flags
        for (const f of flags) {
          if (!f.collected && Math.hypot(px - f.x, py - f.y) < 16) {
            f.collected = true;
          }
        }
        if (flags.every(f => f.collected)) gameState = "win";

        // Police movement
        for (const cop of police) {
          cop.bfsTimer -= dt;
          let targetX = px, targetY = py;
          if (cop.bfsTimer <= 0) {
            cop.bfsTimer = 0.25;
            [targetX, targetY] = bfsNext(cop.x, cop.y, px, py);
            cop._targetX = targetX; cop._targetY = targetY;
          } else {
            targetX = cop._targetX ?? px;
            targetY = cop._targetY ?? py;
          }

          const desiredAngle = Math.atan2(targetX - cop.x, -(targetY - cop.y));
          let dAngle = desiredAngle - cop.angle;
          while (dAngle > Math.PI) dAngle -= Math.PI * 2;
          while (dAngle < -Math.PI) dAngle += Math.PI * 2;
          cop.av = (cop.av + dAngle * 8 * dt) * 0.85;
          cop.angle += cop.av;

          const copPow = 160;
          cop.vx += Math.sin(cop.angle) * copPow * dt;
          cop.vy -= Math.cos(cop.angle) * copPow * dt;
          cop.vx *= 0.92; cop.vy *= 0.92;

          const cnx = cop.x + cop.vx * dt, cny = cop.y + cop.vy * dt;
          if (!carCollides(cnx, cop.y)) cop.x = cnx; else cop.vx *= -0.3;
          if (!carCollides(cop.x, cny)) cop.y = cny; else cop.vy *= -0.3;

          if (Math.hypot(cop.x - px, cop.y - py) < 20) gameState = "bust";
        }
      }

      // ── Camera ─────────────────────────────────────────────────────────
      const camX = Math.max(0, Math.min(COLS*CELL - W, px - W/2));
      const camY = Math.max(0, Math.min(ROWS*CELL - H, py - H/2));

      // ── Draw ───────────────────────────────────────────────────────────
      ctx.fillStyle = "#0d0d1a";
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(-camX, -camY);
      ctx.drawImage(mapCanvas, 0, 0);

      // Flags
      for (const f of flags) {
        if (!f.collected) {
          ctx.save();
          ctx.translate(f.x, f.y);
          ctx.fillStyle = "#ffd700";
          ctx.fillRect(-4, -12, 2, 14);
          ctx.fillStyle = "#ff6600";
          ctx.beginPath();
          ctx.moveTo(-2, -12); ctx.lineTo(8, -8); ctx.lineTo(-2, -4);
          ctx.fill();
          ctx.restore();
        }
      }

      // Police
      for (const cop of police) {
        drawCar(ctx, cop.x, cop.y, cop.angle, "#e63946");
      }
      // Player
      drawCar(ctx, px, py, pAngle, "#00e5ff");

      ctx.restore();

      // ── HUD ────────────────────────────────────────────────────────────
      ctx.font = "10px 'Press Start 2P', monospace";

      // Flags collected
      const collected = flags.filter(f => f.collected).length;
      ctx.fillStyle = "#ffd700";
      ctx.fillText(`FLAGS: ${collected}/10`, 12, 22);

      // Timer
      const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
      const secs = Math.floor(elapsed % 60).toString().padStart(2, "0");
      ctx.fillStyle = "#ffffff";
      const timerW = ctx.measureText(`${mins}:${secs}`).width;
      ctx.fillText(`${mins}:${secs}`, W/2 - timerW/2, 22);

      // Minimap
      const MM = 110, mmX = W - MM - 10, mmY = 10;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(mmX, mmY, MM, MM);
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 1;
      ctx.strokeRect(mmX, mmY, MM, MM);
      const scaleX = MM / (COLS * CELL), scaleY = MM / (ROWS * CELL);

      // Road cells on minimap
      ctx.fillStyle = "#2a2a3e";
      for (const [c, r] of ROAD_CELLS) {
        ctx.fillRect(mmX + c*CELL*scaleX, mmY + r*CELL*scaleY, CELL*scaleX, CELL*scaleY);
      }

      // Flags on minimap
      for (const f of flags) {
        if (!f.collected) {
          ctx.fillStyle = "#ffd700";
          ctx.fillRect(mmX + f.x*scaleX - 1.5, mmY + f.y*scaleY - 1.5, 3, 3);
        }
      }
      // Police on minimap
      for (const cop of police) {
        ctx.fillStyle = "#e63946";
        ctx.fillRect(mmX + cop.x*scaleX - 2, mmY + cop.y*scaleY - 2, 4, 4);
      }
      // Player on minimap
      ctx.fillStyle = "#00e5ff";
      ctx.fillRect(mmX + px*scaleX - 2.5, mmY + py*scaleY - 2.5, 5, 5);

      // Controls hint
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "7px 'Press Start 2P', monospace";
      ctx.fillText("ARROW KEYS TO DRIVE", W/2 - 76, H - 12);

      // ── Overlays ────────────────────────────────────────────────────────
      if (gameState === "win" || gameState === "bust") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);

        ctx.font = "24px 'Press Start 2P', monospace";
        const msg = gameState === "win" ? "YOU WIN!" : "BUSTED!";
        ctx.fillStyle = gameState === "win" ? "#ffd700" : "#e63946";
        const mw = ctx.measureText(msg).width;
        ctx.fillText(msg, W/2 - mw/2, H/2 - 30);

        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.fillStyle = "#ffffff";
        const sub = gameState === "win" ? `TIME: ${mins}:${secs}` : "PRESS R TO RETRY";
        const sw = ctx.measureText(sub).width;
        ctx.fillText(sub, W/2 - sw/2, H/2 + 10);

        if (gameState === "win") {
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.font = "8px 'Press Start 2P', monospace";
          const sub2 = "PRESS R TO PLAY AGAIN";
          const s2w = ctx.measureText(sub2).width;
          ctx.fillText(sub2, W/2 - s2w/2, H/2 + 34);
        }
      }

      rafId = requestAnimationFrame(loop);
    }

    // Restart
    function handleRestart(e: KeyboardEvent) {
      if ((e.key === "r" || e.key === "R") && gameState !== "playing") {
        gameState = "playing";
        elapsed = 0;
        px = 1.5 * CELL; py = 0.5 * CELL;
        pAngle = Math.PI / 2; pvx = 0; pvy = 0; pAV = 0;
        flags = FLAG_POS.map((pos, i) => ({ x: pos[0], y: pos[1], collected: false, id: i }));
        police[0].x = 17.5*CELL; police[0].y = 0.5*CELL; police[0].vx = 0; police[0].vy = 0;
        police[1].x = 1.5*CELL;  police[1].y = 19.5*CELL; police[1].vx = 0; police[1].vy = 0;
        police[2].x = 17.5*CELL; police[2].y = 19.5*CELL; police[2].vx = 0; police[2].vy = 0;
      }
    }
    window.addEventListener("keydown", handleRestart);

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleRestart);
      window.removeEventListener("keydown", e => onKey(e, true));
      window.removeEventListener("keyup", e => onKey(e, false));
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        html, body { margin: 0; padding: 0; overflow: hidden; background: #0d0d1a; }
      `}</style>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </>
  );
}
