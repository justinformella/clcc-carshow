"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAnchorClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition =
          elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
      setMenuOpen(false);
    }
  };

  return (
    <header id="header" className={scrolled ? "scrolled" : ""}>
      <div className="header-inner">
        <a href="#" className="logo">
          <Image
            src="/images/CLCC_Logo2026.png"
            alt="CLCC Logo"
            width={120}
            height={120}
            className="logo-mark"
            priority
          />
          <div className="logo-text-group">
            <span className="logo-text">Crystal Lake Cars &amp; Caffeine</span>
            <span className="logo-tagline">
              Est. 2021 &middot; Crystal Lake, Illinois
            </span>
          </div>
        </a>
        <nav>
          <ul style={menuOpen ? { display: "flex" } : undefined}>
            <li>
              <a href="#about" onClick={(e) => handleAnchorClick(e, "#about")}>
                About
              </a>
            </li>
            <li>
              <a
                href="#schedule"
                onClick={(e) => handleAnchorClick(e, "#schedule")}
              >
                Schedule
              </a>
            </li>
            <li>
              <a
                href="#sponsors"
                onClick={(e) => handleAnchorClick(e, "#sponsors")}
              >
                Sponsors
              </a>
            </li>
            <li>
              <a href="#faq" onClick={(e) => handleAnchorClick(e, "#faq")}>
                FAQ
              </a>
            </li>
            <li>
              <Link href="/register" className="nav-cta">
                Register
              </Link>
            </li>
          </ul>
        </nav>
        <div
          className="mobile-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </header>
  );
}
