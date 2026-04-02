"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

export function KonamiListener() {
  const router = useRouter();
  const seqRef = useRef<string[]>([]);
  const [transitioning, setTransitioning] = useState(false);

  const triggerTransition = useCallback(() => {
    if (transitioning) return;
    setTransitioning(true);

    // Create canvas overlay for pixelation effect
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) { router.push("/8bit"); return; }

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
        setTimeout(() => router.push("/8bit"), 200);
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
  }, [router, transitioning]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      seqRef.current.push(e.key);
      if (seqRef.current.length > KONAMI.length) {
        seqRef.current = seqRef.current.slice(-KONAMI.length);
      }
      if (seqRef.current.length === KONAMI.length &&
          seqRef.current.every((k, i) => k.toLowerCase() === KONAMI[i].toLowerCase())) {
        seqRef.current = [];
        triggerTransition();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [triggerTransition]);

  return null;
}

export function FooterPixel() {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);

  const triggerTransition = useCallback(() => {
    if (transitioning) return;
    setTransitioning(true);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) { router.push("/8bit"); return; }

    canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:99999;pointer-events:none;";
    document.body.appendChild(canvas);

    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    let blockSize = 2;
    const maxBlock = 48;
    const steps = 15;
    const stepMs = 80;
    const colors = ["#1a1a2e", "#0d0d1a", "#ffd700", "#00ff00", "#333", "#555", "#000"];

    let step = 0;
    const animate = () => {
      blockSize = Math.round(2 + (maxBlock - 2) * (step / steps) * (step / steps));
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
        setTimeout(() => router.push("/8bit"), 200);
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
  }, [router, transitioning]);

  return (
    <span
      onClick={triggerTransition}
      title="8-BIT MODE"
      style={{
        display: "inline-flex",
        gap: "2px",
        cursor: "pointer",
        verticalAlign: "middle",
        marginLeft: "0.75rem",
        opacity: 0.4,
        transition: "opacity 0.3s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.4"; }}
    >
      <span style={{ width: "6px", height: "6px", background: "#ff0000", display: "inline-block" }} />
      <span style={{ width: "6px", height: "6px", background: "#ffd700", display: "inline-block" }} />
      <span style={{ width: "6px", height: "6px", background: "#00ff00", display: "inline-block" }} />
      <span style={{ width: "6px", height: "6px", background: "#0088ff", display: "inline-block" }} />
    </span>
  );
}
