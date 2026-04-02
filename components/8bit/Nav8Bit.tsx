import Link from "next/link";
import { CSSProperties } from "react";
import { COLORS, FONT } from "@/components/8bit/styles";

const navStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 1000,
  backgroundColor: COLORS.bgDark,
  borderBottom: `3px solid ${COLORS.gold}`,
  padding: "1rem 2rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontFamily: FONT,
};

const logoStyle: CSSProperties = {
  fontFamily: FONT,
  fontSize: "clamp(0.5rem, 1.5vw, 0.75rem)",
  color: COLORS.gold,
  textTransform: "uppercase",
  textDecoration: "none",
  letterSpacing: "0.05em",
};

const navLinksStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "1.5rem",
  listStyle: "none",
  margin: 0,
  padding: 0,
};

const linkStyle: CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.5rem",
  color: COLORS.lightGray,
  textDecoration: "none",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const registerBtnStyle: CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.5rem",
  color: COLORS.gold,
  textDecoration: "none",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  border: `2px solid ${COLORS.gold}`,
  padding: "0.5rem 0.75rem",
  display: "inline-block",
};

export default function Nav8Bit() {
  return (
    <>
      <style>{`
        @media (max-width: 600px) {
          .nav-8bit-links li.nav-link-item {
            display: none;
          }
        }
      `}</style>
      <nav style={navStyle}>
        <Link href="/80s" style={logoStyle}>
          ★ CLCC 2026 ★
        </Link>
        <ul style={navLinksStyle} className="nav-8bit-links">
          <li className="nav-link-item">
            <a href="#about" style={linkStyle}>
              ABOUT
            </a>
          </li>
          <li className="nav-link-item">
            <a href="#schedule" style={linkStyle}>
              SCHEDULE
            </a>
          </li>
          <li className="nav-link-item">
            <a href="#sponsors" style={linkStyle}>
              SPONSORS
            </a>
          </li>
          <li>
            <Link href="/register" style={registerBtnStyle}>
              ► REGISTER
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
