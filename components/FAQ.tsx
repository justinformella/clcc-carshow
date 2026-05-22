"use client";

import { useState } from "react";

const faqs = [
  {
    question: "How can my business sponsor next year's show?",
    answer:
      "We'd love to have you! Sponsorship opportunities for the 2027 show are open now. Scroll down to the Sponsors section and submit an inquiry — we'll be in touch with tiers, benefits, and how your support directly fuels the Crystal Lake Food Pantry.",
  },
  {
    question: "Where do the proceeds go?",
    answer:
      "100% of net proceeds go directly to the Crystal Lake Food Pantry. Since 1983, the pantry has been a safety net for families across McHenry County facing food insecurity — currently serving over 800 families each month.",
  },
  {
    question: "What types of vehicles are eligible for the show?",
    answer:
      "All vehicles are welcome! Classic cars, modern sports cars, muscle cars, imports, trucks, motorcycles — if it has wheels and you're proud of it, it belongs here. There are no year, make, or model restrictions.",
  },
  {
    question: "When is the next show?",
    answer:
      "We host the show every spring in downtown Crystal Lake. The 2027 date will be announced once it's locked in — follow us on social or check back here for the announcement and pre-registration details.",
  },
];

export default function FAQ() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="faq" id="faq">
      <div className="section-inner">
        <div className="section-header">
          <span className="section-label">Questions</span>
          <h2 className="section-title">Frequently Asked</h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`faq-item ${activeIndex === index ? "active" : ""}`}
            >
              <div className="faq-question" onClick={() => toggleFaq(index)}>
                <span>{faq.question}</span>
                <span className="faq-icon">+</span>
              </div>
              <div className="faq-answer">
                <div className="faq-answer-inner">{faq.answer}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
