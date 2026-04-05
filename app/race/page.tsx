"use client";

/* eslint-disable @next/next/no-img-element */
import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  initAudio,
  playCountdownBeep, startEngine, updateEngine, stopEngine,
  playGearShift, playWinJingle, playLoseJingle, playFoulBuzzer,
  startMusic, startSelectMusic, stopSelectMusic, stopAll,
} from "@/lib/race-audio";

// ─── 8-BIT PALETTE ───
const C = {
  bgDark: "#0d0d1a",
  bgMid: "#1a1a2e",
  bgLight: "#2a1a3e",
  gold: "#ffd700",
  goldDark: "#b8860b",
  green: "#00ff00",
  red: "#ff0000",
  white: "#ffffff",
  gray: "#cccccc",
  midGray: "#aaaaaa",
  border: "#333333",
};

type RaceCar = {
  id: string;
  carNumber: number;
  year: number;
  name: string;
  color: string;
  owner: string;
  hp: number;
  weight: number;
  pwr: number;
  displacement: number;
  cylinders: number;
  engineType: string;
  category: string;
  driveType: string;
  bodyStyle: string;
  origin: string;
  era: string;
  production: number;
  redline: number;
  topSpeed: number;
  gears: number;
  trans: string;
  pixelArt: string | null;
  pixelDash: string | null;
  pixelRear: string | null;
  aiImage: string | null;
  flipped: boolean;
};

type Phase = "loading" | "title" | "select" | "action-menu" | "dyno" | "countdown" | "racing" | "finished";

/**
 * Convert advertised HP to SAE Net equivalent.
 *
 * Before 1972, automakers reported SAE Gross HP — measured at the
 * flywheel with no accessories, water pump, alternator, or exhaust
 * system attached. In 1972 the SAE J1349 standard switched to Net HP,
 * measured with all production accessories and full exhaust. Gross
 * figures ran roughly 20-25% higher than net for the same engine.
 *
 * We apply an 0.80 multiplier to pre-1972 cars to approximate net HP.
 */
function netHP(hp: number, year: number): number {
  if (year < 1972) return hp * 0.80;
  return hp;
}

/**
 * Drivetrain loss factor based on transmission type and era.
 * Modern DCTs and autos are efficient; old slushboxes lose significant power.
 */
function drivetrainFactor(trans: string, gears: number, year: number): number {
  const t = trans.toLowerCase();
  if (t === "electric" || t === "ev") return 0.95; // instant torque, no shift losses
  if (t === "dct" || t === "semi-auto") return 1.0;
  if (t === "cvt") return 1.04;
  if (t === "manual") return 1.03;
  // Automatic — penalty depends on era and gear count
  if (t === "automatic" || t === "auto") {
    if (gears <= 2) return 1.15; // 2-speed Dynaflow, Powerglide
    if (gears <= 3 && year < 1975) return 1.10; // early 3-speed slushbox
    if (gears <= 4) return 1.06; // 4-speed auto
    return 1.02; // modern 6/8/10-speed auto
  }
  return 1.03; // unknown, assume manual-like
}

/**
 * Realistic quarter-mile elapsed time (seconds).
 * Uses the standard empirical formula: ET = 5.825 × (weight / hp)^(1/3)
 * HP is first converted to SAE Net equivalent for pre-1972 cars.
 * Drivetrain losses are applied based on transmission type.
 */
function quarterMileET(hp: number, weightLbs: number, year: number = 2000, trans: string = "Manual", gears: number = 5): number {
  const base = 5.825 * Math.pow(weightLbs / netHP(hp, year), 1 / 3);
  return base * drivetrainFactor(trans, gears, year);
}

/**
 * Quarter-mile trap speed (MPH).
 * Empirical formula: speed = 234 × (hp / weight)^(1/3)
 */
function trapSpeedMPH(hp: number, weightLbs: number, year: number = 2000): number {
  return 234 * Math.pow(netHP(hp, year) / weightLbs, 1 / 3);
}

/**
 * Top speed (MPH). Uses stored value if available, otherwise estimates
 * from trap speed × 1.35.
 */
function topSpeedMPH(hp: number, weightLbs: number, year: number = 2000, stored: number = 0): number {
  if (stored > 0) return stored;
  return trapSpeedMPH(hp, weightLbs, year) * 1.35;
}

/**
 * Find the maxSpeed calibration factor so the simulated physics
 * finishes in exactly targetET seconds. Runs a binary search over
 * the actual acceleration model (player holding space perfectly,
 * or opponent AI curve) to account for gear shifts, RPM ramp, etc.
 */
function calibratePlayer(targetET: number, redline: number = 6500, maxGears: number = 5): { factor: number; peakSpeed: number } {
  const shiftPoint = Math.round(redline * 0.92);
  const gearPenalty = 0.20 / (maxGears / 5);
  const test = (factor: number) => {
    const maxSpeed = 1000 / (targetET * 60 * factor);
    let pos = 0, speed = 0, gear = 1, rpm = 800, frames = 0, peak = 0;
    while (pos < 1000 && frames < 60 * 30) {
      rpm = Math.min(rpm + redline * 0.004, redline);
      const gearCeiling = maxSpeed * (0.20 + 0.80 * Math.pow(gear / maxGears, 1.4));
      const gearFloor = gear === 1 ? 0 : maxSpeed * (0.20 + 0.80 * Math.pow((gear - 1) / maxGears, 1.4));
      const rpmPct = (rpm - 800) / (redline - 800);
      speed = gearFloor + (gearCeiling - gearFloor) * rpmPct;
      if (speed > peak) peak = speed;
      if (rpm >= shiftPoint && gear < maxGears) { gear++; rpm = Math.round(redline * 0.45); }
      pos += speed * (1/60) * 60;
      if (speed > peak) peak = speed;
      frames++;
    }
    return { time: frames / 60, peak };
  };
  let lo = 0.3, hi = 1.5;
  for (let i = 0; i < 25; i++) {
    const mid = (lo + hi) / 2;
    if (test(mid).time < targetET) lo = mid; else hi = mid;
  }
  const finalFactor = (lo + hi) / 2;
  return { factor: finalFactor, peakSpeed: test(finalFactor).peak };
}

