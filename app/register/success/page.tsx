"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

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
            <div
              style={{
                width: "60px",
                height: "60px",
                background: "#2D5016",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
                color: "#fff",
                fontSize: "1.5rem",
              }}
            >
              &#10003;
            </div>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "2rem",
                fontWeight: 400,
                color: "var(--charcoal)",
                marginBottom: "1rem",
              }}
            >
              Registration Confirmed!
            </h1>
            <p
              style={{
                color: "var(--text-light)",
                fontSize: "1.05rem",
                lineHeight: 1.8,
                marginBottom: "1.5rem",
              }}
            >
              Thank you for registering for the CLCC Annual Charity Car Show!
              You&apos;ll receive a confirmation email with your registration
              details and event information.
            </p>

            <div
              style={{
                background: "var(--cream)",
                padding: "1.5rem",
                marginBottom: "2rem",
              }}
            >
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.1rem",
                  marginBottom: "1rem",
                }}
              >
                What&apos;s Next?
              </h3>
              <ul
                style={{
                  listStyle: "none",
                  textAlign: "left",
                  color: "var(--text-light)",
                  fontSize: "0.95rem",
                }}
              >
                <li style={{ padding: "0.5rem 0" }}>
                  &#10003; Check your email for confirmation details
                </li>
                <li style={{ padding: "0.5rem 0" }}>
                  &#10003; Event day: May 17, 2026 — Check-in starts at 7:30 AM
                </li>
                <li style={{ padding: "0.5rem 0" }}>
                  &#10003; Bring your vehicle to Grant, Brink &amp; Williams
                  Streets
                </li>
              </ul>
            </div>

            {sessionId && (
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-light)",
                  marginBottom: "1.5rem",
                }}
              >
                Payment reference: {sessionId.slice(0, 20)}...
              </p>
            )}

            <Link
              href="/"
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
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
