"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { initAudio, startEngine, updateEngine, stopEngine } from "@/lib/race-audio";
import { RaceCar, C, FONT, pageStyle, goldBtnStyle, pixelBtnStyle } from "@/lib/race-types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const BMW_BG = `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/anderson-bmw-exterior.png`;
const SHOWROOM_BG = `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/anderson-bmw-showroom.png`;
const ANDERSON_LOGO = `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/sponsor-anderson-bmw.png`;

type BmwModel = {
  name: string;
  fullName: string;
  year: number;
  hp: number;
  torque: number;
  msrp: number;
  topSpeed: number;
  engine: string;
  drivetrain: string;
  weight: number;
  pixelArt: string;
  pixelInterior: string;
};

const BMW_MODELS: BmwModel[] = [
  {
    name: "2002",
    fullName: "1974 BMW 2002",
    year: 1974,
    hp: 100,
    torque: 106,
    msrp: 4500,
    topSpeed: 107,
    engine: "2.0L Inline-4",
    drivetrain: "RWD",
    weight: 2360,
    pixelArt: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/bmw-2002.png`,
    pixelInterior: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/bmw-2002-interior.png`,
  },
  {
    name: "M6",
    fullName: "1987 BMW M6 (E24)",
    year: 1987,
    hp: 256,
    torque: 243,
    msrp: 56000,
    topSpeed: 156,
    engine: "3.5L Inline-6",
    drivetrain: "RWD",
    weight: 3440,
    pixelArt: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/bmw-e24-m6.png`,
    pixelInterior: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/bmw-e24-m6-interior.png`,
  },
  {
    name: "M3",
    fullName: "2003 BMW M3 (E46)",
    year: 2003,
    hp: 333,
    torque: 262,
    msrp: 47000,
    topSpeed: 155,
    engine: "3.2L Inline-6",
    drivetrain: "RWD",
    weight: 3415,
    pixelArt: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/bmw-e46-m3.png`,
    pixelInterior: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/bmw-e46-m3-interior.png`,
  },
  {
    name: "M2",
    fullName: "2026 BMW M2",
    year: 2026,
    hp: 473,
    torque: 406,
    msrp: 64900,
    topSpeed: 155,
    engine: "3.0L Twin-Turbo I6",
    drivetrain: "RWD",
    weight: 3715,
    pixelArt: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/bmw-m2.png`,
    pixelInterior: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/bmw-m2-interior.png`,
  },
  {
    name: "X5 M Competition",
    fullName: "2026 BMW X5 M Competition",
    year: 2026,
    hp: 617,
    torque: 553,
    msrp: 113100,
    topSpeed: 177,
    engine: "4.4L Twin-Turbo V8",
    drivetrain: "AWD",
    weight: 5370,
    pixelArt: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/bmw-x5m.png`,
    pixelInterior: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/bmw-x5m-interior.png`,
  },
  {
    name: "M5",
    fullName: "2026 BMW M5",
    year: 2026,
    hp: 717,
    torque: 738,
    msrp: 112700,
    topSpeed: 190,
    engine: "4.4L Twin-Turbo V8 Hybrid",
    drivetrain: "AWD",
    weight: 5390,
    pixelArt: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/bmw-m5.png`,
    pixelInterior: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/bmw-m5-interior.png`,
  },
];

const QUESTIONS: { key: keyof BmwModel; label: string; unit: string; min: number; max: number; step: number; format?: string }[] = [
  { key: "hp", label: "GUESS THE HORSEPOWER", unit: "HP", min: 80, max: 800, step: 10 },
  { key: "msrp", label: "GUESS THE ORIGINAL MSRP", unit: "$", min: 3000, max: 150000, step: 500, format: "currency" },
];

function formatValue(val: number, format?: string): string {
  if (format === "currency") return "$" + val.toLocaleString();
  return val.toLocaleString();
}

function scoreGuess(guess: number, actual: number): { points: number; label: string; color: string } {
  const pct = Math.abs(guess - actual) / actual;
  if (pct <= 0.05) return { points: 100, label: "DEAD ON!", color: C.gold };
  if (pct <= 0.15) return { points: 75, label: "CLOSE!", color: "#4ade80" };
  if (pct <= 0.25) return { points: 50, label: "NOT BAD", color: C.white };
  if (pct <= 0.40) return { points: 25, label: "EHHHH", color: C.midGray };
  return { points: 0, label: "WAY OFF", color: C.red };
}

