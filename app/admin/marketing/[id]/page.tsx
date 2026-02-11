"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { AdCampaign, Registration } from "@/types/database";
import { AD_PLATFORMS } from "@/types/database";

type EditForm = {
  platform: string;
  campaign_name: string;
  status: string;
  budget: string;
  spent: string;
  impressions: string;
  clicks: string;
  utm_campaign: string;
  external_url: string;
  start_date: string;
  end_date: string;
  notes: string;
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<AdCampaign | null>(null);
  const [linkedRegs, setLinkedRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCampaign = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("ad_campaigns")
      .select("*")
      .eq("id", id)
      .single();
    setCampaign(data as AdCampaign | null);
    setLoading(false);

    if (data?.utm_campaign) {
      const { data: regs } = await supabase
        .from("registrations")
        .select("*")
        .eq("utm_campaign", data.utm_campaign)
        .in("payment_status", ["paid", "pending"])
        .order("created_at", { ascending: false });
      setLinkedRegs(regs || []);
    }
  }, [id]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  const startEdit = () => {
    if (!campaign) return;
    setForm({
      platform: campaign.platform,
      campaign_name: campaign.campaign_name,
      status: campaign.status,
      budget: campaign.budget_cents != null ? (campaign.budget_cents / 100).toFixed(2) : "",
      spent: (campaign.spent_cents / 100).toFixed(2),
      impressions: String(campaign.impressions),
      clicks: String(campaign.clicks),
      utm_campaign: campaign.utm_campaign || "",
      external_url: campaign.external_url || "",
      start_date: campaign.start_date || "",
      end_date: campaign.end_date || "",
      notes: campaign.notes || "",
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
    setSaveError(null);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (!form) return;
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !campaign) return;
    setSaving(true);
    setSaveError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("ad_campaigns")
      .update({
        platform: form.platform,
        campaign_name: form.campaign_name,
        status: form.status,
        budget_cents: form.budget ? Math.round(parseFloat(form.budget) * 100) : null,
        spent_cents: form.spent ? Math.round(parseFloat(form.spent) * 100) : 0,
        impressions: parseInt(form.impressions) || 0,
        clicks: parseInt(form.clicks) || 0,
        utm_campaign: form.utm_campaign || null,
        external_url: form.external_url || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes || null,
      })
      .eq("id", campaign.id);

    setSaving(false);

    if (error) {
      setSaveError(error.message);
    } else {
      setEditing(false);
      setForm(null);
      await fetchCampaign();
    }
  };

  const handleDelete = async () => {
    if (!campaign) return;
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    setDeleting(true);

    const supabase = createClient();
    const { error } = await supabase.from("ad_campaigns").delete().eq("id", campaign.id);

    if (error) {
      alert(error.message);
      setDeleting(false);
    } else {
      router.push("/admin/marketing");
    }
  };

  if (loading) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Loading...
      </p>
    );
  }

  if (!campaign) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Campaign not found
      </p>
    );
  }

  const c = campaign;
  const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : "—";

  return (
    <div>
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

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "2rem",
                fontWeight: 400,
              }}
            >
              {c.campaign_name}
            </h1>
            <StatusBadge status={c.status} />
            <PlatformBadge platform={c.platform} />
          </div>
        </div>

        {!editing && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <ActionButton label="Edit" onClick={startEdit} variant="secondary" />
            {c.external_url && (
              <a
                href={c.external_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0.5rem 1.2rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  border: "1px solid #ddd",
                  background: "var(--white)",
                  color: "var(--charcoal)",
                  textDecoration: "none",
                }}
              >
                Open in Ads Manager
              </a>
            )}
            <ActionButton
              label={deleting ? "Deleting..." : "Delete"}
              onClick={handleDelete}
              variant="danger"
              disabled={deleting}
            />
          </div>
        )}
      </div>

      {editing && form ? (
        <form
          onSubmit={handleSave}
          style={{
            background: "var(--white)",
            padding: "2rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          {saveError && (
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
              {saveError}
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.3rem",
                fontWeight: 400,
              }}
            >
              Edit Campaign
            </h2>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <ActionButton label="Cancel" onClick={cancelEdit} variant="secondary" type="button" />
              <ActionButton
                label={saving ? "Saving..." : "Save"}
                onClick={() => {}}
                variant="primary"
                type="submit"
                disabled={saving}
              />
            </div>
          </div>

          <div className="sponsor-form" style={{ maxWidth: "100%", margin: 0 }}>
            <SectionHeading>Campaign Details</SectionHeading>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="platform">Platform *</label>
                <select id="platform" name="platform" value={form.platform} onChange={handleFormChange} required>
                  {AD_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" value={form.status} onChange={handleFormChange}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="campaign_name">Campaign Name *</label>
              <input type="text" id="campaign_name" name="campaign_name" value={form.campaign_name} onChange={handleFormChange} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="budget">Budget ($)</label>
                <input type="number" id="budget" name="budget" value={form.budget} onChange={handleFormChange} step="0.01" min="0" />
              </div>
              <div className="form-group">
                <label htmlFor="utm_campaign">UTM Campaign Tag</label>
                <input type="text" id="utm_campaign" name="utm_campaign" value={form.utm_campaign} onChange={handleFormChange} />
              </div>
            </div>

            <SectionHeading>Metrics (from Ads Manager)</SectionHeading>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="spent">Spent ($)</label>
                <input type="number" id="spent" name="spent" value={form.spent} onChange={handleFormChange} step="0.01" min="0" />
              </div>
              <div className="form-group">
                <label htmlFor="impressions">Impressions</label>
                <input type="number" id="impressions" name="impressions" value={form.impressions} onChange={handleFormChange} min="0" />
              </div>
            </div>
            <div className="form-group" style={{ maxWidth: "calc(50% - 0.5rem)" }}>
              <label htmlFor="clicks">Clicks</label>
              <input type="number" id="clicks" name="clicks" value={form.clicks} onChange={handleFormChange} min="0" />
            </div>

            <SectionHeading>Dates & Links</SectionHeading>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_date">Start Date</label>
                <input type="date" id="start_date" name="start_date" value={form.start_date} onChange={handleFormChange} />
              </div>
              <div className="form-group">
                <label htmlFor="end_date">End Date</label>
                <input type="date" id="end_date" name="end_date" value={form.end_date} onChange={handleFormChange} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="external_url">Ads Manager URL</label>
              <input type="url" id="external_url" name="external_url" value={form.external_url} onChange={handleFormChange} />
            </div>
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" name="notes" value={form.notes} onChange={handleFormChange} rows={4} />
            </div>
          </div>
        </form>
      ) : (
        <>
          {/* View mode */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }} className="campaign-grid">
            {/* Details */}
            <DetailSection title="Campaign Details">
              <DetailRow label="Platform" value={c.platform.charAt(0).toUpperCase() + c.platform.slice(1)} />
              <DetailRow label="Status" value={c.status.charAt(0).toUpperCase() + c.status.slice(1)} />
              <DetailRow label="Budget" value={c.budget_cents != null ? `$${(c.budget_cents / 100).toLocaleString()}` : "—"} />
              <DetailRow label="Spent" value={`$${(c.spent_cents / 100).toLocaleString()}`} />
              <DetailRow label="UTM Tag" value={c.utm_campaign || "—"} />
              <DetailRow label="Start" value={c.start_date ? new Date(c.start_date + "T00:00:00").toLocaleDateString() : "—"} />
              <DetailRow label="End" value={c.end_date ? new Date(c.end_date + "T00:00:00").toLocaleDateString() : "—"} />
              {c.notes && <DetailRow label="Notes" value={c.notes} />}
            </DetailSection>

            {/* Metrics */}
            <DetailSection title="Performance">
              <DetailRow label="Impressions" value={c.impressions.toLocaleString()} />
              <DetailRow label="Clicks" value={c.clicks.toLocaleString()} />
              <DetailRow label="CTR" value={ctr === "—" ? "—" : `${ctr}%`} />
              <DetailRow label="Registrations" value={`${linkedRegs.length}`} />
              {c.spent_cents > 0 && linkedRegs.length > 0 && (
                <DetailRow label="Cost / Reg" value={`$${((c.spent_cents / 100) / linkedRegs.length).toFixed(2)}`} />
              )}
            </DetailSection>
          </div>

          {/* Linked Registrations */}
          {c.utm_campaign && (
            <div style={{ marginTop: "2rem" }}>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.4rem",
                  fontWeight: 400,
                  marginBottom: "1rem",
                }}
              >
                Linked Registrations ({linkedRegs.length})
              </h2>
              <div
                style={{
                  background: "var(--white)",
                  overflow: "auto",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ background: "var(--cream)", textAlign: "left" }}>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>Vehicle</th>
                      <th style={thStyle}>Source</th>
                      <th style={thStyle}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkedRegs.map((reg) => (
                      <tr
                        key={reg.id}
                        onClick={() => router.push(`/admin/registrations/${reg.id}`)}
                        style={{ borderBottom: "1px solid #eee", cursor: "pointer" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                      >
                        <td style={tdStyle}>{reg.car_number}</td>
                        <td style={tdStyle}>{reg.first_name} {reg.last_name}</td>
                        <td style={tdStyle}>{reg.vehicle_year} {reg.vehicle_make} {reg.vehicle_model}</td>
                        <td style={tdStyle}>
                          {[reg.utm_source, reg.utm_medium].filter(Boolean).join(" / ") || "—"}
                        </td>
                        <td style={tdStyle}>{new Date(reg.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {linkedRegs.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "var(--text-light)" }}>
                          No registrations linked via utm_campaign=&quot;{c.utm_campaign}&quot;
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <style>{`
            @media (max-width: 900px) {
              .campaign-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </>
      )}
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--white)", padding: "1.5rem 2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
      <h3
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.1rem",
          fontWeight: 400,
          marginBottom: "1rem",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          color: "var(--charcoal)",
        }}
      >
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {children}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "1rem", fontSize: "0.9rem" }}>
      <span
        style={{
          minWidth: "120px",
          color: "var(--text-light)",
          fontSize: "0.8rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          paddingTop: "0.1rem",
        }}
      >
        {label}
      </span>
      <span style={{ color: "var(--charcoal)", wordBreak: "break-word" }}>{value}</span>
    </div>
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

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string }> = {
    active: { bg: "#e8f5e9", color: "#2e7d32" },
    paused: { bg: "#fff3e0", color: "#e65100" },
    completed: { bg: "#f5f5f5", color: "#616161" },
  };
  const { bg, color } = config[status] || config.active;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.3rem 0.8rem",
        fontSize: "0.8rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        background: bg,
        color,
      }}
    >
      {status}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    facebook: { bg: "#e3f2fd", text: "#1565c0" },
    instagram: { bg: "#fce4ec", text: "#ad1457" },
    google: { bg: "#fff3e0", text: "#e65100" },
    tiktok: { bg: "#f3e5f5", text: "#7b1fa2" },
  };
  const colors = map[platform] || { bg: "#f5f5f5", text: "#616161" };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.3rem 0.8rem",
        fontSize: "0.8rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        background: colors.bg,
        color: colors.text,
      }}
    >
      {platform}
    </span>
  );
}

function ActionButton({
  label,
  onClick,
  variant,
  type = "button",
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  variant: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "var(--gold)", color: "var(--charcoal)" },
    secondary: { background: "var(--white)", color: "var(--charcoal)", border: "1px solid #ddd" },
    danger: { background: "#fff", color: "#c00", border: "1px solid #c00" },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.5rem 1.2rem",
        fontSize: "0.8rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        border: "none",
        ...styles[variant],
      }}
    >
      {label}
    </button>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.8rem 1rem",
  fontWeight: 600,
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-light)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "0.8rem 1rem",
};
