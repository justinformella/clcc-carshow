"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];

export function KonamiListener() {

  const seqRef = useRef<string[]>([]);
  const [transitioning, setTransitioning] = useState(false);

  const triggerTransition = useCallback(() => {
    if (transitioning) return;
    setTransitioning(true);

    // Create canvas overlay for pixelation effect
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) { window.location.href = "/8bit"; return; }

    canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:99999;pointer-events:none;";
    document.body.appendChild(canvas);

    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    // Capture current page as pixel blocks
    let blockSize = 2;
    const maxBlock = 48;
    const steps = 15;
    const stepMs = 80;

    // Generate random pixel colors based on page colors
    const colors = ["#1a1a2e", "#0d0d1a", "#ffd700", "#00ff00", "#333", "#555", "#000"];

    let step = 0;
    const animate = () => {
      blockSize = Math.round(2 + (maxBlock - 2) * (step / steps) * (step / steps));
      ctx.clearRect(0, 0, w, h);

      for (let y = 0; y < h; y += blockSize) {
        for (let x = 0; x < w; x += blockSize) {
          // Mix between transparent (early) and solid dark (late)
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
        // Final frame: solid dark with gold text
        ctx.fillStyle = "#0d0d1a";
        ctx.fillRect(0, 0, w, h);
        setTimeout(() => window.location.href = "/8bit", 200);
      }
    };

    // Play a little chiptune beep
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

export function FooterPixelLink() {
  const [transitioning, setTransitioning] = useState(false);

  const triggerTransition = useCallback(() => {
    if (transitioning) return;
    setTransitioning(true);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) { window.location.href = "/8bit"; return; }

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
        setTimeout(() => { window.location.href = "/8bit"; }, 200);
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
  }, [transitioning]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      <span
        onClick={triggerTransition}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "0.65rem",
          color: "rgba(255,255,255,0.4)",
          cursor: "pointer",
          transition: "color 0.3s",
          display: "block",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#ffd700"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
      >
        &copy; 2026 CLCC
      </span>
    </>
  );
}
