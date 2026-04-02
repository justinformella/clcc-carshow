"use client";

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
  cssColor: string;
};

type RaceResult = RaceCar & { finishTime: number; position: number };

const LANE_COLORS = ["#dc2626", "#2563eb", "#16a34a", "#c9a84c", "#9333ea", "#ea580c", "#0891b2", "#be185d"];

function colorToCss(color: string): string {
  const map: Record<string, string> = {
    red: "#dc2626", blue: "#2563eb", green: "#16a34a", black: "#1a1a1a",
    white: "#d4d4d8", silver: "#94a3b8", gray: "#6b7280", grey: "#6b7280",
    yellow: "#eab308", orange: "#ea580c", gold: "#c9a84c", brown: "#92400e",
    purple: "#7c3aed", pink: "#ec4899", copper: "#b87333", beige: "#d4a574",
  };
  const lower = color.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key)) return val;
  }
  return LANE_COLORS[Math.floor(Math.random() * LANE_COLORS.length)];
}

export default function RacePage() {
  const [allCars, setAllCars] = useState<RaceCar[]>([]);
  const [racers, setRacers] = useState<RaceCar[]>([]);
  const [phase, setPhase] = useState<"loading" | "lineup" | "countdown" | "racing" | "finished">("loading");
  const [countdown, setCountdown] = useState(3);
  const [results, setResults] = useState<RaceResult[]>([]);

  const carRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animRef = useRef<number>(0);
  const progressRef = useRef<number[]>([]);
  const speedRef = useRef<number[]>([]);
  const finishedRef = useRef<boolean[]>([]);
  const finishOrderRef = useRef<{ index: number; time: number }[]>([]);

  useEffect(() => {
    fetch("/api/race")
      .then((r) => r.json())
      .then((data) => {
        const cars = (data.cars || []).map((c: RaceCar & { color: string }) => ({
          ...c,
          cssColor: colorToCss(c.color),
        }));
        setAllCars(cars);
        setPhase("lineup");
      })
      .catch(() => setPhase("lineup"));
  }, []);

  const pickRacers = useCallback(() => {
    const shuffled = [...allCars].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(8, shuffled.length));
  }, [allCars]);

  const startRace = useCallback(() => {
    const selected = pickRacers();
    setRacers(selected);
    setResults([]);
    setPhase("countdown");
    setCountdown(3);

    // Reset refs
    progressRef.current = selected.map(() => 0);
    speedRef.current = selected.map(() => 0);
    finishedRef.current = selected.map(() => false);
    finishOrderRef.current = [];
    carRefs.current = selected.map(() => null);

    let count = 3;
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        setPhase("racing");

        const startTime = performance.now();
        const baseSpeedsArr = selected.map((car) => {
          const pwr = car.hp / (car.weight / 1000);
          const norm = Math.min(Math.max((pwr - 30) / 170, 0), 1);
          return 0.3 + norm * 0.5; // 0.3 to 0.8 base speed per frame
        });

        // Pre-generate noise seeds for smooth variation
        const seeds = selected.map(() => Math.random() * 1000);

        const animate = (now: number) => {
          const elapsed = now - startTime;
          let allDone = true;

          for (let i = 0; i < selected.length; i++) {
            if (finishedRef.current[i]) continue;
            allDone = false;

            // Smooth speed variation using sine waves
            const t = elapsed / 1000;
            const wobble1 = Math.sin(t * 2.3 + seeds[i]) * 0.12;
            const wobble2 = Math.sin(t * 3.7 + seeds[i] * 1.5) * 0.08;
            const wobble3 = Math.sin(t * 0.9 + seeds[i] * 0.7) * 0.15;

            // Acceleration curve — start slow, build up
            const accel = Math.min(elapsed / 2000, 1); // Takes 2s to reach full speed
            const accelCurve = accel * accel; // Quadratic ease-in

            const currentSpeed = baseSpeedsArr[i] * accelCurve * (1 + wobble1 + wobble2 + wobble3);
            speedRef.current[i] = currentSpeed;

            progressRef.current[i] = Math.min(progressRef.current[i] + currentSpeed * 0.16, 100);

            // Update DOM directly — no React re-render
            const el = carRefs.current[i];
            if (el) {
              el.style.left = `${(progressRef.current[i] / 100) * 90}%`;
            }

            if (progressRef.current[i] >= 100) {
              finishedRef.current[i] = true;
              finishOrderRef.current.push({ index: i, time: elapsed });
            }
          }

          if (!allDone && elapsed < 25000) {
            animRef.current = requestAnimationFrame(animate);
          } else {
            // Fill in any unfinished
            for (let i = 0; i < selected.length; i++) {
              if (!finishedRef.current[i]) {
                finishOrderRef.current.push({ index: i, time: 25000 });
              }
            }

            // Build results
            const sorted = finishOrderRef.current.sort((a, b) => a.time - b.time);
            const raceResults: RaceResult[] = sorted.map((f, pos) => ({
              ...selected[f.index],
              finishTime: f.time,
              position: pos + 1,
            }));
            setResults(raceResults);
            setPhase("finished");
          }
        };

        animRef.current = requestAnimationFrame(animate);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animRef.current);
    };
  }, [pickRacers]);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  if (phase === "loading") {
    return (
      <div style={containerStyle}>
        <p style={{ color: "#666", fontSize: "1.2rem", textAlign: "center", paddingTop: "40vh" }}>Loading vehicles...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <Link href="/" style={{ color: "#c9a84c", textDecoration: "none", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.2em" }}>
          Crystal Lake Cars &amp; Caffeine
        </Link>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", color: "#fff", margin: "0.5rem 0", fontWeight: 400 }}>
          Slot Car Showdown
        </h1>
        <p style={{ color: "#555", fontSize: "0.85rem" }}>
          {allCars.length} vehicles &middot; Real specs &middot; Random matchups
        </p>
      </div>

      {/* Start screen */}
      {phase === "lineup" && (
        <div style={{ textAlign: "center", paddingTop: "2rem" }}>
          {allCars.length < 2 ? (
            <p style={{ color: "#666" }}>Need at least 2 enriched vehicles. Enrich from Admin &gt; Analytics first.</p>
          ) : (
            <>
              <button onClick={startRace} style={startBtnStyle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Start Race
              </button>
              <p style={{ color: "#444", fontSize: "0.8rem", marginTop: "1rem" }}>
                {Math.min(8, allCars.length)} random cars will line up
              </p>
            </>
          )}
        </div>
      )}

      {/* Countdown */}
      {phase === "countdown" && (
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: "7rem", fontFamily: "'Playfair Display', serif",
            color: countdown === 0 ? "#16a34a" : "#c9a84c",
            textShadow: `0 0 60px ${countdown === 0 ? "rgba(22,163,106,0.4)" : "rgba(201,168,76,0.4)"}`,
            lineHeight: 1, marginBottom: "2rem",
          }}>
            {countdown === 0 ? "GO!" : countdown}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxWidth: "600px", margin: "0 auto" }}>
            {racers.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.4rem 0.75rem", background: "rgba(255,255,255,0.03)", borderLeft: `3px solid ${r.cssColor}` }}>
                <span style={{ color: "#c9a84c", fontWeight: 700, width: "30px" }}>#{r.carNumber}</span>
                <span style={{ color: "#ddd", flex: 1, fontSize: "0.85rem" }}>{r.name}</span>
                <span style={{ color: "#555", fontSize: "0.75rem" }}>{r.hp} HP</span>
                <span style={{ color: "#555", fontSize: "0.75rem" }}>{r.pwr} HP/t</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Track */}
      {(phase === "racing" || phase === "finished") && (
        <>
          <div style={{
            background: "#141416", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "8px", padding: "1.25rem 0.75rem", marginBottom: "2rem",
            position: "relative",
          }}>
            {/* Finish line */}
            <div style={{
              position: "absolute", right: "36px", top: 0, bottom: 0, width: "3px",
              background: "repeating-linear-gradient(to bottom, #fff 0px, #fff 6px, transparent 6px, transparent 12px)",
              opacity: 0.2, zIndex: 1,
            }} />

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {racers.map((racer, i) => (
                <div key={racer.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", height: "34px" }}>
                  <div style={{ width: "36px", textAlign: "right", fontSize: "0.6rem", color: "#444", flexShrink: 0 }}>#{racer.carNumber}</div>
                  <div style={{
                    flex: 1, height: "100%",
                    background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.03)",
                    borderRadius: "3px", position: "relative", overflow: "hidden",
                  }}>
                    {/* Center lane line */}
                    <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "rgba(255,255,255,0.04)" }} />

                    {/* Car — positioned via ref, not React state */}
                    <div
                      ref={(el) => { carRefs.current[i] = el; }}
                      style={{
                        position: "absolute", left: "0%", top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 2,
                        willChange: "left",
                      }}
                    >
                      <div style={{
                        width: "34px", height: "16px",
                        background: `linear-gradient(90deg, ${racer.cssColor}cc, ${racer.cssColor})`,
                        borderRadius: "2px 6px 6px 2px",
                        boxShadow: `0 0 10px ${racer.cssColor}33`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.5rem", fontWeight: 800, color: "#fff",
                        textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                      }}>
                        {racer.carNumber}
                        <div style={{ position: "absolute", bottom: "-2px", left: "3px", width: "5px", height: "5px", borderRadius: "50%", background: "#222", border: "1px solid #444" }} />
                        <div style={{ position: "absolute", bottom: "-2px", right: "3px", width: "5px", height: "5px", borderRadius: "50%", background: "#222", border: "1px solid #444" }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          {phase === "finished" && results.length > 0 && (
            <div style={{ maxWidth: "700px", margin: "0 auto" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: "#fff", textAlign: "center", marginBottom: "1.5rem", fontWeight: 400 }}>
                Results
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {results.map((car) => (
                  <div key={car.id} style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.65rem 1rem",
                    background: car.position === 1 ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.02)",
                    borderLeft: car.position <= 3 ? `3px solid ${car.position === 1 ? "#c9a84c" : car.position === 2 ? "#94a3b8" : "#b87333"}` : "3px solid transparent",
                    borderRadius: "3px",
                  }}>
                    <span style={{ width: "28px", fontSize: car.position <= 3 ? "1.1rem" : "0.85rem", textAlign: "center", flexShrink: 0 }}>
                      {car.position === 1 ? "🥇" : car.position === 2 ? "🥈" : car.position === 3 ? "🥉" : <span style={{ color: "#444" }}>{car.position}</span>}
                    </span>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: car.cssColor, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ color: "#fff", fontSize: "0.85rem" }}>
                        <span style={{ color: "#c9a84c" }}>#{car.carNumber}</span> {car.name}
                      </span>
                      <span style={{ color: "#444", fontSize: "0.7rem", marginLeft: "0.5rem" }}>{car.owner}</span>
                    </div>
                    <span style={{ color: "#555", fontSize: "0.75rem", width: "50px", textAlign: "right" }}>{car.hp} HP</span>
                    <span style={{ color: car.position === 1 ? "#c9a84c" : "#888", fontSize: "0.85rem", fontWeight: 600, width: "60px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {(car.finishTime / 1000).toFixed(2)}s
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center", marginTop: "2rem" }}>
                <button onClick={startRace} style={startBtnStyle}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                  Race Again
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  background: "#08090c",
  minHeight: "100vh",
  padding: "2rem",
  fontFamily: "'Inter', sans-serif",
};

const startBtnStyle: React.CSSProperties = {
  padding: "0.9rem 2.5rem",
  background: "linear-gradient(135deg, #c9a84c, #b8943f)",
  color: "#08090c",
  border: "none",
  fontSize: "1rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.6rem",
  borderRadius: "4px",
  boxShadow: "0 4px 20px rgba(201,168,76,0.25)",
};
