import Image from "next/image";
import Link from "next/link";
import { Archivo } from "next/font/google";
import styles from "./SaveTheDate.module.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  display: "swap",
});

const EVENT_TITLE = "Crystal Lake Cars & Caffeine Charity Car Show";
const GOOGLE_CAL_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  `&text=${encodeURIComponent(EVENT_TITLE)}` +
  "&dates=20270516/20270517" +
  `&location=${encodeURIComponent("Historic Downtown Crystal Lake, IL")}` +
  `&details=${encodeURIComponent(
    "Rain date: Sunday, May 23, 2027. 100% of net proceeds go to the Crystal Lake Food Pantry. crystallakecarshow.com"
  )}`;

function CheckeredFlag() {
  return (
    <svg
      className={styles.flag}
      viewBox="0 0 120 100"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="10" y1="98" x2="34" y2="8" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <defs>
        <pattern id="stdChecks" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#fffdf6" />
          <rect width="8" height="8" fill="currentColor" />
          <rect x="8" y="8" width="8" height="8" fill="currentColor" />
        </pattern>
      </defs>
      <path
        d="M34 8 C58 0, 78 22, 112 10 L100 56 C72 68, 52 44, 22 54 Z"
        fill="url(#stdChecks)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SaveTheDate() {
  return (
    <main className={`${styles.page} ${archivo.className}`}>
      <div className={styles.frame}>
        <div className={styles.artCard}>
          <Image
            src="/images/2027/header-art.png"
            alt="Crystal Lake Cars and Caffeine Charity Car Show 2027"
            width={1471}
            height={274}
            priority
            sizes="(max-width: 960px) 100vw, 920px"
            className={styles.art}
          />
        </div>

        <section className={styles.dateBand} aria-labelledby="std-date">
          <div>
            <p className={styles.eyebrow}>Save the Date</p>
            <h1 id="std-date" className={styles.date}>
              <span>Sunday,</span> May&nbsp;16, 2027
            </h1>
            <p className={styles.rain}>Rain date &nbsp;/&nbsp; Sunday, May 23, 2027</p>
            <div className={styles.calLinks}>
              <a href={GOOGLE_CAL_URL} target="_blank" rel="noopener noreferrer" className={styles.calBtn}>
                Add to Google Calendar
              </a>
              <a href="/clcc-car-show-2027.ics" download className={styles.calBtnGhost}>
                Apple / Outlook (.ics)
              </a>
            </div>
          </div>
          <CheckeredFlag />
        </section>

        <section className={styles.photos} aria-label="Photos from past shows">
          <div className={styles.photoHero}>
            <Image
              src="/images/2027/porsche-911.jpg"
              alt="Yellow classic Porsche 911 cruising through downtown Crystal Lake"
              fill
              sizes="(max-width: 960px) 100vw, 920px"
              className={styles.photo}
            />
          </div>
          <div className={styles.photoPair}>
            <div className={styles.photoSmall}>
              <Image
                src="/images/2027/ferrari-512bb.jpg"
                alt="Black Ferrari 512 BB at the show"
                fill
                sizes="(max-width: 600px) 100vw, 460px"
                className={styles.photo}
              />
            </div>
            <div className={styles.photoSmall}>
              <Image
                src="/images/2027/downtown-crowd.jpg"
                alt="Crowds walking among show cars on the downtown Crystal Lake streets"
                fill
                sizes="(max-width: 600px) 100vw, 460px"
                className={styles.photo}
              />
            </div>
          </div>
        </section>

        <section className={styles.info}>
          <div className={styles.infoText}>
            <h2 className={styles.place}>Historic Downtown Crystal Lake</h2>
            <p className={styles.details}>
              Open to the Public <span aria-hidden="true">&bull;</span> Judged Show with Awards &amp; Trophies
            </p>
            <p className={styles.sponsor}>
              Booth Sponsorships Available &mdash;{" "}
              <Link href="/contact">get in touch</Link>
            </p>
            <p className={styles.note}>Car registration opens in the spring. Check back here for details.</p>
          </div>
          <a
            href="https://www.crystallakefoodpantry.org"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.pantry}
            aria-label="Crystal Lake Food Pantry"
          >
            <Image
              src="/images/2027/food-pantry-logo.png"
              alt="Crystal Lake Food Pantry — No One Should Go Hungry"
              width={573}
              height={198}
              sizes="220px"
            />
          </a>
        </section>

        <p className={styles.proceeds}>100% of net proceeds go to the Crystal Lake Food Pantry</p>
      </div>

      <nav className={styles.footer} aria-label="Site links">
        <a href="https://www.facebook.com/groups/389632989553839" target="_blank" rel="noopener noreferrer">
          Facebook
        </a>
        <Link href="/contact">Contact</Link>
        <Link href="/arcade">Arcade</Link>
        <Link href="/admin" className={styles.admin}>
          Admin
        </Link>
      </nav>
    </main>
  );
}
