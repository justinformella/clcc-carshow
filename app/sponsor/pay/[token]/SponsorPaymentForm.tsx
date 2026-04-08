"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { Sponsor, SponsorshipTier } from "@/types/database";

type Props = {
  sponsor: Sponsor;
  tiers: SponsorshipTier[];
  token: string;
};

export default function SponsorPaymentForm({ sponsor, tiers, token }: Props) {
  const [form, setForm] = useState({
    name: sponsor.name,
    company: sponsor.company,
    email: sponsor.email,
    phone: sponsor.phone || "",
    website: sponsor.website || "",
  });
  const [selectedLevel, setSelectedLevel] = useState(sponsor.sponsorship_level);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "check" | null>(null);
  const [checkNote, setCheckNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkSubmitted, setCheckSubmitted] = useState(false);

  const currentTier = tiers.find((t) => t.name === selectedLevel);
  const assignedTierIndex = tiers.findIndex((t) => t.name === sponsor.sponsorship_level);
  // Only show tiers at or above the assigned level (lower display_order = higher rank)
  const availableTiers = tiers.filter((t) => t.display_order <= (tiers[assignedTierIndex]?.display_order ?? 999));
  const priceDollars = currentTier ? `$${(currentTier.price_cents / 100).toLocaleString()}` : "";

  const handleCardPayment = async () => {
    setSubmitting(true);
    setPaymentMethod("card");
    setError(null);
    try {
      const res = await fetch("/api/sponsors/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          sponsor_id: sponsor.id,
          name: form.name,
          company: form.company,
          email: form.email,
          phone: form.phone || null,
          website: form.website || null,
          selected_level: selectedLevel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start checkout");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  const handleCheckPayment = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sponsors/pay-by-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          sponsor_id: sponsor.id,
          name: form.name,
          company: form.company,
          email: form.email,
          phone: form.phone || null,
          website: form.website || null,
          selected_level: selectedLevel,
          check_note: checkNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setCheckSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  // Already-paid state
  if (sponsor.status === "paid") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--cream, #f8f5f0)", padding: "2rem 1rem" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <header className="scrolled reg-header" id="header">
            <div className="header-inner">
              <Link href="/" className="logo reg-logo">
                <img src="/images/CLCC_Logo2026.png" alt="CLCC Logo" className="reg-logo-img" />
                <div style={{ minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <span className="logo-text" style={{ color: "var(--charcoal)" }}>
                    Crystal Lake Cars &amp; Caffeine
                  </span>
                  <span className="logo-tagline reg-logo-tagline" style={{ color: "var(--text-light)" }}>
                    Est. 2021 &middot; Crystal Lake, Illinois
                  </span>
                </div>
              </Link>
              <nav><ul><li><Link href="/">Home</Link></li></ul></nav>
            </div>
          </header>
          <div style={{ paddingTop: "120px", textAlign: "center" }}>
            <div style={{ background: "var(--white, #fff)", padding: "3rem 2rem", textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>&#10003;</div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 400, color: "var(--charcoal)", marginBottom: "0.5rem" }}>
                Thank You!
              </h1>
              <p style={{ color: "var(--text-light)", fontSize: "1.1rem", marginBottom: "0.5rem" }}>
                Your sponsorship payment has been received.
              </p>
              <p style={{ color: "var(--charcoal)", fontWeight: 600, fontSize: "1.1rem" }}>
                {sponsor.company}
              </p>
              <p style={{ color: "var(--text-light)", fontSize: "0.95rem" }}>
                {sponsor.sponsorship_level}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check-submitted state
  if (checkSubmitted) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--cream, #f8f5f0)", padding: "2rem 1rem" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <header className="scrolled reg-header" id="header">
            <div className="header-inner">
              <Link href="/" className="logo reg-logo">
                <img src="/images/CLCC_Logo2026.png" alt="CLCC Logo" className="reg-logo-img" />
                <div style={{ minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <span className="logo-text" style={{ color: "var(--charcoal)" }}>
                    Crystal Lake Cars &amp; Caffeine
                  </span>
                  <span className="logo-tagline reg-logo-tagline" style={{ color: "var(--text-light)" }}>
                    Est. 2021 &middot; Crystal Lake, Illinois
                  </span>
                </div>
              </Link>
              <nav><ul><li><Link href="/">Home</Link></li></ul></nav>
            </div>
          </header>
          <div style={{ paddingTop: "120px", textAlign: "center" }}>
            <div style={{ background: "var(--white, #fff)", padding: "3rem 2rem", textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>&#10003;</div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 400, color: "var(--charcoal)", marginBottom: "0.5rem" }}>
                Check Payment Submitted
              </h1>
              <p style={{ color: "var(--text-light)", fontSize: "1.1rem", marginBottom: "0.5rem" }}>
                Your check payment has been recorded. We&apos;ll confirm once it&apos;s received.
              </p>
              <p style={{ color: "var(--charcoal)", fontWeight: 600, fontSize: "1.1rem" }}>
                {form.company}
              </p>
              <p style={{ color: "var(--text-light)", fontSize: "0.95rem" }}>
                {selectedLevel} &mdash; {priceDollars}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="scrolled reg-header" id="header">
        <div className="header-inner">
          <Link href="/" className="logo reg-logo">
            <img src="/images/CLCC_Logo2026.png" alt="CLCC Logo" className="reg-logo-img" />
            <div style={{ minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <span className="logo-text" style={{ color: "var(--charcoal)" }}>
                Crystal Lake Cars &amp; Caffeine
              </span>
              <span className="logo-tagline reg-logo-tagline" style={{ color: "var(--text-light)" }}>
                Est. 2021 &middot; Crystal Lake, Illinois
              </span>
            </div>
          </Link>
          <nav><ul><li><Link href="/">Home</Link></li></ul></nav>
        </div>
      </header>

      <div style={{ paddingTop: "120px", paddingBottom: "80px", background: "var(--cream)", minHeight: "100vh" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 2rem" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span className="section-label">Sponsor Portal</span>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", fontWeight: 400, color: "var(--charcoal)", marginBottom: "1rem" }}>
              Sponsorship Payment
            </h1>
            <p style={{ color: "var(--text-light)", maxWidth: "500px", margin: "0 auto", lineHeight: 1.6 }}>
              Review your information and complete your sponsorship payment for the 2026 Crystal Lake Cars &amp; Caffeine Car Show.
            </p>
          </div>

          {error && (
            <div style={{ background: "#fee", border: "1px solid #c00", color: "#c00", padding: "0.8rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
              {error}
            </div>
          )}

          <div style={{ background: "var(--white)", padding: "2rem", marginBottom: "2rem" }}>
            {/* Logo preview if exists */}
            {sponsor.logo_url && (
              <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <img
                  src={sponsor.logo_url}
                  alt={`${sponsor.company} logo`}
                  style={{ maxWidth: "200px", maxHeight: "100px", objectFit: "contain" }}
                />
              </div>
            )}

            {/* Your Information */}
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 600, color: "var(--charcoal)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #eee" }}>
              Your Information
            </h2>
            <div className="sponsor-form" style={{ maxWidth: "100%", margin: 0 }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Website</label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://"
                  />
                </div>
              </div>
            </div>

            {/* Sponsorship Level */}
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 600, color: "var(--charcoal)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #eee", marginTop: "2rem" }}>
              Sponsorship Level
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              {availableTiers.length > 1 ? (
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  style={{ padding: "0.6rem 1rem", border: "1px solid #ddd", fontSize: "0.9rem", fontFamily: "'Inter', sans-serif" }}
                >
                  {availableTiers.map((tier) => (
                    <option key={tier.id} value={tier.name}>
                      {tier.name} &mdash; ${(tier.price_cents / 100).toLocaleString()}
                    </option>
                  ))}
                </select>
              ) : (
                <p style={{ fontSize: "1.1rem", color: "var(--charcoal)", fontWeight: 600 }}>
                  {selectedLevel}
                </p>
              )}
              <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--gold, #c9a84c)" }}>
                {priceDollars}
              </span>
            </div>

            {/* Benefits */}
            {currentTier?.benefits && (
              <div style={{ marginTop: "1rem", padding: "1rem", background: "#f8f5f0", fontSize: "0.95rem", lineHeight: 1.7 }}>
                <ReactMarkdown>{currentTier.benefits}</ReactMarkdown>
              </div>
            )}

            {/* Payment */}
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 600, color: "var(--charcoal)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #eee", marginTop: "2rem" }}>
              Payment
            </h2>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <button
                onClick={handleCardPayment}
                disabled={submitting}
                style={{ flex: 1, padding: "1rem 2rem", background: "var(--gold, #c9a84c)", color: "var(--charcoal, #2c2c2c)", border: "none", fontSize: "1rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", minWidth: "200px" }}
              >
                {submitting && paymentMethod === "card" ? "Processing..." : "Pay with Card"}
              </button>
              <button
                onClick={() => setPaymentMethod("check")}
                disabled={submitting}
                style={{ flex: 1, padding: "1rem 2rem", background: "var(--charcoal, #2c2c2c)", color: "#fff", border: "none", fontSize: "1rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", minWidth: "200px" }}
              >
                Pay by Check
              </button>
            </div>

            {/* Check form */}
            {paymentMethod === "check" && (
              <div style={{ marginTop: "1.5rem", padding: "1.5rem", background: "#f8f5f0", border: "1px solid #e0e0e0" }}>
                <p style={{ fontSize: "0.95rem", color: "var(--charcoal)", lineHeight: 1.6, marginBottom: "1rem" }}>
                  Please make checks payable to <strong>Downtown Crystal Lake / Main Street</strong> and mail to:
                </p>
                <p style={{ fontSize: "0.95rem", color: "var(--charcoal)", lineHeight: 1.6, marginBottom: "1.5rem", fontWeight: 600 }}>
                  Raue House<br />25 W. Crystal Lake Avenue<br />Crystal Lake, IL 60014
                </p>
                <div className="form-group">
                  <label>When do you plan to send the check?</label>
                  <textarea
                    value={checkNote}
                    onChange={(e) => setCheckNote(e.target.value)}
                    placeholder="e.g., Mailing this week, Will drop off at the office..."
                    style={{ width: "100%", minHeight: "80px", padding: "0.6rem", border: "1px solid #ddd", fontSize: "0.9rem", fontFamily: "'Inter', sans-serif" }}
                  />
                </div>
                <button
                  onClick={handleCheckPayment}
                  disabled={submitting}
                  style={{ padding: "0.8rem 2rem", background: "var(--gold, #c9a84c)", color: "var(--charcoal, #2c2c2c)", border: "none", fontSize: "0.9rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer" }}
                >
                  {submitting ? "Submitting..." : "Confirm Check Payment"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
