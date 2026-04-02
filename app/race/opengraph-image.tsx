import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CLCC Slot Car Showdown - Retro Racing Game";
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
          background: "#08090c",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Sky */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "180px",
            background: "linear-gradient(to bottom, #0a1628, #1a3a5c)",
          }}
        />

        {/* Road area */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            background: "linear-gradient(to bottom, #1e6b1e 0%, #1e6b1e 5%, #333 5%, #333 95%, #1e6b1e 95%)",
            position: "relative",
          }}
        >
          {/* Center line */}
          <div
            style={{
              position: "absolute",
              top: "45%",
              left: "40%",
              width: "20%",
              height: "4px",
              background: "#c9a84c",
              display: "flex",
            }}
          />

          {/* Title block */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                fontSize: "72px",
                fontWeight: 800,
                color: "#c9a84c",
                letterSpacing: "-0.02em",
                textShadow: "0 4px 20px rgba(201,168,76,0.4)",
                display: "flex",
              }}
            >
              SLOT CAR SHOWDOWN
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              Crystal Lake Cars &amp; Caffeine
            </div>
          </div>
        </div>

        {/* Dashboard strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "60px",
            height: "120px",
            background: "#1a1a1e",
            borderTop: "2px solid rgba(201,168,76,0.3)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: "36px", fontWeight: 700, color: "#c9a84c", display: "flex" }}>225</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", display: "flex" }}>MPH</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: "36px", fontWeight: 700, color: "#dc2626", display: "flex" }}>7000</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", display: "flex" }}>RPM</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: "36px", fontWeight: 700, color: "#16a34a", display: "flex" }}>5</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", display: "flex" }}>GEAR</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
