import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Registration Closed — Crystal Lake Cars & Caffeine",
};

export default function RegisterClosedPage() {
  return (
    <>
      <Header />
      <main
        style={{
          minHeight: "calc(100vh - 200px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8rem 1.5rem 4rem",
          background: "var(--cream)",
        }}
      >
        <div
          style={{
            background: "var(--white)",
            maxWidth: "560px",
            width: "100%",
            padding: "3rem 2rem",
            textAlign: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            borderTop: "4px solid var(--gold)",
          }}
        >
          <p
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "var(--gold)",
              marginBottom: "1rem",
            }}
          >
            2026 Show is Over
          </p>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "2.2rem",
              fontWeight: 400,
              lineHeight: 1.2,
              marginBottom: "1rem",
            }}
          >
            Thank you for an amazing show!
          </h1>
          <p
            style={{
              color: "var(--text-light)",
              fontSize: "1rem",
              lineHeight: 1.6,
              marginBottom: "2rem",
            }}
          >
            Registration for the 2026 Crystal Lake Cars &amp; Caffeine Charity
            Car Show is closed. Check out this year&apos;s award winners and
            join us next year&mdash;same place, same cause.
          </p>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <Link
              href="/#winners"
              style={{
                padding: "0.9rem 1.75rem",
                background: "var(--gold)",
                color: "var(--charcoal)",
                fontWeight: 700,
                fontSize: "0.85rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                textDecoration: "none",
              }}
            >
              View 2026 Winners
            </Link>
            <Link
              href="/#sponsors"
              style={{
                padding: "0.9rem 1.75rem",
                background: "transparent",
                color: "var(--charcoal)",
                fontWeight: 600,
                fontSize: "0.85rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                textDecoration: "none",
                border: "1px solid #ddd",
              }}
            >
              Sponsor Next Year
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
