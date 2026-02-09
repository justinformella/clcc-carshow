"use client";

import { useState } from "react";

export default function SponsorsSection() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/sponsors/inquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          company: formData.get("company"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          sponsorship_level: formData.get("sponsorship_level"),
          message: formData.get("message"),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      if (data.notificationError) {
        console.warn("Sponsor notification error:", data.notificationError);
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="sponsors" id="sponsors">
      <div className="section-inner">
        <div className="section-header">
          <span className="section-label">Our Partners</span>
          <h2 className="section-title">Event Sponsors</h2>
          <p className="section-subtitle">
            We are grateful to the businesses that make this event possible
          </p>
        </div>

        <div className="sponsor-tier title">
          <p className="sponsor-tier-label">Platinum Sponsors — $2,000</p>
          <div className="sponsor-grid">
            <div className="sponsor-logo">
              <h4>Your Business Here</h4>
            </div>
          </div>
        </div>

        <div className="sponsor-tier">
          <p className="sponsor-tier-label">Gold Sponsors — $500</p>
          <div className="sponsor-grid">
            <div className="sponsor-logo">
              <h4>Your Business Here</h4>
            </div>
          </div>
        </div>

        <div className="sponsor-cta">
          <h3>Become a Sponsor</h3>
          <p>
            Join us in supporting the automotive community and Crystal Lake Food
            Pantry
          </p>

          {success ? (
            <div
              style={{
                background: "#e8f5e9",
                border: "1px solid #4caf50",
                color: "#2e7d32",
                padding: "1.5rem",
                textAlign: "center",
                fontSize: "1.1rem",
                marginTop: "1rem",
              }}
            >
              Thank you! We&apos;ll be in touch soon about sponsorship opportunities.
            </div>
          ) : (
            <form className="sponsor-form" onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    background: "#fee",
                    border: "1px solid #c00",
                    color: "#c00",
                    padding: "0.8rem",
                    marginBottom: "1rem",
                    fontSize: "0.9rem",
                  }}
                >
                  {error}
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sponsor-name">Name</label>
                  <input
                    type="text"
                    id="sponsor-name"
                    name="name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="sponsor-company">Company</label>
                  <input
                    type="text"
                    id="sponsor-company"
                    name="company"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sponsor-email">Email</label>
                  <input
                    type="email"
                    id="sponsor-email"
                    name="email"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="sponsor-phone">Phone</label>
                  <input type="tel" id="sponsor-phone" name="phone" />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="sponsor-level">
                  Sponsorship Level of Interest
                </label>
                <select id="sponsor-level" name="sponsorship_level">
                  <option value="">Select a level...</option>
                  <option value="Platinum Sponsor ($2,000)">
                    Platinum Sponsor ($2,000)
                  </option>
                  <option value="Gold Sponsor ($500)">
                    Gold Sponsor ($500)
                  </option>
                  <option value="Other">Other / Not Sure</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="sponsor-message">Message (Optional)</label>
                <textarea
                  id="sponsor-message"
                  name="message"
                  placeholder="Tell us about your business or any questions you have..."
                ></textarea>
              </div>
              <button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Inquiry"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
