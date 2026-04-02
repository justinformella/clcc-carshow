"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CSSProperties } from "react";
import { COLORS, FONT } from "@/components/8bit/styles";

export default function StickyBar8Bit() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.8);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const barStyle: CSSProperties = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 500,
    backgroundColor: COLORS.bgDark,
    borderTop: `3px solid ${COLORS.gold}`,
    padding: "0.75rem 2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontFamily: FONT,
    transform: visible ? "translateY(0)" : "translateY(100%)",
    transition: "transform 0.3s ease",
  };

  const labelStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.45rem, 1.2vw, 0.65rem)",
    color: COLORS.gold,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const btnStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.45rem, 1.2vw, 0.6rem)",
    color: COLORS.bgDark,
    backgroundColor: COLORS.gold,
    border: `2px solid ${COLORS.goldDark}`,
    padding: "0.6rem 1.25rem",
    textTransform: "uppercase",
    textDecoration: "none",
    display: "inline-block",
    letterSpacing: "0.05em",
    boxShadow: `3px 3px 0 ${COLORS.goldDark}`,
  };

  return (
    <div style={barStyle}>
      <span style={labelStyle}>► REGISTER YOUR RIDE ◄</span>
      <Link href="/register" style={btnStyle}>
        ★ REGISTER ★
      </Link>
    </div>
  );
}
