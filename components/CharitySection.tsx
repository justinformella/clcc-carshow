export default function CharitySection() {
  return (
    <section className="charity" id="charity">
      <div className="section-inner">
        <div className="section-header">
          <span className="section-label">Our Cause</span>
          <h2 className="section-title">Driving Out Hunger</h2>
        </div>
        <div className="charity-grid">
          <div className="charity-main">
            <h3>Crystal Lake Food Pantry</h3>
            <p>
              Every registration, every sponsorship, and every dollar raised goes
              directly to the Crystal Lake Food Pantry. Since 1983, they&apos;ve
              been the safety net for families facing food insecurity in McHenry
              County.
            </p>
            <p>
              In our community, 1 in 8 people struggle with hunger. The Food
              Pantry serves over 800 families each month, providing nutritious
              food with dignity and compassion. Your participation in this car
              show helps stock their shelves and fill empty plates.
            </p>
            <div className="charity-goal">
              <p className="charity-goal-label">2026 Fundraising Goal</p>
              <p className="charity-goal-amount">$10,000</p>
            </div>
          </div>
          <div className="charity-impact">
            <div className="impact-card">
              <p className="impact-number">800+</p>
              <p className="impact-label">Families served monthly</p>
            </div>
            <div className="impact-card">
              <p className="impact-number">40+</p>
              <p className="impact-label">Years serving McHenry County</p>
            </div>
            <div className="impact-card">
              <p className="impact-number">50K+</p>
              <p className="impact-label">Families helped since 1983</p>
            </div>
            <div className="impact-card">
              <p className="impact-number">100%</p>
              <p className="impact-label">Net proceeds donated</p>
            </div>
          </div>
        </div>
        <p className="charity-cta">
          Every car registered helps feed local families. Additional donations
          welcome at check-in.
        </p>
      </div>
    </section>
  );
}
