import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CLCC Car Show | 8-Bit Edition";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0d0d1a",
          position: "relative",
          overflow: "hidden",
          fontFamily: "monospace",
        }}
      >
        {/* CRT scanlines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
            zIndex: 10,
          }}
        />

        {/* Pixel border */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6px", background: "#ffd700", display: "flex" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "6px", background: "#ffd700", display: "flex" }} />
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "6px", background: "#ffd700", display: "flex" }} />
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "6px", background: "#ffd700", display: "flex" }} />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            gap: "16px",
            padding: "40px",
          }}
        >
          {/* Stars */}
          <div style={{ fontSize: "28px", color: "#ffd700", letterSpacing: "0.5em", display: "flex" }}>
            ★ ★ ★ ★ ★
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: "72px",
              fontWeight: 900,
              color: "#ffd700",
              textShadow: "4px 4px 0 #b8860b",
              letterSpacing: "0.05em",
              display: "flex",
            }}
          >
            CRYSTAL LAKE
          </div>
          <div
            style={{
              fontSize: "36px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "0.15em",
              display: "flex",
            }}
          >
            CARS &amp; CAFFEINE
          </div>

          {/* Badge */}
          <div
            style={{
              fontSize: "20px",
              color: "#0d0d1a",
              background: "#ffd700",
              padding: "8px 24px",
              display: "flex",
              marginTop: "8px",
            }}
          >
            8-BIT EDITION
          </div>

          {/* Date */}
          <div
            style={{
              fontSize: "18px",
              color: "#00ff00",
              letterSpacing: "0.15em",
              display: "flex",
              marginTop: "8px",
            }}
          >
            ► MAY 17, 2026 ◄
          </div>

          {/* Pixel color strip */}
          <div style={{ display: "flex", gap: "6px", marginTop: "16px" }}>
            {["#ff0000", "#ff6600", "#ffd700", "#00ff00", "#00ffff", "#0066ff", "#9900ff", "#ff00ff", "#ff0000", "#ff6600"].map((c, i) => (
              <div key={i} style={{ width: "20px", height: "20px", background: c, display: "flex" }} />
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
