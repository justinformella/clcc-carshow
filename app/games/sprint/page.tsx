"use client";

import { useEffect, useRef, useCallback } from "react";

// ── Track waypoints (closed loop circuit with variety) ──────────────────────
const WAYPOINTS = [
  { x: 600, y: 680 }, // start/finish (bottom-center straight)
  { x: 750, y: 680 },
  { x: 900, y: 660 },
  { x: 1020, y: 600 }, // sweeping right turn entry
  { x: 1080, y: 510 },
  { x: 1080, y: 400 }, // wide sweep apex
  { x: 1040, y: 300 },
  { x: 960, y: 230 },
  { x: 860, y: 190 }, // top straight
  { x: 740, y: 180 },
  { x: 620, y: 185 },
  { x: 500, y: 195 }, // S-curve entry
  { x: 420, y: 240 },
  { x: 380, y: 310 }, // S-curve mid
  { x: 360, y: 390 },
  { x: 320, y: 460 }, // S-curve exit
  { x: 240, y: 510 },
  { x: 170, y: 570 }, // hairpin entry
  { x: 130, y: 640 },
  { x: 140, y: 710 }, // hairpin apex
  { x: 190, y: 760 },
  { x: 270, y: 780 }, // hairpin exit
  { x: 380, y: 760 },
  { x: 480, y: 720 },
  { x: 560, y: 690 }, // back to start
];

const TRACK_WIDTH = 120;
const TOTAL_LAPS = 3;
const W = 1200;
const H = 820;

// Finish line is between waypoints[0] and waypoints[1]
const FINISH_X = WAYPOINTS[0].x + 5;
const FINISH_Y_TOP = WAYPOINTS[0].y - TRACK_WIDTH / 2 - 4;
const FINISH_Y_BOT = WAYPOINTS[0].y + TRACK_WIDTH / 2 + 4;

type CarState = {
  x: number;
  y: number;
  angle: number; // radians, 0 = up
  vx: number;
  vy: number;
  va: number; // angular velocity
  wp: number; // next waypoint index
  lap: number;
  finishedLap: number; // total laps done
  lapStart: number;
  lapTimes: number[];
  totalTime: number;
  finished: boolean;
  finishOrder: number; // 0 = not finished yet
  onGrass: boolean;
  color: string;
  name: string;
  skill: number; // speed multiplier
  isPlayer: boolean;
  // cross tracking
  lastX: number;
};

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function ptOnSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return { x: ax + t * dx, y: ay + t * dy };
}

function isOnTrack(x: number, y: number): boolean {
  const halfW = TRACK_WIDTH / 2 + 10; // generous margin
  // Check distance to each waypoint (covers rounded corners)
  for (let i = 0; i < WAYPOINTS.length; i++) {
    if (dist(x, y, WAYPOINTS[i].x, WAYPOINTS[i].y) < halfW) return true;
  }
  // Check distance to each segment between waypoints
  for (let i = 0; i < WAYPOINTS.length; i++) {
    const a = WAYPOINTS[i];
    const b = WAYPOINTS[(i + 1) % WAYPOINTS.length];
    const p = ptOnSegment(x, y, a.x, a.y, b.x, b.y);
    if (dist(x, y, p.x, p.y) < halfW) return true;
  }
  return false;
}

function initCar(idx: number): CarState {
  const xOffsets = [-100, -40, -100, -40]; // staggered 2x2 grid with more space
  const yOffsets = [-30, -30, 30, 30];
  const x = WAYPOINTS[0].x + xOffsets[idx];
  const y = WAYPOINTS[0].y + yOffsets[idx];
  const names = ["YOU", "RED", "BLU", "GRN"];
  const colors = ["#ffd700", "#ff4444", "#4488ff", "#44cc44"];
  const skills = [1.0, 0.85, 0.90, 0.95];
  return {
    x, y,
    angle: Math.PI / 2, // facing right along the start straight
    vx: 0, vy: 0, va: 0,
    wp: 1, // heading toward waypoint 1 (right along the straight)
    lap: 1, finishedLap: 0,
    lapStart: 0, lapTimes: [], totalTime: 0,
    finished: false, finishOrder: 0,
    onGrass: false,
    color: colors[idx],
    name: names[idx],
    skill: skills[idx],
    isPlayer: idx === 0,
    lastX: x,
  };
}

