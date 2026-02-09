export default function SpectatorBanner() {
  return (
    <section className="spectator-banner">
      <div className="free-badge">Spectators Free</div>
      <h2>Come See the Show!</h2>
      <p>
        Don&apos;t have a car to show? No problem! Spectators get in
        free&mdash;no tickets, no registration. Stroll down Grant, Brink, and
        Williams streets filled with amazing cars, then enjoy the unique shopping
        and dining in historic downtown Crystal Lake.
      </p>
      <div className="spectator-features">
        <div className="spectator-feature">
          <div className="spectator-feature-icon">&#127860;</div>
          <div className="spectator-feature-text">Local Dining</div>
        </div>
        <div className="spectator-feature">
          <div className="spectator-feature-icon">&#128717;</div>
          <div className="spectator-feature-text">Unique Shops</div>
        </div>
        <div className="spectator-feature">
          <div className="spectator-feature-icon">&#128664;</div>
          <div className="spectator-feature-text">200+ Cars</div>
        </div>
        <div className="spectator-feature">
          <div className="spectator-feature-icon">&#128106;</div>
          <div className="spectator-feature-text">Family Friendly</div>
        </div>
      </div>
    </section>
  );
}
