import { CSSProperties } from "react";

export const COLORS = {
  bgDark: "#0d0d1a",
  bgMid: "#1a1a2e",
  bgLight: "#2a1a3e",
  gold: "#ffd700",
  goldDark: "#b8860b",
  green: "#00ff00",
  red: "#ff0000",
  white: "#ffffff",
  lightGray: "#cccccc",
  midGray: "#aaaaaa",
  border: "#333333",
  borderGold: "#ffd700",
};

export const FONT = "'Press Start 2P', monospace";

export function sectionStyle(bg?: string): CSSProperties {
  return {
    backgroundColor: bg ?? COLORS.bgMid,
    padding: "4rem 2rem",
    fontFamily: FONT,
  };
}

export function sectionTitleStyle(color?: string): CSSProperties {
  return {
    fontFamily: FONT,
    fontSize: "clamp(0.75rem, 2vw, 1.1rem)",
    color: color ?? COLORS.gold,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "2.5rem",
    textAlign: "center",
  };
}

export function bodyTextStyle(color?: string): CSSProperties {
  return {
    fontFamily: FONT,
    fontSize: "0.65rem",
    color: color ?? COLORS.lightGray,
    lineHeight: "2.2",
    textTransform: "uppercase",
  };
}

export function pixelBorderStyle(color?: string, width?: number): CSSProperties {
  return {
    border: `${width ?? 2}px solid ${color ?? COLORS.border}`,
  };
}

export function goldButtonStyle(): CSSProperties {
  return {
    fontFamily: FONT,
    fontSize: "0.65rem",
    color: COLORS.bgDark,
    backgroundColor: COLORS.gold,
    border: `2px solid ${COLORS.goldDark}`,
    padding: "0.75rem 1.5rem",
    textTransform: "uppercase",
    cursor: "pointer",
    display: "inline-block",
    textDecoration: "none",
    letterSpacing: "0.05em",
  };
}
