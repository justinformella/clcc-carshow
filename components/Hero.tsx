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
        <Link href="/register" className="hero-cta">
          Register Your Vehicle
        </Link>
      </div>
      <div className="scroll-indicator">
        <span>Scroll</span>
      </div>
    </section>
  );
}
