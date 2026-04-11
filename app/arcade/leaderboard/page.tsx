"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { C, FONT, pageStyle, goldBtnStyle, pixelBtnStyle } from "@/lib/race-types";

const GAMES = [
  { key: "drag", label: "DRAG RACE" },
  { key: "cruise", label: "ROUTE 14" },
  { key: "smokeshow", label: "SMOKE SHOW" },
  { key: "detail", label: "DETAIL TECH" },
  { key: "bmwshowroom", label: "BMW SHOWROOM" },
];

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

type ScoreEntry = {
  id: string;
  initials: string;
  score: number;
  car_name: string;
  car_pixel_art: string | null;
  full_name: string | null;
  created_at: string;
};

export default function LeaderboardWrapper() {
  return (
    <Suspense fallback={<div style={{ background: C.bgDark, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.midGray, fontFamily: FONT, fontSize: "0.75rem" }}>LOADING...</div>}>
      <Leaderboard />
    </Suspense>
  );
}

function Leaderboard() {
  const searchParams = useSearchParams();
  const initialGame = searchParams.get("game") || "drag";
  const [activeGame, setActiveGame] = useState(initialGame);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedId, setRevealedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/arcade/scores?game=${activeGame}&limit=20`)
      .then((r) => r.json())
      .then((data) => {
        setScores(data.scores || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeGame]);

  return (
    <div style={pageStyle}>
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <p style={{ fontFamily: FONT, fontSize: "0.5rem", color: C.midGray, letterSpacing: "0.2em", marginBottom: "0.5rem" }}>CLCC ARCADE</p>
        <h1 style={{ fontFamily: FONT, fontSize: "clamp(0.9rem, 3vw, 1.5rem)", color: C.gold, margin: 0 }}>
          LEADERBOARD
        </h1>
      </div>

      {/* Game tabs */}
      <div style={{ display: "flex", gap: "0.25rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1.5rem", maxWidth: "700px", margin: "0 auto 1.5rem" }}>
        {GAMES.map((g) => (
          <button
            key={g.key}
            onClick={() => { setActiveGame(g.key); setRevealedId(null); }}
            style={{
              ...pixelBtnStyle,
              fontSize: "0.45rem",
              padding: "0.4rem 0.6rem",
              background: activeGame === g.key ? C.gold : C.bgMid,
              color: activeGame === g.key ? C.bgDark : C.midGray,
              border: `2px solid ${activeGame === g.key ? C.gold : C.border}`,
            }}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Scores table */}
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        {loading ? (
          <p style={{ fontFamily: FONT, fontSize: "0.6rem", color: C.midGray, textAlign: "center" }}>LOADING...</p>
        ) : scores.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 0" }}>
            <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: C.midGray, marginBottom: "0.5rem" }}>NO SCORES YET</p>
            <p style={{ fontFamily: FONT, fontSize: "0.5rem", color: C.border }}>BE THE FIRST TO SET A HIGH SCORE!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "40px 60px 1fr 80px", gap: "0.5rem", alignItems: "center", padding: "0.4rem 0.5rem", fontFamily: FONT, fontSize: "0.4rem", color: C.border }}>
              <span>#</span>
              <span>WHO</span>
              <span>CAR</span>
              <span style={{ textAlign: "right" }}>SCORE</span>
            </div>

            {scores.map((entry, i) => {
              const isTop3 = i < 3;
              const isRevealed = revealedId === entry.id;
              return (
                <div
                  key={entry.id}
                  onClick={() => entry.full_name && setRevealedId(isRevealed ? null : entry.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 70px 1fr 90px",
                    gap: "0.5rem",
                    alignItems: "center",
                    padding: "0.65rem 0.75rem",
                    background: isTop3 ? "rgba(255,215,0,0.08)" : C.bgMid,
                    border: `1px solid ${isTop3 ? C.goldDark : C.border}`,
                    cursor: entry.full_name ? "pointer" : "default",
                  }}
                >
                  {/* Rank */}
                  <span style={{ fontFamily: FONT, fontSize: "0.8rem", color: isTop3 ? C.gold : C.midGray }}>
                    {i + 1}
                  </span>

                  {/* Initials */}
                  <div>
                    <span style={{
                      fontFamily: FONT,
                      fontSize: "0.75rem",
                      color: isTop3 ? C.gold : C.white,
                      display: "block",
                    }}>
                      {entry.initials}
                    </span>
                    {entry.full_name && (
                      <span style={{ fontFamily: FONT, fontSize: "0.4rem", color: C.midGray, display: "block", marginTop: "0.15rem" }}>
                        {entry.full_name}
                      </span>
                    )}
                  </div>

                  {/* Car */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden" }}>
                    {entry.car_pixel_art && (
                      <img
                        src={entry.car_pixel_art}
                        alt=""
                        style={{ width: "56px", height: "35px", objectFit: "contain", imageRendering: "pixelated", flexShrink: 0 }}
                      />
                    )}
                    <span style={{ fontFamily: FONT, fontSize: "0.55rem", color: C.gray, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.car_name}
                    </span>
                  </div>

                  {/* Score */}
                  <span style={{ fontFamily: FONT, fontSize: "0.75rem", color: isTop3 ? C.gold : C.white, textAlign: "right" }}>
                    {formatScore(activeGame, entry.score)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <Link href="/arcade" style={{ fontFamily: FONT, fontSize: "0.7rem", color: C.midGray, textDecoration: "underline" }}>
          BACK TO ARCADE
        </Link>
      </div>
    </div>
  );
}
