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
  displacement: number;
  cylinders: number;
  engineType: string;
  category: string;
  driveType: string;
  pwr: number;
};

type RaceEntry = RaceCar & {
  lane: number;
  progress: number;
  speed: number;
  baseSpeed: number;
  finished: boolean;
  finishTime: number;
  cssColor: string;
};

const LANE_COLORS = ["#dc2626", "#2563eb", "#16a34a", "#c9a84c", "#9333ea", "#ea580c", "#0891b2", "#be185d", "#4f46e5", "#059669"];

function colorToCss(color: string): string {
  const map: Record<string, string> = {
    red: "#dc2626", blue: "#2563eb", green: "#16a34a", black: "#1a1a1a",
    white: "#e5e5e5", silver: "#94a3b8", gray: "#6b7280", grey: "#6b7280",
    yellow: "#eab308", orange: "#ea580c", gold: "#c9a84c", brown: "#92400e",
    purple: "#7c3aed", pink: "#ec4899", copper: "#b87333", beige: "#d4a574",
  };
  const lower = color.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key)) return val;
  }
  return LANE_COLORS[Math.floor(Math.random() * LANE_COLORS.length)];
}

const RACE_DURATION = 18000; // 18 seconds
const TRACK_LENGTH = 100;

export default function RacePage() {
  const [allCars, setAllCars] = useState<RaceCar[]>([]);
  const [racers, setRacers] = useState<RaceEntry[]>([]);
  const [phase, setPhase] = useState<"loading" | "lineup" | "countdown" | "racing" | "finished">("loading");
  const [countdown, setCountdown] = useState(3);
  const [leaderboard, setLeaderboard] = useState<RaceEntry[]>([]);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef(0);

  // Fetch cars
  useEffect(() => {
    fetch("/api/race")
      .then((r) => r.json())
      .then((data) => {
        setAllCars(data.cars || []);
        setPhase("lineup");
      })
      .catch(() => setPhase("lineup"));
  }, []);

  const pickRacers = useCallback(() => {
    const shuffled = [...allCars].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(8, shuffled.length));
    return selected.map((car, i) => ({
      ...car,
      lane: i,
      progress: 0,
      speed: 0,
      baseSpeed: calculateBaseSpeed(car),
      finished: false,
      finishTime: 0,
      cssColor: colorToCss(car.color),
    }));
  }, [allCars]);

  function calculateBaseSpeed(car: RaceCar): number {
    // Power-to-weight ratio is primary factor
    const pwr = car.hp / (car.weight / 1000);
    // Normalize to 0.6 - 1.0 range
    const minPwr = 30;
    const maxPwr = 200;
    const normalized = Math.min(Math.max((pwr - minPwr) / (maxPwr - minPwr), 0), 1);
    return 0.55 + normalized * 0.45;
  }

  const startRace = useCallback(() => {
    const newRacers = pickRacers();
    setRacers(newRacers);
    setLeaderboard([]);
    setPhase("countdown");
    setCountdown(3);

    // Countdown
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownInterval);
        setPhase("racing");
        startTimeRef.current = performance.now();

        // Start animation
        const finishOrder: RaceEntry[] = [];

        const animate = (now: number) => {
          const elapsed = now - startTimeRef.current;
          const t = Math.min(elapsed / RACE_DURATION, 1);

          setRacers((prev) => {
            const updated = prev.map((racer) => {
              if (racer.finished) return racer;

              // Speed with randomness — faster cars are generally faster but with variance
              const noise = (Math.sin(elapsed * 0.003 + racer.lane * 47) * 0.15) +
                           (Math.sin(elapsed * 0.007 + racer.lane * 23) * 0.1) +
                           (Math.random() - 0.5) * 0.05;

              const currentSpeed = racer.baseSpeed + noise * racer.baseSpeed;
              const newProgress = Math.min(racer.progress + currentSpeed * 0.12, TRACK_LENGTH);

              if (newProgress >= TRACK_LENGTH && !racer.finished) {
                const finished = { ...racer, progress: TRACK_LENGTH, finished: true, finishTime: elapsed, speed: currentSpeed };
                finishOrder.push(finished);
                return finished;
              }

              return { ...racer, progress: newProgress, speed: currentSpeed };
            });

            return updated;
          });

          if (finishOrder.length < newRacers.length && t < 1.2) {
            animRef.current = requestAnimationFrame(animate);
          } else {
            // Race over — any unfinished cars get max time
            setRacers((prev) => prev.map((r) => r.finished ? r : { ...r, finished: true, finishTime: RACE_DURATION, progress: r.progress }));
            const allFinished = [...finishOrder];
            // Add any that didn't quite finish
            newRacers.forEach((r) => {
              if (!allFinished.find((f) => f.id === r.id)) {
                allFinished.push({ ...r, finished: true, finishTime: RACE_DURATION });
              }
            });
            setLeaderboard(allFinished.sort((a, b) => a.finishTime - b.finishTime));
            setPhase("finished");
          }
        };

        animRef.current = requestAnimationFrame(animate);
      }
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
      cancelAnimationFrame(animRef.current);
    };
  }, [pickRacers]);

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  if (phase === "loading") {
    return (
      <div style={containerStyle}>
        <p style={{ color: "#666", fontSize: "1.2rem" }}>Loading vehicles...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <Link href="/" style={{ color: "#c9a84c", textDecoration: "none", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.15em" }}>
          Crystal Lake Cars &amp; Caffeine
        </Link>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", color: "#fff", margin: "0.5rem 0", fontWeight: 400 }}>
          Slot Car Showdown
        </h1>
        <p style={{ color: "#666", fontSize: "0.9rem" }}>
          {allCars.length} vehicles ready to race &middot; Powered by real specs
        </p>
      </div>

      {/* Lineup / Pre-race */}
      {phase === "lineup" && (
        <div style={{ textAlign: "center" }}>
          {allCars.length < 2 ? (
            <p style={{ color: "#888", fontSize: "1rem", marginBottom: "2rem" }}>
              Need at least 2 enriched vehicles to race. Enrich specs from the admin Analytics page first.
            </p>
          ) : (
            <>
              <button onClick={startRace} style={startButtonStyle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Start Race
              </button>
              <p style={{ color: "#555", fontSize: "0.8rem", marginTop: "1rem" }}>
                {Math.min(8, allCars.length)} random cars will be selected
              </p>
            </>
          )}
        </div>
      )}

      {/* Countdown */}
      {phase === "countdown" && (
        <div style={{ textAlign: "center", position: "relative" }}>
          <div style={{
            fontSize: "8rem",
            fontFamily: "'Playfair Display', serif",
            color: countdown === 0 ? "#16a34a" : "#c9a84c",
            textShadow: `0 0 40px ${countdown === 0 ? "rgba(22,163,106,0.5)" : "rgba(201,168,76,0.5)"}`,
            lineHeight: 1,
            marginBottom: "1rem",
            animation: "pulse 0.5s ease",
          }}>
            {countdown === 0 ? "GO!" : countdown}
          </div>
          {/* Show lineup */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "600px", margin: "0 auto" }}>
            {racers.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.4rem 0.75rem", background: "rgba(255,255,255,0.04)", borderLeft: `3px solid ${r.cssColor}` }}>
                <span style={{ color: "#c9a84c", fontWeight: 700, width: "30px" }}>#{r.carNumber}</span>
                <span style={{ color: "#fff", flex: 1, fontSize: "0.85rem" }}>{r.name}</span>
                <span style={{ color: "#666", fontSize: "0.75rem" }}>{r.hp} HP</span>
                <span style={{ color: "#666", fontSize: "0.75rem" }}>{r.pwr} HP/t</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Racing */}
      {(phase === "racing" || phase === "finished") && (
        <>
          {/* Track */}
          <div style={{
            background: "#1a1a1e",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            padding: "1.5rem 1rem",
            marginBottom: "2rem",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Finish line */}
            <div style={{
              position: "absolute",
              right: "40px",
              top: 0,
              bottom: 0,
              width: "4px",
              background: "repeating-linear-gradient(to bottom, #fff 0px, #fff 8px, #1a1a1e 8px, #1a1a1e 16px)",
              opacity: 0.3,
              zIndex: 1,
            }} />

            {/* Lanes */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {racers.map((racer, i) => (
                <div key={racer.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", height: "36px" }}>
                  {/* Car label */}
                  <div style={{ width: "40px", textAlign: "right", fontSize: "0.65rem", color: "#555", flexShrink: 0 }}>
                    #{racer.carNumber}
                  </div>

                  {/* Lane */}
                  <div style={{
                    flex: 1,
                    height: "100%",
                    background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                    borderRadius: "4px",
                    position: "relative",
                    overflow: "hidden",
                  }}>
                    {/* Lane line */}
                    <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "rgba(255,255,255,0.06)" }} />

                    {/* Car */}
                    <div style={{
                      position: "absolute",
                      left: `${(racer.progress / TRACK_LENGTH) * 92}%`,
                      top: "50%",
                      transform: "translateY(-50%)",
                      transition: phase === "finished" ? "none" : "left 0.05s linear",
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                      zIndex: 2,
                    }}>
                      {/* Car body */}
                      <div style={{
                        width: "36px",
                        height: "18px",
                        background: `linear-gradient(135deg, ${racer.cssColor}, ${racer.cssColor}dd)`,
                        borderRadius: "3px 8px 8px 3px",
                        boxShadow: `0 0 8px ${racer.cssColor}44, 2px 0 12px ${racer.cssColor}22`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.55rem",
                        fontWeight: 800,
                        color: "#fff",
                        textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                        position: "relative",
                      }}>
                        {racer.carNumber}
                        {/* Wheels */}
                        <div style={{ position: "absolute", bottom: "-3px", left: "4px", width: "6px", height: "6px", borderRadius: "50%", background: "#333", border: "1px solid #555" }} />
                        <div style={{ position: "absolute", bottom: "-3px", right: "4px", width: "6px", height: "6px", borderRadius: "50%", background: "#333", border: "1px solid #555" }} />
                      </div>
                    </div>

                    {/* Position indicator when finished */}
                    {racer.finished && (
                      <div style={{
                        position: "absolute",
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: leaderboard.findIndex((l) => l.id === racer.id) === 0 ? "#c9a84c" : "#555",
                      }}>
                        {leaderboard.findIndex((l) => l.id === racer.id) >= 0
                          ? `P${leaderboard.findIndex((l) => l.id === racer.id) + 1}`
                          : ""}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          {phase === "finished" && leaderboard.length > 0 && (
            <div style={{ maxWidth: "700px", margin: "0 auto" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: "#fff", textAlign: "center", marginBottom: "1.5rem", fontWeight: 400 }}>
                Race Results
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {leaderboard.map((car, i) => (
                  <div
                    key={car.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      padding: "0.75rem 1rem",
                      background: i === 0 ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.03)",
                      borderLeft: i === 0 ? "3px solid #c9a84c" : i === 1 ? "3px solid #94a3b8" : i === 2 ? "3px solid #b87333" : "3px solid transparent",
                      borderRadius: "4px",
                    }}
                  >
                    {/* Position */}
                    <span style={{
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: i < 3 ? "1.1rem" : "0.85rem",
                      color: i === 0 ? "#c9a84c" : i === 1 ? "#94a3b8" : i === 2 ? "#b87333" : "#555",
                      flexShrink: 0,
                    }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </span>

                    {/* Car color dot */}
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: car.cssColor, flexShrink: 0, boxShadow: `0 0 6px ${car.cssColor}66` }} />

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <span style={{ color: "#fff", fontSize: "0.9rem", fontWeight: 500 }}>
                        <span style={{ color: "#c9a84c" }}>#{car.carNumber}</span> {car.name}
                      </span>
                      <span style={{ color: "#555", fontSize: "0.75rem", marginLeft: "0.75rem" }}>{car.owner}</span>
                    </div>

                    {/* Stats */}
                    <div style={{ display: "flex", gap: "1.5rem", flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.6rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>HP</div>
                        <div style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 600 }}>{car.hp}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.6rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>PWR</div>
                        <div style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 600 }}>{car.pwr}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.6rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>Time</div>
                        <div style={{ fontSize: "0.85rem", color: i === 0 ? "#c9a84c" : "#fff", fontWeight: 600 }}>
                          {(car.finishTime / 1000).toFixed(2)}s
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Race again */}
              <div style={{ textAlign: "center", marginTop: "2rem" }}>
                <button onClick={startRace} style={startButtonStyle}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                  Race Again
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Styles */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  background: "#0a0a0c",
  minHeight: "100vh",
  padding: "2rem",
  fontFamily: "'Inter', sans-serif",
};

const startButtonStyle: React.CSSProperties = {
  padding: "1rem 3rem",
  background: "linear-gradient(135deg, #c9a84c, #b8943f)",
  color: "#0a0a0c",
  border: "none",
  fontSize: "1.1rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.75rem",
  borderRadius: "4px",
  boxShadow: "0 4px 20px rgba(201,168,76,0.3)",
  transition: "transform 0.2s, box-shadow 0.2s",
};
