"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];

function runPixelTransition(onDone: () => void) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("data-transition", "8bit");
  const ctx = canvas.getContext("2d");
  if (!ctx) { onDone(); return; }

  canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:99999;pointer-events:none;";
  document.body.appendChild(canvas);

  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;

  const maxBlock = 48;
  const steps = 15;
  const stepMs = 80;
  const colors = ["#1a1a2e", "#0d0d1a", "#ffd700", "#00ff00", "#333", "#555", "#000"];

  let step = 0;
  const animate = () => {
    const blockSize = Math.round(2 + (maxBlock - 2) * (step / steps) * (step / steps));
    ctx.clearRect(0, 0, w, h);

    for (let y = 0; y < h; y += blockSize) {
      for (let x = 0; x < w; x += blockSize) {
        const progress = step / steps;
        if (Math.random() < progress * 0.8) {
          ctx.fillStyle = progress > 0.7
            ? (Math.random() < 0.1 ? "#ffd700" : "#0d0d1a")
            : colors[Math.floor(Math.random() * colors.length)];
          ctx.fillRect(x, y, blockSize, blockSize);
        }
      }
    }

    step++;
    if (step <= steps) {
      setTimeout(animate, stepMs);
    } else {
      ctx.fillStyle = "#0d0d1a";
      ctx.fillRect(0, 0, w, h);
      setTimeout(onDone, 200);
    }
  };

  try {
    const ac = new AudioContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "square";
    osc.frequency.value = 440;
    osc.frequency.exponentialRampToValueAtTime(880, ac.currentTime + 0.15);
    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.3);
  } catch {}

  animate();
}

function navigateTo8Bit() {
  // Full page navigation with proper history entry
  window.location.assign("/8bit");
}

function cleanupTransition() {
  document.querySelectorAll("canvas[data-transition='8bit']").forEach((el) => el.remove());
}

export function KonamiListener() {
  const seqRef = useRef<string[]>([]);
  const [transitioning, setTransitioning] = useState(false);

  // Clean up on back navigation
  useEffect(() => {
    // Handle bfcache restore
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        cleanupTransition();
        setTransitioning(false);
      }
    };
    // Also clean up on popstate (SPA back navigation)
    const handlePopState = () => {
      cleanupTransition();
      setTransitioning(false);
    };
    // Also clean up on visibility change (tab switching back)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        cleanupTransition();
        setTransitioning(false);
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("visibilitychange", handleVisibility);

    // Clean up any leftover canvases on mount
    cleanupTransition();

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const triggerTransition = useCallback(() => {
    if (transitioning) return;
    setTransitioning(true);
    runPixelTransition(navigateTo8Bit);
  }, [transitioning]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      seqRef.current.push(e.key.toLowerCase());
      if (seqRef.current.length > KONAMI.length) {
        seqRef.current = seqRef.current.slice(-KONAMI.length);
      }
      if (seqRef.current.length === KONAMI.length &&
          seqRef.current.every((k, i) => k === KONAMI[i])) {
        seqRef.current = [];
        triggerTransition();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [triggerTransition]);

  return null;
}

export function FooterPixelBadge() {
  const [transitioning, setTransitioning] = useState(false);
  const [hovered, setHovered] = useState(false);

  const triggerTransition = useCallback(() => {
    if (transitioning) return;
    setTransitioning(true);
    runPixelTransition(navigateTo8Bit);
  }, [transitioning]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes blink8bit { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes scanlines8bit {
          0% { background-position: 0 0; }
          100% { background-position: 0 4px; }
        }
      `}</style>
      <div
        onClick={triggerTransition}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "block",
          width: "100%",
          padding: "1.2rem 1.5rem",
          background: hovered ? "#0d0d1a" : "#111118",
          cursor: "pointer",
          transition: "all 0.3s",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
          borderTop: `2px solid ${hovered ? "#ffd700" : "#333"}`,
          borderBottom: `2px solid ${hovered ? "#ffd700" : "#333"}`,
        }}
      >
        {/* Scanline overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
          pointerEvents: "none",
          animation: "scanlines8bit 0.5s linear infinite",
        }} />

        {/* CRT glow */}
        <div style={{
          position: "absolute",
          inset: 0,
          boxShadow: hovered ? "inset 0 0 40px rgba(255,215,0,0.08)" : "none",
          pointerEvents: "none",
          transition: "box-shadow 0.3s",
        }} />

        <span
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "clamp(0.6rem, 1.5vw, 0.85rem)",
            color: hovered ? "#ffd700" : "#aaa",
            letterSpacing: "0.15em",
            position: "relative",
            zIndex: 1,
            transition: "color 0.3s",
          }}
        >
          ★ TRY THE 8-BIT VERSION ★
        </span>
        <span
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "clamp(0.6rem, 1.5vw, 0.85rem)",
            color: hovered ? "#00ff00" : "#555",
            animation: "blink8bit 1s step-end infinite",
            marginLeft: "0.3rem",
            position: "relative",
            zIndex: 1,
          }}
        >
          ▌
        </span>
      </div>
    </>
  );
}
