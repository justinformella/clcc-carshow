import Link from "next/link";
import { CSSProperties } from "react";
import { COLORS, FONT } from "@/components/8bit/styles";

export default function Footer8Bit() {
  const footerStyle: CSSProperties = {
    backgroundColor: COLORS.bgDark,
    borderTop: `3px solid ${COLORS.gold}`,
    padding: "3rem 2rem 6rem",
    fontFamily: FONT,
    textAlign: "center",
  };

  const titleStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.6rem, 1.8vw, 0.85rem)",
    color: COLORS.gold,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "1rem",
  };

  const subtextStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "0.5rem",
    color: COLORS.midGray,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    lineHeight: "2.2",
    marginBottom: "2rem",
  };

  const linksRowStyle: CSSProperties = {
    display: "flex",
    justifyContent: "center",
    gap: "2rem",
    marginBottom: "2rem",
    flexWrap: "wrap",
  };

  const linkStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "0.5rem",
    color: COLORS.lightGray,
    textTransform: "uppercase",
    textDecoration: "none",
    letterSpacing: "0.05em",
    borderBottom: `1px solid ${COLORS.border}`,
    paddingBottom: "2px",
  };

  const copyrightStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "0.45rem",
    color: COLORS.midGray,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    lineHeight: "2.5",
  };

  return (
    <footer style={footerStyle}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <div style={titleStyle}>★ CRYSTAL LAKE CARS &amp; CAFFEINE ★</div>
        <div style={subtextStyle}>
          ANNUAL CHARITY CAR SHOW &middot; DOWNTOWN CRYSTAL LAKE, IL
        </div>
        <div style={linksRowStyle}>
          <Link href="/register" style={linkStyle}>
            REGISTER
          </Link>
          <Link href="/contact" style={linkStyle}>
            CONTACT
          </Link>
          <a
            href="https://www.facebook.com/groups/389632989553839"
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
          >
            FACEBOOK
          </a>
        </div>
        <div style={copyrightStyle}>
          &copy; 2026 CLCC &middot; ALL RIGHTS RESERVED
        </div>
        <div style={{ marginTop: "1rem" }}>
          <Link
            href="/admin"
            style={{
              fontFamily: FONT,
              fontSize: "0.4rem",
              color: COLORS.midGray,
              textDecoration: "none",
              opacity: 0.3,
            }}
          >
            ADMIN
          </Link>
        </div>
      </div>
    </footer>
  );
}
