"use client";

/* eslint-disable @next/next/no-img-element */
import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { initAudio, startSelectMusic, stopSelectMusic, startMenuMusic, stopMenuMusic } from "@/lib/race-audio";
import { RaceCar, C, FONT, pageStyle, goldBtnStyle, pixelBtnStyle } from "@/lib/race-types";
import CarSelect from "./components/CarSelect";
import DragRace from "./components/DragRace";
import DynoRoom from "./components/DynoRoom";
import DetailTech from "./components/DetailTech";
import SmokeShow from "./components/SmokeShow";
import BmwShowroom from "./components/BmwShowroom";

type Phase = "loading" | "title" | "select" | "action-menu" | "score-entry";
type ActiveGame = "drag" | "dyno" | "detail" | "smokeshow" | "bmwshowroom" | null;

export type ScoreData = {
  game: string;
  score: number;
  metadata?: Record<string, unknown>;
};

function formatScore(game: string, score: number): string {
  if (game === "drag") return `${score.toFixed(2)}s`;
  if (game === "cruise") {
    const m = Math.floor(score / 60);
    const s = (score % 60).toFixed(1);
    return m > 0 ? `${m}:${s.padStart(4, "0")}` : `${s}s`;
  }
  if (game === "smokeshow") return `${Math.round(score)}%`;
  if (game === "detail") return `${Math.round(score)}/100`;
  if (game === "bmwshowroom") return `${Math.round(score)} PTS`;
  return String(score);
}

