export default function HeroSponsors() {
  return (
    <section className="hero-sponsors-bar">
      <div className="hero-sponsors-bar-inner">
        <div className="hero-sponsors-bar-presenting">
          <span className="hero-sponsors-bar-label">Presented by</span>
          <span className="hero-sponsors-bar-name">Home State Bank</span>
        </div>
        <div className="hero-sponsors-bar-divider" />
        <div className="hero-sponsors-bar-tier">
          <span className="hero-sponsors-bar-label">Premier Sponsors</span>
          <div className="hero-sponsors-bar-logos">
            <div className="hero-sponsors-bar-logo">
              <span>Your Logo Here</span>
            </div>
            <div className="hero-sponsors-bar-logo">
              <span>Your Logo Here</span>
            </div>
          </div>
        </div>
        <div className="hero-sponsors-bar-divider" />
        <div className="hero-sponsors-bar-tier">
          <span className="hero-sponsors-bar-label">Community Sponsors</span>
          <div className="hero-sponsors-bar-logos">
            <div className="hero-sponsors-bar-logo">
              <span>Your Logo Here</span>
            </div>
            <div className="hero-sponsors-bar-logo">
              <span>Your Logo Here</span>
            </div>
            <div className="hero-sponsors-bar-logo">
              <span>Your Logo Here</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
