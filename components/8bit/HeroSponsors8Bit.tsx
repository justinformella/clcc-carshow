"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { COLORS, FONT } from "./styles";

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

export default function HeroSponsors8Bit() {
  const [tiers, setTiers] = useState<SponsorTier[]>([]);

  useEffect(() => {
    fetch("/api/sponsors/public")
      .then((res) => res.json())
      .then((data) => setTiers(data.tiers || []))
      .catch(() => {});
  }, []);

  if (tiers.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: COLORS.bgDark,
        borderTop: `2px solid ${COLORS.border}`,
        borderBottom: `2px solid ${COLORS.border}`,
        padding: "1.5rem 2rem",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: "2rem",
        }}
      >
        {tiers.map((tier) => (
          <div
            key={tier.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem",
              width: "100%",
            }}
          >
            <span
              style={{
                fontFamily: FONT,
                fontSize: "0.4rem",
                color: COLORS.goldDark,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              {tier.label}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "1rem" }}>
            {tier.sponsors.map((s) => {
              const logoSrc = getLogoSrc(s);
              const isPresenting = tier.isPresenting;
              return (
                <SponsorLink key={s.company} sponsor={s}>
                  <div
                    style={{
                      border: `2px solid ${isPresenting ? COLORS.borderGold : COLORS.border}`,
                      padding: isPresenting ? "1rem 1.5rem" : "0.75rem 1.25rem",
                      backgroundColor: COLORS.bgMid,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.4rem",
                      cursor: s.website ? "pointer" : "default",
                      transition: "border-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = COLORS.borderGold;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isPresenting
                        ? COLORS.borderGold
                        : COLORS.border;
                    }}
                  >
                    {logoSrc ? (
                      <img
                        src={logoSrc}
                        alt={s.company}
                        style={{
                          maxHeight: isPresenting ? "80px" : "64px",
                          maxWidth: isPresenting ? "220px" : "180px",
                          objectFit: "contain",
                          imageRendering: "pixelated",
                        }}
                      />
                    ) : null}
                    <span
                      style={{
                        fontFamily: FONT,
                        fontSize: "0.35rem",
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
      </div>
    </div>
  );
}
