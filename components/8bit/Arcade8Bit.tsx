"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { COLORS, FONT, sectionStyle, sectionTitleStyle, goldButtonStyle } from "./styles";

type ArcadeCar = {
  pixelArt: string;
};

export default function Arcade8Bit() {
  const [cars, setCars] = useState<ArcadeCar[]>([]);

  useEffect(() => {
    fetch("/api/race")
      .then((r) => r.json())
      .then((data) => {
        const withArt = (data.cars || []).filter(
          (c: { pixelArt?: string | null }) => c.pixelArt
        );
        // Shuffle and take up to 3
        const shuffled = withArt.sort(() => Math.random() - 0.5).slice(0, 3);
        setCars(shuffled);
      })
      .catch(() => {});
  }, []);

  if (cars.length === 0) return null;

  return (
    <section id="arcade" style={{ ...sectionStyle(COLORS.bgDark), textAlign: "center" }}>
      <h2 style={sectionTitleStyle()}>ARCADE</h2>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          marginBottom: "1.5rem",
          maxWidth: "600px",
          margin: "0 auto 1.5rem",
        }}
      >
        {cars.map((car, i) => (
          <div
            key={i}
            style={{
              flex: "1 1 0",
              maxWidth: "180px",
              aspectRatio: "16/9",
              background: "#111",
              border: `2px solid ${COLORS.border}`,
              boxShadow: `3px 3px 0 ${COLORS.goldDark}`,
              overflow: "hidden",
            }}
          >
            <img
              src={car.pixelArt}
              alt="Show car"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                imageRendering: "pixelated",
              }}
            />
          </div>
        ))}
      </div>

      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.7rem",
          color: COLORS.white,
          marginBottom: "1.5rem",
          lineHeight: 2,
        }}
      >
        Try out the show car lineup
      </p>

      <Link href="/race" style={{ ...goldButtonStyle(), textDecoration: "none" }}>
        PLAY
      </Link>
    </section>
  );
}
