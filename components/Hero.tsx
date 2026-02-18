import Link from "next/link";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-badge">4th Annual Charity Event</div>
        <h1>
          CLCC Annual
          <br />
          Charity Car Show
        </h1>
        <p className="hero-date">May 17, 2026</p>
        <p className="hero-location">
          Grant, Brink &amp; Williams Streets &middot; Downtown Crystal Lake
        </p>
        <div className="hero-buttons">
          <Link href="/register" className="hero-cta">
            Register Your Vehicle
          </Link>
          <a href="#sponsors" className="hero-cta hero-cta-outline">
            Become a Sponsor
          </a>
        </div>
        <div className="hero-sponsors">
          <p className="hero-sponsors-label">Presented by our sponsors</p>
          <div className="hero-sponsors-row">
            <div className="hero-sponsor-logo">
              <span>Your Logo Here</span>
            </div>
            <div className="hero-sponsor-logo">
              <span>Your Logo Here</span>
            </div>
            <div className="hero-sponsor-logo">
              <span>Your Logo Here</span>
            </div>
          </div>
        </div>
      </div>
      <div className="scroll-indicator">
        <span>Scroll</span>
      </div>
    </section>
  );
}
