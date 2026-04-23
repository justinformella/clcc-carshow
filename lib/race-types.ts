import React from "react";

export type RaceCar = {
  id: string;
  carNumber: number;
  year: number;
  name: string;
  color: string;
  owner: string;
  hp: number;
  weight: number;
  pwr: number;
  displacement: number;
  cylinders: number;
  engineType: string;
  category: string;
  driveType: string;
  bodyStyle: string;
  origin: string;
  era: string;
  production: number;
  redline: number;
  topSpeed: number;
  gears: number;
  trans: string;
  pixelArt: string | null;
  pixelDash: string | null;
  pixelDashFull: string | null;
  pixelRear: string | null;
  aiImage: string | null;
  flipped: boolean;
  dragCoefficient: number;
};

export type SceneryDef = { type: string; color: string; w: number; h: number; rare?: boolean };
export type TrackSkin = {
  name: string;
  sky1: string;
  sky2: string;
  horizonColor: string;
  roadColor: string;
  roadEdge: string;
  stripeLight: string;
  stripeDark: string;
  grassLight: string;
  grassDark: string;
  rumbleLight: string;
  rumbleDark: string;
  scenery: SceneryDef[];
};

// ─── 8-BIT PALETTE ───
export const C = {
  bgDark: "#0d0d1a",
  bgMid: "#1a1a2e",
  bgLight: "#2a1a3e",
  gold: "#ffd700",
  goldDark: "#b8860b",
  green: "#00ff00",
  red: "#ff0000",
  white: "#ffffff",
  gray: "#cccccc",
  midGray: "#aaaaaa",
  border: "#333333",
};

export const FONT = "'Press Start 2P', monospace";

export const pageStyle: React.CSSProperties = {
  background: C.bgDark,
  minHeight: "100vh",
  padding: "1.5rem",
  fontFamily: FONT,
};

export const goldBtnStyle: React.CSSProperties = {
  padding: "0.7rem 1.5rem",
  background: C.gold,
  color: C.bgDark,
  border: `2px solid ${C.goldDark}`,
  fontFamily: FONT,
  fontSize: "0.75rem",
  cursor: "pointer",
  textTransform: "uppercase",
};

export const pixelBtnStyle: React.CSSProperties = {
  padding: "0.7rem 1.5rem",
  background: C.bgMid,
  color: C.gray,
  border: `2px solid ${C.border}`,
  fontFamily: FONT,
  fontSize: "0.75rem",
  cursor: "pointer",
  textTransform: "uppercase",
};

export const kbdStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0.15rem 0.4rem",
  background: C.bgMid,
  border: `1px solid ${C.border}`,
  fontFamily: FONT,
  fontSize: "0.75rem",
  color: C.gold,
};
