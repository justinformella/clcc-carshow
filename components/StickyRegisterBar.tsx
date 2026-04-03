"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function StickyRegisterBar() {
  const [visible, setVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past the hero (~100vh)
      setVisible(window.scrollY > window.innerHeight * 0.8);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Hide when footer is in view
    const footer = document.querySelector("footer");
    if (footer) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => setFooterVisible(entry.isIntersecting),
        { threshold: 0.1 }
      );
      observerRef.current.observe(footer);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observerRef.current?.disconnect();
    };
  }, []);

  const show = visible && !footerVisible;

  return (
    <div
      className="sticky-register-bar"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transform: show ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s ease",
      }}
    >
      <div className="sticky-register-inner">
        <div className="sticky-register-text">
          <span className="sticky-register-title">Crystal Lake Cars &amp; Caffeine</span>
          <span className="sticky-register-subtitle">May 17, 2026 &middot; $30 per vehicle &middot; Net proceeds to charity</span>
        </div>
        <Link href="/register" className="sticky-register-btn">
          Register Now
        </Link>
      </div>
    </div>
  );
}
