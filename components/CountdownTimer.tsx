"use client";

import { useState, useEffect } from "react";

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  useEffect(() => {
    const target = new Date("2026-05-17T10:00:00").getTime();

    const update = () => {
      const diff = Math.max(0, target - Date.now());
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        mins: Math.floor((diff / (1000 * 60)) % 60),
        secs: Math.floor((diff / 1000) % 60),
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="countdown">
      <div className="countdown-unit">
        <span className="countdown-number">{timeLeft.days}</span>
        <span className="countdown-label">Days</span>
      </div>
      <span className="countdown-sep">:</span>
      <div className="countdown-unit">
        <span className="countdown-number">{String(timeLeft.hours).padStart(2, "0")}</span>
        <span className="countdown-label">Hours</span>
      </div>
      <span className="countdown-sep">:</span>
      <div className="countdown-unit">
        <span className="countdown-number">{String(timeLeft.mins).padStart(2, "0")}</span>
        <span className="countdown-label">Mins</span>
      </div>
      <span className="countdown-sep">:</span>
      <div className="countdown-unit">
        <span className="countdown-number">{String(timeLeft.secs).padStart(2, "0")}</span>
        <span className="countdown-label">Secs</span>
      </div>
    </div>
  );
}
