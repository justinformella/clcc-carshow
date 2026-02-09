export default function ScheduleAwards() {
  return (
    <section className="schedule" id="schedule">
      <div className="section-inner">
        <div className="section-header">
          <span className="section-label">Plan Your Day</span>
          <h2 className="section-title">Schedule &amp; Awards</h2>
          <p className="section-subtitle">
            Everything you need to know to make the most of your experience
          </p>
        </div>
        <div className="schedule-grid">
          <div className="schedule-card">
            <h3>Event Schedule</h3>
            <div className="schedule-item">
              <span className="schedule-time">7:30 AM</span>
              <span className="schedule-event">
                Check-in &amp; Day-of Registration
              </span>
            </div>
            <div className="schedule-item">
              <span className="schedule-time">9:30 AM</span>
              <span className="schedule-event">Registration Closes</span>
            </div>
            <div className="schedule-item">
              <span className="schedule-time">10:00 AM</span>
              <span className="schedule-event">Show Starts</span>
            </div>
            <div className="schedule-item">
              <span className="schedule-time">12:30 PM</span>
              <span className="schedule-event">Awards Ceremony</span>
            </div>
            <div className="schedule-item">
              <span className="schedule-time">1:00 PM</span>
              <span className="schedule-event">Show Ends</span>
            </div>
          </div>
          <div className="schedule-card">
            <h3>Award Categories</h3>
            <ul className="awards-list">
              <li>Best Classic (Pre-2000)</li>
              <li>Best Modern (2000+)</li>
              <li>Best European</li>
              <li>Best Japanese</li>
              <li>Best Domestic</li>
              <li>Best Vanity Plate</li>
              <li>Best Interior</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
