"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, useRef, useCallback, useEffect } from "react";
import { initAudio, startEngine, updateEngine, stopEngine } from "@/lib/race-audio";
import { RaceCar, C, FONT, pageStyle, goldBtnStyle, pixelBtnStyle } from "@/lib/race-types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CIDEAS_LOGO = `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/sponsor-4648a9cf-2b29-4b32-9dc9-7d07ad4316e0.png`;

const CANVAS_W = 800;
const CANVAS_H = 450;
const GRID_SIZE = 8; // pixel size in canvas units
const COLS = Math.floor(CANVAS_W / GRID_SIZE); // 100
const ROWS = Math.floor(CANVAS_H / GRID_SIZE); // 56
const MAX_PIXELS = 120; // filament budget

const FILAMENT_COLORS = ["#00ccff", "#ff4444", "#44ff44", "#ffcc00", "#ff66ff"];

// Aero zones — each pixel placed here generates downforce (lbs)
// Higher value = more effective placement for generating downforce
function getDownforcePerPixel(col: number, row: number, carBounds: { left: number; right: number; top: number; bottom: number }): number {
  const { left, right, top, bottom } = carBounds;
  const carWidth = right - left;
  const carHeight = bottom - top;

  // Above car rear (rear wing/spoiler zone) — most effective: pushes rear down
  if (col >= left && col <= left + carWidth * 0.35 && row >= top - 6 && row < top) return 5;
  // Below car front (front splitter) — very effective: creates front downforce
  if (col >= right - carWidth * 0.35 && col <= right + 2 && row > bottom && row <= bottom + 4) return 4;
  // Below car rear (rear diffuser) — very effective: accelerates air under car
  if (col >= left - 2 && col <= left + carWidth * 0.4 && row > bottom && row <= bottom + 4) return 4;
  // Along car bottom (side skirts/floor) — good: seals underbody airflow
  if (col >= left && col <= right && row >= bottom - 1 && row <= bottom + 2) return 3;
  // Front of car (canards/dive planes) — good: directs air around wheels
  if (col >= right - 4 && col <= right + 3 && row >= top + carHeight * 0.2 && row <= bottom) return 3;
  // Above car front (hood vents) — moderate
  if (col >= right - carWidth * 0.5 && col <= right && row >= top - 4 && row < top) return 2;
  // Near car sides — mild
  if (col >= left - 4 && col <= right + 4 && row >= top - 8 && row <= bottom + 5) return 1;
  // Far from car — no aero effect
  return 0;
}

// Get zone label for tooltip
function getZoneLabel(col: number, row: number, carBounds: { left: number; right: number; top: number; bottom: number }): string {
  const { left, right, top, bottom } = carBounds;
  const carWidth = right - left;
  const carHeight = bottom - top;
  if (col >= left && col <= left + carWidth * 0.35 && row >= top - 6 && row < top) return "REAR WING";
  if (col >= right - carWidth * 0.35 && col <= right + 2 && row > bottom && row <= bottom + 4) return "FRONT SPLITTER";
  if (col >= left - 2 && col <= left + carWidth * 0.4 && row > bottom && row <= bottom + 4) return "REAR DIFFUSER";
  if (col >= left && col <= right && row >= bottom - 1 && row <= bottom + 2) return "SIDE SKIRTS";
  if (col >= right - 4 && col <= right + 3 && row >= top + carHeight * 0.2 && row <= bottom) return "CANARDS";
  if (col >= right - carWidth * 0.5 && col <= right && row >= top - 4 && row < top) return "HOOD VENTS";
  return "";
}

type WindParticle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number };
type GamePhase = "arriving" | "designing" | "testing" | "results";

interface WindTunnelProps {
  playerCar: RaceCar;
  onBack: () => void;
  onGameEnd?: (data: { game: string; score: number; metadata?: Record<string, unknown> }) => void;
}

