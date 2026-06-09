export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-badge">4th Annual Charity Event · May 17, 2026</div>
        <h1>
          Thank You,
          <br />
          Crystal Lake!
        </h1>
        <p className="hero-date" style={{ background: "transparent", padding: 0, fontSize: "1.4rem" }}>
          The 2026 show is in the books
        </p>
        <p className="hero-location">
          See you next May &middot; Downtown Crystal Lake
        </p>
        <div className="hero-buttons">
          <a href="#winners" className="hero-cta">
            View Winners
          </a>
          <a href="#sponsors" className="hero-cta hero-cta-outline">
            Sponsor Next Year
          </a>
        </div>
      </div>
    </section>
  );
}
