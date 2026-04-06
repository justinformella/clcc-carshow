"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { initAudio, getAudioContext, startEngine, updateEngine, stopEngine, stopAll } from "@/lib/race-audio";
import { quarterMileET, trapSpeedMPH } from "@/lib/race-physics";
import { RaceCar, C, FONT, pageStyle, goldBtnStyle } from "@/lib/race-types";

const DYNO_ROOM_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pixel-art/urw-dyno-room.png`;

interface DynoRoomProps {
  playerCar: RaceCar;
  onBack: () => void;
}

function DynoResults({ specs }: { specs: { label: string; value: string }[] }) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (revealed >= specs.length) return;
    const timer = setTimeout(() => {
      // Click sound — reuse existing AudioContext
      try {
        const actx = getAudioContext();
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.frequency.value = 80;
        osc.type = "square";
        gain.gain.value = 0.12;
        osc.start();
        osc.stop(actx.currentTime + 0.05);
      } catch { /* audio may not be available */ }
      setRevealed((r) => r + 1);
    }, 400);
    return () => clearTimeout(timer);
  }, [revealed, specs.length]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", maxWidth: "420px", margin: "1rem auto" }}>
      {specs.map((s, i) => (
        <div
          key={s.label}
          style={{
            padding: "0.7rem",
            background: i < revealed ? "rgba(255,215,0,0.06)" : "transparent",
            border: `1px solid ${i < revealed ? "#b8860b" : C.border}`,
            opacity: i < revealed ? 1 : 0.15,
            transition: "all 0.3s ease",
            gridColumn: i === specs.length - 1 && specs.length % 2 !== 0 ? "1 / -1" : undefined,
          }}
        >
          <div style={{ fontFamily: FONT, fontSize: "0.55rem", color: C.midGray, marginBottom: "0.25rem" }}>{s.label}</div>
          <div style={{ fontFamily: FONT, fontSize: "0.95rem", color: C.gold }}>{i < revealed ? s.value : "---"}</div>
        </div>
      ))}
    </div>
  );
}

export default function DynoRoom({ playerCar, onBack }: DynoRoomProps) {
  const [dynoState, setDynoState] = useState<"idle" | "pulling" | "results">("idle");
  const [dynoRpm, setDynoRpm] = useState(0);
  const [dynoGear, setDynoGear] = useState(1);
  const [revealCount, setRevealCount] = useState(0);
  const dynoCanvasRef = useRef<HTMLCanvasElement>(null);
  const dynoAnimRef = useRef<number>(0);
  const dynoCarImgRef = useRef<HTMLImageElement | null>(null);
  const dynoBgImgRef = useRef<HTMLImageElement | null>(null);

  const startDynoPull = useCallback(() => {
    if (!playerCar) return;
    setDynoState("pulling");
    startEngine();

    const redline = playerCar.redline || 6500;
    // Gear shift logic: shift through actual gears, max 4 gears used
    const numGears = Math.max(2, Math.min(playerCar.gears || 4, 4));
    const numShifts = numGears - 1; // 2-speed = 1 shift, 3-speed = 2, 4+ = 3
    const gearsUsed = numGears;
    const GEAR_MS = 1800; // time per gear pull
    const SHIFT_MS = 300; // brief RPM drop during shift
    const RAMP_MS = gearsUsed * GEAR_MS + numShifts * SHIFT_MS;
    const PEAK_MS = 1000;
    const COOL_MS = 500;
    const totalMs = RAMP_MS + PEAK_MS + COOL_MS;
    const pullStart = performance.now();
    const particles: { x: number; y: number; vx: number; vy: number; life: number; hot: boolean }[] = [];
    // RPM drop point after shift (drops to this fraction of redline)
    const SHIFT_DROP = 0.45;

    const draw = (now: number) => {
      const canvas = dynoCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      const elapsed = now - pullStart;

      // RPM calculation with gear shifts
      let rpm = 0;
      let currentGear = 1;
      let done = false;
      if (elapsed < RAMP_MS) {
        // Walk through gear segments to find current position
        let remaining = elapsed;
        let gear = 0;
        let inShift = false;
        for (let g = 0; g < gearsUsed; g++) {
          if (remaining < GEAR_MS) {
            gear = g;
            break;
          }
          remaining -= GEAR_MS;
          if (g < gearsUsed - 1) {
            if (remaining < SHIFT_MS) {
              // In shift gap between gear g and g+1
              gear = g;
              inShift = true;
              break;
            }
            remaining -= SHIFT_MS;
          }
          gear = g + 1;
        }
        currentGear = gear + 1;
        if (inShift) {
          // RPM drops during shift
          const shiftProgress = remaining / SHIFT_MS;
          rpm = redline * (1 - shiftProgress * (1 - SHIFT_DROP)) ;
          currentGear = gear + 2; // show next gear during shift
        } else {
          // Normal pull within a gear
          const gearProgress = Math.min(remaining / GEAR_MS, 1);
          const eased = gearProgress < 0.5
            ? 2 * gearProgress * gearProgress
            : 1 - Math.pow(-2 * gearProgress + 2, 2) / 2;
          const low = gear === 0 ? 800 : redline * SHIFT_DROP;
          rpm = low + (redline - low) * eased;
        }
      } else if (elapsed < RAMP_MS + PEAK_MS) {
        rpm = redline;
        currentGear = gearsUsed;
      } else if (elapsed < totalMs) {
        rpm = redline * (1 - (elapsed - RAMP_MS - PEAK_MS) / COOL_MS);
        currentGear = gearsUsed;
      } else {
        rpm = 0;
        done = true;
      }

      setDynoRpm(Math.round(rpm));
      setDynoGear(currentGear);
      if (!done) updateEngine(rpm, (rpm / redline) * 100);

      // Clear + background
      ctx.fillStyle = "#0d0d1a";
      ctx.fillRect(0, 0, W, H);
      if (dynoBgImgRef.current?.complete) {
        ctx.globalAlpha = 0.8;
        ctx.drawImage(dynoBgImgRef.current, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      // Car sprite — sits on the dyno floor (background handles the rollers)
      const groundY = H * 0.95; // bottom of car aligns with dyno rollers
      const carCX = W * 0.58; // center over the dyno pit
      const carImg = dynoCarImgRef.current;
      if (carImg?.complete) {
        const carW = W * 0.4;
        const carH = carW * (carImg.height / carImg.width);
        const vibFreq = 8 + (rpm / redline) * 17;
        const vibAmp = 0.5 + (rpm / redline) * 3.5;
        const vibY = Math.sin(elapsed * vibFreq / 100) * vibAmp;
        const carX = carCX - carW / 2;
        const carY = groundY - carH + vibY;

        ctx.save();
        if (playerCar.flipped) {
          ctx.translate(carX + carW, carY);
          ctx.scale(-1, 1);
          ctx.drawImage(carImg, 0, 0, carW, carH);
        } else {
          ctx.drawImage(carImg, carX, carY, carW, carH);
        }
        ctx.restore();

        // Exhaust particles
        const exhaustX = playerCar.flipped ? carX + carW + 3 : carX - 3;
        const exhaustDir = playerCar.flipped ? 1 : -1;
        const spawnChance = 0.02 + (rpm / redline) * 0.08;
        if (!done && Math.random() < spawnChance) {
          particles.push({
            x: exhaustX,
            y: carY + carH * 0.65,
            vx: exhaustDir * (1 + Math.random() * 2.5),
            vy: -(0.3 + Math.random() * 0.8),
            life: 25 + Math.random() * 10,
            hot: rpm > redline * 0.8 && Math.random() < 0.25,
          });
        }
      }

      // Update + draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        const alpha = p.life / 35;
        const radius = 1.5 + (1 - p.life / 35) * 3;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.hot ? "#ff6622" : "#777";
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // RPM gauge bar
      const gaugeH = 6;
      const gaugeY = H - gaugeH - 6;
      const gaugeX = 12;
      const gaugeW = W - 24;
      const fill = Math.max(0, rpm / redline);
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);
      ctx.fillStyle = fill < 0.6 ? "#22cc22" : fill < 0.85 ? "#ddcc00" : "#ee2222";
      ctx.fillRect(gaugeX, gaugeY, gaugeW * fill, gaugeH);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.strokeRect(gaugeX, gaugeY, gaugeW, gaugeH);

      if (done) {
        stopEngine();
        setDynoState("results");
        setRevealCount(0);
        return;
      }

      dynoAnimRef.current = requestAnimationFrame(draw);
    };

    dynoAnimRef.current = requestAnimationFrame(draw);
  }, [playerCar]);

  // Draw idle dyno canvas when entering dyno phase
  useEffect(() => {
    initAudio();
    setDynoState("idle");
    setDynoRpm(0);
    setRevealCount(0);

    // Preload images
    const carImg = new Image();
    carImg.crossOrigin = "anonymous";
    if (playerCar.pixelArt) carImg.src = playerCar.pixelArt;
    dynoCarImgRef.current = carImg;

    const bgImg = new Image();
    bgImg.crossOrigin = "anonymous";
    bgImg.src = DYNO_ROOM_URL;
    dynoBgImgRef.current = bgImg;

    const drawIdle = () => {
      const canvas = dynoCanvasRef.current;
      if (!canvas) { requestAnimationFrame(drawIdle); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = canvas.width;
      const H = canvas.height;

      ctx.fillStyle = "#0d0d1a";
      ctx.fillRect(0, 0, W, H);

      if (bgImg.complete) {
        ctx.globalAlpha = 0.8;
        ctx.drawImage(bgImg, 0, 0, W, H);
        ctx.globalAlpha = 1;
      } else {
        bgImg.onload = () => requestAnimationFrame(drawIdle);
        return;
      }

      // Car — sits on the dyno floor
      const groundY = H * 0.95;
      const carCX = W * 0.58;
      if (carImg.complete) {
        const carW = W * 0.4;
        const carH = carW * (carImg.height / carImg.width);
        const carX = carCX - carW / 2;
        const carY = groundY - carH;
        ctx.save();
        if (playerCar.flipped) {
          ctx.translate(carX + carW, carY);
          ctx.scale(-1, 1);
          ctx.drawImage(carImg, 0, 0, carW, carH);
        } else {
          ctx.drawImage(carImg, carX, carY, carW, carH);
        }
        ctx.restore();
      } else {
        carImg.onload = () => requestAnimationFrame(drawIdle);
      }
    };
    requestAnimationFrame(drawIdle);

    return () => { cancelAnimationFrame(dynoAnimRef.current); stopEngine(); };
  }, [playerCar]);

  const specs = dynoState === "results" ? [
    { label: "HORSEPOWER", value: `${playerCar.hp} HP` },
    { label: "ENGINE", value: `${playerCar.displacement}L ${playerCar.engineType}` },
    { label: "REDLINE", value: `${playerCar.redline.toLocaleString()} RPM` },
    { label: "WEIGHT", value: `${playerCar.weight.toLocaleString()} LBS` },
    { label: "POWER/WEIGHT", value: `${playerCar.pwr} HP/TON` },
    { label: "DRIVETRAIN", value: `${playerCar.driveType} · ${playerCar.gears}-SPD ${playerCar.trans.toUpperCase()}` },
    { label: "1/4 MILE", value: `${quarterMileET(playerCar.hp, playerCar.weight, playerCar.year, playerCar.trans, playerCar.gears).toFixed(1)}s` },
    { label: "TRAP SPEED", value: `${Math.round(trapSpeedMPH(playerCar.hp, playerCar.weight, playerCar.year))} MPH` },
    { label: "TOP SPEED", value: `${playerCar.topSpeed} MPH` },
  ] : [];

  return (
    <div style={pageStyle}>
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <p style={{ fontFamily: FONT, fontSize: "0.6rem", color: C.midGray, letterSpacing: "0.2em" }}>URW AUTOMOTIVE</p>
        <h1 style={{ fontFamily: FONT, fontSize: "clamp(0.9rem, 2.5vw, 1.3rem)", color: C.gold, margin: "0.25rem 0" }}>DYNO ROOM</h1>
        <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: C.white }}>{playerCar.name}</p>
      </div>

      <canvas
        ref={dynoCanvasRef}
        width={800}
        height={400}
        style={{ width: "100%", maxWidth: "800px", margin: "0 auto", display: "block", imageRendering: "pixelated", borderRadius: "6px", border: `2px solid ${C.border}` }}
      />

      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        {dynoState === "idle" && (
          <button onClick={startDynoPull} style={{ ...goldBtnStyle, padding: "0.8rem 2.5rem", fontSize: "1rem" }}>
            START DYNO
          </button>
        )}

        {dynoState === "pulling" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: FONT, fontSize: "1.5rem", color: dynoRpm > (playerCar.redline || 6500) * 0.88 ? C.red : C.gold, textShadow: dynoRpm > (playerCar.redline || 6500) * 0.88 ? "0 0 10px rgba(255,0,0,0.5)" : "none", margin: 0 }}>
              {dynoRpm} <span style={{ fontSize: "0.7rem", color: C.midGray }}>RPM</span>
            </p>
            <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: C.midGray, margin: "0.3rem 0 0" }}>
              GEAR {dynoGear}
            </p>
          </div>
        )}

        {dynoState === "results" && (
          <DynoResults specs={specs} />
        )}

        <button
          onClick={() => { cancelAnimationFrame(dynoAnimRef.current); stopEngine(); setDynoState("idle"); onBack(); }}
          style={{ background: "none", border: "none", color: C.midGray, fontFamily: FONT, fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline", marginTop: "1.5rem", display: "block", margin: "1.5rem auto 0" }}
        >
          BACK TO GARAGE
        </button>

        {dynoState === "results" && (
          <a
            href={`/contact?subject=${encodeURIComponent(`Stats issue: #${playerCar.carNumber} ${playerCar.year} ${playerCar.name}`)}&message=${encodeURIComponent(`I noticed an issue with the stats for car #${playerCar.carNumber} (${playerCar.year} ${playerCar.name}):\n\n`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: FONT, fontSize: "0.5rem", color: C.midGray, textDecoration: "underline", marginTop: "1.5rem", display: "block", textAlign: "center" }}
          >
            STATS WRONG? REPORT AN ISSUE
          </a>
        )}
      </div>
    </div>
  );
}
