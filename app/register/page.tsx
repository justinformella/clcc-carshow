"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AWARD_CATEGORIES, REGISTRATION_PRICE_DISPLAY, MAX_REGISTRATIONS } from "@/types/database";

export default function RegisterPage() {
  const [spotsRemaining, setSpotsRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    hometown: "",
    vehicle_year: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_color: "",
    engine_specs: "",
    modifications: "",
    story: "",
    preferred_category: "",
  });

  useEffect(() => {
    fetch("/api/registrations/count")
      .then((res) => res.json())
      .then((data) => {
        setSpotsRemaining(MAX_REGISTRATIONS - (data.count || 0));
      })
      .catch(() => {
        setSpotsRemaining(MAX_REGISTRATIONS);
      });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          vehicle_year: parseInt(form.vehicle_year),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  const isSoldOut = spotsRemaining !== null && spotsRemaining <= 0;

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
          <nav>
            <ul style={{ display: "flex" }}>
              <li>
                <Link href="/" style={{ color: "var(--text-dark)" }}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/register" className="nav-cta">
                  Register
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <div
        style={{
          paddingTop: "120px",
          paddingBottom: "80px",
          background: "var(--cream)",
          minHeight: "100vh",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 2rem" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span className="section-label">Join Us</span>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "2.5rem",
                fontWeight: 400,
                color: "var(--charcoal)",
                marginBottom: "1rem",
              }}
            >
              Vehicle Registration
            </h1>
            <p style={{ color: "var(--text-light)", fontSize: "1.1rem" }}>
              {REGISTRATION_PRICE_DISPLAY} per vehicle &middot; Limited to{" "}
              {MAX_REGISTRATIONS} vehicles
            </p>
            {spotsRemaining !== null && (
              <p
                style={{
                  marginTop: "0.5rem",
                  fontWeight: 600,
                  color: isSoldOut ? "#c00" : "var(--gold)",
                  fontSize: "1rem",
                }}
              >
                {isSoldOut
                  ? "Registration is full"
                  : `${spotsRemaining} spots remaining`}
              </p>
            )}
          </div>

          {isSoldOut ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                background: "var(--white)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              }}
            >
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.8rem",
                  marginBottom: "1rem",
                }}
              >
                Registration Full
              </h2>
              <p style={{ color: "var(--text-light)" }}>
                All {MAX_REGISTRATIONS} spots have been filled. Day-of
                registration may be available if space opens up.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{
                background: "var(--white)",
                padding: "3rem",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              }}
            >
              {error && (
                <div
                  style={{
                    background: "#fee",
                    border: "1px solid #c00",
                    color: "#c00",
                    padding: "1rem",
                    marginBottom: "2rem",
                    fontSize: "0.9rem",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Owner Information */}
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.3rem",
                  marginBottom: "1.5rem",
                  paddingBottom: "0.5rem",
                  borderBottom: "1px solid rgba(0,0,0,0.1)",
                }}
              >
                Owner Information
              </h3>

              <div className="sponsor-form" style={{ maxWidth: "100%", margin: 0 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="first_name">First Name *</label>
                    <input
                      type="text"
                      id="first_name"
                      name="first_name"
                      value={form.first_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="last_name">Last Name *</label>
                    <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      value={form.last_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="hometown">Hometown</label>
                  <input
                    type="text"
                    id="hometown"
                    name="hometown"
                    value={form.hometown}
                    onChange={handleChange}
                    placeholder="e.g., Crystal Lake, IL"
                  />
                </div>

                {/* Vehicle Information */}
                <h3
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "1.3rem",
                    marginBottom: "1.5rem",
                    marginTop: "2rem",
                    paddingBottom: "0.5rem",
                    borderBottom: "1px solid rgba(0,0,0,0.1)",
                  }}
                >
                  Vehicle Information
                </h3>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="vehicle_year">Year *</label>
                    <input
                      type="number"
                      id="vehicle_year"
                      name="vehicle_year"
                      value={form.vehicle_year}
                      onChange={handleChange}
                      min="1900"
                      max="2027"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="vehicle_make">Make *</label>
                    <input
                      type="text"
                      id="vehicle_make"
                      name="vehicle_make"
                      value={form.vehicle_make}
                      onChange={handleChange}
                      placeholder="e.g., Ford"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="vehicle_model">Model *</label>
                    <input
                      type="text"
                      id="vehicle_model"
                      name="vehicle_model"
                      value={form.vehicle_model}
                      onChange={handleChange}
                      placeholder="e.g., Mustang GT"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="vehicle_color">Color</label>
                    <input
                      type="text"
                      id="vehicle_color"
                      name="vehicle_color"
                      value={form.vehicle_color}
                      onChange={handleChange}
                      placeholder="e.g., Guards Red"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="engine_specs">Engine Specs</label>
                  <input
                    type="text"
                    id="engine_specs"
                    name="engine_specs"
                    value={form.engine_specs}
                    onChange={handleChange}
                    placeholder="e.g., 5.0L V8, 460hp"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modifications">Modifications</label>
                  <textarea
                    id="modifications"
                    name="modifications"
                    value={form.modifications}
                    onChange={handleChange}
                    placeholder="List any modifications or upgrades..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="story">
                    Your Car&apos;s Story (shown on placard)
                  </label>
                  <textarea
                    id="story"
                    name="story"
                    value={form.story}
                    onChange={handleChange}
                    placeholder="Tell us about your car — how you got it, what it means to you, fun facts..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="preferred_category">
                    Preferred Award Category *
                  </label>
                  <select
                    id="preferred_category"
                    name="preferred_category"
                    value={form.preferred_category}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a category...</option>
                    {AWARD_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Summary */}
                <div
                  style={{
                    marginTop: "2rem",
                    padding: "1.5rem",
                    background: "var(--cream)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      color: "var(--text-light)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Registration Fee
                  </p>
                  <p
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "2.5rem",
                      color: "var(--charcoal)",
                    }}
                  >
                    {REGISTRATION_PRICE_DISPLAY}
                  </p>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-light)",
                      marginTop: "0.5rem",
                    }}
                  >
                    Non-refundable. 100% of net proceeds go to the Crystal Lake
                    Food Pantry.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    marginTop: "1.5rem",
                    opacity: submitting ? 0.7 : 1,
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Processing..." : "Proceed to Payment"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
