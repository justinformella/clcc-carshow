import Link from "next/link";

export default function CancelPage() {
  return (
    <>
      <header className="scrolled" id="header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <span className="logo-text" style={{ color: "var(--charcoal)" }}>
              Crystal Lake Cars &amp; Caffeine
            </span>
            <span className="logo-tagline" style={{ color: "var(--text-light)" }}>
              Est. 2021 &middot; Crystal Lake, Illinois
            </span>
          </Link>
        </div>
      </header>

      <div
        style={{
          paddingTop: "160px",
          paddingBottom: "80px",
          background: "var(--cream)",
          minHeight: "100vh",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0 2rem" }}>
          <div
            style={{
              background: "var(--white)",
              padding: "3rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
          >
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "2rem",
                fontWeight: 400,
                color: "var(--charcoal)",
                marginBottom: "1rem",
              }}
            >
              Payment Cancelled
            </h1>
            <p
              style={{
                color: "var(--text-light)",
                fontSize: "1.05rem",
                lineHeight: 1.8,
                marginBottom: "2rem",
              }}
            >
              Your payment was not processed. No charges were made to your card.
              Your registration spot has not been reserved.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                href="/register"
                style={{
                  display: "inline-block",
                  padding: "1rem 2.5rem",
                  background: "var(--gold)",
                  color: "var(--charcoal)",
                  textDecoration: "none",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                Try Again
              </Link>
              <Link
                href="/"
                style={{
                  display: "inline-block",
                  padding: "1rem 2.5rem",
                  border: "1px solid var(--charcoal)",
                  color: "var(--charcoal)",
                  textDecoration: "none",
                  fontSize: "0.85rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
