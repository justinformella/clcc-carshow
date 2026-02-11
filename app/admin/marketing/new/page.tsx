"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { AD_PLATFORMS } from "@/types/database";

export default function NewCampaignPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    platform: "",
    campaign_name: "",
    status: "active",
    budget: "",
    utm_campaign: "",
    external_url: "",
    start_date: "",
    end_date: "",
    notes: "",
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
      .from("ad_campaigns")
      .insert({
        platform: form.platform,
        campaign_name: form.campaign_name,
        status: form.status,
        budget_cents: form.budget ? Math.round(parseFloat(form.budget) * 100) : null,
        utm_campaign: form.utm_campaign || null,
        external_url: form.external_url || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes || null,
      })
      .select()
      .single();

    setSaving(false);

    if (insertError || !data) {
      setError(insertError?.message || "Failed to create campaign");
      return;
    }

    router.push(`/admin/marketing/${data.id}`);
  };

  // Auto-suggest utm_campaign from campaign name
  const suggestUtm = () => {
    if (!form.utm_campaign && form.campaign_name) {
      setForm({
        ...form,
        utm_campaign: form.campaign_name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      });
    }
  };

  return (
    <>
      <button
        onClick={() => router.push("/admin/marketing")}
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
        &larr; Back to Marketing
      </button>

      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "2rem",
          fontWeight: 400,
          marginBottom: "0.5rem",
        }}
      >
        Add Campaign
      </h1>
      <p style={{ color: "var(--text-light)", fontSize: "0.9rem", marginBottom: "2rem" }}>
        Track a new ad campaign. Update spend and metrics manually from Ads Manager.
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
          <SectionHeading>Campaign Details</SectionHeading>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="platform">Platform *</label>
              <select id="platform" name="platform" value={form.platform} onChange={handleChange} required>
                <option value="">Select platform...</option>
                {AD_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" value={form.status} onChange={handleChange}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="campaign_name">Campaign Name *</label>
            <input
              type="text"
              id="campaign_name"
              name="campaign_name"
              value={form.campaign_name}
              onChange={handleChange}
              onBlur={suggestUtm}
              placeholder="e.g., Summer 2026 Launch"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="budget">Budget ($)</label>
              <input
                type="number"
                id="budget"
                name="budget"
                value={form.budget}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="e.g., 500.00"
              />
            </div>
            <div className="form-group">
              <label htmlFor="utm_campaign">UTM Campaign Tag</label>
              <input
                type="text"
                id="utm_campaign"
                name="utm_campaign"
                value={form.utm_campaign}
                onChange={handleChange}
                placeholder="auto-suggested from name"
              />
            </div>
          </div>

          <SectionHeading>Dates & Links</SectionHeading>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">Start Date</label>
              <input type="date" id="start_date" name="start_date" value={form.start_date} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="end_date">End Date</label>
              <input type="date" id="end_date" name="end_date" value={form.end_date} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="external_url">Ads Manager URL</label>
            <input
              type="url"
              id="external_url"
              name="external_url"
              value={form.external_url}
              onChange={handleChange}
              placeholder="Link to campaign in Ads Manager"
            />
          </div>
          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} rows={4} />
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
            {saving ? "Creating..." : "Create Campaign"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/marketing")}
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
