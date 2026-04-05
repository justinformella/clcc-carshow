"use client";

/* eslint-disable @next/next/no-img-element */
import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { initAudio, startSelectMusic, stopSelectMusic } from "@/lib/race-audio";
import { RaceCar, C, FONT, pageStyle, goldBtnStyle, pixelBtnStyle } from "@/lib/race-types";
import CarSelect from "./components/CarSelect";
import DragRace from "./components/DragRace";
import DynoRoom from "./components/DynoRoom";
import DetailTech from "./components/DetailTech";

type Phase = "loading" | "title" | "select" | "action-menu";
type ActiveGame = "drag" | "dyno" | "detail" | null;

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
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);
  const [generating, setGenerating] = useState(false);

  // Fetch cars
  useEffect(() => {
    fetch("/api/race")
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
        if (preselectedCarId) {
          const target = raceCars.find((c) => c.id === preselectedCarId);
          if (target) {
            setPlayerCar(target);
            setPhase("action-menu");
            return;
          }
        }
        setPhase("title");
      })
      .catch(() => setPhase("title"));
  }, [preselectedCarId]);

  const selectCar = useCallback((car: RaceCar) => {
    setPlayerCar(car);
    setPhase("action-menu");
  }, []);

  const backToMenu = useCallback(() => {
    setActiveGame(null);
    setPhase("action-menu");
  }, []);

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

  // ─── ACTIVE GAME ───
  if (activeGame && playerCar) {
    switch (activeGame) {
      case "drag":
        return <DragRace playerCar={playerCar} cars={cars} onBack={backToMenu} />;
      case "dyno":
        return <DynoRoom playerCar={playerCar} onBack={backToMenu} />;
      case "detail":
        return <DetailTech playerCar={playerCar} onBack={backToMenu} />;
    }
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
              <img src={playerCar.pixelArt} alt={playerCar.name} style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" as const, transform: playerCar.flipped ? "scaleX(-1)" : "none" }} />
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", maxWidth: "320px", margin: "0 auto" }}>
          <button onClick={() => setActiveGame("drag")} style={{ ...pixelBtnStyle, width: "100%", padding: "1rem", fontSize: "1rem", background: C.bgMid, color: C.gold, border: `2px solid ${C.goldDark}` }}>
            DRAG RACE
          </button>
          <button onClick={() => setActiveGame("dyno")} style={{ ...pixelBtnStyle, width: "100%", padding: "1rem", fontSize: "1rem", background: C.bgMid, color: C.gold, border: `2px solid ${C.goldDark}` }}>
            HIT THE DYNO AT URW
          </button>
          <button onClick={() => setActiveGame("detail")} style={{ ...pixelBtnStyle, width: "100%", padding: "1rem", fontSize: "1rem", background: C.bgMid, color: C.gold, border: `2px solid ${C.goldDark}` }}>
            DETAIL YOUR CAR AT DETAIL TECH
          </button>
          <button onClick={() => {
            stopSelectMusic();
            window.location.href = `/games/racer-classic/v5.carshow.html?car=${playerCar.id}`;
          }} style={{ ...pixelBtnStyle, width: "100%", padding: "1rem", fontSize: "1rem", background: C.bgMid, color: C.gold, border: `2px solid ${C.goldDark}` }}>
            CRUISE ROUTE 14
          </button>
          <button onClick={() => { setPlayerCar(null); setPhase("select"); }} style={{ background: "none", border: "none", color: C.midGray, fontFamily: FONT, fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline", marginTop: "1rem" }}>
            PICK DIFFERENT CAR
          </button>
        </div>
      </div>
    );
  }

  return null;
}