function drawTrack(ctx: CanvasRenderingContext2D) {
  // Grass background
  ctx.fillStyle = "#2d5a27";
  ctx.fillRect(0, 0, W, H);

  // Track surface — draw wide path
  ctx.strokeStyle = "#3a3a3a";
  ctx.lineWidth = TRACK_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(WAYPOINTS[0].x, WAYPOINTS[0].y);
  for (let i = 1; i < WAYPOINTS.length; i++) ctx.lineTo(WAYPOINTS[i].x, WAYPOINTS[i].y);
  ctx.closePath();
  ctx.stroke();

  // Track border (lighter edge)
  ctx.strokeStyle = "#555";
  ctx.lineWidth = TRACK_WIDTH + 8;
  ctx.beginPath();
  ctx.moveTo(WAYPOINTS[0].x, WAYPOINTS[0].y);
  for (let i = 1; i < WAYPOINTS.length; i++) ctx.lineTo(WAYPOINTS[i].x, WAYPOINTS[i].y);
  ctx.closePath();
  ctx.stroke();

  // Redraw track top
  ctx.strokeStyle = "#3a3a3a";
  ctx.lineWidth = TRACK_WIDTH;
  ctx.beginPath();
  ctx.moveTo(WAYPOINTS[0].x, WAYPOINTS[0].y);
  for (let i = 1; i < WAYPOINTS.length; i++) ctx.lineTo(WAYPOINTS[i].x, WAYPOINTS[i].y);
  ctx.closePath();
  ctx.stroke();

  // Dashed center line
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 14]);
  ctx.beginPath();
  ctx.moveTo(WAYPOINTS[0].x, WAYPOINTS[0].y);
  for (let i = 1; i < WAYPOINTS.length; i++) ctx.lineTo(WAYPOINTS[i].x, WAYPOINTS[i].y);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // Finish line
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#fff" : "#000";
    ctx.fillRect(FINISH_X - 4, FINISH_Y_TOP + i * 8, 8, 8);
  }
}

