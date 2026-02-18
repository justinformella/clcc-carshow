export default function AboutCharitySection() {
  return (
    <section className="about-charity" id="about">
      <div className="section-inner">
        <div className="about-charity-grid">
          {/* Left Column: About the Event */}
          <div className="about-charity-col">
            <span className="section-label">About the Event</span>
            <h2 className="about-charity-heading">
              A Celebration of Automotive Excellence
            </h2>
            <p className="about-charity-text">
              Join the Crystal Lake Cars &amp; Caffeine community for a fantastic
              day of classic and modern vehicles in beautiful, historic downtown
              Crystal Lake. This show is dedicated to bringing the community
              together for a great purpose&mdash;all net proceeds go to the
              Crystal Lake Food Pantry.
            </p>
            <p className="about-charity-text">
              Stroll down Grant, Brink, and Williams streets as they fill with
              the area&apos;s finest cars. While you&apos;re here, enjoy the
              unique shopping and dining opportunities offered by our local
              downtown merchants.
            </p>
            <div className="intro-stats">
              <div className="intro-stat">
                <div className="intro-stat-number">4th</div>
                <div className="intro-stat-label">Annual Show</div>
              </div>
              <div className="intro-stat">
                <div className="intro-stat-number">200+</div>
                <div className="intro-stat-label">Show Cars</div>
              </div>
              <div className="intro-stat">
                <div className="intro-stat-number">6,000+</div>
                <div className="intro-stat-label">Visitors</div>
              </div>
            </div>
          </div>

          {/* Right Column: Our Cause */}
          <div className="about-charity-col about-charity-col--dark" id="charity">
            <span className="section-label">Our Cause</span>
            <h2 className="about-charity-heading">Driving Out Hunger</h2>
            <h3 className="about-charity-subheading">
              Crystal Lake Food Pantry
            </h3>
            <p className="about-charity-text">
              Every registration, every sponsorship, and every dollar raised goes
              directly to the Crystal Lake Food Pantry. Since 1983, they&apos;ve
              been the safety net for families facing food insecurity in McHenry
              County.
            </p>
            <p className="about-charity-text">
              In our community, 1 in 8 people struggle with hunger. The Food
              Pantry serves over 800 families each month, providing nutritious
              food with dignity and compassion. Your participation in this car
              show helps stock their shelves and fill empty plates.
            </p>
            <div className="about-charity-impact">
              <div className="impact-card">
                <p className="impact-number">$10K</p>
                <p className="impact-label">2026 Fundraising Goal</p>
              </div>
              <div className="impact-card">
                <p className="impact-number">800+</p>
                <p className="impact-label">Families served monthly</p>
              </div>
              <div className="impact-card">
                <p className="impact-number">100%</p>
                <p className="impact-label">Net proceeds donated</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
