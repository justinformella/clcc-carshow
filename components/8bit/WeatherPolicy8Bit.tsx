import { CSSProperties } from "react";
import { COLORS, FONT, sectionStyle, sectionTitleStyle, bodyTextStyle } from "@/components/8bit/styles";

const weatherCards = [
  {
    title: "LIGHT RAIN",
    body: "THE SHOW GOES ON! WE'RE CAR ENTHUSIASTS — A LITTLE WATER WON'T STOP US. BRING APPROPRIATE GEAR AND ENJOY THE UNIQUE ATMOSPHERE.",
    borderColor: COLORS.green,
  },
  {
    title: "SEVERE WEATHER",
    body: "IF SEVERE WEATHER IS FORECASTED, THE EVENT WILL BE POSTPONED TO OUR RAIN DATE: SUNDAY, MAY 31, 2026. DECISION MADE BY FRIDAY, MAY 16 AT 4:00 PM.",
    borderColor: COLORS.red,
  },
  {
    title: "UPDATES",
    body: "WEATHER DECISIONS ANNOUNCED VIA OUR WEBSITE AND EMAIL TO ALL REGISTERED PARTICIPANTS.",
    borderColor: COLORS.gold,
  },
  {
    title: "REFUNDS",
    body: "ALL REGISTRATIONS ARE NON-REFUNDABLE. 100% OF NET PROCEEDS ARE DONATED TO THE CRYSTAL LAKE FOOD PANTRY.",
    borderColor: COLORS.midGray,
  },
];

export default function WeatherPolicy8Bit() {
  const cardStyle = (borderColor: string): CSSProperties => ({
    border: `2px solid ${borderColor}`,
    padding: "1.5rem",
  });

  const cardTitleStyle = (color: string): CSSProperties => ({
    fontFamily: FONT,
    fontSize: "clamp(0.55rem, 1.5vw, 0.7rem)",
    color: color,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "1rem",
  });

  return (
    <section style={sectionStyle(COLORS.bgDark)} id="weather">
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h2 style={sectionTitleStyle()}>★ WEATHER POLICY ★</h2>

        <style>{`
          @media (max-width: 600px) {
            .weather-8bit-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>

        <div
          className="weather-8bit-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
          }}
        >
          {weatherCards.map((card, i) => (
            <div key={i} style={cardStyle(card.borderColor)}>
              <div style={cardTitleStyle(card.borderColor)}>{card.title}</div>
              <p style={bodyTextStyle()}>{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
