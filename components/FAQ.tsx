"use client";

import { useState } from "react";

const faqs = [
  {
    question: "What types of vehicles can participate?",
    answer:
      "All vehicles are welcome! Classic cars, modern sports cars, muscle cars, imports, trucks, motorcycles, and anything with wheels that you're proud of. We celebrate all automotive enthusiasm. There are no year, make, or model restrictions.",
  },
  {
    question: "Can I leave early if needed?",
    answer:
      "For safety reasons, we ask that all show vehicles remain in place until 2:00 PM. This ensures the safety of spectators and maintains the integrity of the show. Emergency exits are available if absolutely necessary. Please inform staff at registration if you anticipate needing to leave early.",
  },
  {
    question: "Are pets allowed at the event?",
    answer:
      "Leashed pets are welcome! Please keep them under control at all times and clean up after them. Water stations for pets will be available throughout the venue. We ask that pets be kept away from show vehicles unless you're the owner.",
  },
  {
    question: "Is there handicap accessibility?",
    answer:
      "Yes, the event is fully accessible. We have designated handicap parking areas close to the show field, and all areas of the event are wheelchair accessible. Golf cart shuttles are available for those who need assistance getting around the venue.",
  },
  {
    question: "Is pre-registration required?",
    answer:
      "Pre-registration is strongly encouraged to guarantee your spot. We have limited space for show vehicles, and historically we reach capacity before the event date. Day-of registration may be available but is not guaranteed.",
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
