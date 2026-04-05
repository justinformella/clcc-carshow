"use client";
import { useEffect, useRef } from "react";

const W = 600, H = 700;
const ROAD_W = 280, ROAD_CX = W / 2;
const FINISH_DIST = 5000;
const FUEL_MAX = 100;
const LIVES_MAX = 3;

interface Car { x: number; y: number; w: number; h: number; color: string; speed: number; type: "car"|"truck"; }
interface Pickup { x: number; y: number; type: "fuel"|"boost"; active: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }
interface Tree { x: number; y: number; side: "left"|"right"; }

export default function RoadFighter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    // --- State ---
    let animId = 0;
    let gameState: "playing"|"dead"|"gameover"|"win" = "playing";
    let score = 0;
    let distance = 0;
    let lives = LIVES_MAX;
    let fuel = FUEL_MAX;
    let speed = 3; // road scroll speed
    let boostTimer = 0;
    let invincTimer = 0; // brief invincibility after collision
    let lastTime = 0;

    // Road curve
    let curveDrift = 0;   // current center x offset
    let curveTarget = 0;  // target offset
    let curveTimer = 0;

    // Player car
    let px = ROAD_CX;
    const py = H - 120;

    // Scroll offset for lane markings
    let roadY = 0;

    // Collections
    let traffic: Car[] = [];
    let pickups: Pickup[] = [];
    let particles: Particle[] = [];
    let trees: Tree[] = [];

    // Spawn initial trees
    for (let i = 0; i < 12; i++) {
      trees.push({ x: 0, y: Math.random() * H, side: Math.random() < 0.5 ? "left" : "right" });
    }

    // Keys
    const keys: Record<string, boolean> = {};
    const onKey = (e: KeyboardEvent, down: boolean) => { keys[e.key] = down; e.preventDefault(); };
    window.addEventListener("keydown", e => onKey(e, true));
    window.addEventListener("keyup", e => onKey(e, false));

    // --- Helpers ---
    function roadLeft() { return ROAD_CX + curveDrift - ROAD_W / 2; }
    function roadRight() { return ROAD_CX + curveDrift + ROAD_W / 2; }

    function spawnTraffic() {
      const isTruck = Math.random() < 0.2;
      const w = isTruck ? 55 : 38 + Math.random() * 14;
      const h = isTruck ? 72 : 52 + Math.random() * 16;
      const lane = roadLeft() + 30 + Math.random() * (ROAD_W - 60);
      const colors = ["#e63946","#457b9d","#2a9d8f","#e9c46a","#f4a261","#a8dadc","#6d6875"];
      traffic.push({
        x: lane, y: -h, w, h,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: speed * 0.5 + Math.random() * speed * 0.6,
        type: isTruck ? "truck" : "car",
      });
    }

    function spawnPickup() {
      const lane = roadLeft() + 40 + Math.random() * (ROAD_W - 80);
      pickups.push({ x: lane, y: -20, type: Math.random() < 0.7 ? "fuel" : "boost", active: true });
    }

    function explode(x: number, y: number) {
      for (let i = 0; i < 28; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 1 + Math.random() * 4;
        particles.push({
          x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
          life: 1, color: Math.random() < 0.5 ? "#ffd700" : "#ff4400",
          size: 3 + Math.random() * 5,
        });
      }
    }

    function drawCar(cx: number, cy: number, w: number, h: number, color: string, isPlayer = false) {
      // Body
      ctx.fillStyle = color;
      ctx.fillRect(cx - w/2, cy - h/2, w, h);
      // Roof
      ctx.fillStyle = isPlayer ? "#1a1a3e" : "#00000055";
      ctx.fillRect(cx - w*0.35, cy - h*0.4, w*0.7, h*0.45);
      // Windshield shine
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(cx - w*0.28, cy - h*0.38, w*0.25, h*0.18);
      // Wheels
      ctx.fillStyle = "#111";
      const wy = h*0.3;
      ctx.fillRect(cx - w/2 - 4, cy - wy, 7, 14);
      ctx.fillRect(cx + w/2 - 3, cy - wy, 7, 14);
      ctx.fillRect(cx - w/2 - 4, cy + wy - 14, 7, 14);
      ctx.fillRect(cx + w/2 - 3, cy + wy - 14, 7, 14);
      // Headlights
      if (isPlayer) {
        ctx.fillStyle = "#ffffaa";
        ctx.fillRect(cx - w*0.35, cy - h/2, 10, 6);
        ctx.fillRect(cx + w*0.35 - 10, cy - h/2, 10, 6);
      }
    }

    function drawHUD() {
      // Font fallback
      ctx.font = "12px 'Press Start 2P', monospace";

      // Score
      ctx.fillStyle = "#ffd700";
      ctx.textAlign = "left";
      ctx.fillText(`SCORE: ${score.toLocaleString()}`, 10, 22);

      // Speed
      const mph = Math.round(speed * 28);
      ctx.textAlign = "right";
      ctx.fillText(`${mph} MPH`, W - 10, 22);

      // Distance bar (top center)
      const barW = 180, barH = 10, barX = W/2 - barW/2, barY = 10;
      ctx.fillStyle = "#333";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = "#00ff88";
      ctx.fillRect(barX, barY, barW * Math.min(distance / FINISH_DIST, 1), barH);
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);
      ctx.fillStyle = "#ffd700";
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.floor(distance)}m / ${FINISH_DIST}m`, W/2, barY + barH + 12);

      // Lives (bottom left)
      ctx.textAlign = "left";
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.fillStyle = "#ffd700";
      ctx.fillText("LIVES", 10, H - 50);
      for (let i = 0; i < lives; i++) {
        drawCar(26 + i * 28, H - 28, 18, 28, "#00ccff", true);
      }

      // Fuel gauge (bottom right)
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffd700";
      ctx.fillText("FUEL", W - 10, H - 50);
      const fuelW = 100, fuelH = 14;
      const fuelX = W - 10 - fuelW, fuelY = H - 36;
      ctx.fillStyle = "#333";
      ctx.fillRect(fuelX, fuelY, fuelW, fuelH);
      const fuelPct = fuel / FUEL_MAX;
      ctx.fillStyle = fuelPct > 0.4 ? "#00ff88" : fuelPct > 0.2 ? "#ffaa00" : "#ff2222";
      ctx.fillRect(fuelX, fuelY, fuelW * fuelPct, fuelH);
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 1;
      ctx.strokeRect(fuelX, fuelY, fuelW, fuelH);

      // Boost indicator
      if (boostTimer > 0) {
        ctx.fillStyle = "#00aaff";
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText("BOOST!", W/2, H - 60);
      }
    }

    function drawOverlay(title: string, sub: string, btn: string) {
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.fillRect(0, 0, W, H);
      ctx.font = "28px 'Press Start 2P', monospace";
      ctx.fillStyle = "#ffd700";
      ctx.textAlign = "center";
      ctx.fillText(title, W/2, H/2 - 60);
      ctx.font = "12px 'Press Start 2P', monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(sub, W/2, H/2);
      // Button
      ctx.fillStyle = "#ffd700";
      ctx.fillRect(W/2 - 100, H/2 + 30, 200, 44);
      ctx.fillStyle = "#0d0d1a";
      ctx.font = "12px 'Press Start 2P', monospace";
      ctx.fillText(btn, W/2, H/2 + 59);
    }

    function reset() {
      score = 0; distance = 0; lives = LIVES_MAX; fuel = FUEL_MAX;
      speed = 3; boostTimer = 0; invincTimer = 0;
      curveDrift = 0; curveTarget = 0; curveTimer = 0;
      px = ROAD_CX; roadY = 0;
      traffic = []; pickups = []; particles = [];
      trees = [];
      for (let i = 0; i < 12; i++)
        trees.push({ x: 0, y: Math.random() * H, side: Math.random() < 0.5 ? "left" : "right" });
      gameState = "playing";
      lastTime = 0;
    }

    // Click handler for overlay buttons
    function onClick(e: MouseEvent) {
      if (gameState !== "gameover" && gameState !== "win") return;
      const rect = canvas.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (W / rect.width);
      const cy = (e.clientY - rect.top) * (H / rect.height);
      if (cx > W/2 - 100 && cx < W/2 + 100 && cy > H/2 + 30 && cy < H/2 + 74) reset();
    }
    canvas.addEventListener("click", onClick);

    // --- Main loop ---
    function frame(ts: number) {
      const dt = lastTime ? Math.min((ts - lastTime) / 16.67, 3) : 1;
      lastTime = ts;

      // --- Update ---
      if (gameState === "playing") {
        // Speed control
        if (keys["ArrowUp"] || keys["w"] || keys["W"]) speed = Math.min(speed + 0.04 * dt, boostTimer > 0 ? 10 : 7);
        if (keys["ArrowDown"] || keys["s"] || keys["S"]) speed = Math.max(speed - 0.06 * dt, 1);
        speed = Math.max(speed - 0.005 * dt, 1); // natural deceleration

        // Steering
        const steerSpd = 3.5 * dt;
        if (keys["ArrowLeft"] || keys["a"] || keys["A"]) px -= steerSpd;
        if (keys["ArrowRight"] || keys["d"] || keys["D"]) px += steerSpd;

        // Clamp player to road
        const rL = roadLeft(), rR = roadRight();
        if (px < rL + 20) { px = rL + 20; speed *= 0.95; }
        if (px > rR - 20) { px = rR - 20; speed *= 0.95; }

        // Road scroll
        roadY = (roadY + speed * dt * 4) % 60;

        // Curve
        curveTimer -= dt;
        if (curveTimer <= 0) {
          curveTarget = (Math.random() - 0.5) * 120;
          curveTimer = 120 + Math.random() * 200;
        }
        curveDrift += (curveTarget - curveDrift) * 0.012 * dt;

        // Distance & score
        distance += speed * 0.04 * dt;
        score += Math.floor(speed * 0.3 * dt);

        // Fuel drain
        fuel = Math.max(0, fuel - 0.015 * speed * dt);
        if (fuel <= 0) { gameState = "gameover"; }

        // Boost timer
        if (boostTimer > 0) { boostTimer -= dt; if (boostTimer <= 0) speed = Math.min(speed, 7); }

        // Invincibility timer
        if (invincTimer > 0) invincTimer -= dt;

        // Win check
        if (distance >= FINISH_DIST) { gameState = "win"; }

        // Spawn traffic
        if (Math.random() < 0.015 * dt * (1 + distance / 1000)) spawnTraffic();

        // Spawn pickups
        if (Math.random() < 0.004 * dt) spawnPickup();

        // Update traffic
        for (let i = traffic.length - 1; i >= 0; i--) {
          const c = traffic[i];
          c.y += (c.speed + speed * 0.5) * dt;
          // Collision
          if (invincTimer <= 0 &&
            Math.abs(c.x - px) < (c.w + 30) / 2 &&
            Math.abs(c.y - py) < (c.h + 50) / 2) {
            explode(px, py);
            lives--;
            invincTimer = 120;
            speed = Math.max(2, speed * 0.6);
            traffic.splice(i, 1);
            if (lives <= 0) gameState = "gameover";
            continue;
          }
          if (c.y > H + 80) traffic.splice(i, 1);
        }

        // Update pickups
        for (let i = pickups.length - 1; i >= 0; i--) {
          const p = pickups[i];
          p.y += speed * 0.8 * dt;
          if (p.active && Math.abs(p.x - px) < 28 && Math.abs(p.y - py) < 32) {
            if (p.type === "fuel") fuel = Math.min(FUEL_MAX, fuel + 30);
            else { boostTimer = 180; speed = Math.min(10, speed + 2); }
            p.active = false;
          }
          if (p.y > H + 40 || !p.active) pickups.splice(i, 1);
        }

        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.life -= 0.025 * dt;
          if (p.life <= 0) particles.splice(i, 1);
        }

        // Update trees
        for (const t of trees) {
          t.y += speed * 1.2 * dt;
          if (t.y > H + 40) {
            t.y = -40;
            t.side = Math.random() < 0.5 ? "left" : "right";
          }
          t.x = t.side === "left"
            ? roadLeft() - 40 - Math.random() * 60
            : roadRight() + 40 + Math.random() * 60;
        }
      }

      // --- Draw ---
      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.35);
      sky.addColorStop(0, "#0d0d1a");
      sky.addColorStop(1, "#1a1a3e");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H * 0.35);

      // Grass
      ctx.fillStyle = "#1a3a1a";
      ctx.fillRect(0, 0, W, H);

      // Road
      const rl = roadLeft(), rr = roadRight();
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(rl, 0, ROAD_W, H);

      // Road edge lines
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(rl, 0); ctx.lineTo(rl, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rr, 0); ctx.lineTo(rr, H); ctx.stroke();

      // Dashed center line
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.setLineDash([30, 30]);
      ctx.lineDashOffset = -roadY * 4;
      ctx.beginPath();
      ctx.moveTo(ROAD_CX + curveDrift, 0);
      ctx.lineTo(ROAD_CX + curveDrift, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Trees
      for (const t of trees) {
        ctx.fillStyle = "#0f4a0f";
        ctx.beginPath();
        ctx.arc(t.x, t.y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a6b1a";
        ctx.beginPath();
        ctx.arc(t.x - 4, t.y - 4, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a3a2a";
        ctx.fillRect(t.x - 4, t.y + 12, 8, 14);
      }

      // Pickups
      for (const p of pickups) {
        if (p.type === "fuel") {
          ctx.fillStyle = "#ffd700";
          ctx.fillRect(p.x - 12, p.y - 14, 24, 28);
          ctx.fillStyle = "#0d0d1a";
          ctx.font = "9px monospace";
          ctx.textAlign = "center";
          ctx.fillText("FUEL", p.x, p.y + 4);
        } else {
          ctx.fillStyle = "#00aaff";
          ctx.fillRect(p.x - 12, p.y - 14, 24, 28);
          ctx.fillStyle = "#ffffff";
          ctx.font = "9px monospace";
          ctx.textAlign = "center";
          ctx.fillText("SPD", p.x, p.y + 4);
        }
      }

      // Traffic
      for (const c of traffic) {
        drawCar(c.x, c.y, c.w, c.h, c.color);
      }

      // Player (flicker during invincibility)
      if (invincTimer <= 0 || Math.floor(invincTimer / 6) % 2 === 0) {
        drawCar(px, py, 36, 56, "#00ccff", true);
      }

      // Particles
      for (const p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      // HUD
      drawHUD();

      // Overlays
      if (gameState === "gameover") {
        const reason = fuel <= 0 ? "OUT OF FUEL!" : "NO MORE LIVES!";
        drawOverlay("GAME OVER", `${reason}  SCORE: ${score.toLocaleString()}`, "TRY AGAIN");
      } else if (gameState === "win") {
        drawOverlay("FINISH!", `SCORE: ${score.toLocaleString()}`, "PLAY AGAIN");
      }

      animId = requestAnimationFrame(frame);
    }

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", e => onKey(e, true));
      window.removeEventListener("keyup", e => onKey(e, false));
      canvas.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div
      style={{
        background: "#0d0d1a",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          display: "block",
          border: "3px solid #ffd700",
          boxShadow: "0 0 40px #ffd70055",
          maxWidth: "100vw",
          maxHeight: "100vh",
          imageRendering: "pixelated",
        }}
      />
      <p
        style={{
          color: "#ffd700",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "10px",
          marginTop: "14px",
          opacity: 0.7,
        }}
      >
        ARROWS / WASD to drive &nbsp;|&nbsp; Reach 5000m to win
      </p>
    </div>
  );
}
