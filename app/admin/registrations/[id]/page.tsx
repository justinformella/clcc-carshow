"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Registration, EmailLog } from "@/types/database";
import { AWARD_CATEGORIES } from "@/types/database";
import Placard from "@/components/Placard";

type EditForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  hometown: string;
  vehicle_year: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  engine_specs: string;
  modifications: string;
  story: string;
  preferred_category: string;
};

export default function RegistrationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailLog, setEmailLog] = useState<EmailLog[]>([]);

  const fetchRegistration = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", id)
      .single();

    setRegistration(data);
    setLoading(false);
  }, [id]);

  const fetchEmailLog = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("email_log")
      .select("*")
      .eq("registration_id", id)
      .order("sent_at", { ascending: false });
    setEmailLog(data || []);
  }, [id]);

  useEffect(() => {
    fetchRegistration();
    fetchEmailLog();
  }, [fetchRegistration, fetchEmailLog]);

  const handleCheckIn = async () => {
    if (!registration) return;
    const supabase = createClient();
    const newCheckedIn = !registration.checked_in;

    const { error } = await supabase
      .from("registrations")
      .update({
        checked_in: newCheckedIn,
        checked_in_at: newCheckedIn ? new Date().toISOString() : null,
      })
      .eq("id", registration.id);

    if (!error) {
      setRegistration({
        ...registration,
        checked_in: newCheckedIn,
        checked_in_at: newCheckedIn ? new Date().toISOString() : null,
      });
    }
  };

  const handleResendConfirmation = async () => {
    if (!registration) return;
    setSendingEmail(true);

    try {
      const res = await fetch("/api/email/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: registration.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to send email");
      } else {
        alert("Confirmation email sent!");
        await fetchEmailLog();
      }
    } catch {
      alert("Failed to send email.");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleArchive = async () => {
    if (!registration) return;
    if (!confirm("Are you sure you want to archive this registration? It will be hidden from the default list.")) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("registrations")
      .update({ payment_status: "archived" })
      .eq("id", registration.id);

    if (!error) {
      router.push("/admin/registrations");
    }
  };

  const startEdit = () => {
    if (!registration) return;
    setForm({
      first_name: registration.first_name,
      last_name: registration.last_name,
      email: registration.email,
      phone: registration.phone || "",
      hometown: registration.hometown || "",
      vehicle_year: String(registration.vehicle_year),
      vehicle_make: registration.vehicle_make,
      vehicle_model: registration.vehicle_model,
      vehicle_color: registration.vehicle_color || "",
      engine_specs: registration.engine_specs || "",
      modifications: registration.modifications || "",
      story: registration.story || "",
      preferred_category: registration.preferred_category,
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
    if (!form || !registration) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("registrations")
      .update({
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
      })
      .eq("id", registration.id);

    setSaving(false);

    if (!error) {
      setEditing(false);
      setForm(null);
      await fetchRegistration();
    }
  };

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 100);
  };

  const handleGenerateImage = async () => {
    if (!registration) return;
    setGeneratingImage(true);
    setImageError(null);

    try {
      const res = await fetch("/api/generate-car-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: registration.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Image generation failed");
      }

      setRegistration({ ...registration, ai_image_url: data.imageUrl });
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setGeneratingImage(false);
    }
  };

  if (loading) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Loading...
      </p>
    );
  }

  if (!registration) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Registration not found
      </p>
    );
  }

  // Print mode: only show the placard
  if (printing) {
    return (
      <div className="print-only">
        <Placard registration={registration} />
      </div>
    );
  }

  const r = registration;

  return (
    <div className="no-print">
      {/* Back link */}
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
              <span style={{ color: "var(--gold)" }}>#{r.car_number}</span>{" "}
              {r.first_name} {r.last_name}
            </h1>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {r.payment_status === "archived" ? (
                <StatusBadge label="Archived" bg="#f5f5f5" textColor="#616161" />
              ) : r.payment_status === "pending" ? (
                <StatusBadge label="Unpaid" bg="#fff3e0" textColor="#e65100" />
              ) : r.checked_in ? (
                <StatusBadge label="Checked In" bg="#e8f5e9" textColor="#2e7d32" />
              ) : (
                <StatusBadge label="Paid" bg="#e3f2fd" textColor="#1565c0" />
              )}
            </div>
          </div>
          <p style={{ color: "var(--text-light)", fontSize: "1.1rem", marginTop: "0.3rem" }}>
            {r.vehicle_year} {r.vehicle_make} {r.vehicle_model}
          </p>
        </div>

        {/* Action buttons */}
        {!editing && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <ActionButton
              label={r.checked_in ? "Undo Check-In" : "Check In"}
              onClick={handleCheckIn}
              variant={r.checked_in ? "secondary" : "primary"}
            />
            <ActionButton
              label={
                generatingImage
                  ? "Generating..."
                  : r.ai_image_url
                  ? "Regenerate Image"
                  : "Generate Image"
              }
              onClick={handleGenerateImage}
              variant="secondary"
              disabled={generatingImage}
            />
            <ActionButton
              label={sendingEmail ? "Sending..." : "Resend Confirmation"}
              onClick={handleResendConfirmation}
              variant="secondary"
              disabled={sendingEmail}
            />
            <ActionButton label="Print Placard" onClick={handlePrint} variant="secondary" />
            <ActionButton label="Edit" onClick={startEdit} variant="secondary" />
            <ActionButton label="Archive" onClick={handleArchive} variant="danger" />
          </div>
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
              Edit Registration
            </h2>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <ActionButton label="Cancel" onClick={cancelEdit} variant="secondary" type="button" />
              <ActionButton label={saving ? "Saving..." : "Save"} onClick={() => {}} variant="primary" type="submit" disabled={saving} />
            </div>
          </div>

          <div className="sponsor-form" style={{ maxWidth: "100%", margin: 0 }}>
            {/* Owner Information */}
            <SectionHeading>Owner Information</SectionHeading>
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
              <label htmlFor="hometown">Hometown</label>
              <input type="text" id="hometown" name="hometown" value={form.hometown} onChange={handleFormChange} />
            </div>

            {/* Vehicle Information */}
            <SectionHeading>Vehicle Information</SectionHeading>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="vehicle_year">Year *</label>
                <input type="number" id="vehicle_year" name="vehicle_year" value={form.vehicle_year} onChange={handleFormChange} min="1900" max="2027" required />
              </div>
              <div className="form-group">
                <label htmlFor="vehicle_make">Make *</label>
                <input type="text" id="vehicle_make" name="vehicle_make" value={form.vehicle_make} onChange={handleFormChange} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="vehicle_model">Model *</label>
                <input type="text" id="vehicle_model" name="vehicle_model" value={form.vehicle_model} onChange={handleFormChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="vehicle_color">Color</label>
                <input type="text" id="vehicle_color" name="vehicle_color" value={form.vehicle_color} onChange={handleFormChange} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="engine_specs">Engine Specs</label>
              <input type="text" id="engine_specs" name="engine_specs" value={form.engine_specs} onChange={handleFormChange} />
            </div>
            <div className="form-group">
              <label htmlFor="modifications">Modifications</label>
              <textarea id="modifications" name="modifications" value={form.modifications} onChange={handleFormChange} />
            </div>
            <div className="form-group">
              <label htmlFor="story">Car&apos;s Story</label>
              <textarea id="story" name="story" value={form.story} onChange={handleFormChange} />
            </div>

            {/* Event Info */}
            <SectionHeading>Event Information</SectionHeading>
            <div className="form-group">
              <label htmlFor="preferred_category">Preferred Award Category *</label>
              <select id="preferred_category" name="preferred_category" value={form.preferred_category} onChange={handleFormChange} required>
                <option value="">Select a category...</option>
                {AWARD_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      ) : (
        /* View Mode — Two-column layout */
        <>
          {imageError && (
            <p style={{ color: "#c00", fontSize: "0.85rem", marginBottom: "1rem" }}>
              {imageError}
            </p>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 320px",
              gap: "1.5rem",
              alignItems: "start",
            }}
            className="detail-grid"
          >
            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <DetailSection title="Owner Information">
                <DetailRow label="Name" value={`${r.first_name} ${r.last_name}`} />
                <DetailRow label="Email" value={r.email} />
                <DetailRow label="Phone" value={r.phone || "—"} />
                <DetailRow label="Hometown" value={r.hometown || "—"} />
              </DetailSection>

              <DetailSection title="Vehicle Details">
                <DetailRow label="Year" value={String(r.vehicle_year)} />
                <DetailRow label="Make" value={r.vehicle_make} />
                <DetailRow label="Model" value={r.vehicle_model} />
                <DetailRow label="Color" value={r.vehicle_color || "—"} />
                <DetailRow label="Engine Specs" value={r.engine_specs || "—"} />
              </DetailSection>

              <DetailSection title="Story & Modifications">
                {r.modifications ? (
                  <div style={{ fontSize: "0.9rem", color: "var(--charcoal)", lineHeight: 1.6 }}>
                    <span style={{ color: "var(--text-light)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.4rem" }}>
                      Modifications
                    </span>
                    {r.modifications}
                  </div>
                ) : (
                  <p style={{ color: "var(--text-light)", fontSize: "0.85rem" }}>No modifications listed.</p>
                )}
                {r.story ? (
                  <div style={{ fontSize: "0.9rem", color: "var(--charcoal)", lineHeight: 1.6, marginTop: "1rem" }}>
                    <span style={{ color: "var(--text-light)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.4rem" }}>
                      Story
                    </span>
                    {r.story}
                  </div>
                ) : (
                  <p style={{ color: "var(--text-light)", fontSize: "0.85rem", marginTop: "1rem" }}>No story provided.</p>
                )}
              </DetailSection>

              <DetailSection title="Payment">
                <DetailRow label="Status" value={r.payment_status} />
                <DetailRow label="Amount Paid" value={`$${(r.amount_paid / 100).toFixed(2)}`} />
                <DetailRow label="Session ID" value={r.stripe_session_id || "—"} />
                <DetailRow label="Payment Intent" value={r.stripe_payment_intent_id || "—"} />
              </DetailSection>

              <DetailSection title="Email History">
                {emailLog.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {emailLog.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.4rem 0",
                          borderBottom: "1px solid rgba(0,0,0,0.04)",
                          fontSize: "0.85rem",
                        }}
                      >
                        <div>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.15rem 0.5rem",
                              fontSize: "0.65rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              background: log.email_type === "confirmation" ? "#e8f5e9" : log.email_type === "admin_notification" ? "#e3f2fd" : "#fff3e0",
                              color: log.email_type === "confirmation" ? "#2e7d32" : log.email_type === "admin_notification" ? "#1565c0" : "#e65100",
                              marginRight: "0.5rem",
                            }}
                          >
                            {log.email_type.replace("_", " ")}
                          </span>
                          <span style={{ color: "var(--text-light)", fontSize: "0.8rem" }}>
                            {log.recipient_email}
                          </span>
                        </div>
                        <span style={{ color: "var(--text-light)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                          {new Date(log.sent_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--text-light)", fontSize: "0.85rem" }}>
                    No emails sent yet.
                  </p>
                )}
              </DetailSection>
            </div>

            {/* Right column (sticky sidebar) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", position: "sticky", top: "1.5rem" }} className="detail-sidebar">
              {/* Image card */}
              <div
                style={{
                  background: "var(--white)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  overflow: "hidden",
                }}
              >
                {generatingImage ? (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "3rem 1.5rem",
                    color: "var(--text-light)",
                    fontSize: "0.85rem",
                    textAlign: "center",
                  }}>
                    Generating image of this {r.vehicle_year} {r.vehicle_make} {r.vehicle_model}...
                  </div>
                ) : r.ai_image_url ? (
                  <img
                    src={r.ai_image_url}
                    alt={`AI generated ${r.vehicle_year} ${r.vehicle_make} ${r.vehicle_model}`}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                ) : (
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "3rem 1.5rem",
                    gap: "1rem",
                    color: "var(--text-light)",
                    fontSize: "0.85rem",
                  }}>
                    <span>No image generated</span>
                    <ActionButton
                      label="Generate Image"
                      onClick={handleGenerateImage}
                      variant="primary"
                    />
                  </div>
                )}
              </div>

              {/* Quick Info card */}
              <div
                style={{
                  background: "var(--white)",
                  padding: "1.5rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <h3 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1rem",
                  fontWeight: 400,
                  marginBottom: "0.25rem",
                  paddingBottom: "0.5rem",
                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                  color: "var(--charcoal)",
                }}>
                  Quick Info
                </h3>
                <QuickInfoRow label="Car #" value={`#${r.car_number}`} />
                <QuickInfoRow label="Category" value={r.preferred_category} />
                <QuickInfoRow
                  label="Check-in"
                  value={r.checked_in ? "Checked In" : "Not Checked In"}
                  valueColor={r.checked_in ? "#2e7d32" : "#e65100"}
                />
                {r.checked_in_at && (
                  <QuickInfoRow label="" value={new Date(r.checked_in_at).toLocaleString()} small />
                )}
                <QuickInfoRow label="Registered" value={new Date(r.created_at).toLocaleString()} small />
                <QuickInfoRow label="Updated" value={new Date(r.updated_at).toLocaleString()} small />
              </div>
            </div>
          </div>

          {/* Responsive styles */}
          <style>{`
            @media (max-width: 900px) {
              .detail-grid {
                grid-template-columns: 1fr !important;
              }
              .detail-sidebar {
                order: -1;
                position: static !important;
              }
            }
          `}</style>
        </>
      )}
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

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--white)",
        padding: "1.5rem 2rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
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
          minWidth: "140px",
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

function StatusBadge({ label, bg, textColor }: { label: string; bg: string; textColor: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.6rem",
        fontSize: "0.7rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        background: bg,
        color: textColor,
      }}
    >
      {label}
    </span>
  );
}

function QuickInfoRow({
  label,
  value,
  valueColor,
  small,
}: {
  label: string;
  value: string;
  valueColor?: string;
  small?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: small ? "0.8rem" : "0.85rem" }}>
      {label && (
        <span style={{ color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "0.75rem" }}>
          {label}
        </span>
      )}
      <span style={{ color: valueColor || "var(--charcoal)", fontWeight: small ? 400 : 500, marginLeft: label ? 0 : "auto" }}>
        {value}
      </span>
    </div>
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
    primary: {
      background: "var(--gold)",
      color: "var(--charcoal)",
    },
    secondary: {
      background: "var(--white)",
      color: "var(--charcoal)",
      border: "1px solid #ddd",
    },
    danger: {
      background: "#fff",
      color: "#c00",
      border: "1px solid #c00",
    },
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
