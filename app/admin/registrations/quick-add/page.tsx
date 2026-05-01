"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { REGISTRATION_PRICE_CENTS } from "@/types/database";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.7rem 0.8rem",
  border: "2px solid #ddd",
  fontSize: "1.1rem",
  fontFamily: "'Inter', sans-serif",
  borderRadius: 0,
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "#666",
  marginBottom: "0.3rem",
  display: "block",
};

export default function QuickAddPage() {
  const firstNameRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    vehicle_year: "",
    vehicle_make: "",
    vehicle_model: "",
    email: "",
    donation: "",
  });

  useEffect(() => {
    firstNameRef.current?.focus();
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  const reset = () => {
    setForm({
      first_name: "",
      last_name: "",
      vehicle_year: "",
      vehicle_make: "",
      vehicle_model: "",
      email: "",
      donation: "",
    });
    setError(null);
    setTimeout(() => firstNameRef.current?.focus(), 50);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setError(null);
      setLastSaved(null);

      const donationCents = form.donation
        ? Math.round(parseFloat(form.donation) * 100)
        : 0;

      const row = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || `onsite-${Date.now()}@placeholder.local`,
        vehicle_year: parseInt(form.vehicle_year),
        vehicle_make: form.vehicle_make.trim(),
        vehicle_model: form.vehicle_model.trim(),
        amount_paid: REGISTRATION_PRICE_CENTS,
        donation_cents: donationCents,
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        checked_in: true,
        checked_in_at: new Date().toISOString(),
        utm_source: "onsite",
      };

      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("registrations")
        .insert(row)
        .select()
        .single();

      if (insertError || !data) {
        setError(insertError?.message || "Failed to save");
        setSaving(false);
        return;
      }

      // Enrich + pixel art in background
      fetch("/api/registrations/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: data.id }),
      })
        .then(() =>
          fetch("/api/registrations/pixel-art", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ registration_id: data.id }),
          })
        )
        .catch(() => {});

      // Download placard PDF
      try {
        const [{ pdf }, { PlacardDocument }] = await Promise.all([
          import("@react-pdf/renderer"),
          import("@/lib/placard-pdf"),
        ]);
        const logoUrl = `${window.location.origin}/images/CLCC_Logo2026.png`;
        const blob = await pdf(
          <PlacardDocument registrations={[data]} logoUrl={logoUrl} />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Placard-${data.car_number}-${data.vehicle_year}-${data.vehicle_make}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Placard generation failed:", err);
      }

      setLastSaved(
        `#${data.car_number} — ${data.vehicle_year} ${data.vehicle_make} ${data.vehicle_model}`
      );
      setSaving(false);
      reset();
    },
    [form]
  );

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.8rem",
              fontWeight: 400,
              marginBottom: "0.25rem",
            }}
          >
            On-Site Registration
          </h1>
          <p style={{ color: "var(--text-light)", fontSize: "0.85rem" }}>
            Quick add for day-of walk-ups &middot; Cash payment &middot; Auto
            check-in + placard
          </p>
        </div>
        <button
          onClick={() => setShowQR(!showQR)}
          style={{
            padding: "0.5rem 1rem",
            background: showQR ? "var(--charcoal)" : "var(--white)",
            color: showQR ? "var(--white)" : "var(--charcoal)",
            border: "1px solid #ddd",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {showQR ? "Hide QR" : "Card Payment QR"}
        </button>
      </div>

      {/* QR Code for card payments */}
      {showQR && (
        <div
          style={{
            background: "var(--white)",
            border: "2px solid var(--gold)",
            padding: "2rem",
            marginBottom: "1.5rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--gold)",
              marginBottom: "1rem",
            }}
          >
            Credit Card Registration
          </p>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent("https://crystallakecarshow.com/register")}`}
            alt="QR Code to registration page"
            width={200}
            height={200}
            style={{ display: "block", margin: "0 auto" }}
          />
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--charcoal)",
              marginTop: "1rem",
              fontWeight: 500,
            }}
          >
            Scan to register &amp; pay by card
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-light)", marginTop: "0.25rem" }}>
            crystallakecarshow.com/register
          </p>
          <button
            onClick={() => window.print()}
            style={{
              marginTop: "1rem",
              padding: "0.4rem 1.2rem",
              background: "var(--cream)",
              border: "1px solid #ddd",
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            Print QR Code
          </button>
        </div>
      )}

      {/* Success banner */}
      {lastSaved && (
        <div
          style={{
            background: "#e8f5e9",
            border: "1px solid #4caf50",
            color: "#2e7d32",
            padding: "1rem 1.25rem",
            marginBottom: "1rem",
            fontSize: "0.95rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Saved &amp; placard downloaded: {lastSaved}</span>
          <button
            onClick={() => setLastSaved(null)}
            style={{
              background: "none",
              border: "none",
              color: "#2e7d32",
              cursor: "pointer",
              fontSize: "1.1rem",
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            background: "#fee",
            border: "1px solid #c00",
            color: "#c00",
            padding: "0.8rem",
            marginBottom: "1rem",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--white)",
          padding: "1.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        {/* Name row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={labelStyle}>First Name *</label>
            <input
              ref={firstNameRef}
              type="text"
              value={form.first_name}
              onChange={set("first_name")}
              required
              autoComplete="off"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Last Name *</label>
            <input
              type="text"
              value={form.last_name}
              onChange={set("last_name")}
              required
              autoComplete="off"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Vehicle row */}
        <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={labelStyle}>Year *</label>
            <input
              type="number"
              value={form.vehicle_year}
              onChange={set("vehicle_year")}
              required
              min="1900"
              max="2027"
              autoComplete="off"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Make *</label>
            <input
              type="text"
              value={form.vehicle_make}
              onChange={set("vehicle_make")}
              required
              autoComplete="off"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Model *</label>
            <input
              type="text"
              value={form.vehicle_model}
              onChange={set("vehicle_model")}
              required
              autoComplete="off"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Email + Donation row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              autoComplete="off"
              placeholder="optional"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Donation $</label>
            <input
              type="number"
              value={form.donation}
              onChange={set("donation")}
              min="0"
              step="1"
              placeholder="0"
              autoComplete="off"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          style={{
            width: "100%",
            padding: "1rem",
            background: saving ? "#ccc" : "var(--gold)",
            color: "var(--charcoal)",
            border: "none",
            fontSize: "1rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "Saving & Generating Placard..." : `Register — $${REGISTRATION_PRICE_CENTS / 100} Cash`}
        </button>
      </form>
    </div>
  );
}
