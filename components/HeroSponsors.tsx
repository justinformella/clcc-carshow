"use client";

import { useEffect, useState } from "react";

type SponsorEntry = {
  company: string;
  sponsorship_level: string;
  logo_url: string | null;
  website: string | null;
};

type SponsorData = {
  presenting: SponsorEntry[];
  premier: SponsorEntry[];
  community: SponsorEntry[];
};

export default function HeroSponsors() {
  const [data, setData] = useState<SponsorData | null>(null);

  useEffect(() => {
    fetch("/api/sponsors/public")
      .then((res) => res.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;

  const { presenting, premier, community } = data;
  const hasAny = presenting.length > 0 || premier.length > 0 || community.length > 0;
  if (!hasAny) return null;

  return (
    <section className="hero-sponsors-bar">
      <div className="hero-sponsors-bar-inner">
        {presenting.length > 0 && (
          <div className="hero-sponsors-bar-presenting">
            <span className="hero-sponsors-bar-label">Presented by</span>
            {presenting.map((s) => (
              <SponsorDisplay key={s.company} sponsor={s} large />
            ))}
          </div>
        )}

        {premier.length > 0 && (
          <>
            {presenting.length > 0 && <div className="hero-sponsors-bar-divider" />}
            <div className="hero-sponsors-bar-tier">
              <span className="hero-sponsors-bar-label">Premier Sponsors</span>
              <div className="hero-sponsors-bar-logos">
                {premier.map((s) => (
                  <SponsorDisplay key={s.company} sponsor={s} />
                ))}
              </div>
            </div>
          </>
        )}

        {community.length > 0 && (
          <>
            {(presenting.length > 0 || premier.length > 0) && (
              <div className="hero-sponsors-bar-divider" />
            )}
            <div className="hero-sponsors-bar-tier">
              <span className="hero-sponsors-bar-label">Community Sponsors</span>
              <div className="hero-sponsors-bar-logos">
                {community.map((s) => (
                  <SponsorDisplay key={s.company} sponsor={s} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function SponsorDisplay({ sponsor, large }: { sponsor: SponsorEntry; large?: boolean }) {
  const content = sponsor.logo_url ? (
    <img
      src={sponsor.logo_url}
      alt={sponsor.company}
      style={{
        maxHeight: large ? "40px" : "28px",
        maxWidth: large ? "160px" : "100px",
        objectFit: "contain",
      }}
    />
  ) : (
    <span className="hero-sponsors-bar-name">{sponsor.company}</span>
  );

  if (sponsor.website) {
    return (
      <a
        href={sponsor.website.startsWith("http") ? sponsor.website : `https://${sponsor.website}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {content}
      </a>
    );
  }

  return <>{content}</>;
}
