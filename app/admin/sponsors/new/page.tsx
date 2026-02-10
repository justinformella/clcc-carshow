"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { SPONSORSHIP_LEVELS } from "@/types/database";
import type { Admin } from "@/types/database";

export default function NewSponsorPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);

  useEffect(() => {
    const fetchAdmins = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("admins").select("*").order("name");
      setAdmins((data as Admin[]) || []);
    };
    fetchAdmins();
  }, []);

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    website: "",
    sponsorship_level: "",
    message: "",
    status: "prospect",
    notes: "",
    assigned_to: "",
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
      .from("sponsors")
      .insert({
        name: form.name,
        company: form.company,
        email: form.email,
        phone: form.phone || null,
        website: form.website || null,
        sponsorship_level: form.sponsorship_level,
        message: form.message || null,
        status: form.status,
        notes: form.notes || null,
        assigned_to: form.assigned_to || null,
      })
      .select()
      .single();

    setSaving(false);

    if (insertError || !data) {
      setError(insertError?.message || "Failed to create sponsor");
      return;
    }

    router.push(`/admin/sponsors/${data.id}`);
  };

  return (
    <>
      <button
        onClick={() => router.push("/admin/sponsors")}
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
        &larr; Back to Sponsors
      </button>

      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "2rem",
          fontWeight: 400,
          marginBottom: "0.5rem",
        }}
      >
        Add Sponsor
      </h1>
      <p style={{ color: "var(--text-light)", fontSize: "0.9rem", marginBottom: "2rem" }}>
        Manually add a sponsor or prospect to track.
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
          <SectionHeading>Contact Information</SectionHeading>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input type="text" id="name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="company">Company *</label>
              <input type="text" id="company" name="company" value={form.company} onChange={handleChange} required />
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
            <label htmlFor="website">Website</label>
            <input type="text" id="website" name="website" value={form.website} onChange={handleChange} placeholder="e.g. acme.com" />
          </div>

          <SectionHeading>Sponsorship Details</SectionHeading>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sponsorship_level">Sponsorship Level *</label>
              <select id="sponsorship_level" name="sponsorship_level" value={form.sponsorship_level} onChange={handleChange} required>
                <option value="">Select a level...</option>
                {SPONSORSHIP_LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" value={form.status} onChange={handleChange}>
                <option value="prospect">Prospect</option>
                <option value="inquired">Inquired</option>
                <option value="engaged">Engaged</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea id="message" name="message" value={form.message} onChange={handleChange} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="notes">Internal Notes</label>
              <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} rows={4} />
            </div>
            <div className="form-group">
              <label htmlFor="assigned_to">Assign To</label>
              <select id="assigned_to" name="assigned_to" value={form.assigned_to} onChange={handleChange}>
                <option value="">Unassigned</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
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
            {saving ? "Creating..." : "Create Sponsor"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/sponsors")}
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
