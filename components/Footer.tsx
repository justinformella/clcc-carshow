import Image from "next/image";
import Link from "next/link";
import { FooterPixelLink } from "@/components/EightBitEasterEgg";

export default function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <Image
                src="/images/CLCC_Logo2026.png"
                alt="CLCC Logo"
                width={120}
                height={120}
                style={{ width: "60px", height: "60px", borderRadius: "50%" }}
              />
              <h3 style={{ margin: 0 }}>Crystal Lake Cars &amp; Caffeine</h3>
            </div>
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
            </ul>
          </div>
          <div className="footer-links">
            <h4>Contact</h4>
            <ul>
              <li>
                <Link href="/contact">Contact Us</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            &copy; 2026 Crystal Lake Cars and Coffee. All rights reserved.
          </p>
          <div className="footer-social">
            <a href="https://www.facebook.com/groups/389632989553839" target="_blank" rel="noopener noreferrer">Facebook</a>
            <Link href="/admin" style={{ opacity: 0.5 }}>Admin</Link>
            <FooterPixelLink />
          </div>
        </div>
      </div>
    </footer>
  );
}