const GAME_LABELS: Record<string, string> = {
  drag: "DRAG RACE",
  cruise: "ROUTE 14 SPEED RUN",
  smokeshow: "SMOKE SHOW",
  detail: "DETAIL TECH",
  bmwshowroom: "BMW SHOWROOM",
};

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
  const scoreSubmit = searchParams.get("scoreSubmit");
  const [cars, setCars] = useState<RaceCar[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [playerCar, setPlayerCar] = useState<RaceCar | null>(null);
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);
  const [generating, setGenerating] = useState(false);
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [initials, setInitials] = useState(["", "", ""]);
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fetch cars (once on mount)
  useEffect(() => {
    const carId = preselectedCarId;
    fetch("/api/race?eligible=1")
      .then((r) => r.json())
      .then((data) => {
        const raceCars: RaceCar[] = (data.cars || []).map((c: Record<string, unknown>) => ({
          ...c,
          pixelArt: c.pixelArt || null,
          pixelDash: c.pixelDash || null,
          pixelDashFull: c.pixelDashFull || null,
          pixelRear: c.pixelRear || null,
          aiImage: c.aiImage || null,
          flipped: c.flipped || false,
        }));
        setCars(raceCars);

        // Handle Route 14 score submission return
        if (scoreSubmit === "1") {
          const game = searchParams.get("game") || "";
          const score = parseFloat(searchParams.get("score") || "0");
          const returnCarId = searchParams.get("car") || "";
          const carName = searchParams.get("carName") || "";
          const carPixelArt = searchParams.get("carPixelArt") || "";
          if (game && score > 0) {
            const target = raceCars.find((c) => c.id === returnCarId);
            if (target) setPlayerCar(target);
            else setPlayerCar({ id: returnCarId, name: carName, pixelArt: carPixelArt } as RaceCar);
            setScoreData({ game, score });
            setPhase("score-entry");
            window.history.replaceState({}, "", "/arcade");
            return;
          }
        }

        if (carId) {
          const target = raceCars.find((c) => c.id === carId);
          if (target) {
            setPlayerCar(target);
            initAudio();
            startMenuMusic();
            setPhase("action-menu");
            return;
          }
        }
        setPhase("title");
      })
      .catch(() => setPhase("title"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectCar = useCallback((car: RaceCar) => {
    setPlayerCar(car);
    stopSelectMusic();
    startMenuMusic();
    setPhase("action-menu");
    window.scrollTo(0, 0);
  }, []);

  const backToMenu = useCallback(() => {
    setActiveGame(null);
    startMenuMusic();
    setPhase("action-menu");
    window.scrollTo(0, 0);
  }, []);

  const onGameEnd = useCallback((data: ScoreData) => {
    setScoreData(data);
    setActiveGame(null);
    setInitials(["", "", ""]);
    setFullName("");
    setSubmitted(false);
    setPhase("score-entry");
    window.scrollTo(0, 0);
  }, []);

  const handleScoreSubmit = async () => {
    if (!scoreData || !playerCar || initials.some((c) => !c)) return;
    setSubmitting(true);
    try {
      await fetch("/api/arcade/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: scoreData.game,
          initials: initials.join(""),
          score: scoreData.score,
          carId: playerCar.id,
          carName: playerCar.name,
          carPixelArt: playerCar.pixelArt || null,
          fullName: fullName || null,
          metadata: scoreData.metadata || {},
        }),
      });
      setSubmitted(true);
    } catch {
      // silently fail
    }
    setSubmitting(false);
  };

  const handleInitialChange = (index: number, value: string) => {
    const letter = value.toUpperCase().replace(/[^A-Z]/g, "").slice(-1);
    const next = [...initials];
    next[index] = letter;
    setInitials(next);
    if (letter && index < 2) {
      const nextInput = document.getElementById(`initial-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleInitialKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !initials[index] && index > 0) {
      const prev = document.getElementById(`initial-${index - 1}`);
      prev?.focus();
    }
  };

  const handleGenerateAll = async () => {
    setGenerating(true);
    try {
      await fetch("/api/registrations/pixel-art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: true }),
      });
      const res = await fetch("/api/race?eligible=1");
      const data = await res.json();
      setCars(data.cars || []);
    } catch {}
    setGenerating(false);
  };

  // ─── ACTIVE GAME ───
  if (activeGame && playerCar) {
    switch (activeGame) {
      case "drag":
        return <DragRace playerCar={playerCar} cars={cars} onBack={backToMenu} onGameEnd={onGameEnd} />;
      case "dyno":
        return <DynoRoom playerCar={playerCar} onBack={backToMenu} />;
      case "detail":
        return <DetailTech playerCar={playerCar} onBack={backToMenu} onGameEnd={onGameEnd} />;
      case "smokeshow":
        return <SmokeShow playerCar={playerCar} onBack={backToMenu} onGameEnd={onGameEnd} />;
      case "bmwshowroom":
        return <BmwShowroom playerCar={playerCar} onBack={backToMenu} onGameEnd={onGameEnd} />;
    }
  }

  // ─── SCORE ENTRY ───
  if (phase === "score-entry" && scoreData) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: "center", maxWidth: "500px", margin: "0 auto" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.6rem", color: C.midGray, letterSpacing: "0.2em", marginBottom: "1.5rem" }}>
            {GAME_LABELS[scoreData.game] || scoreData.game.toUpperCase()}
          </p>

          <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: C.midGray, marginBottom: "0.5rem" }}>YOUR SCORE</p>
          <p style={{ fontFamily: FONT, fontSize: "clamp(1.5rem, 5vw, 2.5rem)", color: C.gold, marginBottom: "2rem", textShadow: "0 0 15px rgba(255,215,0,0.3)" }}>
            {formatScore(scoreData.game, scoreData.score)}
          </p>

          {!submitted ? (
            <>
              <p style={{ fontFamily: FONT, fontSize: "clamp(0.6rem, 1.8vw, 0.8rem)", color: C.white, marginBottom: "1.5rem" }}>
                ENTER YOUR INITIALS
              </p>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginBottom: "1.5rem" }}>
                {[0, 1, 2].map((i) => (
                  <input
                    key={i}
                    id={`initial-${i}`}
                    type="text"
                    maxLength={1}
                    value={initials[i]}
                    onChange={(e) => handleInitialChange(i, e.target.value)}
                    onKeyDown={(e) => handleInitialKeyDown(i, e)}
                    autoFocus={i === 0}
                    style={{
                      width: "60px",
                      height: "70px",
                      textAlign: "center",
                      fontFamily: FONT,
                      fontSize: "2rem",
                      color: C.gold,
                      background: C.bgMid,
                      border: `3px solid ${initials[i] ? C.gold : C.border}`,
                      outline: "none",
                      textTransform: "uppercase",
                    }}
                  />
                ))}
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <p style={{ fontFamily: FONT, fontSize: "0.45rem", color: C.midGray, marginBottom: "0.5rem" }}>YOUR NAME (OPTIONAL)</p>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder=""
                  maxLength={50}
                  style={{
                    width: "100%",
                    maxWidth: "280px",
                    padding: "0.5rem 0.75rem",
                    fontFamily: FONT,
                    fontSize: "0.6rem",
                    color: C.white,
                    background: C.bgMid,
                    border: `2px solid ${C.border}`,
                    outline: "none",
                    textAlign: "center",
                  }}
                />
              </div>

              <button
                onClick={handleScoreSubmit}
                disabled={submitting || initials.some((c) => !c)}
                style={{
                  ...goldBtnStyle,
                  fontSize: "0.9rem",
                  padding: "0.75rem 2.5rem",
                  opacity: submitting || initials.some((c) => !c) ? 0.5 : 1,
                  cursor: submitting || initials.some((c) => !c) ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "SAVING..." : "SUBMIT"}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontFamily: FONT, fontSize: "clamp(0.8rem, 2.5vw, 1.2rem)", color: C.gold, marginBottom: "0.5rem", animation: "blink8bit 0.5s step-end 3" }}>
                SCORE SAVED!
              </p>
              <p style={{ fontFamily: FONT, fontSize: "0.6rem", color: C.midGray, marginBottom: "2rem" }}>
                {initials.join("")}{fullName ? ` — ${fullName}` : ""}
              </p>
              <style>{`@keyframes blink8bit { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                <Link
                  href={`/arcade/leaderboard?game=${scoreData.game}`}
                  style={{ ...goldBtnStyle, textDecoration: "none", fontSize: "0.7rem", padding: "0.6rem 1.5rem" }}
                >
                  VIEW LEADERBOARD
                </Link>
                <button
                  onClick={backToMenu}
                  style={{ ...pixelBtnStyle, fontSize: "0.7rem", padding: "0.6rem 1.5rem" }}
                >
                  BACK TO GARAGE
                </button>
              </div>
            </>
          )}

          {!submitted && (
            <button
              onClick={backToMenu}
              style={{ background: "none", border: "none", color: C.midGray, fontFamily: FONT, fontSize: "0.6rem", cursor: "pointer", textDecoration: "underline", marginTop: "1.5rem", display: "block", margin: "1.5rem auto 0" }}
            >
              SKIP
            </button>
          )}
        </div>
      </div>
    );
  }

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
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/redline-garage.png?v=2)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          imageRendering: "pixelated",
        }} />
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, transparent 0%, transparent 60%, rgba(13,13,26,0.85) 80%, rgba(13,13,26,1) 100%)",
        }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: C.gold, letterSpacing: "0.25em" }}>CLCC ARCADE</p>
          <h1 style={{ fontFamily: FONT, fontSize: "clamp(1.1rem, 4vw, 1.8rem)", color: C.white, textShadow: "0 0 20px rgba(255,215,0,0.3)" }}>WELCOME TO REDLINE MOTOR CONDOS</h1>
          <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: C.midGray, lineHeight: 2 }}>{cars.length} VEHICLES IN THE GARAGE</p>
          <button
            onClick={() => {
              initAudio();
              startSelectMusic();
              setPhase("select");
              window.scrollTo(0, 0);
            }}
            style={{ ...goldBtnStyle, fontSize: "1rem", padding: "1rem 3rem", marginTop: "0.5rem" }}
          >
            ENTER GARAGE
          </button>
          <Link href="/arcade/leaderboard" style={{ fontFamily: FONT, fontSize: "0.6rem", color: C.gold, textDecoration: "underline", marginTop: "0.75rem" }}>
            LEADERBOARD
          </Link>
          <p style={{ fontFamily: FONT, fontSize: "0.6rem", color: C.midGray, margin: "0.75rem 0" }}>OR</p>
          <Link href="/8bit" style={{ ...goldBtnStyle, fontSize: "0.7rem", padding: "0.75rem 2rem", background: C.bgMid, color: C.midGray, border: `2px solid ${C.border}`, textDecoration: "none" }}>BACK TO THE CRYSTAL LAKE CAR SHOW HOME PAGE →</Link>
        </div>
      </div>
    );
  }

  // ─── CAR SELECT ───
  if (phase === "select") {
    return <CarSelect cars={cars} onSelect={selectCar} generating={generating} onGenerateAll={handleGenerateAll} />;
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
              <img src={playerCar.pixelArt} alt={playerCar.name} style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" as const, transform: "none" }} />
            )}
          </div>
        </div>
        <style>{`
          .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; max-width: 640px; margin: 0 auto; }
          @media (max-width: 600px) { .action-grid { grid-template-columns: 1fr; max-width: 320px; } }
        `}</style>
        <div className="action-grid">
          {[
            { label: "DRAG RACE", icon: "icon-drag-race", action: () => { stopMenuMusic(); setActiveGame("drag"); window.scrollTo(0, 0); } },
            { label: "ROUTE 14 SPEED RUN", icon: "icon-cruise", action: () => { stopMenuMusic(); window.location.href = `/games/racer-classic/v5.carshow.html?car=${playerCar.id}`; } },
            { label: "DYNO RUN AT URW", icon: "sponsor-a090b21c-c91c-4d9f-add9-510c62e455ad", action: () => { stopMenuMusic(); setActiveGame("dyno"); window.scrollTo(0, 0); } },
            { label: "DETAIL YOUR CAR AT DETAIL TECH", icon: "icon-detail", action: () => { stopMenuMusic(); setActiveGame("detail"); window.scrollTo(0, 0); } },
            { label: "SMOKE SHOW AT IVY HALL", icon: "icon-smokeshow", iconSize: 120, action: () => { stopMenuMusic(); setActiveGame("smokeshow"); window.scrollTo(0, 0); } },
            { label: "TAKE A DRIVE TO ANDERSON BMW", icon: "icon-anderson-bmw", iconSize: 120, action: () => { stopMenuMusic(); setActiveGame("bmwshowroom"); window.scrollTo(0, 0); } },
          ].map((item) => (
            <button key={item.label} onClick={item.action} style={{ ...pixelBtnStyle, width: "100%", padding: "0.75rem 1rem", fontSize: "0.75rem", background: C.bgMid, color: C.gold, border: `2px solid ${C.goldDark}`, display: "flex", alignItems: "center", gap: "0.75rem", textAlign: "left", minHeight: "120px" }}>
              <div style={{ width: "96px", height: "96px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/${item.icon}.png?v=6`}
                  alt=""
                  style={{ maxWidth: "96px", maxHeight: "96px", objectFit: "contain", imageRendering: "pixelated" }}
                />
              </div>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: "1.5rem", display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/arcade/leaderboard" style={{ fontFamily: FONT, fontSize: "0.7rem", color: C.gold, textDecoration: "underline" }}>
            LEADERBOARD
          </Link>
          <button onClick={() => { stopMenuMusic(); startSelectMusic(); setPlayerCar(null); setPhase("select"); window.scrollTo(0, 0); window.history.replaceState({}, "", "/arcade"); }} style={{ background: "none", border: "none", color: C.midGray, fontFamily: FONT, fontSize: "0.7rem", cursor: "pointer", textDecoration: "underline" }}>
            PICK DIFFERENT CAR
          </button>
        </div>
      </div>
    );
  }

  return null;
}
