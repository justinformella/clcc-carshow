import Link from "next/link";
import { CSSProperties } from "react";
import { COLORS, FONT } from "@/components/8bit/styles";

const PIXEL_COLORS = [
  "#ff0000",
  "#ff6600",
  "#ffd700",
  "#00ff00",
  "#00ffff",
  "#0066ff",
  "#9900ff",
  "#ff00ff",
];

export default function Hero8Bit() {
  const heroStyle: CSSProperties = {
    background: `linear-gradient(180deg, ${COLORS.bgMid} 0%, ${COLORS.bgLight} 50%, ${COLORS.bgMid} 100%)`,
    padding: "5rem 2rem 3rem",
    textAlign: "center",
    borderBottom: `3px solid ${COLORS.gold}`,
    fontFamily: FONT,
  };

  const starsStyle: CSSProperties = {
    fontSize: "clamp(0.75rem, 2vw, 1.25rem)",
    color: COLORS.gold,
    letterSpacing: "1rem",
    marginBottom: "2rem",
    display: "block",
  };

  const titleStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(1.25rem, 5vw, 3rem)",
    color: COLORS.gold,
    textShadow: `4px 4px 0 ${COLORS.goldDark}`,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: "0 0 0.75rem",
    lineHeight: "1.3",
  };

  const subtitleStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.75rem, 2.5vw, 1.5rem)",
    color: COLORS.white,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    margin: "0 0 2rem",
  };

  const dateStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.5rem, 1.5vw, 0.75rem)",
    color: COLORS.green,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: "0 0 3rem",
    lineHeight: "2",
  };

  const ctaBtnStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.55rem, 1.5vw, 0.75rem)",
    color: COLORS.bgDark,
    backgroundColor: COLORS.gold,
    border: `3px solid ${COLORS.goldDark}`,
    padding: "1rem 2rem",
    textTransform: "uppercase",
    cursor: "pointer",
    display: "inline-block",
    textDecoration: "none",
    letterSpacing: "0.05em",
    marginBottom: "3rem",
    boxShadow: `4px 4px 0 ${COLORS.goldDark}`,
  };

  return (
    <section style={heroStyle} id="home">
      <span style={starsStyle}>★ ★ ★ ★ ★</span>
      <h1 style={titleStyle}>CRYSTAL LAKE</h1>
      <p style={subtitleStyle}>CARS &amp; CAFFEINE</p>
      <p style={dateStyle}>
        ► MAY 17, 2026 ◄
        <br />
        DOWNTOWN CRYSTAL LAKE
      </p>
      <Link href="/register" style={ctaBtnStyle}>
        ★ REGISTER NOW ★
      </Link>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "4px",
          flexWrap: "wrap",
          maxWidth: "400px",
          margin: "0 auto",
        }}
      >
        {PIXEL_COLORS.map((color, i) => (
          <div
            key={i}
            style={{
              width: "24px",
              height: "24px",
              backgroundColor: color,
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </section>
  );
}
