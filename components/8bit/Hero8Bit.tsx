"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState, useEffect, CSSProperties } from "react";
import { COLORS, FONT } from "@/components/8bit/styles";

const HERO_IMG = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/hero.png`;

function Countdown8Bit() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  useEffect(() => {
    const target = new Date("2026-05-17T10:00:00").getTime();
    const update = () => {
      const diff = Math.max(0, target - Date.now());
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        mins: Math.floor((diff / (1000 * 60)) % 60),
        secs: Math.floor((diff / 1000) % 60),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const unitStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.3rem",
  };
  const numStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(1rem, 3vw, 1.8rem)",
    color: COLORS.white,
    textShadow: `2px 2px 0 ${COLORS.goldDark}`,
  };
  const labelStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "0.3rem",
    color: COLORS.lightGray,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  };
  const sepStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.8rem, 2.5vw, 1.5rem)",
    color: COLORS.gold,
    alignSelf: "flex-start",
    paddingTop: "0.15rem",
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "clamp(0.5rem, 2vw, 1.5rem)", alignItems: "flex-start", marginBottom: "2rem" }}>
      <div style={unitStyle}>
        <span style={numStyle}>{timeLeft.days}</span>
        <span style={labelStyle}>DAYS</span>
      </div>
      <span style={sepStyle}>:</span>
      <div style={unitStyle}>
        <span style={numStyle}>{String(timeLeft.hours).padStart(2, "0")}</span>
        <span style={labelStyle}>HOURS</span>
      </div>
      <span style={sepStyle}>:</span>
      <div style={unitStyle}>
        <span style={numStyle}>{String(timeLeft.mins).padStart(2, "0")}</span>
        <span style={labelStyle}>MINS</span>
      </div>
      <span style={sepStyle}>:</span>
      <div style={unitStyle}>
        <span style={numStyle}>{String(timeLeft.secs).padStart(2, "0")}</span>
        <span style={labelStyle}>SECS</span>
      </div>
    </div>
  );
}

export default function Hero8Bit() {
  const heroStyle: CSSProperties = {
    position: "relative",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "6rem 2rem 3rem",
    textAlign: "center",
    fontFamily: FONT,
    overflow: "hidden",
  };

  const badgeStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.35rem, 1vw, 0.5rem)",
    color: COLORS.white,
    border: `2px solid ${COLORS.gold}`,
    padding: "0.6rem 1.5rem",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "2rem",
    display: "inline-block",
  };

  const titleStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(1rem, 4.5vw, 2.5rem)",
    color: COLORS.gold,
    textShadow: `4px 4px 0 ${COLORS.goldDark}`,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: "0 0 1.5rem",
    lineHeight: 1.4,
  };

  const dateStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.55rem, 1.5vw, 0.85rem)",
    color: COLORS.bgDark,
    backgroundColor: COLORS.gold,
    padding: "0.6rem 1.5rem",
    display: "inline-block",
    marginBottom: "1rem",
  };

  const locationStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.3rem, 1vw, 0.5rem)",
    color: COLORS.lightGray,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "2rem",
    lineHeight: 2,
  };

  const ctaPrimaryStyle: CSSProperties = {
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
    boxShadow: `3px 3px 0 ${COLORS.goldDark}`,
  };

  const ctaOutlineStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.4rem, 1.2vw, 0.6rem)",
    color: COLORS.white,
    backgroundColor: "transparent",
    border: `3px solid ${COLORS.white}`,
    padding: "1rem 2rem",
    textTransform: "uppercase",
    cursor: "pointer",
    display: "inline-block",
    textDecoration: "none",
    letterSpacing: "0.05em",
  };

  return (
    <section style={heroStyle} id="home">
      {/* 8-bit hero background image */}
      <img
        src={HERO_IMG}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          imageRendering: "pixelated",
          opacity: 0.4,
          zIndex: 0,
        }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      {/* Dark overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, rgba(13,13,26,0.5) 0%, rgba(42,26,62,0.3) 50%, rgba(13,13,26,0.7) 100%)",
        zIndex: 1,
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <div style={badgeStyle}>4TH ANNUAL CHARITY EVENT</div>
        <h1 style={titleStyle}>
          CLCC ANNUAL<br />CHARITY CAR SHOW
        </h1>
        <div style={{ marginBottom: "1rem" }}>
          <span style={dateStyle}>MAY 17, 2026</span>
        </div>
        <p style={locationStyle}>
          GRANT, BRINK &amp; WILLIAMS STREETS · DOWNTOWN CRYSTAL LAKE
        </p>

        <Countdown8Bit />

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "3rem" }}>
          <Link href="/register" style={ctaPrimaryStyle}>
            ★ REGISTER YOUR VEHICLE ★
          </Link>
          <Link href="/arcade" style={{ ...ctaPrimaryStyle, backgroundColor: "#16a34a", border: "3px solid #14532d", color: "#fff", boxShadow: "3px 3px 0 #14532d" }}>
            ► TRY THE CLCC ARCADE
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{
        position: "absolute",
        bottom: "2rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
      }}>
        <span style={{ fontFamily: FONT, fontSize: "0.35rem", color: COLORS.lightGray, textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.7 }}>SCROLL</span>
        <div style={{ width: "2px", height: "24px", background: `linear-gradient(to bottom, ${COLORS.gold}, transparent)` }} />
      </div>
    </section>
  );
}