function calibrateOpponent(targetET: number): number {
  const test = (factor: number) => {
    const maxSpeed = 1000 / (targetET * 60 * factor);
    let pos = 0, frames = 0;
    while (pos < 1000 && frames < 60 * 30) {
      const elapsed = frames * (1000/60);
      const curve = Math.min(elapsed / 8000, 1);
      const wobble = Math.sin(elapsed * 0.002) * 0.05;
      const speed = maxSpeed * curve * (0.85 + wobble);
      pos += speed * (1/60) * 60;
      frames++;
    }
    return frames / 60;
  };
  let lo = 0.4, hi = 1.0;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (test(mid) < targetET) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ─── TRACK THEMES — Crystal Lake, IL ───
type SceneryDef = { type: string; color: string; w: number; h: number; rare?: boolean };
type TrackSkin = {
  name: string; subtitle: string;
  skyTop: string; skyBottom: string;
  stars: boolean;
  treeColor: string;
  grassA: string; grassB: string;
  roadA: string; roadB: string;
  shoulderA: string; shoulderB: string;
  centerLine: string;
  horizonStyle: "lakeside" | "downtown" | "commercial";
  scenery: SceneryDef[];
};

const TRACK_SKINS: TrackSkin[] = [
  { // Lakeside Drive — golden hour past Main Beach
    name: "LAKESIDE DRIVE", subtitle: "Lakeshore Dr — Main Beach",
    skyTop: "#4a3520", skyBottom: "#d4956b", stars: false, treeColor: "#1a5a1a",
    grassA: "#1a6a1a", grassB: "#2a7a2a", roadA: "#3a3530", roadB: "#4a4540",
    shoulderA: C.white, shoulderB: "#c9a84c", centerLine: C.gold,
    horizonStyle: "lakeside",
    scenery: [
      { type: "willow", color: "#2a7a2a", w: 20, h: 35 },
      { type: "bench", color: "#8b6914", w: 12, h: 6 },
      { type: "lamp", color: "#888888", w: 4, h: 30 },
      { type: "umbrella", color: "#cc4444", w: 14, h: 14 },
      { type: "dock-post", color: "#8b7355", w: 6, h: 10 },
      { type: "bandshell", color: "#555555", w: 40, h: 25, rare: true },
    ],
  },
  { // Downtown Williams Street — night drag through downtown
    name: "DOWNTOWN WILLIAMS ST", subtitle: "Historic Downtown Crystal Lake",
    skyTop: "#060820", skyBottom: "#1a1a2a", stars: true, treeColor: "#1a1a1a",
    grassA: "#2a2a2a", grassB: "#333333", roadA: "#181820", roadB: "#1e1e28",
    shoulderA: "#666666", shoulderB: "#ccaa00", centerLine: C.white,
    horizonStyle: "downtown",
    scenery: [
      { type: "brick-bldg", color: "#5a4a3a", w: 30, h: 50 },
      { type: "lamp", color: "#888888", w: 4, h: 28 },
      { type: "awning", color: "#cc4444", w: 16, h: 8 },
      { type: "parked-car", color: "#333355", w: 14, h: 22 },
      { type: "theater", color: "#4a3a2a", w: 32, h: 45, rare: true },
      { type: "bench", color: "#5a4a3a", w: 10, h: 5 },
    ],
  },
  { // Route 14 Strip — midnight commercial corridor
    name: "ROUTE 14 STRIP", subtitle: "Northwest Hwy — Commercial Corridor",
    skyTop: "#020208", skyBottom: "#0a0820", stars: true, treeColor: "#0a0a0a",
    grassA: "#0a1a0a", grassB: "#151a10", roadA: "#111118", roadB: "#181822",
    shoulderA: "#cccccc", shoulderB: "#cc2222", centerLine: "#ffcc00",
    horizonStyle: "commercial",
    scenery: [
      { type: "lot-light", color: "#cccccc", w: 4, h: 40 },
      { type: "gas-canopy", color: "#dddddd", w: 36, h: 12, rare: true },
      { type: "traffic-light", color: "#333333", w: 6, h: 32 },
      { type: "power-pole", color: "#6b4226", w: 4, h: 36 },
      { type: "store-sign", color: "#ff4444", w: 20, h: 8 },
      { type: "parked-car", color: "#333355", w: 14, h: 22 },
    ],
  },
];

const DYNO_ROOM_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pixel-art/urw-dyno-room.png`;

function pickRandomSkin(): TrackSkin {
  return TRACK_SKINS[Math.floor(Math.random() * TRACK_SKINS.length)];
}

export default function RacePageWrapper() {
  return (
    <Suspense fallback={<div style={{ background: C.bgDark, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.midGray, fontFamily: FONT, fontSize: "0.75rem" }}>LOADING...</div>}>
      <RacePage />
    </Suspense>
  );
}

function RacePage() {
  const searchParams = useSearchParams();
  const preselectedCarId = searchParams.get("car");
  const [cars, setCars] = useState<RaceCar[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [playerCar, setPlayerCar] = useState<RaceCar | null>(null);
  const [opponentCar, setOpponentCar] = useState<RaceCar | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [playerSpeed, setPlayerSpeed] = useState(0);
  const [opponentSpeed, setOpponentSpeed] = useState(0);
  const [playerPos, setPlayerPos] = useState(0);
  const [opponentPos, setOpponentPos] = useState(0);
  const [gear, setGear] = useState(1);
  const [rpm, setRpm] = useState(800);
  const [winner, setWinner] = useState<"player" | "opponent" | null>(null);
  const [playerTime, setPlayerTime] = useState(0);
  const [opponentTime, setOpponentTime] = useState(0);
  const [reactionTime, setReactionTime] = useState(0); // ms, 0=not yet measured
  const [oppReactionTime, setOppReactionTime] = useState(0);
  const [jumped, setJumped] = useState(false); // true if player launched before green
  const [generating, setGenerating] = useState(false);
  const [trackSkin, setTrackSkin] = useState<TrackSkin>(TRACK_SKINS[0]);
  const [finishFlash, setFinishFlash] = useState(false);
  const [dynoState, setDynoState] = useState<"idle" | "pulling" | "results">("idle");
  const [dynoRpm, setDynoRpm] = useState(0);
  const [dynoGear, setDynoGear] = useState(1);
  const [revealCount, setRevealCount] = useState(0);
  const dynoCanvasRef = useRef<HTMLCanvasElement>(null);
  const dynoAnimRef = useRef<number>(0);
  const dynoCarImgRef = useRef<HTMLImageElement | null>(null);
  const dynoBgImgRef = useRef<HTMLImageElement | null>(null);

  const animRef = useRef<number>(0);
  const startRef = useRef(0);
  const greenRef = useRef(0); // timestamp when green light fires
  const reactedRef = useRef(false); // has player's first input been recorded
  const jumpedRef = useRef(false); // did player hold accel before green
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keyRef = useRef<Set<string>>(new Set());
  const opponentOverlayRef = useRef<HTMLDivElement>(null);
  const opponentImgRef = useRef<HTMLImageElement>(null);
  const opponentFallbackRef = useRef<HTMLDivElement>(null);

  // Fetch cars
  useEffect(() => {
    fetch("/api/race")
      .then((r) => r.json())
      .then((data) => {
        const raceCars: RaceCar[] = (data.cars || []).map((c: Record<string, unknown>) => ({
          ...c,
          pixelArt: c.pixelArt || null,
          pixelDash: c.pixelDash || null,
          pixelRear: c.pixelRear || null,
          aiImage: c.aiImage || null,
          flipped: c.flipped || false,
        }));
        setCars(raceCars);
        if (preselectedCarId) {
          const target = raceCars.find((c) => c.id === preselectedCarId);
          if (target) {
            setPlayerCar(target);
            const others = raceCars.filter((c) => c.id !== target.id);
            const opp = others[Math.floor(Math.random() * others.length)] || target;
            setOpponentCar(opp);
          }
        }
        setPhase("title");
      })
      .catch(() => setPhase("title"));
  }, [preselectedCarId]);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => keyRef.current.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keyRef.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);


  // Keep canvas resolution matched to display size
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const drawRoad = useCallback((canvas: HTMLCanvasElement, roadOffset: number, skin: TrackSkin) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const horizonY = H * 0.3;
    const vanishX = W / 2;

    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, skin.skyTop);
    skyGrad.addColorStop(1, skin.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, horizonY);

    // Pixel stars
    if (skin.stars) {
      ctx.fillStyle = C.white;
      for (let i = 0; i < 30; i++) {
        const sx = (Math.sin(i * 127.1) * 0.5 + 0.5) * W;
        const sy = (Math.sin(i * 269.5) * 0.5 + 0.5) * horizonY * 0.8;
        const size = i % 3 === 0 ? 2 : 1;
        ctx.fillRect(Math.floor(sx), Math.floor(sy), size, size);
      }
    }

    // ─── Horizon features (track-specific) ───
    if (skin.horizonStyle === "lakeside") {
      // Lake shimmer band (left 60% of screen)
      const lakeGrad = ctx.createLinearGradient(0, horizonY - 8, 0, horizonY + 4);
      lakeGrad.addColorStop(0, "#2255aa44");
      lakeGrad.addColorStop(0.5, "#4488cc66");
      lakeGrad.addColorStop(1, "#d4956b33");
      ctx.fillStyle = lakeGrad;
      ctx.fillRect(0, horizonY - 8, W * 0.6, 12);
      // Distant shore silhouette
      ctx.fillStyle = "#1a4a1a";
      for (let x = 0; x < W * 0.55; x += 12) {
        const h = 4 + Math.sin(x * 0.03) * 3;
        ctx.fillRect(x, horizonY - 8 - h, 10, h);
      }
      // Lush tree canopy (right side)
      ctx.fillStyle = skin.treeColor;
      for (let x = Math.floor(W * 0.55); x < W; x += 14) {
        const treeH = 12 + ((x * 7) % 14);
        ctx.fillRect(x, horizonY - treeH, 12, treeH);
        ctx.fillRect(x + 2, horizonY - treeH - 4, 8, 4);
      }
    } else if (skin.horizonStyle === "downtown") {
      // Building roofline silhouettes
      ctx.fillStyle = "#1a1a22";
      for (let x = 0; x < W; x += 18) {
        const bH = 12 + ((x * 13 + 5) % 30);
        ctx.fillRect(x, horizonY - bH, 16, bH);
      }
      // Warm window glow
      ctx.fillStyle = "#ffcc4488";
      for (let x = 0; x < W; x += 18) {
        const bH = 12 + ((x * 13 + 5) % 30);
        for (let wy = horizonY - bH + 4; wy < horizonY - 2; wy += 6) {
          if ((x * 7 + wy) % 11 < 5) {
            ctx.fillRect(x + 3, wy, 3, 3);
            ctx.fillRect(x + 9, wy, 3, 3);
          }
        }
      }
      // Lit storefront glow (center of skyline)
      ctx.fillStyle = "#ffcc4433";
      ctx.fillRect(W * 0.44, horizonY - 20, W * 0.12, 8);
    } else if (skin.horizonStyle === "commercial") {
      // Flat commercial roofline
      ctx.fillStyle = "#0a0a14";
      for (let x = 0; x < W; x += 24) {
        const bH = 6 + ((x * 11 + 3) % 12);
        ctx.fillRect(x, horizonY - bH, 22, bH);
      }
      // Harsh parking lot lights
      ctx.fillStyle = "#ffffff55";
      for (let x = 30; x < W; x += 60) {
        if ((x * 7) % 13 < 6) {
          ctx.fillRect(x, horizonY - 3, 2, 2);
          // Light glow below
          ctx.fillStyle = "#ffffff18";
          ctx.fillRect(x - 4, horizonY - 1, 10, 4);
          ctx.fillStyle = "#ffffff55";
        }
      }
      // Colored sign glow (red, blue, green commercial signage)
      const signColors = ["#ff444466", "#4488ff66", "#44cc4466", "#ffcc0066"];
      for (let x = 50; x < W; x += 80) {
        const ci = ((x * 3) >> 0) % signColors.length;
        ctx.fillStyle = signColors[ci];
        const sW = 14 + ((x * 5) % 16);
        ctx.fillRect(x, horizonY - 10 - ((x * 7) % 8), sW, 5);
      }
    } else {
      // Fallback: generic tree line
      ctx.fillStyle = skin.treeColor;
      for (let x = 0; x < W; x += 20) {
        const treeH = 10 + ((x * 7) % 11);
        ctx.fillRect(x, horizonY - treeH, 16, treeH);
      }
    }

    // ─── Roadside scenery objects — disabled pending quality improvements ───

    // Road (perspective, row by row)
    const roadWidthBottom = W * 0.95;
    const roadWidthTop = W * 0.08;
    const shoulderWidthBottom = W * 0.12;
    const shoulderWidthTop = 2;
    const totalRows = H - horizonY;

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

      // Grass
      ctx.fillStyle = stripeBand ? skin.grassA : skin.grassB;
      ctx.fillRect(0, y, roadLeft - shoulderW, 1);
      ctx.fillRect(roadRight + shoulderW, y, W - (roadRight + shoulderW), 1);

      // Shoulder rumble strips
      ctx.fillStyle = stripeBand ? skin.shoulderA : skin.shoulderB;
      ctx.fillRect(roadLeft - shoulderW, y, shoulderW, 1);
      ctx.fillRect(roadRight, y, shoulderW, 1);

      // Road surface
      ctx.fillStyle = stripeBand ? skin.roadA : skin.roadB;
      ctx.fillRect(roadLeft, y, roadW, 1);

      // Center dashed line
      if (stripePhase > 2 && stripePhase < 8) {
        const lineW = Math.max(2, 4 * perspective);
        ctx.fillStyle = skin.centerLine;
        ctx.fillRect(vanishX - lineW / 2, y, lineW, 1);
      }

      // Lane quarter lines
      const laneOffset = roadW / 4;
      if (stripePhase > 3 && stripePhase < 6) {
        const lineW = Math.max(1, 2 * perspective);
        ctx.fillStyle = skin.centerLine + "26"; // 15% opacity
        ctx.fillRect(vanishX - laneOffset - lineW / 2, y, lineW, 1);
        ctx.fillRect(vanishX + laneOffset - lineW / 2, y, lineW, 1);
      }
    }
  }, []);

  const selectCar = useCallback((car: RaceCar) => {
    setPlayerCar(car);
    setPhase("action-menu");
  }, []);

  const setupDragRace = useCallback(() => {
    if (!playerCar) return;
    const others = cars.filter((c) => c.id !== playerCar.id);
    const opp = others[Math.floor(Math.random() * others.length)] || playerCar;
    setOpponentCar(opp);
    setTrackSkin(pickRandomSkin());
  }, [playerCar, cars]);

  const startRace = useCallback(() => {
    if (!playerCar || !opponentCar) return;
    initAudio();
    stopSelectMusic();
    setTrackSkin(pickRandomSkin());
    setFinishFlash(false);
    setPhase("countdown");
    setCountdown(3);
    setPlayerPos(0);
    setOpponentPos(0);
    setPlayerSpeed(0);
    setOpponentSpeed(0);
    setGear(1);
    setRpm(800);
    setWinner(null);
    setPlayerTime(0);
    setOpponentTime(0);
    setReactionTime(0);
    setOppReactionTime(0);
    setJumped(false);
    greenRef.current = 0;
    reactedRef.current = false;
    jumpedRef.current = false;

    // Compute realistic target quarter-mile times and trap speeds
    const playerTargetET = quarterMileET(playerCar.hp, playerCar.weight, playerCar.year, playerCar.trans, playerCar.gears);
    const oppTargetET = quarterMileET(opponentCar.hp, opponentCar.weight, opponentCar.year, opponentCar.trans, opponentCar.gears);
    const playerTopSpeed = topSpeedMPH(playerCar.hp, playerCar.weight, playerCar.year, playerCar.topSpeed);
    const oppTopSpeed = topSpeedMPH(opponentCar.hp, opponentCar.weight, opponentCar.year, opponentCar.topSpeed);

    // Calibrate maxSpeed per car by simulating the exact physics model,
    // so perfect play finishes at the predicted ET
    const playerCal = calibratePlayer(playerTargetET, playerCar.redline || 6500, playerCar.gears || 5);
    const oppFactor = calibrateOpponent(oppTargetET);
    const playerMaxSpeed = 1000 / (playerTargetET * 60 * playerCal.factor);
    const oppMaxSpeed = 1000 / (oppTargetET * 60 * oppFactor);

    // Map physics speed to realistic MPH display
    // Use peak achievable speed (not maxSpeed) since rev limiter may cap below it
    const playerMPHScale = playerTopSpeed / playerCal.peakSpeed;
    const oppMPHScale = oppTopSpeed / oppMaxSpeed;

    // Christmas tree countdown: 3 amber stages → green
    // If player holds accel during amber, it's a jump (0.5s penalty)
    playCountdownBeep(false);
    let c = 3;
    const interval = setInterval(() => {
      c--;
      setCountdown(c);
      playCountdownBeep(c <= 0);

      // Check for jump: if player is holding accel during amber countdown
      if (c > 0 && (keyRef.current.has(" ") || keyRef.current.has("arrowup"))) {
        jumpedRef.current = true;
        setJumped(true);
        playFoulBuzzer();
      }

      if (c <= 0) {
        clearInterval(interval);
        greenRef.current = performance.now();
        setPhase("racing");
        startEngine();
        startMusic();

        // Opponent reaction time: random 0.15-0.40s
        const oppRT = 150 + Math.random() * 250;
        setOppReactionTime(Math.round(oppRT));

        // If player jumped, add 0.5s penalty to their start
        const jumpPenalty = jumpedRef.current ? 500 : 0;
        startRef.current = performance.now() - jumpPenalty; // negative offset = later start

        const FINISH = 1000;
        let pPos = 0, oPos = 0, pSpeed = 0, oSpeed = 0;
        let pGear = 1, pRpm = 800;
        let pFinish = 0, oFinish = 0;
        let roadOffset = 0;
        let prevTime = performance.now();
        const STRIPE_CYCLE = 20 / 0.3;

        const animate = (now: number) => {
          const elapsed = now - startRef.current;
          const actualDt = Math.min((now - prevTime) / 1000, 0.05);
          prevTime = now;
          const dt = 1 / 60;

          // Player acceleration — measure reaction time on first input
          const accel = keyRef.current.has(" ") || keyRef.current.has("arrowup");

          if (accel && !reactedRef.current && greenRef.current > 0) {
            reactedRef.current = true;
            const rt = jumpedRef.current ? 0 : Math.round(now - greenRef.current);
            setReactionTime(rt);
          }

          const pRedline = playerCar.redline || 6500;
          const pMaxGears = playerCar.gears || 5;
          const pShiftPoint = Math.round(pRedline * 0.92);
          const pGearPenalty = 0.20 / (pMaxGears / 5); // scale: more gears = less penalty per gear

          const pRpmRate = pRedline * 0.004; // scale RPM climb to redline
          if (accel && !pFinish) {
            pRpm = Math.min(pRpm + pRpmRate, pRedline);

            // Speed is directly tied to RPM within each gear.
            // Each gear has a speed range: gear 1 covers 0→cap1, gear 2 covers cap1→cap2, etc.
            // At redline in any gear, speed = that gear's ceiling. Shifting drops RPM, not speed.
            const gearCeiling = playerMaxSpeed * (0.20 + 0.80 * Math.pow(pGear / pMaxGears, 1.4));
            const gearFloor = pGear === 1 ? 0 : playerMaxSpeed * (0.20 + 0.80 * Math.pow((pGear - 1) / pMaxGears, 1.4));
            const rpmPct = (pRpm - 800) / (pRedline - 800); // 0 at idle, 1 at redline
            // Speed is directly proportional to RPM position in gear
            pSpeed = gearFloor + (gearCeiling - gearFloor) * rpmPct;
          } else {
            pRpm = Math.max(pRpm - pRedline * 0.005, 800);
            pSpeed = Math.max(pSpeed - 0.3, 0);
          }

          // Auto shift at shift point (92% of redline)
          if (pRpm >= pShiftPoint && pGear < pMaxGears) {
            pGear++;
            pRpm = Math.round(pRedline * 0.45);
            playGearShift();
          }

          // Opponent AI — delayed by their reaction time
          if (!oFinish) {
            const oppElapsed = elapsed - oppRT; // ms since opponent started
            if (oppElapsed < 0) { oSpeed = 0; } else {
            const oppAccelCurve = Math.min(oppElapsed / 8000, 1);
            const wobble = Math.sin(oppElapsed * 0.002) * 0.05;
            oSpeed = oppMaxSpeed * oppAccelCurve * (0.85 + wobble);
            }
          }

          pPos += pSpeed * dt * 60;
          oPos += oSpeed * dt * 60;

          if (pPos >= FINISH && !pFinish) { pFinish = elapsed; }
          if (oPos >= FINISH && !oFinish) { oFinish = elapsed; }

          // Draw road
          roadOffset = (roadOffset + pSpeed * 0.5 * (actualDt * 60)) % STRIPE_CYCLE;
          if (canvasRef.current) {
            drawRoad(canvasRef.current, roadOffset, trackSkin);
          }

          // Opponent overlay positioning
          const overlayEl = opponentOverlayRef.current;
          if (overlayEl) {
            const delta = oPos - pPos;

            if (delta >= 0) {
              const tOpp = Math.min(1, delta / 150);
              const scale = 1.0 - tOpp * 0.75;
              const topPct = 30 + (1 - tOpp) * 55;
              const perspAtOpp = (1 - tOpp) * (1 - tOpp);
              const roadWidthPct = 8 + (95 - 8) * perspAtOpp;
              const laneOff = roadWidthPct * 0.22;
              const spriteWidth = Math.round(240 * scale);

              overlayEl.style.top = `${topPct}%`;
              overlayEl.style.left = `calc(50% - ${laneOff}%)`;
              overlayEl.style.display = "block";
              overlayEl.style.opacity = "1";

              if (opponentImgRef.current) opponentImgRef.current.style.width = `${spriteWidth}px`;
              if (opponentFallbackRef.current) {
                opponentFallbackRef.current.style.width = `${spriteWidth}px`;
                opponentFallbackRef.current.style.height = `${Math.round(spriteWidth * 0.55)}px`;
                opponentFallbackRef.current.style.fontSize = `${Math.max(10, 16 * scale)}px`;
              }
            } else {
              const behind = Math.min(Math.abs(delta), 80);
              const behindT = behind / 80;
              const scale = 1.0 + behindT * 0.8;
              const topPct = 85 + behindT * 30;
              const laneOff = 20 + behindT * 25;
              const spriteWidth = Math.round(240 * scale);
              const opacity = Math.max(0, 1 - behindT * 1.2);

              overlayEl.style.top = `${topPct}%`;
              overlayEl.style.left = `calc(50% - ${laneOff}%)`;
              overlayEl.style.display = opacity > 0.01 ? "block" : "none";
              overlayEl.style.opacity = `${opacity}`;

              if (opponentImgRef.current) opponentImgRef.current.style.width = `${spriteWidth}px`;
              if (opponentFallbackRef.current) {
                opponentFallbackRef.current.style.width = `${spriteWidth}px`;
                opponentFallbackRef.current.style.height = `${Math.round(spriteWidth * 0.55)}px`;
                opponentFallbackRef.current.style.fontSize = `${Math.max(10, 16 * scale)}px`;
              }
            }
          }

          setPlayerPos(Math.min(pPos / FINISH * 100, 100));
          setOpponentPos(Math.min(oPos / FINISH * 100, 100));
          setPlayerSpeed(Math.round(pSpeed * playerMPHScale));
          setOpponentSpeed(Math.round(oSpeed * oppMPHScale));
          setGear(pGear);
          setRpm(Math.round(pRpm));
          updateEngine(pRpm, pSpeed);

          const finishRace = (w: "player" | "opponent", pT: number, oT: number) => {
            setWinner(w);
            setPlayerTime(pT);
            setOpponentTime(oT);
            stopAll();
            if (w === "player") playWinJingle(); else playLoseJingle();
            // Flash + flag then show results
            setFinishFlash(true);
            setTimeout(() => { setFinishFlash(false); setPhase("finished"); }, 1000);
          };

          if (pFinish && oFinish) {
            finishRace(pFinish < oFinish ? "player" : "opponent", pFinish, oFinish);
            return;
          }
          if (pFinish && !oFinish) {
            const oppRemaining = (FINISH - oPos) / (oSpeed || 0.01);
            finishRace("player", pFinish, Math.round(pFinish + oppRemaining * 1000 / 60));
            return;
          }
          if (oFinish && !pFinish) {
            const pRemaining = (FINISH - pPos) / (pSpeed || 0.01);
            finishRace("opponent", Math.round(oFinish + pRemaining * 1000 / 60), oFinish);
            return;
          }
          if (elapsed < 30000) {
            animRef.current = requestAnimationFrame(animate);
          } else {
            finishRace(pPos > oPos ? "player" : "opponent", elapsed, elapsed);
          }
        };

        animRef.current = requestAnimationFrame(animate);
      }
    }, 1000);
  }, [playerCar, opponentCar, drawRoad, trackSkin]);

  const startDynoPull = useCallback(() => {
    if (!playerCar) return;
    setDynoState("pulling");
    startEngine();

    const redline = playerCar.redline || 6500;
    // Gear shift logic: at least 3 shifts, or 2 if only a 2-speed
    const numGears = Math.max(2, Math.min(playerCar.gears || 4, 4));
    const numShifts = numGears <= 2 ? 2 : 3;
    const gearsUsed = numShifts + 1; // start in 1st, shift numShifts times
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

  useEffect(() => () => { cancelAnimationFrame(animRef.current); stopAll(); }, []);

  // Draw idle dyno canvas when entering dyno phase
  useEffect(() => {
    if (phase !== "dyno" || !playerCar) return;
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

    return () => { cancelAnimationFrame(dynoAnimRef.current); stopAll(); };
  }, [phase, playerCar]);


  const handleGenerateAll = async () => {
    setGenerating(true);
    try {
      await fetch("/api/registrations/pixel-art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: true }),
      });
      const res = await fetch("/api/race");
      const data = await res.json();
      setCars(data.cars || []);
    } catch {}
    setGenerating(false);
  };

  // ─── LOADING ───
  if (phase === "loading") {
    return <div style={pageStyle}><p style={{ color: C.midGray, textAlign: "center", paddingTop: "40vh", fontFamily: FONT, fontSize: "0.75rem" }}>LOADING GARAGE...</p></div>;
  }

  // ─── TITLE SCREEN ───
  if (phase === "title") {
    return (
      <div style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        textAlign: "center",
        padding: "2rem 1.5rem 3rem",
        overflow: "hidden",
      }}>
        {/* Full-screen background image */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/redline-garage.png?v=2)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          imageRendering: "pixelated",
        }} />
        {/* Gradient overlay — only fades in the bottom 30% for text readability */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, transparent 0%, transparent 60%, rgba(13,13,26,0.85) 80%, rgba(13,13,26,1) 100%)",
        }} />
        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: C.gold, letterSpacing: "0.25em" }}>CLCC ARCADE</p>
          <h1 style={{ fontFamily: FONT, fontSize: "clamp(1.1rem, 4vw, 1.8rem)", color: C.white, textShadow: "0 0 20px rgba(255,215,0,0.3)" }}>WELCOME TO REDLINE MOTOR CONDOS</h1>
          <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: C.midGray, lineHeight: 2 }}>{cars.length} VEHICLES IN THE GARAGE</p>
          <button
            onClick={() => {
              initAudio();
              startSelectMusic();
              setPhase("select");
            }}
            style={{ ...goldBtnStyle, fontSize: "1rem", padding: "1rem 3rem", marginTop: "0.5rem" }}
          >
            ENTER GARAGE
          </button>
          <Link href="/" style={{ fontFamily: FONT, fontSize: "0.6rem", color: C.border, textDecoration: "none" }}>BACK TO SITE</Link>
        </div>
      </div>
    );
  }

  // ─── ACTION MENU ───
  if (phase === "action-menu" && playerCar) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.6rem", color: C.midGray, letterSpacing: "0.2em", marginBottom: "0.5rem" }}>CLCC ARCADE</p>
          <h1 style={{ fontFamily: FONT, fontSize: "clamp(1rem, 3vw, 1.5rem)", color: C.gold, margin: "0 0 1rem" }}>
            {playerCar.name}
          </h1>
          <div style={{ maxWidth: "300px", margin: "0 auto 2rem", aspectRatio: "16/9", background: "#111", borderRadius: "6px", overflow: "hidden", border: `2px solid ${C.gold}` }}>
            {playerCar.pixelArt && (
              <img src={playerCar.pixelArt} alt={playerCar.name} style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" as const, transform: playerCar.flipped ? "scaleX(-1)" : "none" }} />
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", maxWidth: "320px", margin: "0 auto" }}>
          <button onClick={() => { setupDragRace(); setPhase("select"); }} style={{ ...goldBtnStyle, width: "100%", padding: "1rem", fontSize: "1rem" }}>
            DRAG RACE
          </button>
          <button onClick={() => setPhase("dyno")} style={{ ...pixelBtnStyle, width: "100%", padding: "1rem", fontSize: "1rem", background: C.bgMid, color: C.gold, border: `2px solid ${C.goldDark}` }}>
            HIT THE DYNO AT URW
          </button>
          <button disabled style={{ ...pixelBtnStyle, width: "100%", padding: "1rem", fontSize: "1rem", opacity: 0.3, cursor: "not-allowed" }}>
            CRUISE CRYSTAL LAKE
          </button>
          <p style={{ fontFamily: FONT, fontSize: "0.55rem", color: C.border, marginTop: "0.5rem" }}>CRUISE — COMING SOON</p>
          <button onClick={() => { setPlayerCar(null); setOpponentCar(null); setPhase("select"); }} style={{ background: "none", border: "none", color: C.midGray, fontFamily: FONT, fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline", marginTop: "1rem" }}>
            PICK DIFFERENT CAR
          </button>
        </div>
      </div>
    );
  }

  // ─── DYNO ROOM ───
  if (phase === "dyno" && playerCar) {
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
            onClick={() => { cancelAnimationFrame(dynoAnimRef.current); stopAll(); setDynoState("idle"); setPhase("action-menu"); }}
            style={{ background: "none", border: "none", color: C.midGray, fontFamily: FONT, fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline", marginTop: "1.5rem", display: "block", margin: "1.5rem auto 0" }}
          >
            BACK TO GARAGE
          </button>

          {dynoState === "results" && (
            <a
              href={`/contact?subject=${encodeURIComponent(`Stats issue: #${playerCar.carNumber} ${playerCar.year} ${playerCar.name}`)}&message=${encodeURIComponent(`I noticed an issue with the stats for car #${playerCar.carNumber} (${playerCar.year} ${playerCar.name}):\n\n`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: FONT, fontSize: "0.5rem", color: C.border, textDecoration: "underline", marginTop: "1rem", display: "block", textAlign: "center" }}
            >
              STATS WRONG? REPORT AN ISSUE
            </a>
          )}
        </div>
      </div>
    );
  }

  // ─── CAR SELECT ───
  if (phase === "select") {
    return (
      <div style={{ ...pageStyle, position: "relative", overflow: "hidden" }}>
        {/* Dimmed Redline background */}
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `url(${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/redline-garage.png?v=2)`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          imageRendering: "pixelated",
          opacity: 0.12,
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.6rem", color: C.midGray, letterSpacing: "0.2em", marginBottom: "0.5rem" }}>CLCC ARCADE</p>
          <h1 style={{ fontFamily: FONT, fontSize: "clamp(1rem, 3vw, 1.5rem)", color: C.gold, margin: "0 0 0.3rem", textTransform: "uppercase" }}>
            Redline Motor Condos
          </h1>
          <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: C.white, margin: "0 0 0.5rem" }}>Choose Your Ride</p>
          <p style={{ color: C.midGray, fontFamily: FONT, fontSize: "0.7rem" }}>{cars.length} VEHICLES IN THE GARAGE</p>
          {cars.some((c) => !c.pixelArt) && (
            <button onClick={handleGenerateAll} disabled={generating} style={{ ...pixelBtnStyle, marginTop: "1rem", background: C.bgMid, color: C.gold, border: `2px solid ${C.goldDark}`, opacity: generating ? 0.5 : 1, cursor: generating ? "wait" : "pointer" }}>
              {generating ? "GENERATING..." : `GENERATE PIXEL ART (${cars.filter((c) => !c.pixelArt).length})`}
            </button>
          )}
        </div>

        {playerCar && opponentCar ? (
          /* Matchup screen */
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            {/* Track name */}
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <p style={{ fontFamily: FONT, fontSize: "0.9rem", color: C.gold, margin: "0 0 0.25rem" }}>{trackSkin.name}</p>
              <p style={{ fontFamily: FONT, fontSize: "0.55rem", color: "#666666", margin: 0 }}>{trackSkin.subtitle}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "1.5rem", alignItems: "center", marginBottom: "2rem" }}>
              <CarCard car={playerCar} label="P1" isPlayer />
              <div style={{ textAlign: "center" }}>
                <span style={{ fontFamily: FONT, fontSize: "1rem", color: C.gold }}>VS</span>
              </div>
              <CarCard key={opponentCar.id} car={opponentCar} label="CPU" isPlayer={false} />
            </div>

            {/* Spec comparison */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "1.5rem", padding: "0 1rem" }}>
              {[
                { label: "HP", p: playerCar.hp, o: opponentCar.hp },
                { label: "LBS", p: playerCar.weight, o: opponentCar.weight },
                { label: "1/4 MI", p: quarterMileET(playerCar.hp, playerCar.weight, playerCar.year, playerCar.trans, playerCar.gears).toFixed(1) + "s", o: quarterMileET(opponentCar.hp, opponentCar.weight, opponentCar.year, opponentCar.trans, opponentCar.gears).toFixed(1) + "s" },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center", padding: "0.6rem", background: "rgba(255,215,0,0.05)", border: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: FONT, fontSize: "0.75rem", color: C.midGray, marginBottom: "0.3rem" }}>{s.label}</div>
                  <div style={{ fontFamily: FONT, fontSize: "0.75rem", color: C.gold }}>{typeof s.p === "number" ? s.p.toLocaleString() : s.p}</div>
                  <div style={{ fontFamily: FONT, fontSize: "0.75rem", color: C.red, marginTop: "0.15rem" }}>{typeof s.o === "number" ? s.o.toLocaleString() : s.o}</div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", alignItems: "center" }}>
                <button onClick={startRace} style={goldBtnStyle}>RACE!</button>
                <button
                  onClick={() => {
                    const others = cars.filter((c) => c.id !== playerCar.id && c.id !== opponentCar.id);
                    if (others.length > 0) {
                      setOpponentCar(others[Math.floor(Math.random() * others.length)]);
                    }
                  }}
                  style={pixelBtnStyle}
                >
                  SHUFFLE
                </button>
              </div>
              <br />
              <button onClick={() => { setPlayerCar(null); setOpponentCar(null); }} style={{ background: "none", border: "none", color: C.midGray, fontFamily: FONT, fontSize: "1rem", cursor: "pointer", textDecoration: "underline" }}>
                PICK DIFFERENT CAR
              </button>
            </div>

            <div style={{ marginTop: "1.5rem", textAlign: "center", fontFamily: FONT, fontSize: "0.75rem", color: C.border }}>
              HOLD <span style={kbdStyle}>SPACE</span> OR <span style={kbdStyle}>UP</span> TO ACCELERATE
            </div>
          </div>
        ) : (
          /* Car grid */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem", maxWidth: "1100px", margin: "0 auto" }}>
            {cars.map((car) => (
              <button
                key={car.id}
                onClick={() => selectCar(car)}
                style={{
                  background: C.bgMid,
                  border: `2px solid ${C.border}`,
                  padding: 0,
                  cursor: "pointer",
                  overflow: "hidden",
                  textAlign: "left",
                  fontFamily: FONT,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.gold; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
              >
                <div style={{ width: "100%", aspectRatio: "16/9", background: "#000", overflow: "hidden", lineHeight: 0 }}>
                  {car.pixelArt ? (
                    <img src={car.pixelArt} alt={car.name} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center", imageRendering: "pixelated" }} />
                  ) : car.aiImage ? (
                    <img src={car.aiImage} alt={car.name} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: C.border, fontFamily: FONT, fontSize: "0.75rem" }}>NO IMAGE</div>
                  )}
                </div>
                <div style={{ padding: "0.6rem 0.7rem" }}>
                  <p style={{ color: C.gold, fontSize: "0.65rem", fontFamily: FONT, marginBottom: "0.15rem" }}>{car.category || car.era}</p>
                  <p style={{ color: C.white, fontSize: "0.85rem", fontFamily: FONT, marginBottom: "0.4rem", lineHeight: 1.6 }}>{car.name}</p>
                  {/* Stat grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem 0.6rem", fontSize: "0.6rem", fontFamily: FONT }}>
                    <div><span style={{ color: C.midGray }}>HP </span><span style={{ color: C.white }}>{car.hp}</span></div>
                    <div><span style={{ color: C.midGray }}>WT </span><span style={{ color: C.white }}>{car.weight.toLocaleString()}</span></div>
                    {car.engineType && car.engineType !== "Unknown" && (
                      <div><span style={{ color: C.midGray }}>ENG </span><span style={{ color: C.white }}>{car.engineType}</span></div>
                    )}
                    {car.displacement > 0 && (
                      <div><span style={{ color: C.midGray }}>DSP </span><span style={{ color: C.white }}>{car.displacement}L</span></div>
                    )}
                    {car.driveType && car.driveType !== "Unknown" && (
                      <div><span style={{ color: C.midGray }}>DRV </span><span style={{ color: C.white }}>{car.driveType}</span></div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      </div>
    );
  }

  // ─── RACING / COUNTDOWN / FINISHED ───
  return (
    <div style={{ ...pageStyle, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", padding: 0 }}>
      {/* HUD */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 1rem", flexShrink: 0, borderBottom: `2px solid ${C.border}` }}>
        <div style={{ fontFamily: FONT, fontSize: "1rem", color: C.gray }}>
          <span style={{ color: C.gold }}>P1</span> #{playerCar?.carNumber} {playerCar?.name}
        </div>
        <div style={{ fontFamily: FONT, fontSize: "1rem", color: C.gray }}>
          <span style={{ color: C.red }}>CPU</span> #{opponentCar?.carNumber} {opponentCar?.name}
        </div>
      </div>

      {/* Race view */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        {/* Track area */}
        <div style={{ height: "65%", position: "relative", overflow: "hidden", background: "#050510" }}>
          <canvas
            ref={canvasRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />

          {/* Opponent sprite */}
          {opponentCar && (
            <div
              ref={opponentOverlayRef}
              style={{
                position: "absolute",
                top: "60%",
                left: "calc(50% - 9%)",
                transform: "translate(-50%, -100%)",
                pointerEvents: "none",
                display: "none",
              }}
            >
              {opponentCar.pixelRear ? (
                <img
                  ref={opponentImgRef}
                  src={opponentCar.pixelRear}
                  alt="opponent"
                  style={{ width: "110px", imageRendering: "pixelated" }}
                />
              ) : (
                <div
                  ref={opponentFallbackRef}
                  style={{
                    width: "70px",
                    height: "39px",
                    background: C.red,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.white,
                    fontFamily: FONT,
                    fontSize: "8px",
                  }}
                >
                  #{opponentCar.carNumber}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dashboard */}
        <div style={{
          height: "35%",
          background: C.bgDark,
          position: "relative",
          overflow: "hidden",
          borderTop: `2px solid ${C.border}`,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}>
          {playerCar?.pixelDash ? (
            <img src={playerCar.pixelDash} alt="dashboard" style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center bottom", imageRendering: "pixelated", opacity: 0.6 }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: `linear-gradient(to bottom, ${C.bgMid}, ${C.bgDark})` }} />
          )}

          {/* Gauges overlay */}
          <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "2.5rem", alignItems: "flex-end" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: FONT, fontSize: "2rem", color: C.gold, textShadow: `0 0 10px rgba(255,215,0,0.5)`, lineHeight: 1 }}>
                {playerSpeed}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.75rem", color: C.midGray, marginTop: "0.2rem" }}>MPH</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: FONT, fontSize: "1rem", color: rpm > (playerCar?.redline || 6500) * 0.88 ? C.red : C.gray, textShadow: rpm > (playerCar?.redline || 6500) * 0.88 ? `0 0 10px rgba(255,0,0,0.5)` : "none", lineHeight: 1 }}>
                {rpm}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.75rem", color: C.midGray, marginTop: "0.2rem" }}>RPM</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: FONT, fontSize: "1.6rem", color: C.green, lineHeight: 1 }}>
                {gear}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.75rem", color: C.midGray, marginTop: "0.2rem" }}>GEAR</div>
            </div>
          </div>
        </div>

        {/* Christmas tree countdown overlay */}
        {phase === "countdown" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(13,13,26,0.7)", zIndex: 10, gap: "1rem" }}>
            {/* Tree lights */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
              {[3, 2, 1].map((n) => (
                <div key={n} style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: `2px solid ${C.border}`,
                  background: countdown <= n && countdown > 0
                    ? "#f59e0b"
                    : countdown === 0
                    ? C.green
                    : "#222",
                  boxShadow: countdown <= n && countdown > 0
                    ? "0 0 20px rgba(245,158,11,0.6)"
                    : countdown === 0
                    ? `0 0 20px rgba(0,255,0,0.6)`
                    : "none",
                  transition: "all 0.15s",
                }} />
              ))}
              {/* Green light */}
              <div style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                border: `2px solid ${C.border}`,
                background: countdown === 0 ? C.green : "#222",
                boxShadow: countdown === 0 ? "0 0 30px rgba(0,255,0,0.8)" : "none",
                transition: "all 0.15s",
              }} />
            </div>
            {/* Jump warning */}
            {jumped && (
              <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: C.red, textShadow: "0 0 10px rgba(255,0,0,0.5)" }}>
                JUMPED! +0.5s PENALTY
              </p>
            )}
            {countdown === 0 && !jumped && (
              <p style={{ fontFamily: FONT, fontSize: "1.5rem", color: C.green, textShadow: "0 0 20px rgba(0,255,0,0.6)" }}>GO!</p>
            )}

          </div>
        )}

        {/* Finish flash + checkered flag */}
        {finishFlash && (
          <div style={{ position: "absolute", inset: 0, zIndex: 15, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "finishFlashAnim 0.6s ease-out forwards" }}>
            {/* White flash */}
            <div style={{ position: "absolute", inset: 0, background: "white", animation: "flashFade 0.3s ease-out forwards" }} />
            {/* Checkered flag */}
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{
                width: "120px",
                height: "80px",
                background: `repeating-conic-gradient(#fff 0% 25%, #111 0% 50%) 0 0 / 24px 20px`,
                border: `3px solid ${C.gold}`,
                boxShadow: `0 0 30px rgba(255,215,0,0.5)`,
                animation: "flagDrop 0.4s ease-out forwards",
              }} />
              <p style={{ fontFamily: FONT, fontSize: "1.2rem", color: C.gold, marginTop: "0.8rem", textShadow: "0 0 20px rgba(255,215,0,0.6)" }}>
                FINISH!
              </p>
            </div>
          </div>
        )}
        <style>{`
          @keyframes flashFade { 0%{opacity:0.9} 100%{opacity:0} }
          @keyframes flagDrop { 0%{transform:translateY(-60px) scale(0.5);opacity:0} 60%{transform:translateY(5px) scale(1.05);opacity:1} 100%{transform:translateY(0) scale(1);opacity:1} }
          @keyframes finishFlashAnim { 0%{opacity:1} 80%{opacity:1} 100%{opacity:1} }
        `}</style>

        {/* Finish overlay */}
        {phase === "finished" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(13,13,26,0.85)", zIndex: 10 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: FONT,
                fontSize: "clamp(1.2rem, 5vw, 2.5rem)",
                color: winner === "player" ? C.gold : C.red,
                marginBottom: "1.5rem",
                textShadow: `0 0 20px ${winner === "player" ? "rgba(255,215,0,0.5)" : "rgba(255,0,0,0.5)"}`,
              }}>
                {winner === "player" ? "YOU WIN!" : "YOU LOSE"}
              </div>
              {/* Car images + times */}
              <div style={{ display: "flex", gap: "2rem", justifyContent: "center", alignItems: "center", marginBottom: "2rem" }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: C.gold, fontFamily: FONT, fontSize: "0.75rem", marginBottom: "0.5rem" }}>P1</p>
                  {playerCar?.pixelArt && (
                    <img src={playerCar.pixelArt} alt={playerCar.name} style={{ width: "220px", maxWidth: "40vw", imageRendering: "pixelated", marginBottom: "0.5rem" }} />
                  )}
                  <p style={{ color: C.gray, fontFamily: FONT, fontSize: "0.75rem", marginBottom: "0.3rem" }}>{playerCar?.name}</p>
                  <p style={{ color: C.white, fontFamily: FONT, fontSize: "1rem" }}>{(playerTime / 1000).toFixed(2)}s</p>
                  <p style={{ color: jumped ? C.red : C.green, fontFamily: FONT, fontSize: "0.6rem", marginTop: "0.3rem" }}>
                    {jumped ? "JUMP +0.5s" : `RT: ${(reactionTime / 1000).toFixed(3)}s`}
                  </p>
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.75rem", color: C.border }}>VS</div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: C.red, fontFamily: FONT, fontSize: "0.75rem", marginBottom: "0.5rem" }}>CPU</p>
                  {opponentCar?.pixelArt && (
                    <img src={opponentCar.pixelArt} alt={opponentCar.name} style={{ width: "220px", maxWidth: "40vw", imageRendering: "pixelated", marginBottom: "0.5rem" }} />
                  )}
                  <p style={{ color: C.gray, fontFamily: FONT, fontSize: "0.75rem", marginBottom: "0.3rem" }}>{opponentCar?.name}</p>
                  <p style={{ color: C.white, fontFamily: FONT, fontSize: "1rem" }}>{(opponentTime / 1000).toFixed(2)}s</p>
                  <p style={{ color: C.midGray, fontFamily: FONT, fontSize: "0.6rem", marginTop: "0.3rem" }}>
                    RT: {(oppReactionTime / 1000).toFixed(3)}s
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                <button onClick={startRace} style={goldBtnStyle}>REMATCH</button>
                <button onClick={() => { setPlayerCar(null); setOpponentCar(null); startSelectMusic(); setPhase("select"); }} style={pixelBtnStyle}>
                  NEW CAR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile accelerate button */}
      <div style={{ flexShrink: 0, padding: "0.5rem", textAlign: "center", borderTop: `2px solid ${C.border}` }}>
        <button
          onTouchStart={() => keyRef.current.add(" ")}
          onTouchEnd={() => keyRef.current.delete(" ")}
          onMouseDown={() => keyRef.current.add(" ")}
          onMouseUp={() => keyRef.current.delete(" ")}
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "0.8rem",
            background: phase === "racing" ? C.gold : C.bgMid,
            color: phase === "racing" ? C.bgDark : C.border,
            border: `2px solid ${phase === "racing" ? C.goldDark : C.border}`,
            fontFamily: FONT,
            fontSize: "0.85rem",
            cursor: "pointer",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          {phase === "racing" ? "HOLD TO ACCELERATE" : phase === "finished" ? (winner === "player" ? "WINNER!" : "TRY AGAIN") : "GET READY..."}
        </button>
      </div>
    </div>
  );
}

