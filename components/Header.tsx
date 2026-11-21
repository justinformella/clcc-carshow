"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type NavLink = { label: string; href: string };

const DEFAULT_LINKS: NavLink[] = [
  { label: "About", href: "#about" },
  { label: "Winners", href: "#winners" },
  { label: "Sponsors", href: "#sponsors" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "/contact" },
];

export default function Header({ links = DEFAULT_LINKS }: { links?: NavLink[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 100);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
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
        <Link href="/" className="logo">
          <Image
            src="/images/CLCC_Logo2026.png"
            alt="CLCC Logo"
            width={60}
            height={60}
            className="logo-mark"
            priority
          />
          <div className="logo-text-group">
            <span className="logo-text">Crystal Lake Cars &amp; Caffeine</span>
            <span className="logo-tagline">
              Est. 2021 &middot; Crystal Lake, Illinois
            </span>
          </div>
        </Link>
        <nav>
          <ul style={menuOpen ? { display: "flex" } : undefined}>
            {links.map((link) =>
              link.href.startsWith("#") ? (
                <li key={link.href}>
                  <a href={link.href} onClick={(e) => handleAnchorClick(e, link.href)}>
                    {link.label}
                  </a>
                </li>
              ) : (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              )
            )}
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
