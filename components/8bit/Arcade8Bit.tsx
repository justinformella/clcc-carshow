"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { COLORS, FONT, sectionStyle, sectionTitleStyle } from "./styles";

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
        const shuffled = withArt.sort(() => Math.random() - 0.5).slice(0, 3);
        setCars(shuffled);
      })
      .catch(() => {});
  }, []);

  if (cars.length === 0) return null;

  return (
    <section id="arcade" style={{ ...sectionStyle(COLORS.bgDark), textAlign: "center" }}>
      <h2 style={sectionTitleStyle()}>CLCC ARCADE</h2>

      {/* Arcade Cabinet */}
      <div style={{
        display: "inline-block",
        background: "linear-gradient(to bottom, #2a2a3e, #1a1a2e)",
        border: `3px solid #444`,
        borderRadius: "12px 12px 4px 4px",
        padding: "0",
        maxWidth: "400px",
        width: "90%",
        overflow: "hidden",
      }}>
        {/* Gold Marquee */}
        <div style={{
          background: `linear-gradient(to right, ${COLORS.goldDark}, ${COLORS.gold}, ${COLORS.goldDark})`,
          padding: "0.6rem 1rem",
          textAlign: "center",
        }}>
          <span style={{
            fontFamily: FONT,
            fontSize: "0.7rem",
            color: COLORS.bgDark,
            letterSpacing: "0.15em",
          }}>
            ★ CLCC ARCADE ★
          </span>
        </div>

        {/* Screen Area */}
        <div style={{
          background: "#000",
          border: `2px solid ${COLORS.border}`,
          margin: "1rem",
          padding: "0.8rem",
        }}>
          {/* Car thumbnails inside the screen */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "0.4rem",
            marginBottom: "0.6rem",
          }}>
            {cars.map((car, i) => (
              <div
                key={i}
                style={{
                  flex: "1 1 0",
                  aspectRatio: "16/9",
                  background: "#111",
                  border: `1px solid ${COLORS.border}`,
                  overflow: "hidden",
                  lineHeight: 0,
                }}
              >
                <img
                  src={car.pixelArt}
                  alt="Show car"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    imageRendering: "pixelated",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Screen text */}
          <p style={{
            fontFamily: FONT,
            fontSize: "0.5rem",
            color: COLORS.gold,
            lineHeight: 2,
            marginBottom: "0.4rem",
          }}>
            REDLINE MOTOR CONDOS
          </p>
          <p style={{
            fontFamily: FONT,
            fontSize: "0.4rem",
            color: COLORS.green,
            animation: "cabinetBlink 1.5s infinite",
          }}>
            INSERT COIN
          </p>
        </div>

        {/* Controls area */}
        <div style={{ padding: "0 1rem 1rem", textAlign: "center" }}>
          <p style={{
            fontFamily: FONT,
            fontSize: "0.45rem",
            color: COLORS.lightGray,
            lineHeight: 2.2,
            marginBottom: "0.8rem",
          }}>
            Race the registered cars
          </p>

          {/* Play button as a big arcade button */}
          <Link
            href="/race"
            style={{
              display: "inline-block",
              fontFamily: FONT,
              fontSize: "0.65rem",
              color: COLORS.bgDark,
              background: COLORS.gold,
              border: `2px solid ${COLORS.goldDark}`,
              boxShadow: `0 4px 0 ${COLORS.goldDark}`,
              padding: "0.6rem 2rem",
              textDecoration: "none",
              letterSpacing: "0.1em",
              borderRadius: "50px",
            }}
          >
            PLAY
          </Link>

          {/* Coin slot */}
          <div style={{ marginTop: "0.8rem" }}>
            <div style={{
              display: "inline-block",
              background: "#222",
              border: `2px solid #555`,
              borderRadius: "2px",
              padding: "0.15rem 0.8rem",
            }}>
              <div style={{ width: "24px", height: "3px", background: "#888", borderRadius: "1px", margin: "0.1rem auto" }} />
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes cabinetBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </section>
  );
}
