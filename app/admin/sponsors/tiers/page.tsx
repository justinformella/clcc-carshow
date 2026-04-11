"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Sponsor, SponsorshipTier } from "@/types/database";
import ReactMarkdown from "react-markdown";

type TierForm = {
  name: string;
  price_dollars: string;
  benefits: string;
  display_order: string;
  is_active: boolean;
};

const emptyForm: TierForm = {
  name: "",
  price_dollars: "",
  benefits: "",
  display_order: "0",
  is_active: true,
};

const statusColors: Record<string, { bg: string; color: string }> = {
  prospect: { bg: "#ede7f6", color: "#5e35b1" },
  inquired: { bg: "#e3f2fd", color: "#1565c0" },
  engaged: { bg: "#fff3e0", color: "#e65100" },
  paid: { bg: "#e8f5e9", color: "#2e7d32" },
  archived: { bg: "#f5f5f5", color: "#757575" },
};

const statusLabels: Record<string, string> = {
  prospect: "Prospect",
  inquired: "Inquired",
  engaged: "Committed",
  paid: "Paid",
  archived: "Archived",
};

const inputStyle: React.CSSProperties = {
  padding: "0.6rem 1rem",
  border: "1px solid #ddd",
  fontSize: "0.9rem",
  fontFamily: "'Inter', sans-serif",
  width: "100%",
};

const goldButtonStyle: React.CSSProperties = {
  padding: "0.6rem 1.5rem",
  background: "var(--gold)",
  color: "var(--charcoal)",
  border: "none",
  fontSize: "0.8rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  cursor: "pointer",
};

export default function TiersPage() {
  const [tiers, setTiers] = useState<SponsorshipTier[]>([]);
  const [sponsorsByTier, setSponsorsByTier] = useState<Record<string, Sponsor[]>>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TierForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [tiersRes, supabase] = await Promise.all([
      fetch("/api/sponsors/tiers"),
      Promise.resolve(createClient()),
    ]);
    const tiersData = await tiersRes.json();
    const fetchedTiers: SponsorshipTier[] = tiersData.tiers || [];
    setTiers(fetchedTiers);

    // Fetch sponsors grouped by sponsorship_level
    const { data: sponsors } = await supabase
      .from("sponsors")
      .select("*")
      .order("company");

    const grouped: Record<string, Sponsor[]> = {};
    for (const tier of fetchedTiers) {
      grouped[tier.name] = [];
    }
    if (sponsors) {
      for (const s of sponsors as Sponsor[]) {
        // Skip archived sponsors
        if (s.status === "archived") continue;
        // Match by exact name or prefix (handles old format "Premier Sponsor ($1,000)")
        const match = fetchedTiers.find((t) => s.sponsorship_level === t.name || s.sponsorship_level.startsWith(t.name));
        if (match && grouped[match.name]) {
          grouped[match.name].push(s);
        }
      }
      // Sort each group: paid first, then committed/engaged, then pipeline
      const statusOrder: Record<string, number> = { paid: 0, committed: 1, engaged: 2, inquired: 3, prospect: 4 };
      for (const key of Object.keys(grouped)) {
        grouped[key].sort((a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5));
      }
    }
    setSponsorsByTier(grouped);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (isNew: boolean) => {
    setSaving(true);
    const priceCents = Math.round(parseFloat(form.price_dollars || "0") * 100);
    const body = {
      ...(isNew ? {} : { id: editingId }),
      name: form.name,
      price_cents: priceCents,
      benefits: form.benefits,
      display_order: parseInt(form.display_order || "0", 10),
      is_active: form.is_active,
    };

    await fetch("/api/sponsors/tiers", {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setAdding(false);
    setEditingId(null);
    setForm(emptyForm);
    setSaving(false);
    setLoading(true);
    await fetchData();
  };

  const startEdit = (tier: SponsorshipTier) => {
    setAdding(false);
    setEditingId(tier.id);
    setForm({
      name: tier.name,
      price_dollars: (tier.price_cents / 100).toString(),
      benefits: tier.benefits,
      display_order: tier.display_order.toString(),
      is_active: tier.is_active,
    });
  };

  const cancelEdit = () => {
    setAdding(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  if (loading) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Loading...
      </p>
    );
  }

  return (
    <>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "2rem",
            fontWeight: 400,
          }}
        >
          Sponsorship Tiers
        </h1>
        <button
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
            setAdding(true);
          }}
          style={goldButtonStyle}
        >
          Add New Tier
        </button>
      </div>

      {/* Add new tier form */}
      {adding && (
        <div style={{ background: "var(--white)", padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1rem" }}>
            New Tier
          </h3>
          <TierFormFields form={form} setForm={setForm} />
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button onClick={() => handleSave(true)} disabled={saving} style={goldButtonStyle}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={cancelEdit}
              style={{
                padding: "0.6rem 1.5rem",
                background: "transparent",
                color: "var(--text-light)",
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
        </div>
      )}

      {/* Tier cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {tiers.map((tier) => {
          const sponsors = sponsorsByTier[tier.name] || [];
          const isEditing = editingId === tier.id;

          return (
            <div
              key={tier.id}
              style={{
                background: "var(--white)",
                overflow: "auto",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                padding: "1.5rem",
              }}
            >
              {/* Tier header row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <h3
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      margin: 0,
                    }}
                  >
                    {tier.name}
                  </h3>
                  <span style={{ fontSize: "0.95rem", color: "var(--text-light)" }}>
                    ${(tier.price_cents / 100).toLocaleString()}
                  </span>
                  {sponsors.length > 0 && (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
                      ({sponsors.length})
                    </span>
                  )}
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.2rem 0.6rem",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      background: tier.is_active ? "#e8f5e9" : "#f5f5f5",
                      color: tier.is_active ? "#2e7d32" : "#757575",
                    }}
                  >
                    {tier.is_active ? "Active" : "Hidden"}
                  </span>
                </div>
                <button
                  onClick={() => (isEditing ? cancelEdit() : startEdit(tier))}
                  style={{
                    padding: "0.4rem 1rem",
                    background: isEditing ? "transparent" : "var(--gold)",
                    color: isEditing ? "var(--text-light)" : "var(--charcoal)",
                    border: isEditing ? "1px solid #ddd" : "none",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                  }}
                >
                  {isEditing ? "Cancel" : "Edit"}
                </button>
              </div>

              {/* Sponsors list */}
              <div style={{ marginBottom: isEditing ? "1.5rem" : 0 }}>
                {sponsors.length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-light)", margin: 0 }}>
                    No active sponsors in this tier
                  </p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #eee", textAlign: "left" }}>
                        <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-light)" }}>Company</th>
                        <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-light)" }}>Contact</th>
                        <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-light)" }}>Status</th>
                        <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-light)", textAlign: "right" }}>Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sponsors.map((s) => {
                        const sc = statusColors[s.status] || statusColors.prospect;
                        return (
                          <tr key={s.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                            <td style={{ padding: "0.5rem 0.75rem", fontWeight: 500 }}>{s.company}</td>
                            <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-light)" }}>{s.name}</td>
                            <td style={{ padding: "0.5rem 0.75rem" }}>
                              <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", background: sc.bg, color: sc.color }}>
                                {statusLabels[s.status] || s.status}
                              </span>
                            </td>
                            <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", fontWeight: 500, color: s.sponsorship_amount > 0 ? "#2e7d32" : "var(--text-light)" }}>
                              {s.sponsorship_amount > 0 ? `$${(s.sponsorship_amount / 100).toLocaleString()}` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Edit form */}
              {isEditing && (
                <div style={{ borderTop: "1px solid #eee", paddingTop: "1.5rem" }}>
                  <TierFormFields form={form} setForm={setForm} />
                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                    <button onClick={() => handleSave(false)} disabled={saving} style={goldButtonStyle}>
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{
                        padding: "0.6rem 1.5rem",
                        background: "transparent",
                        color: "var(--text-light)",
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
                </div>
              )}
            </div>
          );
        })}

        {tiers.length === 0 && (
          <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
            No tiers created yet. Click &ldquo;Add New Tier&rdquo; to get started.
          </p>
        )}
      </div>
    </>
  );
}

