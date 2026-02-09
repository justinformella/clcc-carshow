import Link from "next/link";

export default function RegistrationSection() {
  return (
    <section className="registration" id="registration">
      <div className="section-inner">
        <div className="registration-wrapper">
          <div className="registration-info">
            <span className="section-label">Join Us</span>
            <h2>Vehicle Registration</h2>
            <p>
              Secure your spot at the 2026 Crystal Lake Cars &amp; Caffeine.
              Space is limited to the first 200 cars. If space is available on
              event day, on-site registration will be available.
            </p>
            <ul className="registration-features">
              <li>Reserved parking spot in prime downtown location</li>
              <li>Entry into all award categories</li>
              <li>Be part of a great community event</li>
              <li>Support a local charity</li>
            </ul>
          </div>
          <div className="registration-card">
            <p className="registration-card-label">Show Participant</p>
            <h3>Vehicle Entry</h3>
            <p className="registration-price">$30</p>
            <p className="registration-price-note">Per Vehicle</p>
            <Link href="/register" className="registration-btn">
              Register Now
            </Link>
            <p className="registration-note">
              Limited to 200 vehicles. Registration fees are non-refundable. All
              registered participants will receive event details via email prior
              to the show.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
