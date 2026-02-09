import Link from "next/link";

export default function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <h3>Crystal Lake Cars &amp; Caffeine</h3>
            <p>
              An annual celebration of automotive excellence benefiting the
              Crystal Lake Food Pantry. Join us in downtown Crystal Lake for the
              premier car show in McHenry County.
            </p>
          </div>
          <div className="footer-links">
            <h4>Event</h4>
            <ul>
              <li>
                <a href="#about">About</a>
              </li>
              <li>
                <a href="#schedule">Schedule</a>
              </li>
              <li>
                <Link href="/register">Registration</Link>
              </li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Partners</h4>
            <ul>
              <li>
                <a href="#sponsors">Sponsors</a>
              </li>
              <li>
                <a href="#">Volunteer</a>
              </li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Contact</h4>
            <ul>
              <li>
                <a href="mailto:info@clcarsandcoffee.com">
                  info@clcarsandcoffee.com
                </a>
              </li>
              <li>
                <a href="tel:815-555-2277">(815) 555-CARS</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            &copy; 2026 Crystal Lake Cars and Coffee. All rights reserved.
          </p>
          <div className="footer-social">
            <a href="#">Facebook</a>
            <a href="#">Instagram</a>
            <a href="#">YouTube</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