function drawCar(ctx: CanvasRenderingContext2D, car: CarState) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Body — 26x42, big enough for sprite overlays later
  ctx.fillStyle = car.color;
  ctx.fillRect(-13, -21, 26, 42);
  // Roof / windshield
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(-9, -17, 18, 10);
  // Rear window
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(-8, 10, 16, 6);
  // Wheels
  ctx.fillStyle = "#111";
  ctx.fillRect(-16, -15, 5, 10);
  ctx.fillRect(11, -15, 5, 10);
  ctx.fillRect(-16, 8, 5, 10);
  ctx.fillRect(11, 8, 5, 10);
  // Headlights
  ctx.fillStyle = "#ffffaa";
  ctx.fillRect(-9, -21, 5, 3);
  ctx.fillRect(4, -21, 5, 3);
  // Taillights
  ctx.fillStyle = "#ff3333";
  ctx.fillRect(-9, 18, 5, 3);
  ctx.fillRect(4, 18, 5, 3);
  ctx.restore();
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  player: CarState,
  allCars: CarState[],
  elapsed: number,
  countdown: number,
  raceStarted: boolean
) {
  ctx.font = "12px 'Press Start 2P', monospace";
  ctx.textAlign = "center";

  // Lap counter
  ctx.fillStyle = "#0d0d1a";
  ctx.fillRect(W / 2 - 80, 8, 160, 30);
  ctx.fillStyle = "#ffd700";
  ctx.fillText(`LAP ${Math.min(player.lap, TOTAL_LAPS)} / ${TOTAL_LAPS}`, W / 2, 28);

  // Position
  const sorted = [...allCars].filter(c => !c.finished).sort((a, b) => {
    if (b.finishedLap !== a.finishedLap) return b.finishedLap - a.finishedLap;
    const wa = (a.wp + WAYPOINTS.length) % WAYPOINTS.length;
    const wb = (b.wp + WAYPOINTS.length) % WAYPOINTS.length;
    return wb - wa;
  });
  const finishedCars = allCars.filter(c => c.finished).sort((a, b) => a.finishOrder - b.finishOrder);
  const orderedAll = [...finishedCars, ...sorted];
  const pos = orderedAll.findIndex(c => c.isPlayer) + 1;
  const suffixes = ["", "ST", "ND", "RD", "TH"];
  const suf = pos <= 3 ? suffixes[pos] : suffixes[4];

  ctx.textAlign = "left";
  ctx.fillStyle = "#0d0d1a";
  ctx.fillRect(8, 8, 110, 30);
  ctx.fillStyle = "#fff";
  ctx.fillText(`${pos}${suf} / 4`, 12, 28);

  // Time
  const t = raceStarted ? elapsed / 1000 : 0;
  const mins = Math.floor(t / 60).toString().padStart(2, "0");
  const secs = (t % 60).toFixed(2).padStart(5, "0");
  ctx.textAlign = "right";
  ctx.fillStyle = "#0d0d1a";
  ctx.fillRect(W - 118, 8, 110, 30);
  ctx.fillStyle = "#aaffaa";
  ctx.fillText(`${mins}:${secs}`, W - 12, 28);

  // Controls hint
  if (!raceStarted || countdown > 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(W / 2 - 200, H - 40, 400, 28);
    ctx.fillStyle = "#aaa";
    ctx.font = "9px 'Press Start 2P', monospace";
    ctx.fillText("ARROW KEYS TO DRIVE", W / 2, H - 21);
  }

  // Countdown
  if (countdown > 0) {
    const label = countdown > 3000 ? "3" : countdown > 2000 ? "2" : countdown > 1000 ? "1" : "GO!";
    const alpha = Math.min(1, (countdown % 1000) / 400);
    ctx.globalAlpha = alpha;
    ctx.font = "64px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = label === "GO!" ? "#00ff88" : "#ffd700";
    ctx.fillText(label, W / 2, H / 2 + 20);
    ctx.globalAlpha = 1;
  }
}

function drawResults(ctx: CanvasRenderingContext2D, cars: CarState[], onRestart: () => void) {
  ctx.fillStyle = "rgba(13,13,26,0.85)";
  ctx.fillRect(W / 2 - 220, H / 2 - 170, 440, 340);
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 3;
  ctx.strokeRect(W / 2 - 220, H / 2 - 170, 440, 340);

  ctx.font = "20px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd700";
  ctx.fillText("RACE OVER", W / 2, H / 2 - 130);

  const sorted = [...cars].sort((a, b) => a.finishOrder - b.finishOrder);
  const medals = ["1ST", "2ND", "3RD", "4TH"];
  sorted.forEach((car, i) => {
    const y = H / 2 - 80 + i * 52;
    ctx.font = "11px 'Press Start 2P', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = car.isPlayer ? "#ffd700" : "#ccc";
    ctx.fillText(`${medals[i]}  ${car.name}`, W / 2 - 160, y);
    const t = car.totalTime / 1000;
    const mins = Math.floor(t / 60).toString().padStart(2, "0");
    const secs = (t % 60).toFixed(2).padStart(5, "0");
    ctx.textAlign = "right";
    ctx.fillStyle = "#aaa";
    ctx.fillText(`${mins}:${secs}`, W / 2 + 160, y);
  });

  // Restart button area (drawn, click handled by overlay)
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(W / 2 - 110, H / 2 + 120, 220, 38);
  ctx.font = "13px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#0d0d1a";
  ctx.fillText("RACE AGAIN", W / 2, H / 2 + 146);
}

// ── Engine Audio ──────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
let engineOsc: OscillatorNode | null = null;
let engineGain: GainNode | null = null;

function initSprintAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function startSprintEngine() {
  if (engineOsc) return;
  initSprintAudio();
  if (!audioCtx) return;
  engineOsc = audioCtx.createOscillator();
  engineGain = audioCtx.createGain();
  engineOsc.type = "sawtooth";
  engineOsc.frequency.value = 60;
  engineGain.gain.value = 0;
  engineOsc.connect(engineGain);
  engineGain.connect(audioCtx.destination);
  engineOsc.start();
}

function updateSprintEngine(speed: number, maxSpeed: number) {
  if (!engineOsc || !engineGain) return;
  const norm = Math.min(1, speed / maxSpeed);
  engineOsc.frequency.value = 55 + norm * 180;
  engineGain.gain.value = 0.03 + norm * 0.08;
}

function stopSprintEngine() {
  try { if (engineOsc) { engineOsc.stop(); engineOsc.disconnect(); } } catch {}
  try { if (engineGain) engineGain.disconnect(); } catch {}
  engineOsc = null;
  engineGain = null;
}

export default function SprintPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    cars: [] as CarState[],
    keys: {} as Record<string, boolean>,
    countdown: 4000, // ms before GO
    raceStarted: false,
    raceOver: false,
    elapsed: 0,
    finishCount: 0,
    winnerTime: 0, // elapsed when first car finished
    lastTime: 0,
    trackCache: null as ImageData | null,
  });

  const restart = useCallback(() => {
    const s = stateRef.current;
    s.cars = [0, 1, 2, 3].map(initCar);
    s.countdown = 4000;
    s.raceStarted = false;
    s.raceOver = false;
    s.elapsed = 0;
    s.finishCount = 0;
    s.winnerTime = 0;
    stopSprintEngine();
    s.lastTime = 0;
  }, []);

  useEffect(() => {
    restart();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    // Pre-render track to offscreen canvas
    const offscreen = document.createElement("canvas");
    offscreen.width = W;
    offscreen.height = H;
    const octx = offscreen.getContext("2d")!;
    drawTrack(octx);
    const trackImg = offscreen;

    const onKey = (e: KeyboardEvent, down: boolean) => {
      stateRef.current.keys[e.key] = down;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key))
        e.preventDefault();
    };
    window.addEventListener("keydown", e => onKey(e, true));
    window.addEventListener("keyup", e => onKey(e, false));

    const onClick = (e: MouseEvent) => {
      if (!stateRef.current.raceOver) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      if (mx > W / 2 - 110 && mx < W / 2 + 110 && my > H / 2 + 120 && my < H / 2 + 158) {
        restart();
      }
    };
    canvas.addEventListener("click", onClick);

    let rafId = 0;

    function updateCar(car: CarState, dt: number, keys: Record<string, boolean>, s: typeof stateRef.current) {
      if (car.finished) return;
      const drag = 0.96;
      const angDrag = 0.88;
      const maxSpeed = 3.2 * car.skill;
      const accel = 0.14 * car.skill;
      const turnRate = 0.032;

      if (car.isPlayer) {
        // Steering scales with speed — no turning when stopped, tighter at low speed
        const spd = Math.sqrt(car.vx ** 2 + car.vy ** 2);
        const speedFactor = Math.min(1, spd / 1.5);
        const effectiveTurn = turnRate * speedFactor;
        if (keys["ArrowLeft"] || keys["a"] || keys["A"]) car.va -= effectiveTurn;
        if (keys["ArrowRight"] || keys["d"] || keys["D"]) car.va += effectiveTurn;
        if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
          car.vx += Math.sin(car.angle) * accel;
          car.vy -= Math.cos(car.angle) * accel;
        }
        if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
          car.vx -= Math.sin(car.angle) * accel * 0.5;
          car.vy += Math.cos(car.angle) * accel * 0.5;
        }
      } else {
        // AI: steer toward next waypoint
        const target = WAYPOINTS[car.wp];
        const dx = target.x - car.x;
        const dy = target.y - car.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 28) car.wp = (car.wp + 1) % WAYPOINTS.length;

        // desired angle (0 = up, clockwise positive)
        const desiredAngle = Math.atan2(dx, -dy);
        let diff = desiredAngle - car.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const noise = (Math.random() - 0.5) * 0.02;
        car.va += Math.sign(diff) * turnRate * 0.8 + noise;
        const speed = Math.sqrt(car.vx ** 2 + car.vy ** 2);
        if (speed < maxSpeed) {
          car.vx += Math.sin(car.angle) * accel * 0.85;
          car.vy -= Math.cos(car.angle) * accel * 0.85;
        }
      }

      // Speed cap
      const spd = Math.sqrt(car.vx ** 2 + car.vy ** 2);
      if (spd > maxSpeed) {
        car.vx = (car.vx / spd) * maxSpeed;
        car.vy = (car.vy / spd) * maxSpeed;
      }

      car.vx *= drag;
      car.vy *= drag;
      car.va *= angDrag;
      car.angle += car.va;
      car.lastX = car.x;
      car.x += car.vx;
      car.y += car.vy;

      // Grass slowdown — gentle, not instant death
      car.onGrass = !isOnTrack(car.x, car.y);
      if (car.onGrass) {
        car.vx *= 0.94;
        car.vy *= 0.94;
      }

      // Bounds clamp
      car.x = Math.max(10, Math.min(W - 10, car.x));
      car.y = Math.max(10, Math.min(H - 10, car.y));

      // Lap detection: cross finish line going left→right (increasing x)
      if (
        car.x > FINISH_X && car.lastX <= FINISH_X &&
        car.y > FINISH_Y_TOP && car.y < FINISH_Y_BOT &&
        s.raceStarted
      ) {
        car.finishedLap++;
        const now = s.elapsed;
        car.lapTimes.push(now - car.lapStart);
        car.lapStart = now;
        if (car.finishedLap >= TOTAL_LAPS) {
          car.finished = true;
          car.totalTime = now;
          s.finishCount++;
          car.finishOrder = s.finishCount;
          if (s.finishCount === 1) s.winnerTime = now;
        } else {
          car.lap = car.finishedLap + 1;
        }
      }
    }

    function loop(ts: number) {
      const s = stateRef.current;
      const dt = s.lastTime ? Math.min(ts - s.lastTime, 50) : 16;
      s.lastTime = ts;

      if (s.countdown > 0) {
        s.countdown -= dt;
        if (s.countdown <= 0) {
          s.raceStarted = true;
          s.elapsed = 0;
          s.cars.forEach(c => { c.lapStart = 0; c.lapTimes = []; });
        }
      } else {
        s.elapsed += dt;
      }

      if (s.raceStarted && !s.raceOver) {
        s.cars.forEach(car => updateCar(car, dt, s.keys, s));
        // Engine audio
        const player = s.cars[0];
        if (player) {
          const spd = Math.sqrt(player.vx ** 2 + player.vy ** 2);
          if (!engineOsc && spd > 0.1) startSprintEngine();
          updateSprintEngine(spd, 3.2);
        }
        if (s.finishCount >= 4) {
          s.raceOver = true;
          stopSprintEngine();
        }
        // Force-finish stragglers 10 seconds after winner
        if (s.finishCount >= 1 && s.finishCount < 4 && s.elapsed - s.winnerTime > 10000) {
          s.cars.forEach(car => {
            if (!car.finished) {
              car.finished = true;
              car.totalTime = s.elapsed;
              s.finishCount++;
              car.finishOrder = s.finishCount;
            }
          });
          s.raceOver = true;
          stopSprintEngine();
        }
      }

      // Draw
      ctx.drawImage(trackImg, 0, 0);
      s.cars.forEach(car => drawCar(ctx, car));
      drawHUD(ctx, s.cars[0], s.cars, s.elapsed, s.countdown, s.raceStarted);
      if (s.raceOver) drawResults(ctx, s.cars, restart);

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", e => onKey(e, true));
      window.removeEventListener("keyup", e => onKey(e, false));
      canvas.removeEventListener("click", onClick);
    };
  }, [restart]);

  return (
    <div
      style={{
        background: "#0d0d1a",
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          imageRendering: "pixelated",
          display: "block",
          cursor: "default",
        }}
      />
    </div>
  );
}