function CarCard({ car, label, isPlayer }: { car: RaceCar; label: string; isPlayer: boolean }) {
  const accent = isPlayer ? C.gold : C.red;
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontFamily: FONT, fontSize: "1rem", color: accent, marginBottom: "0.5rem" }}>{label}</p>
      <div style={{ width: "100%", aspectRatio: "16/9", background: "#111", overflow: "hidden", marginBottom: "0.75rem", border: `2px solid ${accent}` }}>
        {car.pixelArt ? (
          <img src={car.pixelArt} alt={car.name} style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" }} />
        ) : car.aiImage ? (
          <img src={car.aiImage} alt={car.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: C.border, fontFamily: FONT, fontSize: "0.75rem" }}>NO IMAGE</div>
        )}
      </div>
      <p style={{ color: accent, fontFamily: FONT, fontSize: "0.75rem" }}>#{car.carNumber}</p>
      <p style={{ color: C.white, fontFamily: FONT, fontSize: "0.85rem", margin: "0.3rem 0", lineHeight: 1.8 }}>{car.name}</p>
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center", fontFamily: FONT, fontSize: "0.75rem", color: C.midGray }}>
        <span>{car.hp} HP</span>
        <span>{car.weight.toLocaleString()} LBS</span>
      </div>
    </div>
  );
}

function DynoResults({ specs }: { specs: { label: string; value: string }[] }) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (revealed >= specs.length) return;
    const timer = setTimeout(() => {
      // Click sound
      try {
        const actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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

const FONT = "'Press Start 2P', monospace";

const pageStyle: React.CSSProperties = {
  background: C.bgDark,
  minHeight: "100vh",
  padding: "1.5rem",
  fontFamily: FONT,
};

const goldBtnStyle: React.CSSProperties = {
  padding: "0.7rem 1.5rem",
  background: C.gold,
  color: C.bgDark,
  border: `2px solid ${C.goldDark}`,
  fontFamily: FONT,
  fontSize: "0.75rem",
  cursor: "pointer",
  textTransform: "uppercase",
};

const pixelBtnStyle: React.CSSProperties = {
  padding: "0.7rem 1.5rem",
  background: C.bgMid,
  color: C.gray,
  border: `2px solid ${C.border}`,
  fontFamily: FONT,
  fontSize: "0.75rem",
  cursor: "pointer",
  textTransform: "uppercase",
};

const kbdStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0.15rem 0.4rem",
  background: C.bgMid,
  border: `1px solid ${C.border}`,
  fontFamily: FONT,
  fontSize: "0.75rem",
  color: C.gold,
};
