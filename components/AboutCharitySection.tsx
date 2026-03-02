export default function AboutCharitySection() {
  return (
    <section className="about-charity" id="about">
      <div className="section-inner">
        <div className="about-charity-grid">
          {/* Left Column: About the Event */}
          <div className="about-charity-col">
            <span className="section-label">About the Event</span>
            <h2 className="about-charity-heading">
              More Than a Car Show
            </h2>
            <p className="about-charity-text">
              Every May, three blocks of historic downtown Crystal Lake transform
              into an open-air showroom&mdash;gleaming hot rods, muscle cars,
              imports, and modern exotics line Grant, Brink, and Williams streets,
              each one with a story under the hood. This year&apos;s show is
              Saturday, May 17, 2026, with a rain date of Sunday, May 31.
            </p>
            <p className="about-charity-text">
              Whether you&apos;re a lifelong gearhead, a family looking for a
              great day out, or someone who simply wants to support a good cause,
              this is your event. Grab a coffee, browse the downtown shops, and
              soak in the small-town energy&mdash;all while all net proceeds go
              to the Crystal Lake Food Pantry.
            </p>
            <div className="intro-stats">
              <div className="intro-stat">
                <div className="intro-stat-number">4th</div>
                <div className="intro-stat-label">Annual Show</div>
              </div>
              <div className="intro-stat">
                <div className="intro-stat-number">3</div>
                <div className="intro-stat-label">City Blocks</div>
              </div>
              <div className="intro-stat">
                <div className="intro-stat-number">100%</div>
                <div className="intro-stat-label">For Charity</div>
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
              Every registration, every sponsorship&mdash;all net proceeds go
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
