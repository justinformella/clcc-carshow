import Image from "next/image";
import Link from "next/link";
import { FooterPixelBadge } from "@/components/EightBitEasterEgg";
import { SHOW_SAVE_THE_DATE } from "@/lib/siteMode";

type FooterLink = { label: string; href: string };

const DEFAULT_EVENT_LINKS: FooterLink[] = [
  { label: "About", href: "/#about" },
  { label: "Schedule", href: "/#schedule" },
  { label: "Registration", href: "/register" },
];

function FooterAnchor({ link }: { link: FooterLink }) {
  return link.href.startsWith("/") && !link.href.includes("#") ? (
    <Link href={link.href}>{link.label}</Link>
  ) : (
    <a href={link.href}>{link.label}</a>
  );
}

export default function Footer({
  eventLinks = DEFAULT_EVENT_LINKS,
  showPixelBadge = !SHOW_SAVE_THE_DATE,
  showLinkColumns = !SHOW_SAVE_THE_DATE,
}: {
  eventLinks?: FooterLink[];
  showPixelBadge?: boolean;
  showLinkColumns?: boolean;
}) {
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
          {showLinkColumns && (<>
          <div className="footer-links">
            <h4>Event</h4>
            <ul>
              {eventLinks.map((link) => (
                <li key={link.href}>
                  <FooterAnchor link={link} />
                </li>
              ))}
            </ul>
          </div>
          <div className="footer-links">
            <h4>Partners</h4>
            <ul>
              <li>
                <a href="/#sponsors">Sponsors</a>
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
          </>)}
        </div>
        <div className="footer-bottom">
          <div>{showPixelBadge && <FooterPixelBadge />}</div>
          <div className="footer-social">
            <a href="https://www.facebook.com/groups/389632989553839" target="_blank" rel="noopener noreferrer">Facebook</a>
            <Link href="/admin" style={{ opacity: 0.5 }}>Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
