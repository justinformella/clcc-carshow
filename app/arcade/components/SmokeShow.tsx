"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { initAudio, startEngine, updateEngine, stopEngine } from "@/lib/race-audio";
import { RaceCar, C, FONT, pageStyle, goldBtnStyle } from "@/lib/race-types";

const IVY_HALL_BG = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/ivy-hall.png`;
const IVY_HALL_LOGO = "https://vuwiucgxxaoygsyxqodk.supabase.co/storage/v1/object/public/pixel-art/8bit/sponsor-220ae348-821c-4f44-b318-dd325bbc1785.png";

type GamePhase = "arriving" | "visiting" | "burnout" | "launching" | "score";
type SmokeParticle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; radius: number; hot: boolean };

interface SmokeShowProps {
  playerCar: RaceCar;
  onBack: () => void;
  onGameEnd?: (data: { game: string; score: number; metadata?: Record<string, unknown> }) => void;
}

export default function SmokeShow({ playerCar, onBack, onGameEnd }: SmokeShowProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>("arriving");
  const [displayRpm, setDisplayRpm] = useState(0);
  const [peakRpm, setPeakRpm] = useState(0);
  const [showScore, setShowScore] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const carImgRef = useRef<HTMLImageElement | null>(null);
  const phaseRef = useRef<GamePhase>("arriving");
  const rpmRef = useRef(0);
  const peakRpmRef = useRef(0);
  const particlesRef = useRef<SmokeParticle[]>([]);
  const carXRef = useRef(-200); // car starts off screen left
  const burnoutStartRef = useRef(0);
  const driverXRef = useRef(0);
  const driverYRef = useRef(0);
  const driverPhaseRef = useRef<"hidden" | "exitCar" | "walkToFront" | "walkToDoor" | "inside" | "walkFromDoor" | "walkToCar" | "enterCar">("hidden");
  const driverFrameRef = useRef(0);
  const visitTimerRef = useRef(0);
  const launchDelayRef = useRef(0);
  const screechNodeRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode } | null>(null);

  const redline = playerCar.redline || 6500;

  // Preload images
  useEffect(() => {
    const bg = new Image(); bg.crossOrigin = "anonymous"; bg.src = IVY_HALL_BG;
    bgImgRef.current = bg;
    const car = new Image(); car.crossOrigin = "anonymous";
    if (playerCar.pixelArt) car.src = playerCar.pixelArt;
    carImgRef.current = car;
    initAudio();
  }, [playerCar]);

  // Draw driver as simple pixel character
  const drawDriver = useCallback((ctx: CanvasRenderingContext2D, x: number, groundY: number, facingLeft: boolean, frame: number) => {
    const w = 14, h = 30;
    const y = groundY - h;
    // Body
    ctx.fillStyle = "#4477cc"; // shirt
    ctx.fillRect(x - w / 2, y, w, 16);
    // Pants
    ctx.fillStyle = "#333";
    ctx.fillRect(x - w / 2, y + 16, w, 14);
    // Head
    ctx.fillStyle = "#dda";
    ctx.fillRect(x - 5, y - 10, 10, 10);
    // Hair
    ctx.fillStyle = "#432";
    ctx.fillRect(x - 5, y - 12, 10, 4);
    // Walking legs
    const legOffset = frame % 2 === 0 ? -4 : 4;
    ctx.fillStyle = "#222";
    ctx.fillRect(x + (facingLeft ? legOffset : -legOffset) - 2, y + 28, 5, 4);
  }, []);

  // Start tire screech sound
  const startScreech = useCallback(() => {
    if (screechNodeRef.current) return;
    try {
      const actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const bufferSize = actx.sampleRate * 2;
      const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
      const source = actx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = actx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 2000;
      filter.Q.value = 2;
      const gain = actx.createGain();
      gain.gain.value = 0;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);
      source.start();
      screechNodeRef.current = { source, gain };
    } catch { /* audio may not be available */ }
  }, []);

  const updateScreech = useCallback((rpm: number) => {
    const node = screechNodeRef.current;
    if (!node) return;
    const pct = Math.max(0, (rpm - 1500) / (redline - 1500));
    node.gain.gain.value = pct * 0.08;
  }, [redline]);

  const stopScreech = useCallback(() => {
    const node = screechNodeRef.current;
    if (node) {
      node.gain.gain.linearRampToValueAtTime(0, node.gain.context.currentTime + 0.3);
      setTimeout(() => { try { node.source.stop(); } catch {} }, 400);
      screechNodeRef.current = null;
    }
  }, []);

  // Handle tap/keypress for burnout
  const handleTap = useCallback(() => {
    if (phaseRef.current !== "burnout") return;
    const add = 270 + Math.random() * 280;
    rpmRef.current = Math.min(rpmRef.current + add, redline);
    if (rpmRef.current > peakRpmRef.current) peakRpmRef.current = rpmRef.current;
  }, [redline]);

  // Keyboard listener
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); handleTap(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleTap]);

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let frameCount = 0;
    const carW_pct = 0.35;
    const groundY_pct = 1.0;
    const buildingDoorX_pct = 0.5; // center of building
    const carStopX_pct = 0.38; // car stops left of center

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = canvas.width, H = canvas.height;
      const groundY = H * groundY_pct;

      // Background
      ctx.fillStyle = "#87CEEB";
      ctx.fillRect(0, 0, W, H);
      const bg = bgImgRef.current;
      if (bg?.complete && bg.naturalWidth > 0) {
        ctx.drawImage(bg, 0, 0, W, H);
      }

      // Car dimensions
      const carImg = carImgRef.current;
      let carW = 0, carH = 0, carX = carXRef.current, carY = 0;
      if (carImg?.complete && carImg.naturalWidth > 0) {
        carW = W * carW_pct;
        carH = carW * (carImg.height / carImg.width);
        carY = groundY - carH;

        // Phase logic
        const phase = phaseRef.current;

        if (phase === "arriving") {
          const targetX = W * carStopX_pct - carW / 2;
          if (carXRef.current < targetX) {
            if (carXRef.current === -200) { startEngine(); updateEngine(1200, 20); }
            carXRef.current += 3;
            if (carXRef.current >= targetX) {
              carXRef.current = targetX;
              updateEngine(800, 0);
              phaseRef.current = "visiting";
              driverPhaseRef.current = "exitCar";
              driverXRef.current = carXRef.current + carW * 0.7;
              driverYRef.current = groundY;
              visitTimerRef.current = 0;
            }
          }
          carX = carXRef.current;
        }

        if (phase === "visiting") {
          visitTimerRef.current++;
          const doorX = W * buildingDoorX_pct;
          const doorY = groundY - carH * 0.8; // up toward building entrance
          const frontOfCarX = carXRef.current + carW * 0.85;

          if (driverPhaseRef.current === "exitCar") {
            if (visitTimerRef.current > 20) {
              driverPhaseRef.current = "walkToFront";
              driverFrameRef.current = 0;
            }
          } else if (driverPhaseRef.current === "walkToFront") {
            // Walk right to the front of the car
            driverXRef.current += 2;
            driverFrameRef.current++;
            if (driverXRef.current >= frontOfCarX) {
              driverPhaseRef.current = "walkToDoor";
            }
          } else if (driverPhaseRef.current === "walkToDoor") {
            // Walk diagonally up toward the building door
            const dx = doorX - driverXRef.current;
            const dy = doorY - driverYRef.current;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 3) {
              const speed = 2.5;
              driverXRef.current += (dx / dist) * speed;
              driverYRef.current += (dy / dist) * speed;
              driverFrameRef.current++;
            } else {
              driverPhaseRef.current = "inside";
              visitTimerRef.current = 0;
            }
          } else if (driverPhaseRef.current === "inside") {
            if (visitTimerRef.current > 120) {
              driverPhaseRef.current = "walkFromDoor";
              driverXRef.current = doorX;
              driverYRef.current = doorY;
              driverFrameRef.current = 0;
            }
          } else if (driverPhaseRef.current === "walkFromDoor") {
            // Walk diagonally back down to front of car
            const dx = frontOfCarX - driverXRef.current;
            const dy = groundY - driverYRef.current;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 3) {
              const speed = 2.5;
              driverXRef.current += (dx / dist) * speed;
              driverYRef.current += (dy / dist) * speed;
              driverFrameRef.current++;
            } else {
              driverPhaseRef.current = "walkToCar";
              driverYRef.current = groundY;
            }
          } else if (driverPhaseRef.current === "walkToCar") {
            // Walk left back to car door
            driverXRef.current -= 2;
            driverFrameRef.current++;
            const carDoorX = carXRef.current + carW * 0.7;
            if (driverXRef.current <= carDoorX) {
              driverPhaseRef.current = "enterCar";
              visitTimerRef.current = 0;
            }
          } else if (driverPhaseRef.current === "enterCar") {
            if (visitTimerRef.current > 15) {
              driverPhaseRef.current = "hidden";
              phaseRef.current = "burnout";
              setGamePhase("burnout");
              burnoutStartRef.current = performance.now();
              rpmRef.current = 800;
              peakRpmRef.current = 800;
              startScreech();
            }
          }
        }

        if (phase === "burnout") {
          // RPM decay
          rpmRef.current = Math.max(800, rpmRef.current - 28);
          updateEngine(rpmRef.current, (rpmRef.current / redline) * 100);
          updateScreech(rpmRef.current);
          setDisplayRpm(Math.round(rpmRef.current));

          // Spawn smoke based on RPM
          const spawnRate = Math.floor(rpmRef.current / 400);
          // FWD smokes front tires, RWD/AWD smokes rear tires
          const isFWD = playerCar.driveType?.toUpperCase() === "FWD";
          const tireX = isFWD ? carX + carW * 0.75 - 20 : carX + carW * 0.15;
          const tireY = carY + carH * 0.75 - 10;
          for (let i = 0; i < spawnRate; i++) {
            const hot = rpmRef.current > redline * 0.8 && Math.random() < 0.2;
            particlesRef.current.push({
              x: tireX + (Math.random() - 0.5) * 40,
              y: tireY + (Math.random() - 0.5) * 30,
              vx: -(1 + Math.random() * 3),
              vy: -(0.3 + Math.random() * 2.5),
              life: 60 + Math.random() * 60,
              maxLife: 120,
              radius: 5 + Math.random() * 10,
              hot,
            });
          }

          // Auto-end after 8 seconds or redline held for 1s
          const elapsed = (performance.now() - burnoutStartRef.current) / 1000;
          if (elapsed > 8 || (rpmRef.current >= redline * 0.98 && elapsed > 3)) {
            phaseRef.current = "launching";
            setGamePhase("launching");
            launchDelayRef.current = 0;
            stopScreech();
            setPeakRpm(peakRpmRef.current);
          }
        }

        if (phase === "launching") {
          launchDelayRef.current++;
          // Sit and smoke for 90 frames (~1.5s) before peeling out
          if (launchDelayRef.current > 90) {
            carXRef.current += Math.min(launchDelayRef.current - 90, 20);
          }
          carX = carXRef.current;
          updateEngine(redline, 100);

          // Trailing smoke — same height as burnout smoke
          const isFWD = playerCar.driveType?.toUpperCase() === "FWD";
          const tireX = isFWD ? carX + carW * 0.75 - 20 : carX + carW * 0.15;
          const tireY = carY + carH * 0.75 - 10;
          for (let i = 0; i < 10; i++) {
            particlesRef.current.push({
              x: tireX + (Math.random() - 0.5) * 40, y: tireY + (Math.random() - 0.5) * 30,
              vx: -4 - Math.random() * 4,
              vy: -(Math.random() * 3),
              life: 70 + Math.random() * 50,
              maxLife: 120,
              radius: 6 + Math.random() * 12,
              hot: Math.random() < 0.15,
            });
          }

          if (carXRef.current > W + 100) {
            stopEngine();
            phaseRef.current = "score";
            setGamePhase("score");
            setShowScore(true);
          }
        }

        // Draw car
        if (carX > -carW && carX < W + carW) {
          ctx.save();
          if (playerCar.flipped) {
            ctx.translate(carX + carW, carY);
            ctx.scale(-1, 1);
            ctx.drawImage(carImg, 0, 0, carW, carH);
          } else {
            ctx.drawImage(carImg, carX, carY, carW, carH);
          }
          ctx.restore();
        }

        // Draw driver
        const dPhase = driverPhaseRef.current;
        if (dPhase !== "hidden" && dPhase !== "inside") {
          const facingLeft = dPhase === "walkFromDoor" || dPhase === "walkToCar" || dPhase === "enterCar";
          drawDriver(ctx, driverXRef.current, driverYRef.current, facingLeft, Math.floor(driverFrameRef.current / 8));
        }
      }

      // Draw smoke particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.radius += 0.05;
        p.life--;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        const alpha = (p.life / p.maxLife) * 0.6;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.hot ? "#ff6622" : `rgb(${150 + Math.random() * 50}, ${150 + Math.random() * 50}, ${150 + Math.random() * 50})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // RPM gauge (during burnout)
      if (phaseRef.current === "burnout") {
        const gaugeH = 8, gaugeY = 8, gaugeX = 12, gaugeW = W - 24;
        const fill = Math.max(0, rpmRef.current / redline);
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);
        ctx.fillStyle = fill < 0.6 ? "#22cc22" : fill < 0.85 ? "#ddcc00" : "#ee2222";
        ctx.fillRect(gaugeX, gaugeY, gaugeW * fill, gaugeH);
        ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
        ctx.strokeRect(gaugeX, gaugeY, gaugeW, gaugeH);
      }

      frameCount++;
      animRef.current = requestAnimationFrame(draw);
    };

    phaseRef.current = "arriving";
    carXRef.current = -200;
    particlesRef.current = [];
    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      stopEngine();
      stopScreech();
    };
  }, [playerCar, redline, drawDriver, startScreech, updateScreech, stopScreech]);

  // Score calculations
  const score = Math.round((peakRpm / redline) * 100);
  const label = score >= 90 ? "LEGENDARY BURNOUT" : score >= 70 ? "SOLID SMOKE SHOW" : score >= 50 ? "DECENT BURNOUT" : "WEAK";
  const labelColor = score >= 70 ? C.gold : score >= 50 ? C.white : C.midGray;

  return (
    <div style={pageStyle}>
      <div style={{ textAlign: "center", marginBottom: "0.25rem" }}>
        <a href="https://www.ivyhallil.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "inline-block" }}>
          <img src={IVY_HALL_LOGO} alt="Ivy Hall" style={{ maxWidth: "180px", height: "auto", imageRendering: "pixelated", display: "block", margin: "0 auto 0.3rem" }} />
          <p style={{ fontFamily: FONT, fontSize: "clamp(0.9rem, 2.5vw, 1.3rem)", color: "#2d6b2d", margin: "0" }}>SMOKE SHOW AT IVY HALL</p>
        </a>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={450}
        onClick={handleTap}
        style={{ width: "100%", maxWidth: "800px", display: "block", margin: "0 auto", imageRendering: "pixelated", border: `1px solid ${C.border}`, cursor: gamePhase === "burnout" ? "pointer" : "default", touchAction: "none" }}
      />

      {gamePhase === "burnout" && (
        <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "1.5rem", color: displayRpm > redline * 0.88 ? C.red : C.gold, textShadow: displayRpm > redline * 0.88 ? "0 0 10px rgba(255,0,0,0.5)" : "none", margin: "0" }}>
            {displayRpm} <span style={{ fontSize: "0.7rem", color: C.midGray }}>RPM</span>
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.6rem", color: C.green, marginTop: "0.3rem", animation: "blink8bit 0.5s step-end infinite" }}>
            TAP TO BURN OUT
          </p>
          <style>{`@keyframes blink8bit { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
          <button
            onClick={handleTap}
            style={{ ...goldBtnStyle, padding: "1rem 3rem", fontSize: "1.2rem", marginTop: "0.5rem", background: "#ee2222", border: "3px solid #aa0000", color: "#fff" }}
          >
            TAP!
          </button>
        </div>
      )}

      {gamePhase === "arriving" && (
        <p style={{ fontFamily: FONT, fontSize: "0.5rem", color: C.midGray, textAlign: "center", marginTop: "0.5rem" }}>Pulling up to Ivy Hall...</p>
      )}

      {gamePhase === "visiting" && (
        <p style={{ fontFamily: FONT, fontSize: "0.5rem", color: C.midGray, textAlign: "center", marginTop: "0.5rem" }}>Quick stop inside...</p>
      )}

      {showScore && (
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "2rem", color: C.gold, textShadow: score >= 90 ? "0 0 15px rgba(255,215,0,0.5)" : "none" }}>
            {score}%<span style={{ fontSize: "0.8rem", color: C.midGray }}> SMOKE SHOW</span>
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: labelColor, marginTop: "0.3rem", letterSpacing: "0.15em" }}>{label}</p>
          {onGameEnd && (
            <button
              onClick={() => { cancelAnimationFrame(animRef.current); stopEngine(); stopScreech(); onGameEnd({ game: "smokeshow", score, metadata: { peakRpm, redline } }); }}
              style={{ ...goldBtnStyle, marginTop: "1rem", background: "#22c55e", border: "2px solid #166534" }}
            >
              SAVE SCORE
            </button>
          )}
        </div>
      )}

      <button
        onClick={() => { cancelAnimationFrame(animRef.current); stopEngine(); stopScreech(); onBack(); }}
        style={{ background: "none", border: "none", color: C.midGray, fontFamily: FONT, fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline", marginTop: "1.5rem", display: "block", margin: "1.5rem auto 0" }}
      >
        BACK TO GARAGE
      </button>
    </div>
  );
}
