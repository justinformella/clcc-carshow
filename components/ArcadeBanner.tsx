"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type FeaturedCar = {
  name: string;
  pixelArt: string;
};

export default function ArcadeBanner() {
  const [cars, setCars] = useState<FeaturedCar[]>([]);

  useEffect(() => {
    fetch("/api/arcade/featured")
      .then((res) => res.json())
      .then((data) => setCars(data.cars || []))
      .catch(() => {});
  }, []);

  return (
    <section
      style={{
        background: "#0d0d1a",
        padding: "4rem 2rem",
        textAlign: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Scanline overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div style={{ position: "relative", zIndex: 2, maxWidth: "900px", margin: "0 auto" }}>
        <p
          style={{
            fontFamily: "'Press Start 2P', 'Courier New', monospace",
            fontSize: "0.6rem",
            letterSpacing: "0.3em",
            color: "#D4A44A",
            marginBottom: "1rem",
            textTransform: "uppercase",
          }}
        >
          CLCC Arcade
        </p>
        <h2
          style={{
            fontFamily: "'Press Start 2P', 'Courier New', monospace",
            fontSize: "clamp(1rem, 3vw, 1.6rem)",
            color: "#fff",
            marginBottom: "0.8rem",
            lineHeight: 1.6,
          }}
        >
          Your Car. 8-Bit.
        </h2>
        <p
          style={{
            fontSize: "0.95rem",
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.7,
            marginBottom: "2rem",
            maxWidth: "500px",
            margin: "0 auto 2rem",
          }}
        >
          Every registered vehicle gets transformed into pixel art and enters
          the arcade. Race, drag, and compete for high scores.
        </p>

        {/* Pixel art car showcase */}
        {cars.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "0.5rem",
              marginBottom: "2.5rem",
              flexWrap: "wrap",
            }}
          >
            {cars.map((car, i) => (
              <div
                key={i}
                style={{
                  width: "100px",
                  height: "60px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
                title={car.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={car.pixelArt}
                  alt={car.name}
                  onError={(e) => {
                    (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                  }}
                  style={{
                    maxWidth: "90%",
                    maxHeight: "90%",
                    objectFit: "contain",
                    imageRendering: "pixelated",
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <Link
          href="/arcade"
          style={{
            display: "inline-block",
            padding: "1rem 2.5rem",
            background: "#D4A44A",
            color: "#0d0d1a",
            textDecoration: "none",
            fontFamily: "'Press Start 2P', 'Courier New', monospace",
            fontSize: "0.7rem",
            letterSpacing: "0.1em",
            transition: "background 0.3s, transform 0.3s",
          }}
        >
          Enter the Arcade
        </Link>
      </div>
    </section>
  );
}
