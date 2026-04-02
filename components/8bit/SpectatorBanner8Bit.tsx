import { CSSProperties } from "react";
import { COLORS, FONT, bodyTextStyle } from "@/components/8bit/styles";

const features = [
  "LOCAL DINING",
  "UNIQUE SHOPS",
  "200+ CARS",
  "FAMILY FRIENDLY",
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

  const badgeStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.5rem, 1.5vw, 0.7rem)",
    color: COLORS.white,
    backgroundColor: COLORS.bgDark,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    padding: "0.6rem 1.5rem",
    display: "inline-block",
    marginBottom: "2rem",
  };

  const titleStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.75rem, 2.5vw, 1.2rem)",
    color: COLORS.gold,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "1.5rem",
    lineHeight: 1.8,
  };

  const featureStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "0.45rem",
    color: COLORS.gold,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    textAlign: "center",
    background: COLORS.bgDark,
    padding: "1.25rem 0.75rem",
    lineHeight: 2,
    boxShadow: `inset 0 0 0 2px ${COLORS.gold}, inset 0 0 0 4px ${COLORS.bgDark}, inset 0 0 0 5px ${COLORS.border}`,
  };

  return (
    <section style={sectionStyle}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={badgeStyle}>SPECTATORS FREE</div>
        <h2 style={titleStyle}>★ COME SEE THE SHOW! ★</h2>
        <p
          style={{
            ...bodyTextStyle(),
            textAlign: "center",
            maxWidth: "700px",
            margin: "0 auto 2.5rem",
          }}
        >
          DON&apos;T HAVE A CAR TO SHOW? NO PROBLEM! SPECTATORS GET IN FREE—NO
          TICKETS, NO REGISTRATION. STROLL DOWN GRANT, BRINK, AND WILLIAMS
          STREETS FILLED WITH AMAZING CARS, THEN ENJOY THE UNIQUE SHOPPING AND
          DINING IN HISTORIC DOWNTOWN CRYSTAL LAKE.
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
              ► {f}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
