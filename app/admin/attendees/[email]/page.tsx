"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Registration } from "@/types/database";

type GravatarProfile = {
  hash: string;
  display_name: string;
  profile_url: string;
  avatar_url: string;
  avatar_alt_text: string;
  location: string;
  description: string;
  job_title: string;
  company: string;
  verified_accounts: { service_type: string; service_label: string; url: string }[];
};

type EditForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
};

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function AttendeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const email = decodeURIComponent(params.email as string);

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [gravatar, setGravatar] = useState<GravatarProfile | null>(null);
  const [gravatarLoading, setGravatarLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("registrations")
      .select("*")
      .ilike("email", email)
      .in("payment_status", ["paid", "comped", "pending"])
      .order("car_number", { ascending: true });
    setRegistrations(data || []);
    setLoading(false);
  }, [email]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchGravatar = async () => {
      try {
        const hash = await sha256(email);
        const res = await fetch(`https://api.gravatar.com/v3/profiles/${hash}`);
        if (res.ok) {
          const data = await res.json();
          setGravatar(data);
        } else {
          setGravatar(null);
        }
      } catch {
        setGravatar(null);
      }
      setGravatarLoading(false);
    };
    fetchGravatar();
  }, [email]);

  const startEdit = () => {
    if (registrations.length === 0) return;
    const first = registrations[0];
    setForm({
      first_name: first.first_name,
      last_name: first.last_name,
      email: first.email,
      phone: first.phone || "",
      address_street: first.address_street || "",
      address_city: first.address_city || "",
      address_state: first.address_state || "",
      address_zip: first.address_zip || "",
    });
    setSaveError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
    setSaveError(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!form) return;
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || registrations.length === 0) return;
    setSaving(true);
    setSaveError(null);

    const supabase = createClient();
    const ids = registrations.map((r) => r.id);

    const { error } = await supabase
      .from("registrations")
      .update({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || null,
        address_street: form.address_street || null,
        address_city: form.address_city || null,
        address_state: form.address_state || null,
        address_zip: form.address_zip || null,
      })
      .in("id", ids);

    setSaving(false);

    if (error) {
      setSaveError(error.message);
    } else {
      setEditing(false);
      setForm(null);
      // If email changed, redirect to new attendee URL
      if (form.email.toLowerCase() !== email.toLowerCase()) {
        router.push(`/admin/attendees/${encodeURIComponent(form.email.toLowerCase())}`);
      } else {
        await fetchData();
      }
    }
  };

  if (loading) {
    return (
      <p
        style={{
          color: "var(--text-light)",
          textAlign: "center",
          padding: "3rem",
        }}
      >
        Loading...
      </p>
    );
  }

  if (registrations.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-light)", marginBottom: "1rem" }}>
          No registrations found for this attendee.
        </p>
        <button
          onClick={() => router.push("/admin/attendees")}
          style={{
            padding: "0.6rem 1.5rem",
            background: "var(--charcoal)",
            color: "var(--white)",
            border: "none",
            fontSize: "0.8rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            cursor: "pointer",
          }}
        >
          Back to Attendees
        </button>
      </div>
    );
  }

  const first = registrations[0];
  const name = `${first.first_name} ${first.last_name}`;
  const totalPaid = registrations.reduce(
    (sum, r) => sum + (r.amount_paid || 0),
    0
  );
  const totalDonated = registrations.reduce(
    (sum, r) => sum + (r.donation_cents || 0),
    0
  );
  const checkedInCount = registrations.filter((r) => r.checked_in).length;

  return (
    <>
      {/* Back button */}
      <button
        onClick={() => router.push("/admin/attendees")}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-light)",
          fontSize: "0.85rem",
          cursor: "pointer",
          padding: "0",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Attendees
      </button>

      {/* Attendee info card */}
      <div
        style={{
          background: "var(--white)",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          padding: "1.5rem 2rem",
          marginBottom: "2rem",
        }}
      >
        {editing && form ? (
          <form onSubmit={handleSave}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h1
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.75rem",
                  fontWeight: 400,
                }}
              >
                Edit Attendee
              </h1>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={cancelEdit}
                  style={btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    ...btnPrimary,
                    opacity: saving ? 0.6 : 1,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            {saveError && (
              <div style={{
                background: "#fee",
                border: "1px solid #c00",
                color: "#c00",
                padding: "0.8rem",
                marginBottom: "1rem",
                fontSize: "0.85rem",
              }}>
                {saveError}
              </div>
            )}

            <p style={{ fontSize: "0.8rem", color: "var(--text-light)", marginBottom: "1.25rem" }}>
              Changes will apply to all {registrations.length} registration{registrations.length > 1 ? "s" : ""} for this attendee.
            </p>

            <div className="sponsor-form" style={{ maxWidth: "100%", margin: 0 }}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="first_name">First Name *</label>
                  <input type="text" id="first_name" name="first_name" value={form.first_name} onChange={handleFormChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="last_name">Last Name *</label>
                  <input type="text" id="last_name" name="last_name" value={form.last_name} onChange={handleFormChange} required />
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
              <div className="form-group">
                <label htmlFor="address_street">Street Address</label>
                <input type="text" id="address_street" name="address_street" value={form.address_street} onChange={handleFormChange} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="address_city">City</label>
                  <input type="text" id="address_city" name="address_city" value={form.address_city} onChange={handleFormChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="address_state">State</label>
                  <input type="text" id="address_state" name="address_state" value={form.address_state} onChange={handleFormChange} maxLength={2} />
                </div>
              </div>
              <div className="form-group" style={{ maxWidth: "200px" }}>
                <label htmlFor="address_zip">ZIP Code</label>
                <input type="text" id="address_zip" name="address_zip" value={form.address_zip} onChange={handleFormChange} maxLength={10} />
              </div>
            </div>
          </form>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.75rem",
                fontWeight: 400,
              }}
            >
              {name}
            </h1>
            <button onClick={startEdit} style={btnSecondary}>
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      {!editing && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: "1.5rem",
            alignItems: "start",
          }}
        >
          {/* Left column */}
          <div>
            {/* Contact Info */}
            <SidebarCard title="Contact">
              <InfoItem label="Email" value={email} />
              <InfoItem label="Phone" value={first.phone || "\u2014"} />
              <InfoItem label="Address" value={
                [first.address_street, [first.address_city, first.address_state].filter(Boolean).join(", "), first.address_zip].filter(Boolean).join(", ") || "\u2014"
              } />
            </SidebarCard>

            {/* Gravatar profile */}
            {!gravatarLoading && gravatar && (
              <SidebarCard title="Profile">
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  {gravatar.avatar_url && (
                    <img src={gravatar.avatar_url} alt={gravatar.display_name} style={{ width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  )}
                  <div>
                    {gravatar.display_name && <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>{gravatar.display_name}</p>}
                    {(gravatar.job_title || gravatar.company) && (
                      <p style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
                        {gravatar.job_title}{gravatar.job_title && gravatar.company && " at "}{gravatar.company}
                      </p>
                    )}
                  </div>
                </div>
              </SidebarCard>
            )}

            {/* Vehicles */}
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.25rem",
                fontWeight: 400,
                paddingBottom: "0.5rem",
                borderBottom: "1px solid rgba(0,0,0,0.1)",
                marginBottom: "1.25rem",
              }}
            >
              Vehicles ({registrations.length})
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {registrations.map((reg) => (
                <div
                  key={reg.id}
                  style={{
                    background: "var(--white)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    overflow: "hidden",
                  }}
                >
                  {reg.ai_image_url ? (
                    <img
                      src={reg.ai_image_url}
                      alt={`${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`}
                      style={{ width: "100%", height: "180px", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "180px", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-light)", fontSize: "0.8rem" }}>
                      No image
                    </div>
                  )}
                  <div style={{ padding: "1rem 1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.3rem" }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem" }}>
                        <span style={{ color: "var(--gold)" }}>#{reg.car_number}</span>{" "}
                        {reg.vehicle_year} {reg.vehicle_make} {reg.vehicle_model}
                        {reg.vehicle_color ? ` \u2014 ${reg.vehicle_color}` : ""}
                      </span>
                      <PaymentBadge status={reg.payment_status} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <span style={{
                        display: "inline-block", padding: "0.2rem 0.6rem", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase",
                        background: reg.checked_in ? "#e8f5e9" : "#f5f5f5", color: reg.checked_in ? "#2e7d32" : "#616161",
                      }}>
                        {reg.checked_in ? "Checked In" : "Not Checked In"}
                      </span>
                    </div>
                    <Link
                      href={`/admin/registrations/${reg.id}`}
                      style={{ fontSize: "0.8rem", color: "var(--gold)", textDecoration: "none", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}
                    >
                      View Details &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Financials */}
            <SidebarCard title="Financials">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <FinancialRow label="Registration Fees" value={`$${(totalPaid / 100).toLocaleString()}`} />
                <FinancialRow label="Donations" value={totalDonated > 0 ? `$${(totalDonated / 100).toLocaleString()}` : "$0"} />
                <div style={{ borderTop: "2px solid #ddd", paddingTop: "0.5rem", marginTop: "0.25rem" }}>
                  <FinancialRow label="Total" value={`$${((totalPaid + totalDonated) / 100).toLocaleString()}`} bold />
                </div>
              </div>
            </SidebarCard>

            {/* Check-In Status */}
            <SidebarCard title="Check-In">
              <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: checkedInCount === registrations.length ? "#2e7d32" : "var(--charcoal)" }}>
                  {checkedInCount}/{registrations.length}
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
                  {checkedInCount === registrations.length ? "All checked in" : "vehicles checked in"}
                </p>
              </div>
            </SidebarCard>

            {/* Map */}
            {(first.address_street || first.address_city) && (() => {
              const addressParts = [first.address_street, first.address_city, first.address_state, first.address_zip].filter(Boolean).join(", ");
              const mapQuery = encodeURIComponent(addressParts);
              return (
                <SidebarCard title="Location">
                  <iframe
                    src={`https://maps.google.com/maps?q=${mapQuery}&output=embed&z=13`}
                    style={{ width: "100%", height: "200px", border: "none" }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Attendee location"
                  />
                </SidebarCard>
              );
            })()}
          </div>
        </div>
      )}

      {/* Responsive mobile override */}
      <style>{`
        @media (max-width: 899px) {
          [style*="grid-template-columns: 1fr 340px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--white)",
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        marginBottom: "1.5rem",
      }}
    >
      <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid #eee" }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", margin: 0 }}>
          {title}
        </h3>
      </div>
      <div style={{ padding: "1rem 1.25rem" }}>{children}</div>
    </div>
  );
}

function FinancialRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "0.85rem", color: bold ? "var(--charcoal)" : "var(--text-light)", fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: bold ? "1.1rem" : "0.9rem", fontWeight: bold ? 700 : 500, color: "var(--charcoal)", fontFamily: bold ? "'Playfair Display', serif" : "inherit" }}>{value}</span>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        style={{
          fontSize: "0.7rem",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--text-light)",
          marginBottom: "0.2rem",
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: "0.95rem", color: "var(--charcoal)" }}>{value}</p>
    </div>
  );
}

function PaymentBadge({
  status,
}: {
  status: Registration["payment_status"];
}) {
  const config: Record<
    string,
    { label: string; bg: string; color: string }
  > = {
    paid: { label: "Paid", bg: "#e8f5e9", color: "#2e7d32" },
    comped: { label: "Comped", bg: "#ede7f6", color: "#5e35b1" },
    pending: { label: "Unpaid", bg: "#fff3e0", color: "#e65100" },
    refunded: { label: "Refunded", bg: "#fce4ec", color: "#c62828" },
    archived: { label: "Archived", bg: "#f5f5f5", color: "#616161" },
  };
  const { label, bg, color } = config[status] || config.pending;

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

const btnPrimary: React.CSSProperties = {
  padding: "0.5rem 1.2rem",
  fontSize: "0.8rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  cursor: "pointer",
  background: "var(--gold)",
  color: "var(--charcoal)",
  border: "none",
};

const btnSecondary: React.CSSProperties = {
  padding: "0.5rem 1.2rem",
  fontSize: "0.8rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  cursor: "pointer",
  background: "var(--white)",
  color: "var(--charcoal)",
  border: "1px solid #ddd",
};
