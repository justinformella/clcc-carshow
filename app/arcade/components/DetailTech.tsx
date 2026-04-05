"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { initAudio, stopAll } from "@/lib/race-audio";
import { RaceCar, C, FONT, pageStyle, goldBtnStyle, pixelBtnStyle } from "@/lib/race-types";

const DETAIL_BAY_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pixel-art/detail-bay.png`;
const DETAIL_LOGO_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pixel-art/detail-tech-logo.png`;

interface DetailTechProps {
  playerCar: RaceCar;
  onBack: () => void;
}

function DetailReveal({ exteriorScore, interiorScore }: { exteriorScore: number; interiorScore: number }) {
  const [revealed, setRevealed] = useState(0);
  const [scoreDisplay, setScoreDisplay] = useState(0);
  const finalScore = Math.round(exteriorScore * 0.6 + interiorScore * 0.4);
  const label = finalScore >= 95 ? "SHOWROOM PERFECT" : finalScore >= 80 ? "SHOW READY" : finalScore >= 60 ? "STREET CLEAN" : "NEEDS WORK";
  const labelColor = finalScore >= 80 ? C.gold : finalScore >= 60 ? C.white : C.midGray;

  useEffect(() => {
    if (revealed < 1) {
      const timer = setTimeout(() => {
        try {
          const actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const osc = actx.createOscillator();
          const gain = actx.createGain();
          osc.connect(gain); gain.connect(actx.destination);
          osc.frequency.value = 80; osc.type = "square"; gain.gain.value = 0.12;
          osc.start(); osc.stop(actx.currentTime + 0.05);
        } catch { /* audio may not be available */ }
        setRevealed(1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [revealed]);

  useEffect(() => {
    if (revealed < 1 || scoreDisplay >= finalScore) return;
    const timer = setTimeout(() => setScoreDisplay((s) => Math.min(s + 2, finalScore)), 16);
    return () => clearTimeout(timer);
  }, [revealed, scoreDisplay, finalScore]);

  return (
    <div style={{ textAlign: "center", marginTop: "1rem" }}>
      {revealed >= 1 && (
        <>
          <p style={{ fontFamily: FONT, fontSize: "2rem", color: C.gold, textShadow: finalScore >= 95 ? "0 0 15px rgba(255,215,0,0.5)" : "none" }}>
            {scoreDisplay}<span style={{ fontSize: "0.8rem", color: C.midGray }}>/100</span>
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: labelColor, marginTop: "0.3rem", letterSpacing: "0.15em" }}>{label}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", maxWidth: "300px", margin: "1rem auto 0" }}>
            <div style={{ padding: "0.5rem", background: "rgba(255,215,0,0.06)", border: `1px solid ${C.goldDark}` }}>
              <div style={{ fontFamily: FONT, fontSize: "0.5rem", color: C.midGray, marginBottom: "0.2rem" }}>EXTERIOR</div>
              <div style={{ fontFamily: FONT, fontSize: "0.8rem", color: C.gold }}>{Math.round(exteriorScore)}%</div>
            </div>
            <div style={{ padding: "0.5rem", background: "rgba(255,215,0,0.06)", border: `1px solid ${C.goldDark}` }}>
              <div style={{ fontFamily: FONT, fontSize: "0.5rem", color: C.midGray, marginBottom: "0.2rem" }}>INTERIOR</div>
              <div style={{ fontFamily: FONT, fontSize: "0.8rem", color: C.gold }}>{Math.round(interiorScore)}%</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function DetailTech({ playerCar, onBack }: DetailTechProps) {
  const [detailState, setDetailState] = useState<"idle" | "exterior" | "interior" | "sweep" | "reveal">("idle");
  const [detailProgress, setDetailProgress] = useState(0);
  const [exteriorScore, setExteriorScore] = useState(0);
  const [interiorScore, setInteriorScore] = useState(0);
  const detailCanvasRef = useRef<HTMLCanvasElement>(null);
  const detailAnimRef = useRef<number>(0);
  const detailCarImgRef = useRef<HTMLImageElement | null>(null);
  const detailDashImgRef = useRef<HTMLImageElement | null>(null);
  const detailBayImgRef = useRef<HTMLImageElement | null>(null);
  const detailLogoImgRef = useRef<HTMLImageElement | null>(null);
  const grimeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const detailParticlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; star: boolean }[]>([]);
  const isDraggingRef = useRef(false);
  const lastDragPosRef = useRef<{ x: number; y: number } | null>(null);

  // ─── DETAIL TECH HELPERS ───

  const initGrimeCanvas = useCallback((width: number, height: number, carImg?: HTMLImageElement | null, carBounds?: { x: number; y: number; w: number; h: number }, flipped?: boolean) => {
    const grime = document.createElement("canvas");
    grime.width = width;
    grime.height = height;
    const gCtx = grime.getContext("2d")!;
    const bx = carBounds?.x ?? 0, by = carBounds?.y ?? 0;
    const bw = carBounds?.w ?? width, bh = carBounds?.h ?? height;

    if (carImg?.complete && carImg.naturalWidth > 0 && carBounds) {
      // Draw car silhouette as alpha mask first
      gCtx.save();
      if (flipped) { gCtx.translate(bx + bw, by); gCtx.scale(-1, 1); gCtx.drawImage(carImg, 0, 0, bw, bh); }
      else { gCtx.drawImage(carImg, bx, by, bw, bh); }
      gCtx.restore();
      // Fill only where car pixels exist using source-in
      gCtx.globalCompositeOperation = "source-in";
      gCtx.fillStyle = "rgba(80, 60, 30, 0.55)";
      gCtx.fillRect(0, 0, width, height);
      // Add noise texture on top, still masked
      gCtx.globalCompositeOperation = "source-atop";
      for (let i = 0; i < 600; i++) {
        const x = bx + Math.random() * bw;
        const y = by + Math.random() * bh;
        const r = 2 + Math.random() * 5;
        const alpha = 0.08 + Math.random() * 0.2;
        gCtx.fillStyle = Math.random() > 0.5 ? `rgba(50, 35, 15, ${alpha})` : `rgba(90, 70, 35, ${alpha})`;
        gCtx.beginPath();
        gCtx.arc(x, y, r, 0, Math.PI * 2);
        gCtx.fill();
      }
      gCtx.globalCompositeOperation = "source-over";
    } else {
      // Fallback: fill entire area (used for dashboard/interior)
      gCtx.fillStyle = "rgba(80, 60, 30, 0.45)";
      gCtx.fillRect(bx, by, bw, bh);
      for (let i = 0; i < 800; i++) {
        const x = bx + Math.random() * bw;
        const y = by + Math.random() * bh;
        const r = 2 + Math.random() * 6;
        const alpha = 0.05 + Math.random() * 0.15;
        gCtx.fillStyle = Math.random() > 0.5 ? `rgba(60, 40, 20, ${alpha})` : `rgba(100, 80, 40, ${alpha})`;
        gCtx.beginPath();
        gCtx.arc(x, y, r, 0, Math.PI * 2);
        gCtx.fill();
      }
    }
    grimeCanvasRef.current = grime;
  }, []);

  const eraseGrimeAt = useCallback((canvasX: number, canvasY: number, radius: number) => {
    const grime = grimeCanvasRef.current;
    if (!grime) return;
    const gCtx = grime.getContext("2d");
    if (!gCtx) return;
    gCtx.globalCompositeOperation = "destination-out";
    gCtx.beginPath();
    gCtx.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
    gCtx.fill();
    gCtx.globalCompositeOperation = "source-over";
    const particles = detailParticlesRef.current;
    const count = radius > 20 ? 4 : 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2.5;
      particles.push({ x: canvasX, y: canvasY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 18 + Math.random() * 10, maxLife: 28, star: Math.random() < 0.15 });
    }
  }, []);

  const calcGrimeProgress = useCallback(() => {
    const grime = grimeCanvasRef.current;
    if (!grime) return 0;
    const gCtx = grime.getContext("2d");
    if (!gCtx) return 0;
    const data = gCtx.getImageData(0, 0, grime.width, grime.height).data;
    let cleared = 0, total = 0;
    for (let i = 3; i < data.length; i += 32) { total++; if (data[i] === 0) cleared++; }
    return total > 0 ? (cleared / total) * 100 : 0;
  }, []);

  const toCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * (canvas.width / rect.width), y: (clientY - rect.top) * (canvas.height / rect.height) };
  }, []);

  const playSpraySound = useCallback(() => {
    try {
      const actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const bufferSize = actx.sampleRate * 0.08;
      const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
      const source = actx.createBufferSource();
      source.buffer = buffer;
      const filter = actx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 3000;
      source.connect(filter);
      filter.connect(actx.destination);
      source.start();
    } catch { /* audio may not be available */ }
  }, []);

  const playSparkleSound = useCallback(() => {
    try {
      const actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.connect(gain); gain.connect(actx.destination);
      osc.frequency.value = 1800 + Math.random() * 400;
      osc.type = "sine";
      gain.gain.value = 0.06;
      osc.start();
      osc.stop(actx.currentTime + 0.03);
    } catch { /* audio may not be available */ }
  }, []);

  const playSweepSound = useCallback(() => {
    try {
      const actx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.connect(gain); gain.connect(actx.destination);
      osc.frequency.setValueAtTime(200, actx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, actx.currentTime + 1);
      osc.type = "sine";
      gain.gain.value = 0.05;
      osc.start();
      osc.stop(actx.currentTime + 1);
    } catch { /* audio may not be available */ }
  }, []);

  // Draw particles helper for detail canvas
  const drawDetailParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    const particles = detailParticlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.life--;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      if (p.star) {
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - 4, p.y); ctx.lineTo(p.x + 4, p.y);
        ctx.moveTo(p.x, p.y - 4); ctx.lineTo(p.x, p.y + 4);
        ctx.stroke();
      } else {
        const radius = 1 + (1 - p.life / p.maxLife) * 2;
        ctx.fillStyle = Math.random() > 0.3 ? "#ffffff" : "#ffd700";
        ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }, []);

  // Draw car on detail canvas (reused by exterior draw + reveal)
  const drawDetailCar = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number, img: HTMLImageElement | null, mode: "side" | "dash") => {
    if (!playerCar) return { carX: 0, carY: 0, carW: 0, carH: 0 };
    if (mode === "dash") {
      if (img?.complete && img.naturalWidth > 0) {
        // Preserve native aspect ratio with cover fit
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = W / H;
        let drawW = W, drawH = H, drawX = 0, drawY = 0;
        if (imgAspect > canvasAspect) {
          drawH = H;
          drawW = H * imgAspect;
          drawX = (W - drawW) / 2;
        } else {
          drawW = W;
          drawH = W / imgAspect;
          drawY = (H - drawH) / 2;
        }
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      }
      return { carX: 0, carY: 0, carW: W, carH: H };
    }
    const groundY = H * 0.95;
    const carCX = W * 0.5;
    if (img?.complete && img.naturalWidth > 0) {
      const carW = W * 0.4;
      const carH = carW * (img.height / img.width);
      const carX = carCX - carW / 2;
      const carY = groundY - carH;
      ctx.save();
      if (playerCar.flipped) { ctx.translate(carX + carW, carY); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, carW, carH); }
      else { ctx.drawImage(img, carX, carY, carW, carH); }
      ctx.restore();
      return { carX, carY, carW, carH };
    }
    return { carX: 0, carY: 0, carW: 0, carH: 0 };
  }, [playerCar]);

  // Start exterior detail pass
  const startDetailExterior = useCallback(() => {
    if (!playerCar) return;
    setDetailState("exterior");
    setDetailProgress(0);
    detailParticlesRef.current = [];
    const canvas = detailCanvasRef.current;
    if (!canvas) return;
    // Calculate car bounds for grime overlay
    const carImg = detailCarImgRef.current;
    const W = canvas.width, H = canvas.height;
    const groundY = H * 0.95;
    let carBounds: { x: number; y: number; w: number; h: number } | undefined;
    if (carImg?.complete && carImg.naturalWidth > 0) {
      const carW = W * 0.4;
      const carH = carW * (carImg.height / carImg.width);
      const carX = W * 0.5 - carW / 2;
      const carY = groundY - carH;
      carBounds = { x: carX, y: carY, w: carW, h: carH };
    }
    initGrimeCanvas(canvas.width, canvas.height, carImg, carBounds, playerCar.flipped);
    cancelAnimationFrame(detailAnimRef.current);
    const draw = () => {
      const cvs = detailCanvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext("2d");
      if (!ctx) return;
      const W = cvs.width, H = cvs.height;
      ctx.fillStyle = "#0d0d1a"; ctx.fillRect(0, 0, W, H);
      if (detailBayImgRef.current?.complete && detailBayImgRef.current.naturalWidth > 0) {
        ctx.globalAlpha = 0.8; ctx.drawImage(detailBayImgRef.current, 0, 0, W, H); ctx.globalAlpha = 1;
      }
      drawDetailCar(ctx, W, H, detailCarImgRef.current, "side");
      const grime = grimeCanvasRef.current;
      if (grime) ctx.drawImage(grime, 0, 0);
      drawDetailParticles(ctx);
      detailAnimRef.current = requestAnimationFrame(draw);
    };
    detailAnimRef.current = requestAnimationFrame(draw);
  }, [playerCar, initGrimeCanvas, drawDetailCar, drawDetailParticles]);

  // Start interior detail pass
  const startDetailInterior = useCallback(() => {
    if (!playerCar) return;
    setDetailState("interior");
    setDetailProgress(0);
    detailParticlesRef.current = [];
    const canvas = detailCanvasRef.current;
    if (!canvas) return;
    initGrimeCanvas(canvas.width, canvas.height);
    cancelAnimationFrame(detailAnimRef.current);
    const draw = () => {
      const cvs = detailCanvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext("2d");
      if (!ctx) return;
      const W = cvs.width, H = cvs.height;
      ctx.fillStyle = "#0d0d1a"; ctx.fillRect(0, 0, W, H);
      drawDetailCar(ctx, W, H, detailDashImgRef.current, "dash");
      const grime = grimeCanvasRef.current;
      if (grime) ctx.drawImage(grime, 0, 0);
      drawDetailParticles(ctx);
      detailAnimRef.current = requestAnimationFrame(draw);
    };
    detailAnimRef.current = requestAnimationFrame(draw);
  }, [playerCar, initGrimeCanvas, drawDetailCar, drawDetailParticles]);

  // Run shine sweep then call next
  const runShineSweep = useCallback((onDone: () => void) => {
    const canvas = detailCanvasRef.current;
    if (!canvas) { onDone(); return; }
    const ctx = canvas.getContext("2d");
    if (!ctx) { onDone(); return; }
    const W = canvas.width;
    let sweepX = -W * 0.2;
    const sweepW = W * 0.2;
    playSweepSound();
    cancelAnimationFrame(detailAnimRef.current);
    const sweepDraw = () => {
      sweepX += W * 0.015;
      if (sweepX > W * 1.2) { onDone(); return; }
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const grad = ctx.createLinearGradient(sweepX, 0, sweepX + sweepW, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.5, "rgba(255,255,255,0.2)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(sweepX, 0, sweepW, canvas.height);
      ctx.restore();
      detailAnimRef.current = requestAnimationFrame(sweepDraw);
    };
    detailAnimRef.current = requestAnimationFrame(sweepDraw);
  }, [playSweepSound]);

  // Finish current detail pass
  const finishDetailPass = useCallback(() => {
    const pct = calcGrimeProgress();
    if (detailState === "exterior") {
      setExteriorScore(pct);
      setDetailState("sweep");
      runShineSweep(() => setTimeout(() => startDetailInterior(), 300));
    } else if (detailState === "interior") {
      setInteriorScore(pct);
      setDetailState("sweep");
      cancelAnimationFrame(detailAnimRef.current);
      runShineSweep(() => setDetailState("reveal"));
    }
  }, [detailState, calcGrimeProgress, runShineSweep, startDetailInterior]);

  // Detail pointer handlers
  // Brush size: interior is full-canvas so needs much larger brush
  const clickRadius = detailState === "interior" ? 50 : 25;
  const dragRadius = detailState === "interior" ? 40 : 20;

  const handleDetailPointerDown = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (detailState !== "exterior" && detailState !== "interior") return;
    e.preventDefault();
    const canvas = detailCanvasRef.current;
    if (!canvas) return;
    const pos = toCanvasCoords(e, canvas);
    isDraggingRef.current = true;
    lastDragPosRef.current = pos;
    eraseGrimeAt(pos.x, pos.y, clickRadius);
    playSpraySound();
    playSparkleSound();
    const pct = calcGrimeProgress();
    setDetailProgress(pct);
  }, [detailState, clickRadius, toCanvasCoords, eraseGrimeAt, playSpraySound, playSparkleSound, calcGrimeProgress]);

  const progressThrottleRef = useRef(0);

  const handleDetailPointerMove = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const canvas = detailCanvasRef.current;
    if (!canvas) return;
    const pos = toCanvasCoords(e, canvas);
    const last = lastDragPosRef.current;
    if (last) {
      const dx = pos.x - last.x, dy = pos.y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.floor(dist / 8));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        eraseGrimeAt(last.x + dx * t, last.y + dy * t, dragRadius);
      }
    }
    lastDragPosRef.current = pos;
    // Update progress every 10 frames to avoid perf hit
    progressThrottleRef.current++;
    if (progressThrottleRef.current % 10 === 0) {
      const pct = calcGrimeProgress();
      setDetailProgress(pct);
      if (pct >= 95) finishDetailPass();
    }
  }, [toCanvasCoords, eraseGrimeAt, dragRadius, calcGrimeProgress, finishDetailPass]);

  const handleDetailPointerUp = useCallback(() => {
    isDraggingRef.current = false;
    lastDragPosRef.current = null;
    const pct = calcGrimeProgress();
    setDetailProgress(pct);
    if (pct >= 95) finishDetailPass();
  }, [calcGrimeProgress, finishDetailPass]);

  // Draw idle detail canvas when entering detail phase
  useEffect(() => {
    initAudio();
    setDetailState("idle");
    setDetailProgress(0);
    setExteriorScore(0);
    setInteriorScore(0);

    const carImg = new Image(); carImg.crossOrigin = "anonymous";
    if (playerCar.pixelArt) carImg.src = playerCar.pixelArt;
    detailCarImgRef.current = carImg;

    const dashImg = new Image(); dashImg.crossOrigin = "anonymous";
    if (playerCar.pixelDash) dashImg.src = playerCar.pixelDash;
    detailDashImgRef.current = dashImg;

    const bayImg = new Image(); bayImg.crossOrigin = "anonymous";
    bayImg.src = DETAIL_BAY_URL;
    detailBayImgRef.current = bayImg;

    const logoImg = new Image(); logoImg.crossOrigin = "anonymous";
    logoImg.src = DETAIL_LOGO_URL;
    detailLogoImgRef.current = logoImg;

    const drawIdle = () => {
      const canvas = detailCanvasRef.current;
      if (!canvas) { requestAnimationFrame(drawIdle); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = canvas.width, H = canvas.height;
      ctx.fillStyle = "#0d0d1a"; ctx.fillRect(0, 0, W, H);
      if (bayImg.complete && bayImg.naturalWidth > 0) {
        ctx.globalAlpha = 0.8; ctx.drawImage(bayImg, 0, 0, W, H); ctx.globalAlpha = 1;
      } else { bayImg.onload = () => requestAnimationFrame(drawIdle); return; }
      const groundY = H * 0.95, carCX = W * 0.5;
      if (carImg.complete && carImg.naturalWidth > 0) {
        const carW = W * 0.4, carH = carW * (carImg.height / carImg.width);
        const carX = carCX - carW / 2, carY = groundY - carH;
        ctx.save();
        if (playerCar.flipped) { ctx.translate(carX + carW, carY); ctx.scale(-1, 1); ctx.drawImage(carImg, 0, 0, carW, carH); }
        else { ctx.drawImage(carImg, carX, carY, carW, carH); }
        ctx.restore();
        // Draw grime shaped to car silhouette using temp canvas
        const tmp = document.createElement("canvas");
        tmp.width = W; tmp.height = H;
        const tCtx = tmp.getContext("2d")!;
        if (playerCar.flipped) { tCtx.translate(carX + carW, carY); tCtx.scale(-1, 1); tCtx.drawImage(carImg, 0, 0, carW, carH); }
        else { tCtx.drawImage(carImg, carX, carY, carW, carH); }
        tCtx.globalCompositeOperation = "source-in";
        tCtx.fillStyle = "rgba(80, 60, 30, 0.55)";
        tCtx.fillRect(0, 0, W, H);
        tCtx.globalCompositeOperation = "source-over";
        ctx.drawImage(tmp, 0, 0);
      } else { carImg.onload = () => requestAnimationFrame(drawIdle); }
    };
    const waitForCanvas = () => { if (detailCanvasRef.current) drawIdle(); else requestAnimationFrame(waitForCanvas); };
    waitForCanvas();
    return () => cancelAnimationFrame(detailAnimRef.current);
  }, [playerCar]);

  // Before/after canvas reveal animation
  useEffect(() => {
    if (detailState !== "reveal" || !playerCar) return;
    const canvas = detailCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const carImg = detailCarImgRef.current;
    if (!carImg?.complete) return;
    const carW = W * 0.4, carH = carW * (carImg.height / carImg.width);
    const groundY = H * 0.95;
    const carX = W * 0.5 - carW / 2, carY = groundY - carH;

    // Dirty snapshot
    const dirtyCanvas = document.createElement("canvas");
    dirtyCanvas.width = W; dirtyCanvas.height = H;
    const dCtx = dirtyCanvas.getContext("2d")!;
    dCtx.fillStyle = "#0d0d1a"; dCtx.fillRect(0, 0, W, H);
    if (detailBayImgRef.current?.complete) { dCtx.globalAlpha = 0.8; dCtx.drawImage(detailBayImgRef.current, 0, 0, W, H); dCtx.globalAlpha = 1; }
    dCtx.save();
    if (playerCar.flipped) { dCtx.translate(carX + carW, carY); dCtx.scale(-1, 1); dCtx.drawImage(carImg, 0, 0, carW, carH); }
    else { dCtx.drawImage(carImg, carX, carY, carW, carH); }
    dCtx.restore();
    dCtx.fillStyle = "rgba(80, 60, 30, 0.45)"; dCtx.fillRect(carX, carY, carW, carH);

    const cleanFrame = () => {
      ctx.fillStyle = "#0d0d1a"; ctx.fillRect(0, 0, W, H);
      if (detailBayImgRef.current?.complete) { ctx.globalAlpha = 0.8; ctx.drawImage(detailBayImgRef.current, 0, 0, W, H); ctx.globalAlpha = 1; }
      ctx.save();
      if (playerCar.flipped) { ctx.translate(carX + carW, carY); ctx.scale(-1, 1); ctx.drawImage(carImg, 0, 0, carW, carH); }
      else { ctx.drawImage(carImg, carX, carY, carW, carH); }
      ctx.restore();
    };

    const startTime = performance.now();
    const duration = 1500;
    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const dividerX = eased * W;
      cleanFrame();
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, dividerX, H); ctx.clip();
      ctx.drawImage(dirtyCanvas, 0, 0); ctx.restore();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(dividerX, 0); ctx.lineTo(dividerX, H); ctx.stroke();
      if (dividerX > 60) { ctx.fillStyle = C.midGray; ctx.font = "10px 'Press Start 2P', monospace"; ctx.fillText("BEFORE", dividerX - 55, 20); }
      if (dividerX < W - 60) { ctx.fillStyle = C.gold; ctx.font = "10px 'Press Start 2P', monospace"; ctx.fillText("AFTER", dividerX + 10, 20); }
      if (t < 1) detailAnimRef.current = requestAnimationFrame(animate);
    };
    detailAnimRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(detailAnimRef.current);
  }, [detailState, playerCar]);

  // ─── DETAIL TECH ───
  return (
    <div style={pageStyle}>
      <div style={{ textAlign: "center", marginBottom: "0.25rem" }}>
        <h1 style={{ fontFamily: FONT, fontSize: "clamp(0.9rem, 2.5vw, 1.3rem)", color: C.gold, margin: "0.25rem 0" }}>DETAIL TECH</h1>
      </div>

      <canvas
        ref={detailCanvasRef}
        width={800}
        height={450}
        onMouseDown={handleDetailPointerDown}
        onMouseMove={handleDetailPointerMove}
        onMouseUp={handleDetailPointerUp}
        onMouseLeave={handleDetailPointerUp}
        onTouchStart={handleDetailPointerDown}
        onTouchMove={handleDetailPointerMove}
        onTouchEnd={handleDetailPointerUp}
        style={{ width: "100%", maxWidth: "800px", display: "block", margin: "0 auto", imageRendering: "pixelated", border: `1px solid ${C.border}`, cursor: detailState === "exterior" || detailState === "interior" ? "crosshair" : "default", touchAction: "none" }}
      />

      {(detailState === "exterior" || detailState === "interior") && (
        <div style={{ maxWidth: "800px", margin: "0.5rem auto", padding: "0 0.5rem" }}>
          <div style={{ background: "#1a1a1a", height: 8, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ background: C.gold, width: `${detailProgress}%`, height: "100%", transition: "width 0.1s" }} />
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.55rem", color: C.midGray, textAlign: "center", marginTop: "0.3rem" }}>
            {detailState === "exterior" ? "EXTERIOR" : "INTERIOR"} — {Math.round(detailProgress)}% CLEAN
          </p>
        </div>
      )}

      {detailState === "idle" && (
        <button onClick={() => startDetailExterior()} style={{ ...goldBtnStyle, padding: "0.8rem 2.5rem", fontSize: "1rem", display: "block", margin: "1rem auto" }}>
          START DETAIL
        </button>
      )}

      {(detailState === "exterior" || detailState === "interior") && (
        <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.5rem", color: C.midGray }}>Click to spray · Drag to wipe</p>
          {detailProgress >= 50 && (
            <button onClick={() => finishDetailPass()} style={{ ...pixelBtnStyle, padding: "0.5rem 1.5rem", fontSize: "0.7rem", marginTop: "0.5rem", background: C.bgMid, color: C.gold, border: `1px solid ${C.goldDark}` }}>
              DONE
            </button>
          )}
        </div>
      )}

      {detailState === "reveal" && (
        <DetailReveal exteriorScore={exteriorScore} interiorScore={interiorScore} />
      )}

      <button
        onClick={() => { cancelAnimationFrame(detailAnimRef.current); stopAll(); setDetailState("idle"); onBack(); }}
        style={{ background: "none", border: "none", color: C.midGray, fontFamily: FONT, fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline", marginTop: "1.5rem", display: "block", margin: "1.5rem auto 0" }}
      >
        BACK TO GARAGE
      </button>
    </div>
  );
}
