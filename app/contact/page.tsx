"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ContactPage() {
  const searchParams = useSearchParams();
  const prefillSubject = searchParams.get("subject") || "";
  const prefillMessage = searchParams.get("message") || "";
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [requestNumber, setRequestNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/help-requests/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          subject: formData.get("subject"),
          message: formData.get("message"),
          website: formData.get("website"), // honeypot
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setRequestNumber(data.request_number);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      {/* Force scrolled header style since there's no dark hero */}
      <style>{`header { background: rgba(255, 255, 255, 0.98) !important; box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08) !important; }
        header .logo-text { color: var(--charcoal) !important; }
        header .logo-tagline { color: var(--text-light) !important; }
        header nav ul li a { color: var(--text-dark) !important; }
        header nav ul li a:hover { color: var(--gold) !important; }
        header .nav-cta { color: var(--charcoal) !important; }
        header .mobile-toggle span { background: var(--charcoal) !important; }
        @media (max-width: 1024px) {
          header nav ul[style] { background: var(--white) !important; border-top: 1px solid rgba(0,0,0,0.08); }
          header nav ul[style] li a:hover { background: rgba(0,0,0,0.03) !important; }
        }
      `}</style>
      <main
        style={{
          paddingTop: "120px",
          paddingBottom: "4rem",
          minHeight: "100vh",
          background: "var(--cream)",
        }}
      >
        <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0 1.5rem" }}>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "2.5rem",
              textAlign: "center",
              marginBottom: "0.5rem",
              color: "var(--charcoal)",
            }}
          >
            Contact Us
          </h1>
          <p
            style={{
              textAlign: "center",
              color: "var(--text-light)",
              marginBottom: "2.5rem",
              fontSize: "1.05rem",
              lineHeight: 1.6,
            }}
          >
            Have a question about the car show? Need help with your registration?
            We&apos;d love to hear from you.
          </p>

          {success ? (
            <div
              style={{
                background: "var(--white)",
                padding: "3rem 2rem",
                textAlign: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "#e8f5e9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.5rem",
                  fontSize: "1.75rem",
                }}
              >
                &#10003;
              </div>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.75rem",
                  marginBottom: "0.75rem",
                  color: "var(--charcoal)",
                }}
              >
                Request Submitted
              </h2>
              {requestNumber ? (
                <p
                  style={{
                    fontSize: "1rem",
                    color: "var(--text-light)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Your request number is{" "}
                  <strong style={{ color: "var(--charcoal)" }}>
                    #{requestNumber}
                  </strong>
                </p>
              ) : null}
              <p
                style={{
                  fontSize: "0.95rem",
                  color: "var(--text-light)",
                  lineHeight: 1.6,
                }}
              >
                We&apos;ve sent a confirmation to your email. Our team will get back
                to you as soon as possible.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="sponsor-form">
              {error && (
                <div
                  style={{
                    background: "#fef2f2",
                    color: "#991b1b",
                    padding: "0.75rem 1rem",
                    marginBottom: "1.5rem",
                    fontSize: "0.9rem",
                    border: "1px solid #fecaca",
                  }}
                >
                  {error}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Your Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    placeholder="John Smith"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject *</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  required
                  defaultValue={prefillSubject}
                  placeholder="What can we help you with?"
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  defaultValue={prefillMessage}
                  placeholder="Tell us more about your question or request..."
                />
              </div>

              {/* Honeypot field — hidden from humans */}
              <div
                style={{ position: "absolute", left: "-9999px" }}
                aria-hidden="true"
              >
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="form-submit-btn"
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  background: "var(--gold)",
                  color: "var(--charcoal)",
                  border: "none",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