type GamePhase = "arriving" | "visiting" | "welcome" | "showroom" | "score";

interface BmwShowroomProps {
  playerCar: RaceCar;
  onBack: () => void;
  onGameEnd?: (data: { game: string; score: number; metadata?: Record<string, unknown> }) => void;
}

export default function BmwShowroom({ playerCar, onBack, onGameEnd }: BmwShowroomProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>("arriving");
  const [carIndex, setCarIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const [showingInterior, setShowingInterior] = useState(false);
  const [revealResult, setRevealResult] = useState<{ points: number; label: string; color: string; guess: number; actual: number; format?: string } | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [locked, setLocked] = useState(false);

  // Canvas refs for arrival animation
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const carImgRef = useRef<HTMLImageElement | null>(null);
  const phaseRef = useRef<GamePhase>("arriving");
  const carXRef = useRef(-200);
  const driverXRef = useRef(0);
  const driverYRef = useRef(0);
  const driverPhaseRef = useRef<"hidden" | "exitCar" | "walkToFront" | "walkToDoor" | "inside">("hidden");
  const driverFrameRef = useRef(0);
  const visitTimerRef = useRef(0);

  const currentCar = BMW_MODELS[carIndex];
  const currentQuestion = QUESTIONS[questionIndex];

  // Preload images
  useEffect(() => {
    const bg = new Image(); bg.crossOrigin = "anonymous"; bg.src = BMW_BG;
    bgImgRef.current = bg;
    const car = new Image(); car.crossOrigin = "anonymous";
    if (playerCar.pixelArt) car.src = playerCar.pixelArt;
    carImgRef.current = car;
    initAudio();
  }, [playerCar]);

  // Draw driver
  const drawDriver = useCallback((ctx: CanvasRenderingContext2D, x: number, groundY: number, facingLeft: boolean, frame: number) => {
    const w = 14, h = 30;
    const y = groundY - h;
    ctx.fillStyle = "#4477cc";
    ctx.fillRect(x - w / 2, y, w, 16);
    ctx.fillStyle = "#333";
    ctx.fillRect(x - w / 2, y + 16, w, 14);
    ctx.fillStyle = "#dda";
    ctx.fillRect(x - 5, y - 10, 10, 10);
    ctx.fillStyle = "#432";
    ctx.fillRect(x - 5, y - 12, 10, 4);
    const legOffset = frame % 2 === 0 ? -4 : 4;
    ctx.fillStyle = "#222";
    ctx.fillRect(x + (facingLeft ? legOffset : -legOffset) - 2, y + 28, 5, 4);
  }, []);

  // Arrival animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || gamePhase !== "arriving") return;

    const carW_pct = 0.35;
    const groundY_pct = 1.0;
    const buildingDoorX_pct = 0.5;
    const carStopX_pct = 0.38;

    phaseRef.current = "arriving";
    carXRef.current = -200;
    driverPhaseRef.current = "hidden";
    visitTimerRef.current = 0;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = canvas.width, H = canvas.height;
      const groundY = H * groundY_pct;

      ctx.fillStyle = "#87CEEB";
      ctx.fillRect(0, 0, W, H);
      const bg = bgImgRef.current;
      if (bg?.complete && bg.naturalWidth > 0) {
        ctx.drawImage(bg, 0, 0, W, H);
      }

      const carImg = carImgRef.current;
      let carW = 0, carH = 0, carX = carXRef.current;
      if (carImg?.complete && carImg.naturalWidth > 0) {
        carW = W * carW_pct;
        carH = carW * (carImg.height / carImg.width);
        const carY = groundY - carH;
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
          const doorY = groundY - carH * 0.8;
          const frontOfCarX = carXRef.current + carW * 0.85;

          if (driverPhaseRef.current === "exitCar") {
            if (visitTimerRef.current > 20) {
              driverPhaseRef.current = "walkToFront";
              driverFrameRef.current = 0;
            }
          } else if (driverPhaseRef.current === "walkToFront") {
            driverXRef.current += 2;
            driverFrameRef.current++;
            if (driverXRef.current >= frontOfCarX) {
              driverPhaseRef.current = "walkToDoor";
            }
          } else if (driverPhaseRef.current === "walkToDoor") {
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
              stopEngine();
              // Transition to welcome after a brief pause
              setTimeout(() => {
                setGamePhase("welcome");
              }, 800);
            }
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
          const facingLeft = false;
          drawDriver(ctx, driverXRef.current, driverYRef.current, facingLeft, Math.floor(driverFrameRef.current / 8));
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); };
  }, [gamePhase, playerCar, drawDriver]);

  // Auto-advance from welcome to showroom
  useEffect(() => {
    if (gamePhase === "welcome") {
      const timer = setTimeout(() => {
        setCarIndex(0);
        setQuestionIndex(0);
        resetSlider(0, 0);
        setGamePhase("showroom");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [gamePhase]);

  const resetSlider = (ci: number, qi: number) => {
    const q = QUESTIONS[qi];
    const car = BMW_MODELS[ci];
    const actual = car[q.key] as number;
    // Start slider at midpoint of range
    const mid = Math.round((q.min + q.max) / 2 / q.step) * q.step;
    setSliderValue(mid);
    setRevealResult(null);
    setLocked(false);
    setShowingInterior(false);
  };

  const handleLockIn = useCallback(() => {
    if (locked) return;
    setLocked(true);
    const actual = currentCar[currentQuestion.key] as number;
    const result = scoreGuess(sliderValue, actual);
    setRevealResult({ ...result, guess: sliderValue, actual, format: currentQuestion.format });
    setTotalScore(prev => prev + result.points);
  }, [locked, sliderValue, currentCar, currentQuestion]);

  const handleNext = useCallback(() => {
    const nextQ = questionIndex + 1;
    if (nextQ < QUESTIONS.length) {
      // Next question for same car
      setQuestionIndex(nextQ);
      resetSlider(carIndex, nextQ);
    } else {
      // Next car
      const nextC = carIndex + 1;
      if (nextC < BMW_MODELS.length) {
        setCarIndex(nextC);
        setQuestionIndex(0);
        resetSlider(nextC, 0);
      } else {
        // Done
        setGamePhase("score");
      }
    }
  }, [questionIndex, carIndex]);

  // Score screen
  const maxScore = BMW_MODELS.length * QUESTIONS.length * 100;
  const scoreLabel = totalScore >= 1000 ? "BMW MASTER TECHNICIAN"
    : totalScore >= 750 ? "M POWER ENTHUSIAST"
    : totalScore >= 500 ? "SUNDAY DRIVER"
    : totalScore >= 250 ? "MAYBE STICK TO TOYOTAS"
    : "DO YOU EVEN DRIVE?";
  const scoreLabelColor = totalScore >= 750 ? C.gold : totalScore >= 500 ? C.white : C.midGray;

  // ─── ARRIVAL PHASE ───
  if (gamePhase === "arriving" || gamePhase === "visiting") {
    return (
      <div style={pageStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div style={{ textAlign: "center", marginBottom: "0.25rem" }}>
          <img src={ANDERSON_LOGO} alt="Anderson BMW" style={{ maxWidth: "100px", height: "auto", imageRendering: "pixelated", display: "block", margin: "0 auto 0.3rem" }} />
          <p style={{ fontFamily: FONT, fontSize: "clamp(0.7rem, 2vw, 1rem)", color: C.gold, margin: "0" }}>ANDERSON BMW</p>
        </div>
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          style={{ width: "100%", maxWidth: "800px", display: "block", margin: "0 auto", imageRendering: "pixelated", border: `1px solid ${C.border}`, touchAction: "none" }}
        />
        <p style={{ fontFamily: FONT, fontSize: "0.5rem", color: C.midGray, textAlign: "center", marginTop: "0.5rem" }}>
          Pulling up to Anderson BMW...
        </p>
        <button
          onClick={() => { cancelAnimationFrame(animRef.current); stopEngine(); onBack(); }}
          style={{ background: "none", border: "none", color: C.midGray, fontFamily: FONT, fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline", display: "block", margin: "1.5rem auto 0" }}
        >
          BACK TO GARAGE
        </button>
      </div>
    );
  }

  // ─── WELCOME PHASE ───
  if (gamePhase === "welcome") {
    return (
      <div style={pageStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div style={{ textAlign: "center", marginTop: "3rem" }}>
          <img src={ANDERSON_LOGO} alt="Anderson BMW" style={{ maxWidth: "120px", height: "auto", imageRendering: "pixelated", display: "block", margin: "0 auto 1.5rem" }} />
          <h1 style={{ fontFamily: FONT, fontSize: "clamp(0.8rem, 2.5vw, 1.2rem)", color: C.gold, margin: "0 0 1rem" }}>
            WELCOME TO ANDERSON BMW
          </h1>
          <p style={{ fontFamily: FONT, fontSize: "clamp(0.5rem, 1.5vw, 0.65rem)", color: C.midGray, lineHeight: 2, maxWidth: "500px", margin: "0 auto" }}>
            HOW WELL DO YOU KNOW YOUR BMWS?
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.5rem", color: C.border, marginTop: "1.5rem", animation: "blink8bit 1s step-end infinite" }}>
            GET READY...
          </p>
          <style>{`@keyframes blink8bit { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
        </div>
      </div>
    );
  }

  // ─── SHOWROOM PHASE ───
  if (gamePhase === "showroom" && currentCar) {
    return (
      <div style={pageStyle}>
        {/* Car display area */}
        <div style={{
          maxWidth: "800px",
          margin: "0 auto 1rem",
          aspectRatio: "16/9",
          background: showingInterior ? "#111" : "#0d0d1a",
          border: `2px solid ${C.border}`,
          overflow: "hidden",
          position: "relative",
          imageRendering: "pixelated",
        }}>
          {/* Showroom background with slight darkening */}
          {!showingInterior && (
            <>
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: `url(${SHOWROOM_BG})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                imageRendering: "pixelated",
              }} />
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(0,0,0,0.25)",
                pointerEvents: "none",
              }} />
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={showingInterior ? currentCar.pixelInterior : currentCar.pixelArt}
            alt={currentCar.fullName}
            style={{
              display: "block",
              width: showingInterior ? "100%" : "38%",
              height: showingInterior ? "100%" : "auto",
              maxHeight: showingInterior ? "100%" : "55%",
              objectFit: showingInterior ? "cover" : "contain",
              position: showingInterior ? "relative" : "absolute",
              bottom: showingInterior ? "auto" : "-5%",
              left: showingInterior ? "auto" : "50%",
              transform: showingInterior ? "none" : "translateX(-50%)",
              zIndex: 1,
              imageRendering: "pixelated",
            }}
          />
        </div>

        {/* Progress + score */}
        <p style={{ fontFamily: FONT, fontSize: "clamp(0.55rem, 1.5vw, 0.7rem)", color: C.midGray, textAlign: "center", marginTop: "0.75rem", marginBottom: "0.25rem", letterSpacing: "0.1em" }}>
          CAR {carIndex + 1} OF {BMW_MODELS.length} &middot; SCORE: {totalScore}
        </p>
        {BMW_MODELS.length - carIndex > 1 && (
          <p style={{ fontFamily: FONT, fontSize: "clamp(0.4rem, 1.1vw, 0.5rem)", color: C.gold, textAlign: "center", marginBottom: "0.25rem", opacity: 0.7 }}>
            {BMW_MODELS.length - carIndex - 1} {BMW_MODELS.length - carIndex - 1 === 1 ? "CAR" : "CARS"} LEFT TO GO!
          </p>
        )}

        {/* Car name + sit inside link */}
        <div style={{ textAlign: "center", margin: "0.75rem 0 1rem" }}>
          <h2 style={{ fontFamily: FONT, fontSize: "clamp(0.7rem, 2vw, 1rem)", color: C.gold, margin: "0 0 0.3rem" }}>
            {currentCar.fullName}
          </h2>
          <button
            onClick={() => setShowingInterior(!showingInterior)}
            style={{ background: "none", border: "none", fontFamily: FONT, fontSize: "0.55rem", color: C.midGray, cursor: "pointer", textDecoration: "underline", padding: "0.25rem 0" }}
          >
            {showingInterior ? "GET OUT" : "SIT INSIDE"}
          </button>
        </div>

        {/* Question area */}
        {!showingInterior && (
          <div style={{ maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
            {!revealResult ? (
              <>
                <p style={{ fontFamily: FONT, fontSize: "clamp(0.55rem, 1.5vw, 0.7rem)", color: C.white, marginBottom: "1rem" }}>
                  {currentQuestion.label}
                </p>

                {/* Current value display */}
                <p style={{ fontFamily: FONT, fontSize: "clamp(1rem, 3vw, 1.5rem)", color: C.gold, margin: "0 0 0.75rem" }}>
                  {formatValue(sliderValue, currentQuestion.format)}
                </p>

                {/* Slider */}
                <div style={{ padding: "0 1rem", marginBottom: "1rem" }}>
                  <input
                    type="range"
                    min={currentQuestion.min}
                    max={currentQuestion.max}
                    step={currentQuestion.step}
                    value={sliderValue}
                    onChange={(e) => setSliderValue(Number(e.target.value))}
                    style={{
                      width: "100%",
                      height: "32px",
                      cursor: "pointer",
                      accentColor: C.gold,
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT, fontSize: "clamp(0.5rem, 1.2vw, 0.6rem)", color: C.midGray, marginTop: "0.25rem" }}>
                    <span>{formatValue(currentQuestion.min, currentQuestion.format)}</span>
                    <span>{formatValue(currentQuestion.max, currentQuestion.format)}</span>
                  </div>
                </div>

                {/* Lock in button */}
                <button
                  onClick={handleLockIn}
                  style={{ ...goldBtnStyle, fontSize: "0.8rem", padding: "0.75rem 2.5rem" }}
                >
                  LOCK IT IN
                </button>
              </>
            ) : (
              <>
                {/* Reveal */}
                <p style={{ fontFamily: FONT, fontSize: "clamp(0.8rem, 2.5vw, 1.2rem)", color: revealResult.color, margin: "0 0 0.5rem", textShadow: revealResult.points >= 75 ? `0 0 15px ${revealResult.color}` : "none" }}>
                  {revealResult.label}
                </p>
                <p style={{ fontFamily: FONT, fontSize: "clamp(0.65rem, 1.8vw, 0.8rem)", color: C.midGray, margin: "0 0 0.5rem", lineHeight: 2.2 }}>
                  YOU GUESSED: <span style={{ color: C.white }}>{formatValue(revealResult.guess, revealResult.format)}</span>
                </p>
                <p style={{ fontFamily: FONT, fontSize: "clamp(0.65rem, 1.8vw, 0.8rem)", color: C.midGray, margin: "0 0 0.75rem", lineHeight: 2.2 }}>
                  ACTUAL: <span style={{ color: C.gold }}>{formatValue(revealResult.actual, revealResult.format)}</span>
                </p>
                <p style={{ fontFamily: FONT, fontSize: "clamp(0.8rem, 2.2vw, 1rem)", color: revealResult.color, margin: "0 0 1rem" }}>
                  +{revealResult.points} PTS
                </p>

                {/* Next button */}
                <button
                  onClick={handleNext}
                  style={{ ...goldBtnStyle, fontSize: "0.7rem", padding: "0.6rem 2rem" }}
                >
                  {carIndex === BMW_MODELS.length - 1 && questionIndex === QUESTIONS.length - 1 ? "SEE RESULTS" : "NEXT"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Back button */}
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: C.midGray, fontFamily: FONT, fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline", display: "block", margin: "1.5rem auto 0" }}
        >
          BACK TO GARAGE
        </button>
      </div>
    );
  }

  // ─── SCORE PHASE ───
  if (gamePhase === "score") {
    const pct = Math.round((totalScore / maxScore) * 100);
    return (
      <div style={pageStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <img src={ANDERSON_LOGO} alt="Anderson BMW" style={{ maxWidth: "180px", height: "auto", imageRendering: "pixelated", display: "block", margin: "0 auto 1.5rem" }} />

          <p style={{ fontFamily: FONT, fontSize: "clamp(1.5rem, 4vw, 2.5rem)", color: C.gold, margin: "0 0 0.5rem", textShadow: totalScore >= 1000 ? "0 0 20px rgba(255,215,0,0.4)" : "none" }}>
            {totalScore}<span style={{ fontSize: "0.6rem", color: C.midGray }}> / {maxScore}</span>
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: C.midGray, margin: "0 0 1rem" }}>
            {pct}% ACCURACY
          </p>
          <p style={{ fontFamily: FONT, fontSize: "clamp(0.6rem, 1.8vw, 0.85rem)", color: scoreLabelColor, letterSpacing: "0.15em", margin: "0 0 2rem" }}>
            {scoreLabel}
          </p>

          {onGameEnd && (
            <button
              onClick={() => onGameEnd({ game: "bmwshowroom", score: totalScore, metadata: { maxScore } })}
              style={{ ...goldBtnStyle, background: "#22c55e", border: "2px solid #166534", marginBottom: "1rem" }}
            >
              SAVE SCORE
            </button>
          )}

          <button
            onClick={onBack}
            style={{ background: "none", border: "none", color: C.midGray, fontFamily: FONT, fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline", marginTop: "0.5rem" }}
          >
            BACK TO GARAGE
          </button>
        </div>
      </div>
    );
  }

  return null;
}
