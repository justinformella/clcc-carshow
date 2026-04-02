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
              Every year, three blocks of historic downtown Crystal Lake
              transform into an open-air showroom. Over 200 vehicles line
              Grant, Brink, and Williams streets&mdash;each one with a story
              under the hood. This year&apos;s show is Sunday, May 17, 2026,
              with a rain date of Sunday, May 31.
            </p>
            <p className="about-charity-text">
              Grab a coffee, browse the local shops, and take in the
              small-town energy&mdash;all while supporting a great cause.
              100% of net proceeds go to the Crystal Lake Food Pantry.
            </p>

            <div style={{
              margin: "2rem 0",
              background: "rgba(0,0,0,0.03)",
              border: "1px solid rgba(0,0,0,0.06)",
              padding: "1.75rem",
            }}>
              <p style={{
                fontSize: "0.95rem",
                color: "var(--charcoal)",
                lineHeight: 1.7,
                marginBottom: "1.25rem",
              }}>
                From Ferraris to Fords, Porsches to pickup trucks&mdash;if it has
                wheels and you&apos;re proud of it, it belongs here. No year, make,
                or model restrictions.
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.5rem",
                marginBottom: "1.5rem",
              }}>
                {[
                  "Supercars & Exotics",
                  "European Luxury",
                  "Japanese Imports",
                  "American Muscle",
                  "Classic & Vintage",
                  "Hot Rods & Customs",
                  "Modern Sports Cars",
                  "Trucks & SUVs",
                  "Motorcycles",
                ].map((cat) => (
                  <div
                    key={cat}
                    style={{
                      padding: "0.6rem 0.75rem",
                      background: "var(--white)",
                      border: "1px solid rgba(0,0,0,0.08)",
                      fontSize: "0.8rem",
                      color: "var(--charcoal)",
                      fontWeight: 500,
                      textAlign: "center",
                    }}
                  >
                    {cat}
                  </div>
                ))}
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.5rem",
                borderTop: "1px solid rgba(0,0,0,0.08)",
                paddingTop: "1.25rem",
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 400, color: "var(--charcoal)" }}>4th</div>
                  <div style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-light)", marginTop: "0.25rem" }}>Annual Show</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 400, color: "var(--charcoal)" }}>3</div>
                  <div style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-light)", marginTop: "0.25rem" }}>City Blocks</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 400, color: "var(--charcoal)" }}>100%</div>
                  <div style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-light)", marginTop: "0.25rem" }}>For Charity</div>
                </div>
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
