/* eslint-disable @next/next/no-img-element */
export default function AboutSection() {
  return (
    <section className="intro" id="about">
      <div className="section-inner">
        <div className="intro-grid">
          <div className="intro-image">
            <img
              src="/images/PXL_20250831_161306124.jpg"
              alt="Classic Thunderbird at Crystal Lake Cars and Coffee"
            />
          </div>
          <div className="intro-content">
            <span className="section-label">About the Event</span>
            <h2>A Celebration of Automotive Excellence</h2>
            <p>
              Join the Crystal Lake Cars &amp; Caffeine community for a
              fantastic day of classic and modern vehicles in beautiful, historic
              downtown Crystal Lake. This show is dedicated to bringing the
              community together for a great purpose&mdash;all net proceeds go to
              the Crystal Lake Food Pantry.
            </p>
            <p>
              Stroll down Grant, Brink, and Williams streets as they fill with
              the area&apos;s finest cars. While you&apos;re here, enjoy the
              unique shopping and dining opportunities offered by our local
              downtown merchants.
            </p>
            <div className="intro-stats">
              <div className="intro-stat">
                <div className="intro-stat-number">200+</div>
                <div className="intro-stat-label">Show Cars</div>
              </div>
              <div className="intro-stat">
                <div className="intro-stat-number">6,000+</div>
                <div className="intro-stat-label">Visitors</div>
              </div>
              <div className="intro-stat">
                <div className="intro-stat-number">$10K</div>
                <div className="intro-stat-label">Charity Goal</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
