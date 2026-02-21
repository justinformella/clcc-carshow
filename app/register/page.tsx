"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  REGISTRATION_PRICE_DISPLAY,
  REGISTRATION_PRICE_CENTS,
  MAX_REGISTRATIONS,
  MAX_VEHICLES_PER_CHECKOUT,
  DONATION_PRESETS,
} from "@/types/database";

type VehicleForm = {
  vehicle_year: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  story: string;
};

const emptyVehicle = (): VehicleForm => ({
  vehicle_year: "",
  vehicle_make: "",
  vehicle_model: "",
  vehicle_color: "",
  story: "",
});

function RegisterContent() {
  const searchParams = useSearchParams();
  const utmRef = useRef({
    utm_source: searchParams.get("utm_source") || "",
    utm_medium: searchParams.get("utm_medium") || "",
    utm_campaign: searchParams.get("utm_campaign") || "",
  });

  const [spotsRemaining, setSpotsRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [owner, setOwner] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address_street: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    hide_owner_details: false,
  });

  const [vehicles, setVehicles] = useState<VehicleForm[]>([emptyVehicle()]);
  const [donationCents, setDonationCents] = useState(0);
  const [showCustomDonation, setShowCustomDonation] = useState(false);
  const [customDonationValue, setCustomDonationValue] = useState("");

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

  const handleOwnerChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setOwner({ ...owner, [e.target.name]: e.target.value });
  };

  const handleVehicleChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const updated = [...vehicles];
    updated[index] = { ...updated[index], [e.target.name]: e.target.value };
    setVehicles(updated);
  };

  const addVehicle = () => {
    if (vehicles.length < MAX_VEHICLES_PER_CHECKOUT) {
      setVehicles([...vehicles, emptyVehicle()]);
    }
  };

  const removeVehicle = (index: number) => {
    if (vehicles.length > 1) {
      setVehicles(vehicles.filter((_, i) => i !== index));
    }
  };

  const canAddMore =
    vehicles.length < MAX_VEHICLES_PER_CHECKOUT &&
    (spotsRemaining === null || vehicles.length < spotsRemaining);

  const regCents = vehicles.length * REGISTRATION_PRICE_CENTS;
  const totalCents = regCents + donationCents;
  const totalDisplay = `$${totalCents / 100}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...owner,
          hide_owner_details: owner.hide_owner_details,
          vehicles: vehicles.map((v) => ({
            ...v,
            vehicle_year: parseInt(v.vehicle_year),
          })),
          donation_cents: donationCents,
          utm_source: utmRef.current.utm_source || undefined,
          utm_medium: utmRef.current.utm_medium || undefined,
          utm_campaign: utmRef.current.utm_campaign || undefined,
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
          <Link href="/" className="logo reg-logo">
            <img
              src="/images/CLCC_Logo2026.png"
              alt="CLCC Logo"
              className="reg-logo-img"
            />
            <div style={{ minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <span className="logo-text" style={{ color: "var(--charcoal)" }}>
                Crystal Lake Cars &amp; Caffeine
              </span>
              <span className="logo-tagline reg-logo-tagline" style={{ color: "var(--text-light)" }}>
                Est. 2021 &middot; Crystal Lake, Illinois
              </span>
            </div>
          </Link>
          <nav>
            <ul style={{ display: "flex" }}>
              <li>
                <Link href="/" style={{ color: "var(--text-dark)" }}>
                  Home
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
                      value={owner.first_name}
                      onChange={handleOwnerChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="last_name">Last Name *</label>
                    <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      value={owner.last_name}
                      onChange={handleOwnerChange}
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
                      value={owner.email}
                      onChange={handleOwnerChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={owner.phone}
                      onChange={handleOwnerChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="address_street">Street Address *</label>
                  <input
                    type="text"
                    id="address_street"
                    name="address_street"
                    value={owner.address_street}
                    onChange={handleOwnerChange}
                    placeholder="e.g., 123 Main St"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="address_city">City *</label>
                    <input
                      type="text"
                      id="address_city"
                      name="address_city"
                      value={owner.address_city}
                      onChange={handleOwnerChange}
                      placeholder="e.g., Crystal Lake"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="address_state">State *</label>
                    <input
                      type="text"
                      id="address_state"
                      name="address_state"
                      value={owner.address_state}
                      onChange={handleOwnerChange}
                      placeholder="e.g., IL"
                      maxLength={2}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ maxWidth: "200px" }}>
                  <label htmlFor="address_zip">ZIP Code *</label>
                  <input
                    type="text"
                    id="address_zip"
                    name="address_zip"
                    value={owner.address_zip}
                    onChange={handleOwnerChange}
                    placeholder="e.g., 60014"
                    maxLength={10}
                    required
                  />
                </div>

                <div
                  style={{
                    marginTop: "1.25rem",
                    padding: "1rem 1.25rem",
                    background: "var(--cream)",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      fontSize: "0.9rem",
                      color: "var(--charcoal)",
                      cursor: "pointer",
                      textTransform: "none",
                      letterSpacing: "0",
                      fontWeight: 400,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={owner.hide_owner_details}
                      onChange={(e) =>
                        setOwner({ ...owner, hide_owner_details: e.target.checked })
                      }
                      style={{ width: "auto", margin: 0 }}
                    />
                    Keep my name and city anonymous for my vehicle registration placard
                  </label>
                </div>

                {/* Vehicle(s) */}
                {vehicles.map((vehicle, index) => (
                  <div key={index}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: "2rem",
                        marginBottom: "1.5rem",
                        paddingBottom: "0.5rem",
                        borderBottom: "1px solid rgba(0,0,0,0.1)",
                      }}
                    >
                      <h3
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: "1.3rem",
                          margin: 0,
                        }}
                      >
                        {vehicles.length > 1 ? `Vehicle ${index + 1}` : "Vehicle Information"}
                      </h3>
                      {vehicles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVehicle(index)}
                          style={{
                            background: "none",
                            border: "1px solid #c00",
                            color: "#c00",
                            padding: "0.3rem 0.8rem",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            width: "auto",
                            flexShrink: 0,
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor={`vehicle_year_${index}`}>Year *</label>
                        <input
                          type="number"
                          id={`vehicle_year_${index}`}
                          name="vehicle_year"
                          value={vehicle.vehicle_year}
                          onChange={(e) => handleVehicleChange(index, e)}
                          min="1900"
                          max="2027"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`vehicle_make_${index}`}>Make *</label>
                        <input
                          type="text"
                          id={`vehicle_make_${index}`}
                          name="vehicle_make"
                          value={vehicle.vehicle_make}
                          onChange={(e) => handleVehicleChange(index, e)}
                          placeholder="e.g., Ford"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor={`vehicle_model_${index}`}>Model *</label>
                        <input
                          type="text"
                          id={`vehicle_model_${index}`}
                          name="vehicle_model"
                          value={vehicle.vehicle_model}
                          onChange={(e) => handleVehicleChange(index, e)}
                          placeholder="e.g., Mustang GT"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`vehicle_color_${index}`}>Color</label>
                        <input
                          type="text"
                          id={`vehicle_color_${index}`}
                          name="vehicle_color"
                          value={vehicle.vehicle_color}
                          onChange={(e) => handleVehicleChange(index, e)}
                          placeholder="e.g., Guards Red"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor={`story_${index}`}>
                        Your Car&apos;s Story (optional, shown on placard)
                      </label>
                      <textarea
                        id={`story_${index}`}
                        name="story"
                        value={vehicle.story}
                        onChange={(e) => handleVehicleChange(index, e)}
                        placeholder="Tell us about your car — how you got it, what it means to you, fun facts..."
                      />
                    </div>
                  </div>
                ))}

                {/* Add Vehicle Button */}
                {canAddMore && (
                  <button
                    type="button"
                    onClick={addVehicle}
                    style={{
                      marginTop: "1.5rem",
                      width: "100%",
                      padding: "0.8rem",
                      background: "var(--cream)",
                      border: "2px dashed rgba(0,0,0,0.15)",
                      color: "var(--charcoal)",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                    }}
                  >
                    + Add Another Vehicle ({REGISTRATION_PRICE_DISPLAY})
                  </button>
                )}

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
                    {donationCents > 0 ? "Total" : "Registration Fee"}
                  </p>
                  <p
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "2.5rem",
                      color: "var(--charcoal)",
                    }}
                  >
                    {totalDisplay}
                  </p>
                  {(vehicles.length > 1 || donationCents > 0) && (
                    <div
                      style={{
                        fontSize: "0.9rem",
                        color: "var(--text-light)",
                        marginTop: "0.25rem",
                      }}
                    >
                      {vehicles.length > 1 ? (
                        <span>
                          {vehicles.length} vehicles &times; {REGISTRATION_PRICE_DISPLAY}
                        </span>
                      ) : (
                        <span>Registration: {REGISTRATION_PRICE_DISPLAY}</span>
                      )}
                      {donationCents > 0 && (
                        <span> + ${donationCents / 100} donation</span>
                      )}
                    </div>
                  )}
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

                {/* Donation Section */}
                <div
                  style={{
                    marginTop: "1.5rem",
                    padding: "1.5rem",
                    background: "#fffde7",
                    border: "1px solid rgba(201,168,76,0.3)",
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "1.2rem",
                      marginBottom: "0.5rem",
                      color: "var(--charcoal)",
                      textAlign: "center",
                    }}
                  >
                    Additional Donation to the Crystal Lake Food Pantry
                  </h3>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-light)",
                      textAlign: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    Add an optional donation with your registration
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    {DONATION_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          if (donationCents === preset) {
                            setDonationCents(0);
                          } else {
                            setDonationCents(preset);
                            setShowCustomDonation(false);
                            setCustomDonationValue("");
                          }
                        }}
                        style={{
                          padding: "0.5rem 1.2rem",
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          background: donationCents === preset ? "var(--gold)" : "var(--white)",
                          color: donationCents === preset ? "var(--charcoal)" : "var(--charcoal)",
                          border: `2px solid ${donationCents === preset ? "var(--gold)" : "rgba(201,168,76,0.5)"}`,
                          width: "auto",
                        }}
                      >
                        +${preset / 100}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        if (showCustomDonation) {
                          setShowCustomDonation(false);
                          setCustomDonationValue("");
                          setDonationCents(0);
                        } else {
                          setShowCustomDonation(true);
                          setDonationCents(0);
                        }
                      }}
                      style={{
                        padding: "0.5rem 1.2rem",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        background: showCustomDonation ? "var(--gold)" : "var(--white)",
                        color: "var(--charcoal)",
                        border: `2px solid ${showCustomDonation ? "var(--gold)" : "rgba(201,168,76,0.5)"}`,
                        width: "auto",
                      }}
                    >
                      Custom
                    </button>
                  </div>

                  {showCustomDonation && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--charcoal)" }}>$</span>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        step="1"
                        placeholder="Enter amount"
                        value={customDonationValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomDonationValue(val);
                          const dollars = parseInt(val);
                          if (!isNaN(dollars) && dollars > 0 && dollars <= 500) {
                            setDonationCents(dollars * 100);
                          } else {
                            setDonationCents(0);
                          }
                        }}
                        style={{
                          width: "160px",
                          padding: "0.5rem 0.75rem",
                          fontSize: "1rem",
                          border: "1px solid rgba(0,0,0,0.15)",
                          textAlign: "center",
                        }}
                      />
                    </div>
                  )}

                  {donationCents === 0 && !showCustomDonation && (
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-light)",
                        textAlign: "center",
                        marginTop: "0.25rem",
                      }}
                    >
                      No thanks, just register
                    </p>
                  )}
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

      <style>{`
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

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}