export default function WindTunnel({ playerCar, onBack, onGameEnd }: WindTunnelProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>("arriving");
  const [grid, setGrid] = useState<(string | null)[][]>(() => Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
  const [filamentColor, setFilamentColor] = useState(FILAMENT_COLORS[0]);
  const [pixelsUsed, setPixelsUsed] = useState(0);
  const [score, setScore] = useState(0);
  const [totalDownforce, setTotalDownforce] = useState(0);
  const [testProgress, setTestProgress] = useState(0);
  const [isErasing, setIsErasing] = useState(false);
  const [isPainting, setIsPainting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const carImgRef = useRef<HTMLImageElement | null>(null);
  const phaseRef = useRef<GamePhase>("arriving");
  const carXRef = useRef(-200);
  const particlesRef = useRef<WindParticle[]>([]);
  const testStartRef = useRef(0);
  const carGridBoundsRef = useRef({ left: 0, right: 0, top: 0, bottom: 0 });
  const gridRef = useRef(grid);
  gridRef.current = grid;

  useEffect(() => {
    const car = new Image(); car.crossOrigin = "anonymous";
    if (playerCar.pixelArt) car.src = playerCar.pixelArt;
    carImgRef.current = car;
    initAudio();
  }, [playerCar]);

  // Calculate current downforce from grid placement
  const calcResults = useCallback(() => {
    const bounds = carGridBoundsRef.current;
    let df = 0;
    let placed = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (gridRef.current[r][c]) {
          placed++;
          df += getDownforcePerPixel(c, r, bounds);
        }
      }
    }
    // Max possible = all pixels in the best zones (5 lbs each)
    const maxPossible = MAX_PIXELS * 5;
    const pct = maxPossible > 0 ? Math.min(100, Math.round((df / maxPossible) * 100)) : 0;
    return { score: pct, downforce: df, placed };
  }, []);

  // Paint/erase a cell
  const paintCell = useCallback((col: number, row: number) => {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      if (isErasing) {
        if (next[row][col]) {
          next[row][col] = null;
          setPixelsUsed((p) => p - 1);
        }
      } else {
        if (!next[row][col] && pixelsUsed < MAX_PIXELS) {
          next[row][col] = filamentColor;
          setPixelsUsed((p) => p + 1);
        } else if (next[row][col]) {
          // Replace color
          next[row][col] = filamentColor;
        }
      }
      return next;
    });
  }, [isErasing, filamentColor, pixelsUsed]);

  const getGridCell = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return { col: Math.floor(x / GRID_SIZE), row: Math.floor(y / GRID_SIZE) };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (gamePhase !== "designing") return;
    e.preventDefault();
    setIsPainting(true);
    const cell = getGridCell(e);
    if (cell) paintCell(cell.col, cell.row);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPainting || gamePhase !== "designing") return;
    e.preventDefault();
    const cell = getGridCell(e);
    if (cell) paintCell(cell.col, cell.row);
  };

  const handlePointerUp = () => { setIsPainting(false); };

  useEffect(() => {
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchend", handlePointerUp);
    return () => { window.removeEventListener("mouseup", handlePointerUp); window.removeEventListener("touchend", handlePointerUp); };
  }, []);

  const startTest = () => {
    phaseRef.current = "testing";
    setGamePhase("testing");
    testStartRef.current = performance.now();
    particlesRef.current = [];
    startEngine();
    updateEngine(3000, 50);
  };

  const clearGrid = () => {
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
    setPixelsUsed(0);
  };

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = CANVAS_W, H = CANVAS_H;
      const floorY = H * 0.82;

      // Background — 2D side-view tunnel
      ctx.fillStyle = "#0d0d1a";
      ctx.fillRect(0, 0, W, H);

      // Tunnel walls
      const ceilingY = H * 0.06;
      ctx.fillStyle = "#141428";
      ctx.fillRect(0, ceilingY, W, floorY - ceilingY);
      // Ceiling line
      ctx.fillStyle = "#1e1e3a";
      ctx.fillRect(0, ceilingY, W, 4);
      // Floor
      ctx.fillStyle = "#1a1a30";
      ctx.fillRect(0, floorY, W, H - floorY);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(W, floorY); ctx.stroke();

      // Fan at right
      const fanCX = W - 25;
      const fanCY = (ceilingY + floorY) / 2;
      const fanR = (floorY - ceilingY) / 2 - 8;
      ctx.strokeStyle = "rgba(80,130,180,0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(fanCX, fanCY, fanR, 0, Math.PI * 2); ctx.stroke();
      for (let a = 0; a < 6; a++) {
        const angle = (a / 6) * Math.PI * 2 + performance.now() * 0.002;
        ctx.beginPath();
        ctx.moveTo(fanCX, fanCY);
        ctx.lineTo(fanCX + Math.cos(angle) * fanR * 0.85, fanCY + Math.sin(angle) * fanR * 0.85);
        ctx.stroke();
      }

      // Car
      const carImg = carImgRef.current;
      const phase = phaseRef.current;

      if (carImg?.complete && carImg.naturalWidth > 0) {
        const carW = W * 0.45;
        const carH = carW * (carImg.height / carImg.width);
        const carTargetX = W * 0.27 - carW / 2;
        const carY = floorY - carH + carH * 0.06;

        if (phase === "arriving") {
          if (carXRef.current === -200) { startEngine(); updateEngine(1200, 20); }
          carXRef.current += 3;
          if (carXRef.current >= carTargetX) {
            carXRef.current = carTargetX;
            stopEngine();
            phaseRef.current = "designing";
            setGamePhase("designing");
          }
        }

        const carX = Math.min(carXRef.current, carTargetX);

        // Store car bounds in grid units
        carGridBoundsRef.current = {
          left: Math.floor(carX / GRID_SIZE),
          right: Math.floor((carX + carW) / GRID_SIZE),
          top: Math.floor(carY / GRID_SIZE),
          bottom: Math.floor((carY + carH) / GRID_SIZE),
        };

        // Draw car
        ctx.save();
        if (playerCar.flipped) {
          ctx.translate(carX + carW, carY);
          ctx.scale(-1, 1);
          ctx.drawImage(carImg, 0, 0, carW, carH);
        } else {
          ctx.drawImage(carImg, carX, carY, carW, carH);
        }
        ctx.restore();

        // Draw filled grid pixels
        const currentGrid = gridRef.current;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (currentGrid[r][c]) {
              ctx.fillStyle = currentGrid[r][c]!;
              ctx.fillRect(c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            }
          }
        }

        // Draw grid overlay in designing phase
        if (phase === "designing") {
          ctx.strokeStyle = "rgba(255,255,255,0.08)";
          ctx.lineWidth = 0.5;
          for (let c = 0; c <= COLS; c++) {
            ctx.beginPath(); ctx.moveTo(c * GRID_SIZE, 0); ctx.lineTo(c * GRID_SIZE, H); ctx.stroke();
          }
          for (let r = 0; r <= ROWS; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * GRID_SIZE); ctx.lineTo(W, r * GRID_SIZE); ctx.stroke();
          }

          // Highlight aero zones — brighter = more downforce per pixel
          const bounds = carGridBoundsRef.current;
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              if (currentGrid[r][c]) continue;
              const df = getDownforcePerPixel(c, r, bounds);
              if (df >= 4) {
                ctx.fillStyle = "rgba(0,200,255,0.1)";
                ctx.fillRect(c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE);
              } else if (df >= 3) {
                ctx.fillStyle = "rgba(0,200,255,0.06)";
                ctx.fillRect(c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE);
              } else if (df >= 2) {
                ctx.fillStyle = "rgba(0,200,255,0.03)";
                ctx.fillRect(c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE);
              }
            }
          }

          // Zone labels
          ctx.font = '7px "Press Start 2P"';
          ctx.fillStyle = "rgba(0,200,255,0.25)";
          const rearWingY = (bounds.top - 4) * GRID_SIZE;
          const rearWingX = (bounds.left + 2) * GRID_SIZE;
          if (rearWingY > 0) ctx.fillText("REAR WING", rearWingX, rearWingY);
          const splitterX = (bounds.right - 6) * GRID_SIZE;
          const splitterY = (bounds.bottom + 3) * GRID_SIZE;
          if (splitterY < H) ctx.fillText("SPLITTER", splitterX, splitterY);
          const diffuserX = (bounds.left) * GRID_SIZE;
          ctx.fillText("DIFFUSER", diffuserX, splitterY);

          // Live downforce readout on canvas
          const liveResults = calcResults();
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillRect(W - 200, 8, 190, 30);
          ctx.font = '9px "Press Start 2P"';
          ctx.fillStyle = "#66ccff";
          ctx.fillText("DOWNFORCE: +" + liveResults.downforce + " LBS", W - 192, 28);
        }

        // Wind test particles
        if (phase === "testing") {
          const elapsed = (performance.now() - testStartRef.current) / 1000;
          const progress = Math.min(1, elapsed / 5);
          setTestProgress(progress);

          for (let i = 0; i < 6; i++) {
            particlesRef.current.push({
              x: W + 5, y: ceilingY + Math.random() * (floorY - ceilingY),
              vx: -(3 + Math.random() * 3), vy: 0,
              life: 100 + Math.random() * 50, maxLife: 150,
            });
          }

          const particles = particlesRef.current;
          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];

            // Deflect around car and filled pixels
            const gc = Math.floor(p.x / GRID_SIZE);
            const gr = Math.floor(p.y / GRID_SIZE);
            const hitCar = p.x > carX && p.x < carX + carW && p.y > carY && p.y < carY + carH;
            const hitPixel = gc >= 0 && gc < COLS && gr >= 0 && gr < ROWS && currentGrid[gr][gc];

            if (hitCar || hitPixel) {
              const centerY = hitCar ? carY + carH / 2 : gr * GRID_SIZE + GRID_SIZE / 2;
              p.vy += p.y < centerY ? -1.5 : 1.5;
              p.vx *= 0.94;
            }

            p.x += p.vx; p.y += p.vy; p.vy *= 0.96; p.life--;
            if (p.life <= 0 || p.x < -10) { particles.splice(i, 1); continue; }

            const alpha = Math.min(1, p.life / p.maxLife) * 0.4;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = "#5599cc";
            ctx.lineWidth = 1.5;
            const len = Math.min(10, Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 1.5);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + len * (p.vx > 0 ? 1 : -1), p.y + (p.vy / Math.max(1, Math.abs(p.vx))) * len);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;

          updateEngine(2000 + progress * 4000, progress * 80);

          // HUD
          const results = calcResults();
          ctx.fillStyle = "rgba(0,0,0,0.75)";
          ctx.fillRect(10, 10, 260, 35);
          ctx.font = '10px "Press Start 2P"';
          ctx.fillStyle = "#66ccff";
          ctx.fillText("DOWNFORCE: +" + Math.round(results.downforce * progress) + " UNITS", 20, 32);

          if (elapsed >= 5) {
            stopEngine();
            const final = calcResults();
            setScore(final.score);
            setTotalDownforce(final.downforce);
            phaseRef.current = "results";
            setGamePhase("results");
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    phaseRef.current = gamePhase === "arriving" ? "arriving" : phaseRef.current;
    carXRef.current = gamePhase === "arriving" ? -200 : carXRef.current;
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [gamePhase, playerCar, calcResults]);

  const scoreLabel = score >= 90 ? "WIND TUNNEL MASTER" : score >= 70 ? "AERO ENGINEER" : score >= 50 ? "GETTING THERE" : "MORE DRAG THAN A PARACHUTE";
  const scoreLabelColor = score >= 70 ? C.gold : score >= 50 ? C.white : C.midGray;

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "0.25rem" }}>
        <img src={CIDEAS_LOGO} alt="CIDEAS" style={{ maxWidth: "100px", height: "auto", imageRendering: "pixelated", display: "block", margin: "0 auto 0.3rem" }} />
        {gamePhase === "arriving" && (
          <p style={{ fontFamily: FONT, fontSize: "0.5rem", color: C.midGray }}>ENTERING THE CIDEAS WIND TUNNEL...</p>
        )}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        style={{ width: "100%", maxWidth: "800px", display: "block", margin: "0 auto", imageRendering: "pixelated", border: `1px solid ${C.border}`, touchAction: "none", cursor: gamePhase === "designing" ? "crosshair" : "default" }}
      />

      {/* Design controls */}
      {gamePhase === "designing" && (
        <div style={{ maxWidth: "800px", margin: "0.75rem auto 0", textAlign: "center" }}>
          <p style={{ fontFamily: FONT, fontSize: "clamp(0.5rem, 1.3vw, 0.65rem)", color: C.white, marginBottom: "0.3rem" }}>
            MAXIMIZE DOWNFORCE
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.4rem", color: C.midGray, marginBottom: "0.3rem" }}>
            3D PRINT AERO PARTS ONTO YOUR CAR
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.35rem", color: "#66ccff", marginBottom: "0.75rem" }}>
            PLACE PIXELS IN THE HIGHLIGHTED ZONES FOR MAXIMUM DOWNFORCE
          </p>

          {/* Filament budget */}
          <div style={{ marginBottom: "0.75rem" }}>
            <p style={{ fontFamily: FONT, fontSize: "clamp(0.55rem, 1.5vw, 0.7rem)", color: pixelsUsed >= MAX_PIXELS ? C.red : C.gold }}>
              FILAMENT: {MAX_PIXELS - pixelsUsed}/{MAX_PIXELS}
            </p>
            <div style={{ maxWidth: "300px", margin: "0.4rem auto", height: "8px", background: C.bgMid, border: `1px solid ${C.border}` }}>
              <div style={{ width: `${(pixelsUsed / MAX_PIXELS) * 100}%`, height: "100%", background: pixelsUsed >= MAX_PIXELS ? C.red : C.gold, transition: "width 0.1s" }} />
            </div>
          </div>

          {/* Color picker + tools */}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
            {FILAMENT_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => { setFilamentColor(color); setIsErasing(false); }}
                style={{
                  width: "32px", height: "32px", background: color,
                  border: `3px solid ${filamentColor === color && !isErasing ? C.white : "transparent"}`,
                  cursor: "pointer",
                }}
              />
            ))}
            <button
              onClick={() => setIsErasing(!isErasing)}
              style={{
                ...pixelBtnStyle, fontSize: "0.4rem", padding: "0.3rem 0.6rem",
                background: isErasing ? C.red : C.bgMid,
                color: isErasing ? C.white : C.midGray,
                border: `2px solid ${isErasing ? C.red : C.border}`,
              }}
            >
              {isErasing ? "ERASING" : "ERASER"}
            </button>
            <button
              onClick={clearGrid}
              style={{ ...pixelBtnStyle, fontSize: "0.4rem", padding: "0.3rem 0.6rem", color: C.midGray, border: `2px solid ${C.border}` }}
            >
              CLEAR
            </button>
          </div>

          {/* Start button */}
          <button
            onClick={startTest}
            disabled={pixelsUsed === 0}
            style={{
              ...goldBtnStyle, fontSize: "0.8rem", padding: "0.75rem 2.5rem",
              opacity: pixelsUsed === 0 ? 0.5 : 1, cursor: pixelsUsed === 0 ? "not-allowed" : "pointer",
            }}
          >
            START TUNNEL
          </button>
        </div>
      )}

      {/* Testing */}
      {gamePhase === "testing" && (
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.6rem", color: C.gold, animation: "blink8bit 0.5s step-end infinite" }}>TESTING...</p>
          <style>{`@keyframes blink8bit { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
          <div style={{ maxWidth: "400px", margin: "0.75rem auto", height: "8px", background: C.bgMid, border: `1px solid ${C.border}` }}>
            <div style={{ width: `${testProgress * 100}%`, height: "100%", background: C.gold, transition: "width 0.1s" }} />
          </div>
        </div>
      )}

      {/* Results */}
      {gamePhase === "results" && (
        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "clamp(1.5rem, 4vw, 2.5rem)", color: C.gold, margin: "0 0 0.5rem", textShadow: score >= 90 ? "0 0 20px rgba(255,215,0,0.4)" : "none" }}>
            {score}<span style={{ fontSize: "0.7rem", color: C.midGray }}>/100</span>
          </p>
          <p style={{ fontFamily: FONT, fontSize: "clamp(0.55rem, 1.5vw, 0.7rem)", color: scoreLabelColor, letterSpacing: "0.15em", marginBottom: "1rem" }}>
            {scoreLabel}
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.55rem", color: "#66ccff", marginBottom: "0.3rem" }}>
            DOWNFORCE: +{totalDownforce} UNITS
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.45rem", color: C.midGray, marginBottom: "1.5rem" }}>
            {pixelsUsed} PIXELS USED OF {MAX_PIXELS} FILAMENT
          </p>

          {onGameEnd && (
            <button
              onClick={() => onGameEnd({ game: "windtunnel", score, metadata: { totalDownforce, pixelsUsed } })}
              style={{ ...goldBtnStyle, background: "#22c55e", border: "2px solid #166534", marginBottom: "0.75rem" }}
            >
              SAVE SCORE
            </button>
          )}
        </div>
      )}

      {/* Back button */}
      <button
        onClick={() => { cancelAnimationFrame(animRef.current); stopEngine(); onBack(); }}
        style={{ background: "none", border: "none", color: C.midGray, fontFamily: FONT, fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline", display: "block", margin: "1.5rem auto 0" }}
      >
        BACK TO GARAGE
      </button>
    </div>
  );
}
