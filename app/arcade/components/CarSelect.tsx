"use client";

import { RaceCar, C, FONT, pageStyle, pixelBtnStyle } from "@/lib/race-types";

interface CarSelectProps {
  cars: RaceCar[];
  onSelect: (car: RaceCar) => void;
  generating: boolean;
  onGenerateAll: () => void;
}

export default function CarSelect({ cars, onSelect, generating, onGenerateAll }: CarSelectProps) {
  return (
    <div style={{ ...pageStyle, position: "relative", overflow: "hidden" }}>
      {/* Dimmed Redline background */}
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: `url(${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/redline-garage.png?v=2)`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        imageRendering: "pixelated",
        opacity: 0.12,
        pointerEvents: "none",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.6rem", color: C.midGray, letterSpacing: "0.2em", marginBottom: "0.5rem" }}>CLCC ARCADE</p>
          <h1 style={{ fontFamily: FONT, fontSize: "clamp(1rem, 3vw, 1.5rem)", color: C.gold, margin: "0 0 0.3rem", textTransform: "uppercase" }}>
            Redline Motor Condos
          </h1>
          <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: C.white, margin: "0 0 0.5rem" }}>Choose Your Ride</p>
          <p style={{ color: C.midGray, fontFamily: FONT, fontSize: "0.7rem" }}>{cars.length} VEHICLES IN THE GARAGE</p>
          {cars.some((c) => !c.pixelArt) && (
            <button onClick={onGenerateAll} disabled={generating} style={{ ...pixelBtnStyle, marginTop: "1rem", background: C.bgMid, color: C.gold, border: `2px solid ${C.goldDark}`, opacity: generating ? 0.5 : 1, cursor: generating ? "wait" : "pointer" }}>
              {generating ? "GENERATING..." : `GENERATE PIXEL ART (${cars.filter((c) => !c.pixelArt).length})`}
            </button>
          )}
        </div>

        {/* Car grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem", maxWidth: "1100px", margin: "0 auto" }}>
          {cars.map((car) => (
            <button
              key={car.id}
              onClick={() => onSelect(car)}
              style={{
                background: C.bgMid,
                border: `2px solid ${C.border}`,
                padding: 0,
                cursor: "pointer",
                overflow: "hidden",
                textAlign: "left",
                fontFamily: FONT,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.gold; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
            >
              <div style={{ width: "100%", aspectRatio: "16/9", background: "#000", overflow: "hidden", lineHeight: 0 }}>
                {car.pixelArt ? (
                  <img src={car.pixelArt} alt={car.name} style={{ display: "block", width: "100%", height: "100%", objectFit: "contain", objectPosition: "center bottom", imageRendering: "pixelated" }} />
                ) : car.aiImage ? (
                  <img src={car.aiImage} alt={car.name} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: C.border, fontFamily: FONT, fontSize: "0.75rem" }}>NO IMAGE</div>
                )}
              </div>
              <div style={{ padding: "0.6rem 0.7rem" }}>
                <p style={{ color: C.gold, fontSize: "0.65rem", fontFamily: FONT, marginBottom: "0.15rem" }}>{car.category || car.era}</p>
                <p style={{ color: C.white, fontSize: "0.85rem", fontFamily: FONT, marginBottom: "0.4rem", lineHeight: 1.6 }}>{car.name}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem 0.6rem", fontSize: "0.6rem", fontFamily: FONT }}>
                  <div><span style={{ color: C.midGray }}>HP </span><span style={{ color: C.white }}>{car.hp}</span></div>
                  <div><span style={{ color: C.midGray }}>WT </span><span style={{ color: C.white }}>{car.weight.toLocaleString()}</span></div>
                  {car.engineType && car.engineType !== "Unknown" && (
                    <div><span style={{ color: C.midGray }}>ENG </span><span style={{ color: C.white }}>{car.engineType}</span></div>
                  )}
                  {car.displacement > 0 && (
                    <div><span style={{ color: C.midGray }}>DSP </span><span style={{ color: C.white }}>{car.displacement}L</span></div>
                  )}
                  {car.driveType && car.driveType !== "Unknown" && (
                    <div><span style={{ color: C.midGray }}>DRV </span><span style={{ color: C.white }}>{car.driveType}</span></div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
