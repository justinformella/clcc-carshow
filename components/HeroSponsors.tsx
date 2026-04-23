"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";

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

export default function HeroSponsors() {
  const [tiers, setTiers] = useState<SponsorTier[]>([]);

  useEffect(() => {
    fetch("/api/sponsors/public")
      .then((res) => res.json())
      .then((data) => setTiers(data.tiers || []))
      .catch(() => {});
  }, []);

  if (tiers.length === 0) return null;

  return (
    <section className="hero-sponsors-bar">
      <div className="hero-sponsors-bar-inner">
        {tiers.map((tier, i) => (
          <div key={tier.label} style={{ display: "contents" }}>
            {/* removed tier divider */}
            {tier.isPresenting ? (
              <div className="hero-sponsors-bar-presenting">
                <span className="hero-sponsors-bar-label">Presented by</span>
                {tier.sponsors.map((s) => (
                  <SponsorLink key={s.company} sponsor={s}>
                    <div className="hero-sponsors-bar-logo" style={{ padding: "0.8rem 1.5rem" }}>
                      {getLogoSrc(s) ? (
                        <img
                          src={getLogoSrc(s)!}
                          alt={s.company}
                          style={{ maxHeight: "100px", maxWidth: "360px", objectFit: "contain" }}
                        />
                      ) : (
                        <span className="hero-sponsors-bar-name" style={{ color: "var(--charcoal)" }}>{s.company}</span>
                      )}
                    </div>
                  </SponsorLink>
                ))}
              </div>
            ) : (
              <div className="hero-sponsors-bar-tier">
                <span className="hero-sponsors-bar-label">{tier.label}</span>
                <div className="hero-sponsors-bar-logos">
                  {tier.sponsors.map((s) => (
                    <SponsorLink key={s.company} sponsor={s}>
                      <div className="hero-sponsors-bar-logo" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                        {getLogoSrc(s) ? (
                          <img
                            src={getLogoSrc(s)!}
                            alt={s.company}
                            style={{ maxHeight: "90px", maxWidth: "320px", objectFit: "contain" }}
                          />
                        ) : (
                          <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{s.company}</span>
                        )}
                      </div>
                    </SponsorLink>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
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

function SponsorLink({ sponsor, children }: { sponsor: SponsorEntry; children: React.ReactNode }) {
  if (sponsor.website) {
    return (
      <a
        href={sponsor.website.startsWith("http") ? sponsor.website : `https://${sponsor.website}`}
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
