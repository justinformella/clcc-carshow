import { CSSProperties } from "react";
import { COLORS, FONT, bodyTextStyle } from "@/components/8bit/styles";

const features = [
  { icon: "🍽", label: "LOCAL DINING" },
  { icon: "🛍", label: "UNIQUE SHOPS" },
  { icon: "🚗", label: "200+ CARS" },
  { icon: "👨‍👩‍👧", label: "FAMILY FRIENDLY" },
];

export default function SpectatorBanner8Bit() {
  const sectionStyle: CSSProperties = {
    backgroundColor: COLORS.bgLight,
    padding: "4rem 2rem",
    fontFamily: FONT,
    borderTop: `3px solid ${COLORS.green}`,
    borderBottom: `3px solid ${COLORS.green}`,
    textAlign: "center",
  };

  const labelStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.55rem, 1.5vw, 0.75rem)",
    color: COLORS.bgDark,
    backgroundColor: COLORS.green,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    padding: "0.4rem 1rem",
    display: "inline-block",
    marginBottom: "1.5rem",
  };

  const titleStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.75rem, 2.5vw, 1.1rem)",
    color: COLORS.white,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "1.5rem",
    lineHeight: "1.8",
  };

  const featureStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "0.5rem",
    color: COLORS.lightGray,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    textAlign: "center",
    border: `2px solid ${COLORS.border}`,
    padding: "1rem 0.75rem",
    lineHeight: "2.5",
  };

  return (
    <section style={sectionStyle}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={labelStyle}>FREE ADMISSION</div>
        <h2 style={titleStyle}>★ COME SEE THE SHOW! ★</h2>
        <p
          style={{
            ...bodyTextStyle(),
            textAlign: "center",
            maxWidth: "650px",
            margin: "0 auto 2.5rem",
          }}
        >
          SPECTATOR ENTRY IS COMPLETELY FREE! BRING THE WHOLE FAMILY AND ENJOY
          HUNDREDS OF INCREDIBLE VEHICLES, THE VIBRANT DOWNTOWN CRYSTAL LAKE
          ATMOSPHERE, AND ALL-DAY ENTERTAINMENT.
        </p>
        <style>{`
          @media (max-width: 600px) {
            .spectator-features-grid {
              grid-template-columns: 1fr 1fr !important;
            }
          }
        `}</style>
        <div
          className="spectator-features-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
          }}
        >
          {features.map((f, i) => (
            <div key={i} style={featureStyle}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                {f.icon}
              </div>
              {f.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
