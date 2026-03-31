"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useEffect } from "react";

type SponsorEntry = {
  company: string;
  sponsorship_level: string;
  logo_url: string | null;
  website: string | null;
};

type SponsorTier = {
  label: string;
  sponsors: SponsorEntry[];
  isPresenting: boolean;
};

export default function SponsorsSection() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tiers, setTiers] = useState<SponsorTier[]>([]);

  useEffect(() => {
    fetch("/api/sponsors/public")
      .then((res) => res.json())
      .then((data) => setTiers(data.tiers || []))
      .catch(() => {});
  }, []);

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

        {tiers.map((tier) => (
          <div key={tier.label} className={`sponsor-tier${tier.isPresenting ? " title" : ""}`}>
            <p className="sponsor-tier-label">{tier.label}</p>
            <div className="sponsor-grid">
              {tier.sponsors.map((s) => (
                <SponsorLogo key={s.company} sponsor={s} />
              ))}
            </div>
          </div>
        ))}

        {/* Why Sponsor */}
        <div className="sponsor-why">
          <h3 className="sponsor-why-heading">Why Sponsor?</h3>
          <p className="sponsor-why-text">
            Put your brand in front of thousands of engaged attendees in the
            heart of downtown Crystal Lake. Our sponsors get prominent logo
            placement, on-site signage, PA mentions, and a direct connection to
            the community&mdash;all while supporting the Crystal Lake Food Pantry.
          </p>
          <div className="sponsor-why-stats">
            <div className="sponsor-why-stat">
              <p className="sponsor-why-stat-number">6,000+</p>
              <p className="sponsor-why-stat-label">Attendees</p>
            </div>
            <div className="sponsor-why-stat">
              <p className="sponsor-why-stat-number">200+</p>
              <p className="sponsor-why-stat-label">Show Vehicles</p>
            </div>
            <div className="sponsor-why-stat">
              <p className="sponsor-why-stat-number">3</p>
              <p className="sponsor-why-stat-label">City Blocks</p>
            </div>
            <div className="sponsor-why-stat">
              <p className="sponsor-why-stat-number">4th</p>
              <p className="sponsor-why-stat-label">Annual Event</p>
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
                  <option value="Presenting Sponsor ($2,500)">
                    Presenting Sponsor ($2,500)
                  </option>
                  <option value="Premier Sponsor ($1,000)">
                    Premier Sponsor ($1,000)
                  </option>
                  <option value="Community Sponsor ($500)">
                    Community Sponsor ($500)
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

function getLogoSrc(sponsor: SponsorEntry): string | null {
  if (sponsor.logo_url) return sponsor.logo_url;
  if (sponsor.website) {
    const domain = sponsor.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  }
  return null;
}

function SponsorLogo({ sponsor }: { sponsor: SponsorEntry }) {
  const logoSrc = getLogoSrc(sponsor);
  const inner = (
    <div className="sponsor-logo" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
      {logoSrc && (
        <img
          src={logoSrc}
          alt={sponsor.company}
          style={{
            maxHeight: "100px",
            maxWidth: "240px",
            objectFit: "contain",
          }}
        />
      )}
      <h4>{sponsor.company}</h4>
    </div>
  );

  if (sponsor.website) {
    return (
      <a
        href={sponsor.website.startsWith("http") ? sponsor.website : `https://${sponsor.website}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {inner}
      </a>
    );
  }

  return inner;
}
