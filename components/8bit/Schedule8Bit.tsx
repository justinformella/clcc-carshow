import { CSSProperties } from "react";
import { COLORS, FONT, sectionTitleStyle, bodyTextStyle } from "@/components/8bit/styles";

const schedule = [
  { time: "7:30 AM", event: "CHECK-IN & DAY-OF REGISTRATION" },
  { time: "9:30 AM", event: "REGISTRATION CLOSES" },
  { time: "10:00 AM", event: "SHOW STARTS" },
  { time: "12:30 PM", event: "AWARDS CEREMONY" },
  { time: "2:00 PM", event: "SHOW ENDS" },
];

const awards = [
  "BEST OF SHOW",
  "BEST CLASSIC (PRE-2000)",
  "BEST MODERN (2000+)",
  "BEST EUROPEAN",
  "BEST JAPANESE",
  "BEST DOMESTIC",
  "BEST VANITY PLATE",
  "BEST INTERIOR",
];

export default function Schedule8Bit() {
  const sectionStyle: CSSProperties = {
    backgroundColor: COLORS.bgDark,
    padding: "4rem 2rem",
    fontFamily: FONT,
  };

  const colTitleStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.55rem, 1.5vw, 0.75rem)",
    color: COLORS.gold,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "1.5rem",
    borderBottom: `2px solid ${COLORS.border}`,
    paddingBottom: "0.75rem",
  };

  const timeStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "0.55rem",
    color: COLORS.green,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    minWidth: "90px",
    flexShrink: 0,
  };

  const eventNameStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "0.5rem",
    color: COLORS.lightGray,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    lineHeight: "2",
  };

  const awardItemStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "0.5rem",
    color: COLORS.lightGray,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    lineHeight: "2",
    borderBottom: `1px dashed ${COLORS.border}`,
    padding: "0.5rem 0",
  };

  return (
    <section style={sectionStyle} id="schedule">
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <h2 style={sectionTitleStyle()}>► SCHEDULE &amp; AWARDS ◄</h2>

        <style>{`
          @media (max-width: 700px) {
            .schedule-8bit-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>

        <div
          className="schedule-8bit-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "3rem",
          }}
        >
          {/* Left: Event Schedule */}
          <div>
            <div style={colTitleStyle}>EVENT SCHEDULE</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {schedule.map((item, i) => (
                <div key={i}>
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "flex-start",
                      padding: "0.75rem 0",
                    }}
                  >
                    <span style={timeStyle}>{item.time}</span>
                    <span style={eventNameStyle}>{item.event}</span>
                  </div>
                  {i < schedule.length - 1 && (
                    <div
                      style={{
                        borderBottom: `1px dashed ${COLORS.border}`,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Award Categories */}
          <div>
            <div style={colTitleStyle}>★ AWARD CATEGORIES ★</div>
            <div>
              {awards.map((award, i) => (
                <div key={i} style={awardItemStyle}>
                  ► {award}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
