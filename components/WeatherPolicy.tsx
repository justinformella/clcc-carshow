export default function WeatherPolicy() {
  return (
    <section className="weather">
      <div className="section-inner">
        <div className="section-header">
          <span className="section-label">Be Prepared</span>
          <h2 className="section-title">Weather Policy</h2>
          <p className="section-subtitle">
            Rain or shine, we celebrate automotive passion
          </p>
        </div>
        <div className="weather-grid">
          <div className="weather-card">
            <h4>Light Rain</h4>
            <p>
              The show goes on! We&apos;re car enthusiasts&mdash;a little water
              won&apos;t stop us. Bring appropriate gear and enjoy the unique
              atmosphere.
            </p>
          </div>
          <div className="weather-card">
            <h4>Severe Weather</h4>
            <p>
              If severe weather is forecasted, the event will be postponed to
              Sunday, May 18, 2026. Decision made by Friday, May 15 at 4:00 PM.
            </p>
          </div>
          <div className="weather-card">
            <h4>Updates</h4>
            <p>
              Weather decisions announced via our website and email to registered
              participants.
            </p>
          </div>
          <div className="weather-card">
            <h4>Refunds</h4>
            <p>
              All registrations are non-refundable. 100% of net proceeds are
              donated to the Crystal Lake Food Pantry.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
