"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Sponsor, SponsorStatus, SponsorAuditLogEntry, Admin } from "@/types/database";
import { SPONSORSHIP_LEVELS } from "@/types/database";

type EditForm = {
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  sponsorship_level: string;
  message: string;
  status: string;
  amount_paid: string;
  notes: string;
  assigned_to: string;
};

export default function SponsorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [auditLog, setAuditLog] = useState<SponsorAuditLogEntry[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [logoVisible, setLogoVisible] = useState(true);

  const fetchSponsor = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("sponsors")
      .select("*")
      .eq("id", id)
      .single();

    setSponsor(data as Sponsor | null);
    setLoading(false);
  }, [id]);

  const fetchAuditLog = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("sponsor_audit_log")
      .select("*")
      .eq("sponsor_id", id)
      .order("created_at", { ascending: false });
    setAuditLog((data as SponsorAuditLogEntry[]) || []);
  }, [id]);

  useEffect(() => {
    fetchSponsor();
    fetchAuditLog();
    setLogoVisible(true);

    const fetchAdmins = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("admins").select("*").order("name");
      setAdmins((data as Admin[]) || []);
    };
    fetchAdmins();
  }, [fetchSponsor, fetchAuditLog]);

  const startEdit = () => {
    if (!sponsor) return;
    setForm({
      name: sponsor.name,
      company: sponsor.company,
      email: sponsor.email,
      phone: sponsor.phone || "",
      website: sponsor.website || "",
      sponsorship_level: sponsor.sponsorship_level,
      message: sponsor.message || "",
      status: sponsor.status,
      amount_paid: String(sponsor.amount_paid / 100),
      notes: sponsor.notes || "",
      assigned_to: sponsor.assigned_to || "",
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (!form) return;
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !sponsor) return;
    setSaving(true);

    const supabase = createClient();

    // Determine paid_at value based on status transition
    const wasPaid = sponsor.status === "paid";
    const nowPaid = form.status === "paid";
    let paidAtUpdate: Record<string, string | null> = {};
    if (nowPaid && !wasPaid) {
      paidAtUpdate = { paid_at: new Date().toISOString() };
    } else if (!nowPaid) {
      paidAtUpdate = { paid_at: null };
    }

    const { error } = await supabase
      .from("sponsors")
      .update({
        name: form.name,
        company: form.company,
        email: form.email,
        phone: form.phone || null,
        website: form.website || null,
        sponsorship_level: form.sponsorship_level,
        message: form.message || null,
        status: form.status,
        amount_paid: Math.round(parseFloat(form.amount_paid || "0") * 100),
        notes: form.notes || null,
        assigned_to: form.assigned_to || null,
        ...paidAtUpdate,
      })
      .eq("id", sponsor.id);

    setSaving(false);

    if (!error) {
      setEditing(false);
      setForm(null);
      await fetchSponsor();
      fetchAuditLog();
    }
  };

  if (loading) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Loading...
      </p>
    );
  }

  if (!sponsor) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Sponsor not found
      </p>
    );
  }

  const s = sponsor;
  const logoDomain = s.website ? s.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : null;
  const logoUrl = logoDomain ? `https://www.google.com/s2/favicons?domain=${logoDomain}&sz=128` : null;

  return (
    <>
      {/* Back link */}
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
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
          {logoUrl && logoVisible && (
            <img
              src={logoUrl}
              alt={`${s.company} logo`}
              width={56}
              height={56}
              onError={() => setLogoVisible(false)}
              style={{
                objectFit: "contain",
                borderRadius: "8px",
                border: "1px solid #eee",
                background: "var(--white)",
                padding: "4px",
              }}
            />
          )}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <h1
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "2rem",
                  fontWeight: 400,
                }}
              >
                {s.company}
              </h1>
              <SponsorStatusBadge status={s.status} />
            </div>
            <p style={{ color: "var(--text-light)", fontSize: "1.1rem", marginTop: "0.3rem" }}>
              {s.name} &middot; {s.sponsorship_level}
            </p>
          </div>
        </div>

        {!editing && (
          <button
            onClick={startEdit}
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
            Edit
          </button>
        )}
      </div>

      {editing && form ? (
        /* Edit Mode */
        <form
          onSubmit={handleSave}
          style={{
            background: "var(--white)",
            padding: "2rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 400 }}>
              Edit Sponsor
            </h2>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={cancelEdit}
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
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div className="sponsor-form" style={{ maxWidth: "100%", margin: 0 }}>
            <SectionHeading>Contact Information</SectionHeading>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input type="text" id="name" name="name" value={form.name} onChange={handleFormChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="company">Company *</label>
                <input type="text" id="company" name="company" value={form.company} onChange={handleFormChange} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input type="email" id="email" name="email" value={form.email} onChange={handleFormChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input type="tel" id="phone" name="phone" value={form.phone} onChange={handleFormChange} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="website">Website</label>
                <input type="text" id="website" name="website" value={form.website} onChange={handleFormChange} placeholder="e.g. acme.com" />
              </div>
              <div className="form-group">
                <label htmlFor="assigned_to">Assigned To</label>
                <select id="assigned_to" name="assigned_to" value={form.assigned_to} onChange={handleFormChange}>
                  <option value="">Unassigned</option>
                  {admins.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <SectionHeading>Sponsorship Details</SectionHeading>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="sponsorship_level">Sponsorship Level *</label>
                <select id="sponsorship_level" name="sponsorship_level" value={form.sponsorship_level} onChange={handleFormChange} required>
                  <option value="">Select a level...</option>
                  {SPONSORSHIP_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="status">Status *</label>
                <select id="status" name="status" value={form.status} onChange={handleFormChange} required>
                  <option value="prospect">Prospect</option>
                  <option value="inquired">Inquired</option>
                  <option value="engaged">Engaged</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="amount_paid">Amount Paid ($)</label>
                <input type="number" id="amount_paid" name="amount_paid" value={form.amount_paid} onChange={handleFormChange} min="0" step="0.01" />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea id="message" name="message" value={form.message} onChange={handleFormChange} />
            </div>

            <SectionHeading>Notes</SectionHeading>
            <div className="form-group">
              <label htmlFor="notes">Internal Notes</label>
              <textarea id="notes" name="notes" value={form.notes} onChange={handleFormChange} rows={4} />
            </div>
          </div>
        </form>
      ) : (
        /* View Mode */
        <>
          <div
            style={{
              background: "var(--white)",
              padding: "2rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              marginBottom: "1.5rem",
            }}
          >
            <SectionHeading>Contact Information</SectionHeading>
            <DetailRow label="Name" value={s.name} />
            <DetailRow label="Company" value={s.company} />
            <DetailRow label="Email" value={s.email} />
            <DetailRow label="Phone" value={s.phone || "—"} />
            <DetailRow label="Website" value={s.website ? (
              <a href={s.website.startsWith("http") ? s.website : `https://${s.website}`} target="_blank" rel="noopener noreferrer" style={{ color: "#1565c0" }}>
                {s.website}
              </a>
            ) : "—"} />
            <DetailRow label="Assigned To" value={s.assigned_to ? (admins.find((a) => a.id === s.assigned_to)?.name || "—") : "Unassigned"} />
          </div>

          <div
            style={{
              background: "var(--white)",
              padding: "2rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              marginBottom: "1.5rem",
            }}
          >
            <SectionHeading>Sponsorship Details</SectionHeading>
            <DetailRow label="Level" value={s.sponsorship_level} />
            <DetailRow label="Status" value={<SponsorStatusBadge status={s.status} />} />
            <DetailRow
              label="Amount Paid"
              value={s.amount_paid > 0 ? `$${(s.amount_paid / 100).toLocaleString()}` : "—"}
            />
            {s.paid_at && (
              <DetailRow label="Paid At" value={new Date(s.paid_at).toLocaleString()} />
            )}
            <DetailRow label="Message" value={s.message || "—"} />
          </div>

          {s.notes && (
            <div
              style={{
                background: "var(--white)",
                padding: "2rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                marginBottom: "1.5rem",
              }}
            >
              <SectionHeading>Notes</SectionHeading>
              <p style={{ fontSize: "0.9rem", color: "var(--charcoal)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {s.notes}
              </p>
            </div>
          )}

          <div
            style={{
              background: "var(--white)",
              padding: "2rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              marginBottom: "1.5rem",
            }}
          >
            <SectionHeading>Timestamps</SectionHeading>
            <DetailRow label="Created" value={new Date(s.created_at).toLocaleString()} />
            <DetailRow label="Updated" value={new Date(s.updated_at).toLocaleString()} />
          </div>

          <div
            style={{
              background: "var(--white)",
              padding: "2rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <SectionHeading>Activity Log</SectionHeading>
            {auditLog.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {auditLog.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: "0.5rem 0",
                      borderBottom: "1px solid rgba(0,0,0,0.04)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                      <span style={{ fontWeight: 500, color: "var(--charcoal)", fontSize: "0.8rem" }}>
                        {entry.actor_email || "System"}
                      </span>
                      <span style={{ color: "var(--text-light)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                      {Object.entries(entry.changed_fields).map(([field, vals]) => (
                        <div key={field} style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
                          <span style={{ fontWeight: 500, color: "var(--charcoal)" }}>
                            {formatFieldLabel(field)}
                          </span>
                          {": "}
                          {formatAuditValue(vals.old)}
                          {" \u2192 "}
                          {formatAuditValue(vals.new)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-light)", fontSize: "0.85rem" }}>
                No changes recorded yet.
              </p>
            )}
          </div>
        </>
      )}
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
        marginTop: "0",
        paddingBottom: "0.5rem",
        borderBottom: "1px solid rgba(0,0,0,0.1)",
      }}
    >
      {children}
    </h3>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        padding: "0.6rem 0",
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      <span
        style={{
          width: "140px",
          flexShrink: 0,
          fontSize: "0.85rem",
          color: "var(--text-light)",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "0.9rem", color: "var(--charcoal)" }}>{value}</span>
    </div>
  );
}

function SponsorStatusBadge({ status }: { status: SponsorStatus }) {
  const config: Record<SponsorStatus, { label: string; bg: string; color: string }> = {
    prospect: { label: "Prospect", bg: "#ede7f6", color: "#5e35b1" },
    inquired: { label: "Inquired", bg: "#e3f2fd", color: "#1565c0" },
    engaged: { label: "Engaged", bg: "#fff3e0", color: "#e65100" },
    paid: { label: "Paid", bg: "#e8f5e9", color: "#2e7d32" },
  };

  const { label, bg, color } = config[status] || config.prospect;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.6rem",
        fontSize: "0.7rem",
        fontWeight: 600,
        textTransform: "uppercase",
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  );
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  company: "Company",
  email: "Email",
  phone: "Phone",
  website: "Website",
  sponsorship_level: "Sponsorship Level",
  message: "Message",
  status: "Status",
  amount_paid: "Amount Paid",
  notes: "Notes",
  assigned_to: "Assigned To",
};

function formatFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAuditValue(val: unknown): string {
  if (val === null || val === undefined) return "\u2014";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  const str = String(val);
  if (str.length > 60) return str.slice(0, 57) + "...";
  return str;
}
