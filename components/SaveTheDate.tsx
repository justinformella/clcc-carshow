import Image from "next/image";
import Link from "next/link";
import Header, { type NavLink } from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./SaveTheDate.module.css";

const EVENT_TITLE = "Crystal Lake Cars & Caffeine Charity Car Show";
const GOOGLE_CAL_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  `&text=${encodeURIComponent(EVENT_TITLE)}` +
  "&dates=20270516/20270517" +
  `&location=${encodeURIComponent("Historic Downtown Crystal Lake, IL")}` +
  `&details=${encodeURIComponent(
    "Rain date: Sunday, May 23, 2027. 100% of net proceeds go to the Crystal Lake Food Pantry. crystallakecarshow.com"
  )}`;

const NAV_LINKS: NavLink[] = [
  { label: "About", href: "#about" },
  { label: "Charity", href: "#charity" },
  { label: "Sponsors", href: "#sponsors" },
  { label: "Arcade", href: "/arcade" },
  { label: "Contact", href: "/contact" },
];

const HIGHLIGHTS = ["Open to the Public", "Judged Show", "Awards & Trophies"];

export default function SaveTheDate() {
  return (
    <>
      <Header links={NAV_LINKS} />

      <section className={`hero ${styles.hero}`}>
        <Image
          src="/images/2026-show/street-lineup.jpg"
          alt=""
          fill
          priority
          // on tall screens "cover" scales the 3:2 photo to the viewport
          // height, so it renders ~150vh wide; request a big enough file
          sizes="(max-aspect-ratio: 3/2) 150vh, 100vw"
          className={styles.heroBg}
        />
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={`hero-content ${styles.heroContent}`}>
          <div className="hero-badge">5th Annual Charity Event</div>
          <h1 className={styles.heroTitle}>Save the Date</h1>
          <p className="hero-date">Sunday, May 16, 2027</p>
          <p className="hero-location">Historic Downtown Crystal Lake</p>
          <p className={styles.rainDate}>Rain date &middot; Sunday, May 23, 2027</p>
          <div className="hero-buttons">
            <a href={GOOGLE_CAL_URL} target="_blank" rel="noopener noreferrer" className="hero-cta">
              Add to Calendar
            </a>
            <a href="#sponsors" className="hero-cta hero-cta-outline">
              Become a Sponsor
            </a>
          </div>
          <a href="/clcc-car-show-2027.ics" download className={styles.icsLink}>
            Using Apple Calendar or Outlook? Download the .ics file
          </a>
        </div>
      </section>

      <section id="about" className={styles.about}>
        <div className="section-inner">
          <div className={styles.aboutGrid}>
            <div>
              <span className="section-label">Charity Car Show 2027</span>
              <h2 className={`section-title ${styles.aboutTitle}`}>
                We&apos;re Back Next May
              </h2>
              <p className={styles.text}>
                Historic downtown Crystal Lake turns into an open-air showroom
                again on Sunday, May 16, 2027. It&apos;s open to the public, so
                bring the family, grab a coffee and stroll the streets.
              </p>
              <p className={styles.text}>
                It&apos;s a judged show with awards and trophies. Car
                registration opens in the spring; check back here for details.
              </p>
              <ul className={styles.highlights}>
                {HIGHLIGHTS.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
            <div className={styles.artCard}>
              <Image
                src="/images/2027/header-art.png"
                alt="Crystal Lake Cars and Caffeine Charity Car Show 2027 artwork"
                width={1471}
                height={274}
                sizes="(max-width: 900px) 100vw, 560px"
                className={styles.art}
              />
            </div>
          </div>

          <div className={styles.photoGrid}>
            <div className={styles.photo}>
              <Image
                src="/images/2026-show/award-ferrari-512bb.jpg"
                alt="A 2026 award winner holding his trophy beside his black Ferrari 512 BB"
                fill
                sizes="(max-width: 700px) 100vw, 600px"
              />
            </div>
            <div className={styles.photo}>
              <Image
                src="/images/2026-show/families-strolling.jpg"
                alt="Families strolling past the show cars in downtown Crystal Lake"
                fill
                sizes="(max-width: 700px) 100vw, 600px"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="charity" className={styles.charity}>
        <div className={`section-inner ${styles.charityInner}`}>
          <div>
            <span className="section-label">Our Cause</span>
            <h2 className={styles.charityTitle}>
              100% of net proceeds go to the Crystal Lake Food Pantry
            </h2>
            <p className={styles.charityText}>
              Every registration, sponsorship and donation helps neighbors right
              here in Crystal Lake. No one should go hungry.
            </p>
          </div>
          {/* TODO: link to the pantry's website once its URL is confirmed */}
          <div className={styles.pantry}>
            <Image
              src="/images/2027/food-pantry-logo.png"
              alt="Crystal Lake Food Pantry: No One Should Go Hungry"
              width={573}
              height={198}
              sizes="260px"
            />
          </div>
        </div>
      </section>

      <section id="sponsors" className={styles.sponsors}>
        <div className="section-inner">
          <div className="section-header">
            <span className="section-label">Partners</span>
            <h2 className="section-title">Booth Sponsorships Available</h2>
            <p className="section-subtitle">
              Put your business in front of thousands of car fans in downtown
              Crystal Lake while supporting the food pantry.
            </p>
          </div>
          <div className={styles.sponsorCta}>
            <Link href="/contact" className="hero-cta">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      <Footer
        showPixelBadge={false}
        eventLinks={[
          { label: "About", href: "#about" },
          { label: "Food Pantry", href: "#charity" },
          { label: "Arcade", href: "/arcade" },
        ]}
      />
    </>
  );
}
