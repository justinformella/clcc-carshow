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
  // Match sponsor's level to a tier — handles old format "Premier Sponsor ($1,000)" matching "Premier Sponsor"
  const matchTier = (level: string) => tiers.find((t) => level.startsWith(t.name));
  const assignedTier = matchTier(sponsor.sponsorship_level);
  const initialLevel = assignedTier?.name || sponsor.sponsorship_level;

  const [selectedLevel, setSelectedLevel] = useState(initialLevel);
  const [donationAmount, setDonationAmount] = useState(0);
  const [customDonation, setCustomDonation] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "check" | null>(null);
  const [checkNote, setCheckNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkSubmitted, setCheckSubmitted] = useState(false);

  const currentTier = tiers.find((t) => t.name === selectedLevel);
  const assignedTierIndex = assignedTier ? tiers.findIndex((t) => t.id === assignedTier.id) : -1;
  // Only show tiers at or above the assigned level (lower display_order = higher rank)
  const availableTiers = tiers.filter((t) => t.display_order <= (assignedTier?.display_order ?? 999));
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
          donation_cents: donationAmount * 100,
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
          donation_cents: donationAmount * 100,
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
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Show tiers in reverse order: assigned (cheapest available) first, upgrades below */}
              {[...availableTiers].reverse().map((tier) => {
                const isSelected = selectedLevel === tier.name;
                const isAssigned = assignedTier?.name === tier.name;
                const isUpgrade = tier.display_order < (tiers[assignedTierIndex]?.display_order ?? 999);
                return (
                  <label
                    key={tier.id}
                    onClick={() => setSelectedLevel(tier.name)}
                    style={{
                      display: "block",
                      border: isSelected ? "2px solid var(--gold, #c9a84c)" : "1px solid #ddd",
                      padding: "1.25rem",
                      cursor: "pointer",
                      background: isSelected ? "#fffdf7" : "var(--white, #fff)",
                      position: "relative",
                      transition: "border-color 0.2s, background 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%",
                        border: isSelected ? "6px solid var(--gold, #c9a84c)" : "2px solid #ccc",
                        flexShrink: 0,
                      }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--charcoal)" }}>
                          {tier.name}
                        </span>
                        {isAssigned && (
                          <span style={{ fontSize: "0.75rem", background: "#e3f2fd", color: "#1565c0", padding: "2px 8px", borderRadius: 4, marginLeft: "0.5rem" }}>
                            Your Level
                          </span>
                        )}
                        {isUpgrade && !isAssigned && (
                          <span style={{ fontSize: "0.75rem", background: "#fff3e0", color: "#e65100", padding: "2px 8px", borderRadius: 4, marginLeft: "0.5rem" }}>
                            Upgrade
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "1.3rem", fontWeight: 700, color: isSelected ? "var(--gold, #c9a84c)" : "var(--charcoal)" }}>
                        ${(tier.price_cents / 100).toLocaleString()}
                      </span>
                    </div>
                    {tier.benefits && (
                      <div style={{ paddingLeft: "2.75rem", fontSize: "0.9rem", color: "#555", lineHeight: 1.7 }}>
                        <ReactMarkdown>{tier.benefits}</ReactMarkdown>
                      </div>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Additional Donation */}
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 600, color: "var(--charcoal)", marginBottom: "0.5rem", paddingBottom: "0.5rem", borderBottom: "1px solid #eee", marginTop: "2rem" }}>
              Additional Donation
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-light)", marginBottom: "1rem", lineHeight: 1.6 }}>
              Want to give a little extra? All additional donations go directly to supporting the event and our community.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              {[0, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => { setDonationAmount(amt); setCustomDonation(""); }}
                  style={{
                    padding: "0.6rem 1.2rem",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    border: donationAmount === amt && !customDonation ? "2px solid var(--gold, #c9a84c)" : "1px solid #ddd",
                    background: donationAmount === amt && !customDonation ? "#fffdf7" : "var(--white, #fff)",
                    color: "var(--charcoal)",
                    cursor: "pointer",
                    minWidth: "80px",
                  }}
                >
                  {amt === 0 ? "None" : `$${amt}`}
                </button>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--charcoal)" }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Other"
                  value={customDonation}
                  onChange={(e) => {
                    setCustomDonation(e.target.value);
                    const val = parseInt(e.target.value);
                    setDonationAmount(val > 0 ? val : 0);
                  }}
                  style={{
                    width: "100px",
                    padding: "0.6rem 0.8rem",
                    fontSize: "0.95rem",
                    border: customDonation ? "2px solid var(--gold, #c9a84c)" : "1px solid #ddd",
                    background: customDonation ? "#fffdf7" : "var(--white, #fff)",
                    fontFamily: "'Inter', sans-serif",
                  }}
                />
              </div>
            </div>

            {/* Total summary */}
            {currentTier && (
              <div style={{
                background: "#f8f5f0",
                padding: "1rem 1.25rem",
                marginBottom: "1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "1rem",
              }}>
                <div style={{ color: "var(--text-light)" }}>
                  {donationAmount > 0 ? (
                    <>
                      <span>{currentTier.name}: ${(currentTier.price_cents / 100).toLocaleString()}</span>
                      <span style={{ margin: "0 0.5rem" }}>+</span>
                      <span>Donation: ${donationAmount.toLocaleString()}</span>
                    </>
                  ) : (
                    <span>{currentTier.name}</span>
                  )}
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", fontWeight: 600, color: "var(--charcoal)" }}>
                  ${((currentTier.price_cents / 100) + donationAmount).toLocaleString()}
                </div>
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

      <style>{`
        .reg-header .header-inner {
          flex-wrap: nowrap;
        }
        .reg-header nav {
          width: auto;
          order: 0;
        }
        .reg-header nav ul {
          display: flex !important;
          background: none !important;
          padding: 0 !important;
          flex-direction: row !important;
        }
        .reg-header nav ul li a {
          color: var(--text-dark) !important;
          padding: 0 !important;
        }
        .reg-logo {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .reg-logo-img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        @media (max-width: 600px) {
          .reg-logo .logo-text {
            font-size: 1rem !important;
            letter-spacing: 0.03em !important;
          }
          .reg-logo-tagline {
            display: none;
          }
          .reg-logo-img {
            width: 34px;
            height: 34px;
          }
        }
      `}</style>
    </>
  );
}
