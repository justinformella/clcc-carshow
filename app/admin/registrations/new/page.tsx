"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { AWARD_CATEGORIES } from "@/types/database";

export default function NewRegistrationPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("registrations")
      .insert({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || null,
        hometown: form.hometown || null,
        vehicle_year: parseInt(form.vehicle_year),
        vehicle_make: form.vehicle_make,
        vehicle_model: form.vehicle_model,
        vehicle_color: form.vehicle_color || null,
        engine_specs: form.engine_specs || null,
        modifications: form.modifications || null,
        story: form.story || null,
        preferred_category: form.preferred_category,
        payment_status: "pending",
        amount_paid: 0,
      })
      .select()
      .single();

    setSaving(false);

    if (insertError || !data) {
      setError(insertError?.message || "Failed to create registration");
      return;
    }

    router.push(`/admin/registrations/${data.id}`);
  };

  return (
    <>
      <button
        onClick={() => router.push("/admin/registrations")}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-light)",
          cursor: "pointer",
          fontSize: "0.85rem",
          padding: 0,
          marginBottom: "1.5rem",
        }}
      >
        &larr; Back to Registrations
      </button>

      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "2rem",
          fontWeight: 400,
          marginBottom: "0.5rem",
        }}
      >
        Add Registration
      </h1>
      <p style={{ color: "var(--text-light)", fontSize: "0.9rem", marginBottom: "2rem" }}>
        Manually add a registration (e.g. staff, VIPs). No payment required.
      </p>

      {error && (
        <div
          style={{
            background: "#fee",
            border: "1px solid #c00",
            color: "#c00",
            padding: "0.8rem",
            marginBottom: "1.5rem",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--white)",
          padding: "2rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <div className="sponsor-form" style={{ maxWidth: "100%", margin: 0 }}>
          <SectionHeading>Owner Information</SectionHeading>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">First Name *</label>
              <input type="text" id="first_name" name="first_name" value={form.first_name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="last_name">Last Name *</label>
              <input type="text" id="last_name" name="last_name" value={form.last_name} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input type="email" id="email" name="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input type="tel" id="phone" name="phone" value={form.phone} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="hometown">Hometown</label>
            <input type="text" id="hometown" name="hometown" value={form.hometown} onChange={handleChange} />
          </div>

          <SectionHeading>Vehicle Information</SectionHeading>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="vehicle_year">Year *</label>
              <input type="number" id="vehicle_year" name="vehicle_year" value={form.vehicle_year} onChange={handleChange} min="1900" max="2027" required />
            </div>
            <div className="form-group">
              <label htmlFor="vehicle_make">Make *</label>
              <input type="text" id="vehicle_make" name="vehicle_make" value={form.vehicle_make} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="vehicle_model">Model *</label>
              <input type="text" id="vehicle_model" name="vehicle_model" value={form.vehicle_model} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="vehicle_color">Color</label>
              <input type="text" id="vehicle_color" name="vehicle_color" value={form.vehicle_color} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="engine_specs">Engine Specs</label>
            <input type="text" id="engine_specs" name="engine_specs" value={form.engine_specs} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="modifications">Modifications</label>
            <textarea id="modifications" name="modifications" value={form.modifications} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="story">Car&apos;s Story</label>
            <textarea id="story" name="story" value={form.story} onChange={handleChange} />
          </div>

          <SectionHeading>Event Information</SectionHeading>
          <div className="form-group">
            <label htmlFor="preferred_category">Preferred Award Category *</label>
            <select id="preferred_category" name="preferred_category" value={form.preferred_category} onChange={handleChange} required>
              <option value="">Select a category...</option>
              {AWARD_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "2rem" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "0.6rem 1.5rem",
              background: "var(--gold)",
              color: "var(--charcoal)",
              border: "none",
              fontSize: "0.8rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Creating..." : "Create Registration"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/registrations")}
            style={{
              padding: "0.6rem 1.5rem",
              background: "var(--white)",
              color: "var(--charcoal)",
              border: "1px solid #ddd",
              fontSize: "0.8rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </h3>
  );
}
