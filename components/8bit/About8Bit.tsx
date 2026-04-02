import { CSSProperties } from "react";
import { COLORS, FONT, sectionStyle, sectionTitleStyle, bodyTextStyle } from "@/components/8bit/styles";

const PIXEL_COLORS = [
  "#ff0000",
  "#ff6600",
  "#ffd700",
  "#00ff00",
  "#00ffff",
  "#0066ff",
  "#9900ff",
  "#ff00ff",
  "#ff0000",
  "#ff6600",
  "#ffd700",
  "#00ff00",
];

function PixelDivider() {
  return (
    <div
      style={{
        display: "flex",
        gap: "4px",
        justifyContent: "center",
        margin: "2.5rem 0",
        flexWrap: "wrap",
      }}
    >
      {PIXEL_COLORS.map((color, i) => (
        <div
          key={i}
          style={{ width: "16px", height: "16px", backgroundColor: color }}
        />
      ))}
    </div>
  );
}

export default function About8Bit() {
  const maxWidth = "900px";

  const statNumStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.85rem, 2.5vw, 1.25rem)",
    color: COLORS.gold,
    textTransform: "uppercase",
    display: "block",
    marginBottom: "0.5rem",
  };

  const statLabelStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "0.5rem",
    color: COLORS.midGray,
    textTransform: "uppercase",
    lineHeight: "2",
  };

  const impactNumStyle: CSSProperties = {
    ...statNumStyle,
    color: COLORS.green,
  };

  const cardStyle: CSSProperties = {
    border: `2px solid ${COLORS.border}`,
    padding: "1.5rem",
    textAlign: "center",
  };

  return (
    <section style={sectionStyle(COLORS.bgMid)} id="about">
      <div style={{ maxWidth, margin: "0 auto" }}>
        <h2 style={sectionTitleStyle()}>★ ABOUT THE EVENT ★</h2>

        <p style={{ ...bodyTextStyle(), textAlign: "center", marginBottom: "1rem" }}>
          JOIN US ON GRANT, BRINK, AND WILLIAMS STREETS IN THE HEART OF DOWNTOWN
          CRYSTAL LAKE FOR AN AMAZING DAY OF AUTOMOTIVE CELEBRATION.
        </p>
        <p
          style={{
            ...bodyTextStyle(),
            textAlign: "center",
            marginBottom: "1rem",
          }}
        >
          SUNDAY, MAY 17, 2026 &mdash; RAIN DATE MAY 31, 2026
        </p>

        <PixelDivider />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.5rem",
            marginBottom: "3rem",
          }}
        >
          <div style={cardStyle}>
            <span style={statNumStyle}>4TH</span>
            <span style={statLabelStyle}>ANNUAL</span>
          </div>
          <div style={cardStyle}>
            <span style={statNumStyle}>3</span>
            <span style={statLabelStyle}>CITY BLOCKS</span>
          </div>
          <div style={cardStyle}>
            <span style={statNumStyle}>100%</span>
            <span style={statLabelStyle}>CHARITY</span>
          </div>
        </div>

        <div
          style={{
            border: `2px solid ${COLORS.green}`,
            padding: "2rem",
          }}
        >
          <h3
            style={{
              ...sectionTitleStyle(COLORS.green),
              marginBottom: "1.5rem",
            }}
          >
            ★ DRIVING OUT HUNGER ★
          </h3>
          <p
            style={{
              ...bodyTextStyle(),
              textAlign: "center",
              marginBottom: "1.5rem",
            }}
          >
            ALL NET PROCEEDS BENEFIT THE CRYSTAL LAKE FOOD PANTRY. YOUR
            REGISTRATION FEE GOES DIRECTLY TO FIGHTING HUNGER IN OUR COMMUNITY.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1.5rem",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <span style={impactNumStyle}>$10K</span>
              <span style={statLabelStyle}>GOAL</span>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={impactNumStyle}>800+</span>
              <span style={statLabelStyle}>FAMILIES</span>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={impactNumStyle}>100%</span>
              <span style={statLabelStyle}>DONATED</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