function TierFormFields({
  form,
  setForm,
}: {
  form: TierForm;
  setForm: React.Dispatch<React.SetStateAction<TierForm>>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Row 1: Name + Price */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 2, minWidth: "200px" }}>
          <label style={labelStyle}>Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Presenting Sponsor"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1, minWidth: "120px" }}>
          <label style={labelStyle}>Price ($)</label>
          <input
            type="number"
            value={form.price_dollars}
            onChange={(e) => setForm((f) => ({ ...f, price_dollars: e.target.value }))}
            placeholder="0"
            min="0"
            step="0.01"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Row 2: Display Order + Active */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ minWidth: "120px" }}>
          <label style={labelStyle}>Display Order</label>
          <input
            type="number"
            value={form.display_order}
            onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
            min="0"
            style={inputStyle}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingBottom: "0.3rem" }}>
          <label style={{ ...labelStyle, margin: 0 }}>Active</label>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
            style={{
              width: "44px",
              height: "24px",
              borderRadius: "12px",
              border: "none",
              background: form.is_active ? "#2e7d32" : "#ccc",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.2s",
            }}
          >
            <span
              style={{
                display: "block",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "#fff",
                position: "absolute",
                top: "3px",
                left: form.is_active ? "23px" : "3px",
                transition: "left 0.2s",
              }}
            />
          </button>
        </div>
      </div>

      {/* Row 3: Benefits + Preview */}
      <div>
        <label style={labelStyle}>Benefits (markdown)</label>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "250px" }}>
            <textarea
              value={form.benefits}
              onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))}
              placeholder={"- Logo on event signage\n- **Premium** booth location\n- Social media mentions"}
              rows={6}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--text-light)", margin: "0.4rem 0 0" }}>
              Tip: Use - for bullet points, **bold** for emphasis
            </p>
          </div>
          <div
            style={{
              flex: 1,
              minWidth: "250px",
              padding: "0.75rem 1rem",
              border: "1px solid #eee",
              background: "#fafafa",
              fontSize: "0.85rem",
              lineHeight: 1.6,
              minHeight: "120px",
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-light)",
                marginBottom: "0.5rem",
              }}
            >
              Preview:
            </div>
            {form.benefits ? (
              <ReactMarkdown>{form.benefits}</ReactMarkdown>
            ) : (
              <span style={{ color: "var(--text-light)", fontStyle: "italic" }}>
                Markdown preview will appear here
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.7rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-light)",
  marginBottom: "0.4rem",
};
