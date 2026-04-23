"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { COLORS, FONT, sectionStyle, sectionTitleStyle } from "./styles";

type ArcadeCar = {
  pixelArt: string;
};

export default function Arcade8Bit() {
  const [cars, setCars] = useState<ArcadeCar[]>([]);
  const [totalCars, setTotalCars] = useState(0);

  useEffect(() => {
    fetch("/api/race")
      .then((r) => r.json())
      .then((data) => {
        const withArt = (data.cars || []).filter(
          (c: { pixelArt?: string | null }) => c.pixelArt
        );
        setTotalCars(withArt.length);
        const shuffled = withArt.sort(() => Math.random() - 0.5).slice(0, 3);
        setCars(shuffled);
      })
      .catch(() => {});
  }, []);

  if (cars.length === 0) return null;

  return (
    <section id="arcade" style={{ ...sectionStyle(COLORS.bgDark), textAlign: "center", padding: "4rem 1.5rem" }}>
      <style>{`
        @keyframes cabinetBlink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes marqueeLights { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes glowPulse { 0%,100%{box-shadow: 0 0 20px rgba(255,215,0,0.15), 0 0 60px rgba(255,215,0,0.05)} 50%{box-shadow: 0 0 30px rgba(255,215,0,0.3), 0 0 80px rgba(255,215,0,0.1)} }
        .arcade-play-btn:hover { transform: translateY(2px) !important; box-shadow: 0 3px 0 #166534, 0 4px 8px rgba(0,0,0,0.4) !important; }
        .arcade-play-btn:active { transform: translateY(5px) !important; box-shadow: 0 0px 0 #166534 !important; }
      `}</style>

      {/* Section header */}
      <h2 style={{ ...sectionTitleStyle(), fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}>CLCC ARCADE</h2>
      <p style={{ fontFamily: FONT, fontSize: "clamp(0.45rem, 1.2vw, 0.55rem)", color: COLORS.midGray, marginBottom: "2.5rem", letterSpacing: "0.15em" }}>
        SPONSORED BY REDLINE MOTOR CONDOS · URW AUTOMOTIVE · THE DETAIL TECH · ANDERSON BMW · CIDEAS
      </p>

      {/* Arcade Cabinet */}
      <div style={{ position: "relative", display: "inline-block", maxWidth: "560px", width: "92%", animation: "glowPulse 3s ease-in-out infinite" }}>
        {/* Side panels */}
        <div style={{ position: "absolute", top: 0, bottom: "40px", left: "-2px", width: "12px", background: "linear-gradient(to right, #15152a, #1e1e35)", borderLeft: "2px solid #555", borderRadius: "6px 0 0 0", zIndex: 2 }} />
        <div style={{ position: "absolute", top: 0, bottom: "40px", right: "-2px", width: "12px", background: "linear-gradient(to left, #15152a, #1e1e35)", borderRight: "2px solid #555", borderRadius: "0 6px 0 0", zIndex: 2 }} />

        {/* Cabinet body */}
        <div style={{
          background: "linear-gradient(175deg, #2d2d48 0%, #1e1e35 40%, #191930 100%)",
          border: "2px solid #555",
          borderRadius: "10px 10px 2px 2px",
          overflow: "hidden",
          position: "relative",
        }}>
          {/* T-molding */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(to right, transparent 5%, #ffd700 20%, #ffd700 80%, transparent 95%)", zIndex: 3, borderRadius: "10px 10px 0 0" }} />

          {/* Marquee */}
          <div style={{
            background: "linear-gradient(180deg, #e6c44a 0%, #ffd700 30%, #c9a84c 70%, #b8860b 100%)",
            padding: "0.8rem 1rem",
            position: "relative",
            borderBottom: "3px solid #8a6d1b",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
          }}>
            <span style={{ fontFamily: FONT, fontSize: "clamp(0.55rem, 1.8vw, 0.75rem)", color: "#1a0a00", letterSpacing: "0.12em", textShadow: "0 1px 0 rgba(255,255,255,0.3)" }}>
              ★ CLCC ARCADE ★
            </span>
            {/* Marquee light strip */}
            <div style={{ position: "absolute", bottom: "-3px", left: "10%", right: "10%", height: "3px", background: "repeating-linear-gradient(to right, #ffd700 0px, #ffd700 4px, transparent 4px, transparent 8px)", animation: "marqueeLights 0.8s infinite" }} />
          </div>

          {/* CRT Bezel */}
          <div style={{
            margin: "0.8rem",
            padding: "6px",
            background: "linear-gradient(145deg, #111 0%, #222 50%, #0a0a0a 100%)",
            border: "2px solid #333",
            borderRadius: "4px",
            boxShadow: "inset 0 0 15px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5)",
          }}>
            {/* Screen */}
            <div style={{
              background: "#000",
              border: "1px solid #1a1a1a",
              padding: "0.8rem",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Scanlines */}
              <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)", pointerEvents: "none", zIndex: 1 }} />
              {/* Screen glow */}
              <div style={{ position: "absolute", inset: "-2px", borderRadius: "2px", boxShadow: "0 0 20px rgba(255,215,0,0.05), inset 0 0 30px rgba(0,50,0,0.1)", pointerEvents: "none" }} />

              {/* Car thumbnails */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.6rem", position: "relative", zIndex: 2 }}>
                {cars.map((car, i) => (
                  <div key={i} style={{ flex: "1 1 0", aspectRatio: "16/9", background: "#0a0a15", border: "1px solid #222", overflow: "hidden", lineHeight: 0 }}>
                    <img src={car.pixelArt} alt="Show car" style={{ display: "block", width: "100%", height: "100%", objectFit: "contain", objectPosition: "center bottom", imageRendering: "pixelated" }} />
                  </div>
                ))}
              </div>

              <p style={{ fontFamily: FONT, fontSize: "clamp(0.5rem, 1.5vw, 0.6rem)", color: COLORS.gold, lineHeight: 2, position: "relative", zIndex: 2 }}>
                CHOOSE YOUR RIDE
              </p>
              <p style={{ fontFamily: FONT, fontSize: "clamp(0.45rem, 1.2vw, 0.5rem)", color: COLORS.green, animation: "cabinetBlink 1.5s infinite", position: "relative", zIndex: 2, marginTop: "0.2rem" }}>
                INSERT COIN
              </p>
            </div>
          </div>

          {/* Speaker grille */}
          <div style={{ display: "flex", justifyContent: "center", gap: "2px", padding: "0.4rem 2rem" }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ height: "2px", flex: 1, maxWidth: "60px", background: "#333", borderRadius: "1px" }} />
            ))}
          </div>

          {/* Control panel */}
          <div style={{
            background: "linear-gradient(175deg, #252540, #1a1a30)",
            borderTop: "2px solid #3a3a50",
            padding: "1.2rem 1.5rem 1rem",
            position: "relative",
          }}>
            {/* Angled top edge */}
            <div style={{ position: "absolute", top: "-8px", left: "5%", right: "5%", height: "8px", background: "linear-gradient(to bottom, transparent, #252540)" }} />

            <p style={{ fontFamily: FONT, fontSize: "clamp(0.5rem, 1.4vw, 0.65rem)", color: "#ccc", lineHeight: 2.2, marginBottom: "1rem" }}>
              {totalCars} cars ready to race, detail & cruise
            </p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}>
              {/* Joystick */}
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                {/* Ball top */}
                <div style={{ width: "20px", height: "20px", background: "radial-gradient(circle at 35% 35%, #ef4444, #991b1b)", border: "2px solid #b91c1c", borderRadius: "50%", zIndex: 2 }} />
                {/* Shaft */}
                <div style={{ width: "8px", height: "16px", background: "linear-gradient(to right, #333, #555, #333)", marginTop: "-4px", zIndex: 1 }} />
                {/* Base plate */}
                <div style={{ width: "36px", height: "10px", background: "radial-gradient(ellipse at center, #444, #222)", border: "2px solid #555", borderRadius: "50%", marginTop: "-3px" }} />
              </div>

              {/* Play button */}
              <Link
                href="/arcade"
                className="arcade-play-btn"
                style={{
                  display: "inline-block",
                  fontFamily: FONT,
                  fontSize: "clamp(0.9rem, 2.5vw, 1.2rem)",
                  color: "#fff",
                  background: "linear-gradient(180deg, #4ade80, #22c55e, #16a34a)",
                  border: "3px solid #15803d",
                  boxShadow: "0 5px 0 #166534, 0 7px 14px rgba(0,0,0,0.4)",
                  padding: "1rem 3rem",
                  textDecoration: "none",
                  letterSpacing: "0.12em",
                  borderRadius: "50px",
                  transition: "all 0.1s",
                }}
              >
                PLAY
              </Link>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid #555", boxShadow: "0 2px 0 rgba(0,0,0,0.3)", background: "radial-gradient(circle at 40% 40%, #ef4444, #991b1b)" }} />
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid #555", boxShadow: "0 2px 0 rgba(0,0,0,0.3)", background: "radial-gradient(circle at 40% 40%, #3b82f6, #1d4ed8)" }} />
              </div>
            </div>
          </div>

          {/* Coin door */}
          <div style={{ padding: "0.6rem", display: "flex", justifyContent: "center" }}>
            <div style={{ background: "#1a1a2e", border: "2px solid #444", borderRadius: "3px", padding: "0.3rem 0.7rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <span style={{ fontFamily: FONT, fontSize: "0.25rem", color: "#666", letterSpacing: "0.1em" }}>COIN</span>
              <div style={{ width: "28px", height: "4px", background: "#111", border: "1px solid #555", borderRadius: "2px" }} />
            </div>
          </div>

          {/* Kick plate */}
          <div style={{ background: "linear-gradient(to bottom, #151528, #0d0d1a)", borderTop: "1px solid #333", height: "20px", borderRadius: "0 0 2px 2px", margin: "0 -2px -2px", border: "2px solid #555", borderTopStyle: "none" }} />
        </div>

        {/* Base (wider than cabinet) */}
        <div style={{ width: "108%", marginLeft: "-4%", height: "12px", background: "linear-gradient(to bottom, #222, #111)", border: "2px solid #444", borderTopStyle: "none", borderRadius: "0 0 4px 4px" }} />
      </div>
    </section>
  );
}
