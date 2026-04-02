"use client";

import { useState } from "react";
import { CSSProperties } from "react";
import { COLORS, FONT, sectionStyle, sectionTitleStyle, bodyTextStyle } from "@/components/8bit/styles";

const faqs = [
  {
    question: "WHAT TYPES OF VEHICLES CAN PARTICIPATE?",
    answer:
      "ALL VEHICLES ARE WELCOME! CLASSIC CARS, MODERN SPORTS CARS, MUSCLE CARS, IMPORTS, TRUCKS, MOTORCYCLES — ANYTHING WITH WHEELS YOU'RE PROUD OF. NO YEAR, MAKE, OR MODEL RESTRICTIONS.",
  },
  {
    question: "CAN I LEAVE EARLY IF NEEDED?",
    answer:
      "FOR SAFETY REASONS, WE ASK THAT ALL SHOW VEHICLES REMAIN IN PLACE UNTIL 2:00 PM. THIS ENSURES THE SAFETY OF SPECTATORS AND MAINTAINS THE INTEGRITY OF THE SHOW.",
  },
  {
    question: "ARE PETS ALLOWED AT THE EVENT?",
    answer:
      "LEASHED PETS ARE WELCOME! PLEASE KEEP THEM UNDER CONTROL AT ALL TIMES AND CLEAN UP AFTER THEM. WE ASK THAT PETS BE KEPT AWAY FROM SHOW VEHICLES UNLESS YOU'RE THE OWNER.",
  },
  {
    question: "IS PRE-REGISTRATION REQUIRED?",
    answer:
      "PRE-REGISTRATION IS STRONGLY ENCOURAGED TO GUARANTEE YOUR SPOT. WE HAVE LIMITED SPACE FOR SHOW VEHICLES AND HISTORICALLY REACH CAPACITY BEFORE THE EVENT DATE. DAY-OF REGISTRATION MAY BE AVAILABLE BUT IS NOT GUARANTEED.",
  },
];

export default function FAQ8Bit() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggle = (i: number) => {
    setActiveIndex(activeIndex === i ? null : i);
  };

  const questionStyle = (active: boolean): CSSProperties => ({
    border: `2px solid ${active ? COLORS.gold : COLORS.border}`,
    padding: "1.25rem",
    cursor: "pointer",
    marginBottom: active ? 0 : "1rem",
    transition: "border-color 0.2s",
  });

  const questionTextStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "clamp(0.45rem, 1.2vw, 0.6rem)",
    color: COLORS.white,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    lineHeight: "1.8",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem",
  };

  const arrowStyle = (active: boolean): CSSProperties => ({
    fontFamily: FONT,
    fontSize: "0.6rem",
    color: COLORS.gold,
    flexShrink: 0,
    transform: active ? "rotate(90deg)" : "rotate(0deg)",
    transition: "transform 0.2s",
    display: "inline-block",
  });

  const answerStyle: CSSProperties = {
    border: `2px solid ${COLORS.gold}`,
    borderTop: "none",
    padding: "1rem 1.25rem",
    marginBottom: "1rem",
  };

  return (
    <section style={sectionStyle(COLORS.bgMid)} id="faq">
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={sectionTitleStyle()}>★ FAQ ★</h2>
        <div>
          {faqs.map((faq, i) => {
            const active = activeIndex === i;
            return (
              <div key={i}>
                <div
                  style={questionStyle(active)}
                  onClick={() => toggle(i)}
                  role="button"
                  aria-expanded={active}
                >
                  <div style={questionTextStyle}>
                    <span>► {faq.question}</span>
                    <span style={arrowStyle(active)}>►</span>
                  </div>
                </div>
                {active && (
                  <div style={answerStyle}>
                    <p style={bodyTextStyle()}>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
