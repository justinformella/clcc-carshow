export default function SponsorsSection() {
  return (
    <section className="sponsors" id="sponsors">
      <div className="section-inner">
        <div className="section-header">
          <span className="section-label">Our Partners</span>
          <h2 className="section-title">Event Sponsors</h2>
          <p className="section-subtitle">
            We are grateful to the businesses that make this event possible
          </p>
        </div>

        <div className="sponsor-tier title">
          <p className="sponsor-tier-label">Platinum Sponsors — $2,000</p>
          <div className="sponsor-grid">
            <div className="sponsor-logo">
              <h4>Your Business Here</h4>
            </div>
          </div>
        </div>

        <div className="sponsor-tier">
          <p className="sponsor-tier-label">Gold Sponsors — $500</p>
          <div className="sponsor-grid">
            <div className="sponsor-logo">
              <h4>Your Business Here</h4>
            </div>
          </div>
        </div>

        <div className="sponsor-cta">
          <h3>Become a Sponsor</h3>
          <p>
            Join us in supporting the automotive community and Crystal Lake Food
            Pantry
          </p>

          <form
            className="sponsor-form"
            action="https://formspree.io/f/xzzngklg"
            method="POST"
          >
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="sponsor-name">Name</label>
                <input
                  type="text"
                  id="sponsor-name"
                  name="name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="sponsor-company">Company</label>
                <input
                  type="text"
                  id="sponsor-company"
                  name="company"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="sponsor-email">Email</label>
                <input
                  type="email"
                  id="sponsor-email"
                  name="email"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="sponsor-phone">Phone</label>
                <input type="tel" id="sponsor-phone" name="phone" />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="sponsor-level">
                Sponsorship Level of Interest
              </label>
              <select id="sponsor-level" name="sponsorship_level">
                <option value="">Select a level...</option>
                <option value="Platinum Sponsor ($2,000)">
                  Platinum Sponsor ($2,000)
                </option>
                <option value="Gold Sponsor ($500)">
                  Gold Sponsor ($500)
                </option>
                <option value="Other">Other / Not Sure</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="sponsor-message">Message (Optional)</label>
              <textarea
                id="sponsor-message"
                name="message"
                placeholder="Tell us about your business or any questions you have..."
              ></textarea>
            </div>
            <input
              type="hidden"
              name="_subject"
              value="CLCC Sponsorship Inquiry"
            />
            <button type="submit">Submit Inquiry</button>
          </form>
        </div>
      </div>
    </section>
  );
}
