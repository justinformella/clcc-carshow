"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CSSProperties } from "react";
import { COLORS, FONT } from "@/components/8bit/styles";

export default function Nav8Bit() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
      setMenuOpen(false);
    }
  };

  const navStyle: CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 1000,
    backgroundColor: scrolled ? COLORS.bgDark : "rgba(13,13,26,0.85)",
    borderBottom: `3px solid ${COLORS.gold}`,
    padding: "0.75rem 2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontFamily: FONT,
    transition: "background-color 0.3s",
  };

  const logoStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    textDecoration: "none",
    gap: "0.2rem",
  };

  const linkStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "0.45rem",
    color: COLORS.lightGray,
    textDecoration: "none",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    transition: "color 0.2s",
  };

  const registerBtnStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "0.45rem",
    color: COLORS.bgDark,
    backgroundColor: COLORS.gold,
    textDecoration: "none",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "0.5rem 0.75rem",
    display: "inline-block",
  };

  return (
    <>
      <style>{`
        .nav-8bit-link:hover { color: ${COLORS.gold} !important; }
        @media (max-width: 768px) {
          .nav-8bit-desktop { display: none !important; }
          .nav-8bit-mobile-toggle { display: flex !important; }
        }
        @media (min-width: 769px) {
          .nav-8bit-mobile-toggle { display: none !important; }
          .nav-8bit-mobile-menu { display: none !important; }
        }
      `}</style>
      <nav style={navStyle}>
        <Link href="/8bit" style={logoStyle}>
          <span style={{ fontFamily: FONT, fontSize: "clamp(0.65rem, 2vw, 0.9rem)", color: COLORS.gold }}>
            ★ CRYSTAL LAKE CARS &amp; CAFFEINE ★
          </span>
          <span style={{ fontFamily: FONT, fontSize: "0.4rem", color: COLORS.lightGray, letterSpacing: "0.1em" }}>
            EST. 2021 · CRYSTAL LAKE, ILLINOIS
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="nav-8bit-desktop" style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <a href="#about" onClick={(e) => handleAnchorClick(e, "#about")} style={linkStyle} className="nav-8bit-link">ABOUT</a>
          <a href="#schedule" onClick={(e) => handleAnchorClick(e, "#schedule")} style={linkStyle} className="nav-8bit-link">SCHEDULE</a>
          <a href="#sponsors" onClick={(e) => handleAnchorClick(e, "#sponsors")} style={linkStyle} className="nav-8bit-link">SPONSORS</a>
          <a href="#faq" onClick={(e) => handleAnchorClick(e, "#faq")} style={linkStyle} className="nav-8bit-link">FAQ</a>
          <Link href="/contact" style={linkStyle} className="nav-8bit-link">CONTACT</Link>
          <Link href="/register" style={registerBtnStyle}>► REGISTER</Link>
        </div>

        {/* Mobile hamburger */}
        <div
          className="nav-8bit-mobile-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ display: "none", flexDirection: "column", gap: "4px", cursor: "pointer", padding: "0.5rem" }}
        >
          <span style={{ width: "20px", height: "2px", background: COLORS.gold, display: "block" }} />
          <span style={{ width: "20px", height: "2px", background: COLORS.gold, display: "block" }} />
          <span style={{ width: "20px", height: "2px", background: COLORS.gold, display: "block" }} />
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="nav-8bit-mobile-menu"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: COLORS.bgDark,
            zIndex: 999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2rem",
            fontFamily: FONT,
          }}
        >
          <button onClick={() => setMenuOpen(false)} style={{ position: "absolute", top: "1rem", right: "1.5rem", background: "none", border: "none", color: COLORS.gold, fontFamily: FONT, fontSize: "1rem", cursor: "pointer" }}>✕</button>
          {["#about", "#schedule", "#sponsors", "#faq"].map((href) => (
            <a key={href} href={href} onClick={(e) => handleAnchorClick(e, href)} style={{ ...linkStyle, fontSize: "0.6rem" }}>{href.replace("#", "").toUpperCase()}</a>
          ))}
          <Link href="/contact" style={{ ...linkStyle, fontSize: "0.6rem" }} onClick={() => setMenuOpen(false)}>CONTACT</Link>
          <Link href="/register" style={{ ...registerBtnStyle, fontSize: "0.6rem", padding: "0.75rem 1.5rem" }} onClick={() => setMenuOpen(false)}>► REGISTER</Link>
        </div>
      )}
    </>
  );
}
