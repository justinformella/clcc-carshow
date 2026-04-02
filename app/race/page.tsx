"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";

type RaceCar = {
  id: string;
  carNumber: number;
  name: string;
  color: string;
  owner: string;
  hp: number;
  weight: number;
  pwr: number;
  pixelArt: string | null;
  pixelDash: string | null;
  aiImage: string | null;
};

type Phase = "loading" | "select" | "countdown" | "racing" | "finished";

export default function RacePage() {
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
  const [generating, setGenerating] = useState(false);

  const animRef = useRef<number>(0);
  const startRef = useRef(0);
  const roadRef = useRef<HTMLDivElement>(null);
  const keyRef = useRef<Set<string>>(new Set());

  // Fetch cars
  useEffect(() => {
    fetch("/api/race")
      .then((r) => r.json())
      .then((data) => {
        const raceCars: RaceCar[] = (data.cars || []).map((c: Record<string, unknown>) => ({
          ...c,
          pixelArt: c.pixelArt || null,
          pixelDash: c.pixelDash || null,
          aiImage: c.aiImage || null,
        }));
        setCars(raceCars);
        setPhase("select");
      })
      .catch(() => setPhase("select"));
  }, []);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => keyRef.current.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keyRef.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const selectCar = useCallback((car: RaceCar) => {
    setPlayerCar(car);
    // Pick random opponent
    const others = cars.filter((c) => c.id !== car.id);
    const opp = others[Math.floor(Math.random() * others.length)] || car;
    setOpponentCar(opp);
  }, [cars]);

  const startRace = useCallback(() => {
    if (!playerCar || !opponentCar) return;
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

    let c = 3;
    const interval = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(interval);
        setPhase("racing");
        startRef.current = performance.now();

        const FINISH = 1000; // distance units
        const playerMaxSpeed = (playerCar.hp / (playerCar.weight / 1000)) * 0.15;
        const oppMaxSpeed = (opponentCar.hp / (opponentCar.weight / 1000)) * 0.15;
        let pPos = 0, oPos = 0, pSpeed = 0, oSpeed = 0;
        let pGear = 1, pRpm = 800;
        let pFinish = 0, oFinish = 0;
        let roadOffset = 0;

        const animate = (now: number) => {
          const elapsed = now - startRef.current;
          const dt = 1 / 60;

          // Player acceleration — hold space/up to accelerate
          const accel = keyRef.current.has(" ") || keyRef.current.has("arrowup");

          if (accel && !pFinish) {
            pRpm = Math.min(pRpm + 120, 7000);
            const gearFactor = 1 - (pGear - 1) * 0.12;
            const rpmFactor = Math.min(pRpm / 5000, 1.2);
            pSpeed = Math.min(pSpeed + playerMaxSpeed * dt * gearFactor * rpmFactor * 0.4, playerMaxSpeed);
          } else {
            pRpm = Math.max(pRpm - 60, 800);
            pSpeed = Math.max(pSpeed - 0.3, 0);
          }

          // Auto shift for player
          if (pRpm > 6500 && pGear < 5) {
            pGear++;
            pRpm = 3000;
          }

          // Opponent AI — smooth acceleration with slight variation
          if (!oFinish) {
            const oppAccelCurve = Math.min(elapsed / 3000, 1);
            const wobble = Math.sin(elapsed * 0.002) * 0.05;
            oSpeed = oppMaxSpeed * oppAccelCurve * (0.85 + wobble);
          }

          pPos += pSpeed * dt * 60;
          oPos += oSpeed * dt * 60;

          if (pPos >= FINISH && !pFinish) { pFinish = elapsed; }
          if (oPos >= FINISH && !oFinish) { oFinish = elapsed; }

          // Road scroll
          roadOffset = (roadOffset + pSpeed * 2) % 40;
          if (roadRef.current) {
            roadRef.current.style.backgroundPosition = `0 ${roadOffset}px`;
          }

          setPlayerPos(Math.min(pPos / FINISH * 100, 100));
          setOpponentPos(Math.min(oPos / FINISH * 100, 100));
          setPlayerSpeed(Math.round(pSpeed * 15));
          setOpponentSpeed(Math.round(oSpeed * 15));
          setGear(pGear);
          setRpm(Math.round(pRpm));

          if (pFinish && oFinish) {
            setWinner(pFinish < oFinish ? "player" : "opponent");
            setPlayerTime(pFinish);
            setOpponentTime(oFinish);
            setPhase("finished");
            return;
          }

          if (elapsed < 30000) {
            animRef.current = requestAnimationFrame(animate);
          } else {
            setWinner(pPos > oPos ? "player" : "opponent");
            setPlayerTime(30000);
            setOpponentTime(30000);
            setPhase("finished");
          }
        };

        animRef.current = requestAnimationFrame(animate);
      }
    }, 1000);
  }, [playerCar, opponentCar]);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const handleGenerateAll = async () => {
    setGenerating(true);
    try {
      await fetch("/api/registrations/pixel-art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: true }),
      });
      // Reload cars
      const res = await fetch("/api/race");
      const data = await res.json();
      setCars(data.cars || []);
    } catch {}
    setGenerating(false);
  };

  // ─── LOADING ───
  if (phase === "loading") {
    return <div style={pageStyle}><p style={{ color: "#555", textAlign: "center", paddingTop: "40vh" }}>Loading garage...</p></div>;
  }

  // ─── CAR SELECT ───
  if (phase === "select") {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Link href="/" style={{ color: "#c9a84c", textDecoration: "none", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.2em" }}>CLCC</Link>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", color: "#fff", margin: "0.5rem 0", fontWeight: 400 }}>
            Choose Your Ride
          </h1>
          <p style={{ color: "#555", fontSize: "0.8rem" }}>{cars.length} vehicles in the garage</p>
          {cars.some((c) => !c.pixelArt) && (
            <button onClick={handleGenerateAll} disabled={generating} style={{ marginTop: "0.75rem", padding: "0.4rem 1rem", background: "rgba(255,255,255,0.06)", color: "#c9a84c", border: `1px solid rgba(201,168,76,0.3)`, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", cursor: generating ? "wait" : "pointer", opacity: generating ? 0.5 : 1 }}>
              {generating ? "Generating Pixel Art..." : `Generate Pixel Art (${cars.filter((c) => !c.pixelArt).length} remaining)`}
            </button>
          )}
        </div>

        {playerCar && opponentCar ? (
          /* Matchup screen */
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "1.5rem", alignItems: "center", marginBottom: "2rem" }}>
              <CarCard car={playerCar} label="YOU" />
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#c9a84c" }}>VS</span>
              </div>
              <CarCard car={opponentCar} label="OPPONENT" />
            </div>

            <div style={{ textAlign: "center" }}>
              <button onClick={startRace} style={goldBtnStyle}>
                Race!
              </button>
              <br />
              <button onClick={() => { setPlayerCar(null); setOpponentCar(null); }} style={{ marginTop: "1rem", background: "none", border: "none", color: "#555", fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline" }}>
                Pick a different car
              </button>
            </div>

            <div style={{ marginTop: "1.5rem", textAlign: "center", color: "#444", fontSize: "0.75rem" }}>
              Hold <kbd style={kbdStyle}>SPACE</kbd> or <kbd style={kbdStyle}>↑</kbd> to accelerate
            </div>
          </div>
        ) : (
          /* Car grid */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem", maxWidth: "1000px", margin: "0 auto" }}>
            {cars.map((car) => (
              <button
                key={car.id}
                onClick={() => selectCar(car)}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "6px",
                  padding: 0,
                  cursor: "pointer",
                  overflow: "hidden",
                  textAlign: "left",
                  transition: "border-color 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#c9a84c"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ width: "100%", aspectRatio: "16/9", background: "#111", overflow: "hidden" }}>
                  {car.pixelArt ? (
                    <img src={car.pixelArt} alt={car.name} style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" }} />
                  ) : car.aiImage ? (
                    <img src={car.aiImage} alt={car.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: "0.7rem" }}>No Image</div>
                  )}
                </div>
                <div style={{ padding: "0.6rem 0.75rem" }}>
                  <p style={{ color: "#c9a84c", fontSize: "0.65rem", fontWeight: 600, marginBottom: "0.2rem" }}>#{car.carNumber}</p>
                  <p style={{ color: "#ddd", fontSize: "0.8rem", fontWeight: 500, marginBottom: "0.15rem" }}>{car.name}</p>
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.7rem", color: "#555" }}>
                    <span>{car.hp} HP</span>
                    <span>{car.pwr} HP/t</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── RACING / COUNTDOWN / FINISHED ───
  return (
    <div style={{ ...pageStyle, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* HUD */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1.5rem", flexShrink: 0 }}>
        <div style={{ color: "#ddd", fontSize: "0.8rem" }}>
          <span style={{ color: "#c9a84c" }}>#{playerCar?.carNumber}</span> {playerCar?.name}
        </div>
        <div style={{ color: "#888", fontSize: "0.8rem" }}>
          vs <span style={{ color: "#dc2626" }}>#{opponentCar?.carNumber}</span> {opponentCar?.name}
        </div>
      </div>

      {/* Race view */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        {/* Sky */}
        <div style={{ height: "25%", background: "linear-gradient(to bottom, #1a3a5c, #2d5a7b)", position: "relative" }}>
          {/* Trees */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40px", background: "repeating-linear-gradient(90deg, transparent 0px, transparent 40px, #1a4a2a 40px, #1a4a2a 55px, transparent 55px, transparent 80px)" }} />
        </div>

        {/* Road */}
        <div
          ref={roadRef}
          style={{
            height: "40%",
            background: `repeating-linear-gradient(to bottom, #333 0px, #333 18px, #444 18px, #444 20px)`,
            position: "relative",
          }}
        >
          {/* Center line */}
          <div style={{ position: "absolute", top: "48%", left: 0, right: 0, height: "3px", background: "repeating-linear-gradient(90deg, #c9a84c 0px, #c9a84c 20px, transparent 20px, transparent 40px)" }} />

          {/* Opponent car on road */}
          <div style={{
            position: "absolute",
            top: "15%",
            left: `${40 + (opponentPos - playerPos) * 0.5}%`,
            transform: "translateX(-50%)",
            transition: "left 0.1s linear",
          }}>
            {opponentCar?.pixelArt ? (
              <img src={opponentCar.pixelArt} alt="opponent" style={{ width: `${Math.max(40, 120 - Math.abs(opponentPos - playerPos))}px`, imageRendering: "pixelated", opacity: 0.9 }} />
            ) : (
              <div style={{ width: "60px", height: "30px", background: "#dc2626", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.6rem", fontWeight: 700 }}>
                #{opponentCar?.carNumber}
              </div>
            )}
          </div>
        </div>

        {/* Dashboard */}
        <div style={{
          height: "35%",
          background: "#1a1a1e",
          position: "relative",
          overflow: "hidden",
        }}>
          {playerCar?.pixelDash ? (
            <img src={playerCar.pixelDash} alt="dashboard" style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated", opacity: 0.7 }} />
          ) : (
            /* Fallback dashboard */
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(to bottom, #222, #111)" }} />
          )}

          {/* Gauges overlay */}
          <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "2rem", alignItems: "flex-end" }}>
            {/* Speedometer */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "monospace", fontSize: "2.5rem", fontWeight: 700, color: "#c9a84c", textShadow: "0 0 10px rgba(201,168,76,0.5)", lineHeight: 1 }}>
                {playerSpeed}
              </div>
              <div style={{ fontSize: "0.6rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>MPH</div>
            </div>

            {/* RPM */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "monospace", fontSize: "1.5rem", fontWeight: 700, color: rpm > 6000 ? "#dc2626" : "#ddd", textShadow: rpm > 6000 ? "0 0 10px rgba(220,38,38,0.5)" : "none", lineHeight: 1 }}>
                {rpm}
              </div>
              <div style={{ fontSize: "0.6rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>RPM</div>
            </div>

            {/* Gear */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "monospace", fontSize: "2rem", fontWeight: 700, color: "#16a34a", lineHeight: 1 }}>
                {gear}
              </div>
              <div style={{ fontSize: "0.6rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>GEAR</div>
            </div>
          </div>
        </div>

        {/* Countdown overlay */}
        {phase === "countdown" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", zIndex: 10 }}>
            <div style={{ fontSize: "10rem", fontFamily: "'Playfair Display', serif", color: countdown === 0 ? "#16a34a" : "#c9a84c", textShadow: `0 0 80px ${countdown === 0 ? "rgba(22,163,106,0.5)" : "rgba(201,168,76,0.5)"}` }}>
              {countdown === 0 ? "GO!" : countdown}
            </div>
          </div>
        )}

        {/* Finish overlay */}
        {phase === "finished" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", zIndex: 10 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", fontFamily: "'Playfair Display', serif", color: winner === "player" ? "#c9a84c" : "#dc2626", marginBottom: "1rem" }}>
                {winner === "player" ? "YOU WIN!" : "YOU LOSE"}
              </div>
              <div style={{ display: "flex", gap: "3rem", justifyContent: "center", marginBottom: "2rem" }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: "#c9a84c", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>Your Time</p>
                  <p style={{ color: "#fff", fontSize: "1.5rem", fontFamily: "monospace" }}>{(playerTime / 1000).toFixed(2)}s</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: "#dc2626", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>Opponent</p>
                  <p style={{ color: "#fff", fontSize: "1.5rem", fontFamily: "monospace" }}>{(opponentTime / 1000).toFixed(2)}s</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                <button onClick={startRace} style={goldBtnStyle}>Rematch</button>
                <button onClick={() => { setPlayerCar(null); setOpponentCar(null); setPhase("select"); }} style={{ ...goldBtnStyle, background: "rgba(255,255,255,0.1)", color: "#ddd" }}>
                  New Car
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile accelerate button */}
      <div style={{ flexShrink: 0, padding: "0.5rem", textAlign: "center" }}>
        <button
          onTouchStart={() => keyRef.current.add(" ")}
          onTouchEnd={() => keyRef.current.delete(" ")}
          onMouseDown={() => keyRef.current.add(" ")}
          onMouseUp={() => keyRef.current.delete(" ")}
          style={{ width: "100%", maxWidth: "400px", padding: "1rem", background: phase === "racing" ? "linear-gradient(135deg, #c9a84c, #b8943f)" : "rgba(255,255,255,0.05)", color: phase === "racing" ? "#08090c" : "#444", border: "none", fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", cursor: "pointer", borderRadius: "4px", letterSpacing: "0.1em", userSelect: "none", WebkitUserSelect: "none" }}
        >
          {phase === "racing" ? "HOLD TO ACCELERATE" : phase === "finished" ? (winner === "player" ? "🏆 WINNER!" : "Try Again") : "GET READY..."}
        </button>
      </div>
    </div>
  );
}

function CarCard({ car, label }: { car: RaceCar; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.15em", color: label === "YOU" ? "#c9a84c" : "#dc2626", marginBottom: "0.5rem" }}>{label}</p>
      <div style={{ width: "100%", aspectRatio: "16/9", background: "#111", borderRadius: "6px", overflow: "hidden", marginBottom: "0.75rem", border: `1px solid ${label === "YOU" ? "rgba(201,168,76,0.3)" : "rgba(220,38,38,0.3)"}` }}>
        {car.pixelArt ? (
          <img src={car.pixelArt} alt={car.name} style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" }} />
        ) : car.aiImage ? (
          <img src={car.aiImage} alt={car.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#333" }}>No Image</div>
        )}
      </div>
      <p style={{ color: "#c9a84c", fontSize: "0.7rem", fontWeight: 600 }}>#{car.carNumber}</p>
      <p style={{ color: "#fff", fontSize: "1rem", fontWeight: 500 }}>{car.name}</p>
      <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", marginTop: "0.5rem", fontSize: "0.75rem", color: "#555" }}>
        <span>{car.hp} HP</span>
        <span>{car.weight.toLocaleString()} lbs</span>
        <span>{car.pwr} HP/t</span>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  background: "#08090c",
  minHeight: "100vh",
  padding: "1.5rem",
  fontFamily: "'Inter', sans-serif",
};

const goldBtnStyle: React.CSSProperties = {
  padding: "0.8rem 2.5rem",
  background: "linear-gradient(135deg, #c9a84c, #b8943f)",
  color: "#08090c",
  border: "none",
  fontSize: "1rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  cursor: "pointer",
  borderRadius: "4px",
};

const kbdStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0.15rem 0.5rem",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: "3px",
  fontSize: "0.75rem",
  color: "#ddd",
  fontFamily: "monospace",
};
