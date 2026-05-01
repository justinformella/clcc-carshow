"use client";

import { useEffect, useState } from "react";

export default function CharityProgress() {
  const [raised, setRaised] = useState<number | null>(null);
  const [goal, setGoal] = useState(1000000);

  useEffect(() => {
    fetch("/api/charity/progress")
      .then((res) => res.json())
      .then((data) => {
        setRaised(data.raised_cents);
        setGoal(data.goal_cents);
      })
      .catch(() => {});
  }, []);

  if (raised === null) return null;

  const pct = Math.min(100, (raised / goal) * 100);
  const raisedDollars = Math.floor(raised / 100);
  const goalDollars = Math.floor(goal / 100);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "3rem 2rem 3rem",
        background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
        zIndex: 2,
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: "1.8rem",
        }}
      >
        <span
          style={{
            fontSize: "1rem",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "var(--gold)",
            whiteSpace: "nowrap",
            fontWeight: 600,
          }}
        >
          Raised for Charity
        </span>
        <div
          style={{
            flex: 1,
            height: "18px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: "9px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: "linear-gradient(90deg, var(--gold), var(--gold-light))",
              borderRadius: "9px",
              boxShadow: "0 0 18px rgba(212,164,74,0.45)",
              transition: "width 1.5s ease",
            }}
          />
        </div>
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.5rem",
            color: "var(--gold)",
            whiteSpace: "nowrap",
          }}
        >
          ${raisedDollars.toLocaleString()}{" "}
          <span style={{ fontSize: "1rem", color: "rgba(255,255,255,0.5)" }}>
            of ${goalDollars.toLocaleString()} Goal
          </span>
        </span>
      </div>
    </div>
  );
}
