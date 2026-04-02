"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import {
  COLORS,
  FONT,
  sectionStyle,
  sectionTitleStyle,
  goldButtonStyle,
} from "./styles";

type SponsorEntry = {
  company: string;
  sponsorship_level: string;
  logo_url: string | null;
  pixel_logo_url: string | null;
  website: string | null;
};

type SponsorTier = {
  label: string;
  sponsors: SponsorEntry[];
  isPresenting: boolean;
};

const inputStyle: React.CSSProperties = {
  background: "#111",
  color: "#fff",
  border: `2px solid ${COLORS.border}`,
  fontFamily: FONT,
  fontSize: "0.4rem",
  padding: "0.6rem",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.4rem",
  color: COLORS.gold,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  display: "block",
  marginBottom: "0.4rem",
};

function getLogoSrc(sponsor: SponsorEntry): string | null {
  if (sponsor.pixel_logo_url) return sponsor.pixel_logo_url;
  if (sponsor.logo_url) return sponsor.logo_url;
  return null;
}

function SponsorLink({
  sponsor,
  children,
}: {
  sponsor: SponsorEntry;
  children: React.ReactNode;
}) {
  if (sponsor.website) {
    return (
      <a
        href={
          sponsor.website.startsWith("http")
            ? sponsor.website
            : `https://${sponsor.website}`
        }
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {children}
      </a>
    );
  }
  return <>{children}</>;
}

export default function Sponsors8Bit() {
  const [tiers, setTiers] = useState<SponsorTier[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="sponsors" style={sectionStyle(COLORS.bgDark)}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Section title */}
        <h2 style={sectionTitleStyle()}>★ SPONSORS ★</h2>

        {/* Sponsor tiers */}
        {tiers.map((tier) => (
          <div key={tier.label} style={{ marginBottom: "3rem" }}>
            <p
              style={{
                fontFamily: FONT,
                fontSize: "0.45rem",
                color: COLORS.goldDark,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "1.25rem",
                textAlign: "center",
              }}
            >
              — {tier.label} —
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: tier.isPresenting ? "2rem" : "1.25rem",
              }}
            >
              {tier.sponsors.map((s) => {
                const logoSrc = getLogoSrc(s);
                return (
                  <SponsorLink key={s.company} sponsor={s}>
                    <div
                      style={{
                        border: `2px solid ${tier.isPresenting ? COLORS.borderGold : COLORS.border}`,
                        padding: tier.isPresenting ? "2rem 2.5rem" : "1.25rem 1.75rem",
                        backgroundColor: COLORS.bgMid,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.75rem",
                        minWidth: tier.isPresenting ? "260px" : "180px",
                        cursor: s.website ? "pointer" : "default",
                        transition: "border-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = COLORS.borderGold;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = tier.isPresenting
                          ? COLORS.borderGold
                          : COLORS.border;
                      }}
                    >
                      {logoSrc && (
                        <img
                          src={logoSrc}
                          alt={s.company}
                          style={{
                            maxHeight: tier.isPresenting ? "80px" : "56px",
                            maxWidth: tier.isPresenting ? "220px" : "160px",
                            objectFit: "contain",
                            imageRendering: "pixelated",
                          }}
                        />
                      )}
                      <span
                        style={{
                          fontFamily: FONT,
                          fontSize: "0.4rem",
                          color: COLORS.lightGray,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          textAlign: "center",
                        }}
                      >
                        {s.company}
                      </span>
                    </div>
                  </SponsorLink>
                );
              })}
            </div>
          </div>
        ))}

        {/* Divider */}
        <div
          style={{
            borderTop: `2px solid ${COLORS.border}`,
            margin: "3rem 0",
          }}
        />

        {/* Become a Sponsor */}
        <div>
          <h3
            style={{
              fontFamily: FONT,
              fontSize: "clamp(0.6rem, 1.5vw, 0.9rem)",
              color: COLORS.gold,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textAlign: "center",
              marginBottom: "0.75rem",
            }}
          >
            ► Become a Sponsor ◄
          </h3>
          <p
            style={{
              fontFamily: FONT,
              fontSize: "0.45rem",
              color: COLORS.midGray,
              textAlign: "center",
              lineHeight: "2.2",
              marginBottom: "2rem",
              textTransform: "uppercase",
            }}
          >
            Support the Crystal Lake Food Pantry & put your brand in front of
            6,000+ attendees
          </p>

          {success ? (
            <div
              style={{
                border: `2px solid ${COLORS.green}`,
                backgroundColor: "#001a00",
                color: COLORS.green,
                padding: "1.5rem",
                textAlign: "center",
                fontFamily: FONT,
                fontSize: "0.5rem",
                lineHeight: "2",
                textTransform: "uppercase",
              }}
            >
              ✓ Inquiry received! We&apos;ll be in touch soon about sponsorship
              opportunities.
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{
                maxWidth: "640px",
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              {error && (
                <div
                  style={{
                    border: `2px solid ${COLORS.red}`,
                    backgroundColor: "#1a0000",
                    color: COLORS.red,
                    padding: "0.75rem",
                    fontFamily: FONT,
                    fontSize: "0.4rem",
                    textTransform: "uppercase",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Row: Name + Company */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label htmlFor="s8-name" style={labelStyle}>
                    Name *
                  </label>
                  <input
                    id="s8-name"
                    type="text"
                    name="name"
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="s8-company" style={labelStyle}>
                    Company *
                  </label>
                  <input
                    id="s8-company"
                    type="text"
                    name="company"
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Row: Email + Phone */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label htmlFor="s8-email" style={labelStyle}>
                    Email *
                  </label>
                  <input
                    id="s8-email"
                    type="email"
                    name="email"
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="s8-phone" style={labelStyle}>
                    Phone
                  </label>
                  <input
                    id="s8-phone"
                    type="tel"
                    name="phone"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Sponsorship level */}
              <div>
                <label htmlFor="s8-level" style={labelStyle}>
                  Level of Interest
                </label>
                <select
                  id="s8-level"
                  name="sponsorship_level"
                  style={inputStyle}
                >
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

              {/* Message */}
              <div>
                <label htmlFor="s8-message" style={labelStyle}>
                  Message (Optional)
                </label>
                <textarea
                  id="s8-message"
                  name="message"
                  rows={4}
                  placeholder="Tell us about your business..."
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              <div style={{ textAlign: "center" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    ...goldButtonStyle(),
                    opacity: submitting ? 0.6 : 1,
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Submitting..." : "► Submit Inquiry"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
