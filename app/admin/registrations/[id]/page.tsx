"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Registration, EmailLog, AuditLogEntry, StripePaymentDetails } from "@/types/database";
import { AWARD_CATEGORIES } from "@/types/database";
import { openPlacardPrintWindow } from "@/lib/placard-print";

type EditForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  hide_owner_details: boolean;
  vehicle_year: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  story: string;
  award_category: string;
  payment_status: string;
};

export default function RegistrationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailLog, setEmailLog] = useState<EmailLog[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stripeDetails, setStripeDetails] = useState<StripePaymentDetails | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showContact, setShowContact] = useState(false);
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [siblingRegs, setSiblingRegs] = useState<Registration[]>([]);
  const [vehicleSpec, setVehicleSpec] = useState<Record<string, string | number | null> | null>(null);

  const fetchRegistration = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", id)
      .single();

    setRegistration(data);

    // Fetch sibling registrations from the same checkout
    if (data?.stripe_session_id) {
      const { data: siblings } = await supabase
        .from("registrations")
        .select("*")
        .eq("stripe_session_id", data.stripe_session_id)
        .neq("id", id)
        .order("car_number", { ascending: true });
      setSiblingRegs(siblings || []);
    } else {
      setSiblingRegs([]);
    }

    // Fetch vehicle specs
    const { data: specData } = await supabase
      .from("vehicle_specs")
      .select("*")
      .eq("registration_id", id)
      .maybeSingle();
    setVehicleSpec(specData);

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

  const fetchAuditLog = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("registration_audit_log")
      .select("*")
      .eq("registration_id", id)
      .order("created_at", { ascending: false });
    setAuditLog(data || []);
  }, [id]);

  const fetchStripeDetails = useCallback(async (opts: { paymentIntentId?: string; sessionId?: string }) => {
    setStripeLoading(true);
    setStripeError(null);
    try {
      const params = new URLSearchParams();
      if (opts.paymentIntentId) params.set("payment_intent_id", opts.paymentIntentId);
      else if (opts.sessionId) params.set("session_id", opts.sessionId);
      const res = await fetch(`/api/admin/stripe-details?${params}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch Stripe details");
      }
      setStripeDetails(data);
    } catch (err) {
      setStripeError(err instanceof Error ? err.message : "Failed to load payment details");
    } finally {
      setStripeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistration();
    fetchEmailLog();
    fetchAuditLog();
  }, [fetchRegistration, fetchEmailLog, fetchAuditLog]);

  useEffect(() => {
    if (registration?.stripe_payment_intent_id) {
      fetchStripeDetails({ paymentIntentId: registration.stripe_payment_intent_id });
    } else if (registration?.stripe_session_id) {
      fetchStripeDetails({ sessionId: registration.stripe_session_id });
    }
  }, [registration?.stripe_payment_intent_id, registration?.stripe_session_id, fetchStripeDetails]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

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
      fetchAuditLog();
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
    setMenuOpen(false);
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

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration || !contactSubject.trim() || !contactMessage.trim()) return;
    setContactSending(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: admin } = user?.email
        ? await supabase.from("admins").select("*").ilike("email", user.email).single()
        : { data: null };

      // Create help desk ticket via service client
      const res = await fetch("/api/help-requests/create-from-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: registration.id,
          name: `${registration.first_name} ${registration.last_name}`,
          email: registration.email,
          subject: contactSubject,
          message: contactMessage,
          admin_name: admin?.name || "Admin",
          admin_email: admin?.email || user?.email || "",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowContact(false);
        setContactSubject("");
        setContactMessage("");
        router.push(`/admin/help-desk/${data.help_request_id}`);
      }
    } catch (err) {
      console.error("Contact error:", err);
    } finally {
      setContactSending(false);
    }
  };

  const startEdit = () => {
    if (!registration) return;
    setForm({
      first_name: registration.first_name,
      last_name: registration.last_name,
      email: registration.email,
      phone: registration.phone || "",
      address_street: registration.address_street || "",
      address_city: registration.address_city || "",
      address_state: registration.address_state || "",
      address_zip: registration.address_zip || "",
      hide_owner_details: registration.hide_owner_details,
      vehicle_year: String(registration.vehicle_year),
      vehicle_make: registration.vehicle_make,
      vehicle_model: registration.vehicle_model,
      vehicle_color: registration.vehicle_color || "",
      story: registration.story || "",
      award_category: registration.award_category || "",
      payment_status: registration.payment_status,
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

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !registration) return;
    setSaving(true);
    setSaveError(null);

    const supabase = createClient();
    const awardValue = form.award_category || null;

    // Uniqueness pre-check: if assigning an award, verify no other reg has it
    if (awardValue) {
      const { data: existing } = await supabase
        .from("registrations")
        .select("id, first_name, last_name, car_number")
        .eq("award_category", awardValue)
        .neq("id", registration.id)
        .maybeSingle();

      if (existing) {
        setSaving(false);
        setSaveError(
          `"${awardValue}" is already assigned to #${existing.car_number} ${existing.first_name} ${existing.last_name}. Remove it from that registration first.`
        );
        return;
      }
    }

    // Determine paid_at value based on payment status transition
    const wasPaid = registration.payment_status === "paid" || registration.payment_status === "comped";
    const nowPaid = form.payment_status === "paid" || form.payment_status === "comped";
    let paidAtUpdate: Record<string, string | null> = {};
    if (nowPaid && !wasPaid) {
      paidAtUpdate = { paid_at: new Date().toISOString() };
    } else if (!nowPaid) {
      paidAtUpdate = { paid_at: null };
    }

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
        hide_owner_details: form.hide_owner_details,
        vehicle_year: parseInt(form.vehicle_year),
        vehicle_make: form.vehicle_make,
        vehicle_model: form.vehicle_model,
        vehicle_color: form.vehicle_color || null,
        story: form.story || null,
        award_category: awardValue,
        payment_status: form.payment_status,
        ...paidAtUpdate,
      })
      .eq("id", registration.id);

    setSaving(false);

    if (error) {
      setSaveError(error.message);
    } else {
      setEditing(false);
      setForm(null);
      await fetchRegistration();
      fetchAuditLog();
    }
  };

  const handlePrint = () => {
    if (!registration) return;
    openPlacardPrintWindow([registration]);
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
              {r.hide_owner_details && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9e9e9e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "0.5rem", verticalAlign: "middle", display: "inline" }}>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </h1>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {r.payment_status === "archived" ? (
                <StatusBadge label="Archived" bg="#f5f5f5" textColor="#616161" />
              ) : r.payment_status === "refunded" ? (
                <StatusBadge label="Refunded" bg="#fce4ec" textColor="#b71c1c" />
              ) : r.payment_status === "comped" ? (
                <StatusBadge label="Comped" bg="#ede7f6" textColor="#5e35b1" />
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
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "stretch" }}>
            <ActionButton
              label={r.checked_in ? "Undo Check-In" : "Check In"}
              onClick={handleCheckIn}
              variant={r.checked_in ? "secondary" : "primary"}
            />
            <ActionButton label="Edit" onClick={startEdit} variant="secondary" />
            {/* More dropdown */}
            <div ref={menuRef} style={{ position: "relative", display: "flex" }}>
              <button
                onClick={() => { setMenuOpen(!menuOpen); }}
                style={{
                  padding: "0 0.9rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  cursor: "pointer",
                  background: menuOpen ? "#f0f0f0" : "var(--white)",
                  color: "var(--charcoal)",
                  border: "1px solid #ddd",
                }}
                title="More actions"
              >
                ···
              </button>
              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 4px)",
                    background: "var(--white)",
                    border: "1px solid #ddd",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                    minWidth: "200px",
                    zIndex: 50,
                  }}
                >
                  <DropdownItem
                    label={
                      generatingImage
                        ? "Generating..."
                        : r.ai_image_url
                        ? "Regenerate Image"
                        : "Generate Image"
                    }
                    onClick={() => { handleGenerateImage(); setMenuOpen(false); }}
                    disabled={generatingImage}
                  />
                  <DropdownItem
                    label={sendingEmail ? "Sending..." : "Resend Confirmation"}
                    onClick={() => { handleResendConfirmation(); setMenuOpen(false); }}
                    disabled={sendingEmail}
                  />
                  <DropdownItem
                    label="Print Placard"
                    onClick={() => { handlePrint(); setMenuOpen(false); }}
                  />
                  <DropdownItem
                    label="Contact Registrant"
                    onClick={() => { setShowContact(true); setMenuOpen(false); }}
                  />
                  {/* Divider */}
                  <div style={{ borderTop: "1px solid #eee", margin: "0.25rem 0" }} />
                  {r.payment_status !== "archived" && (
                    <DropdownItem
                      label="Archive"
                      onClick={handleArchive}
                      danger
                    />
                  )}
                </div>
              )}
            </div>
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

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.9rem",
                color: "var(--charcoal)",
                cursor: "pointer",
                marginTop: "0.5rem",
              }}
            >
              <input
                type="checkbox"
                checked={form.hide_owner_details}
                onChange={(e) => setForm({ ...form, hide_owner_details: e.target.checked })}
                style={{ width: "auto", margin: 0 }}
              />
              Hide owner details from placard
            </label>

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
              <label htmlFor="story">Car&apos;s Story (optional)</label>
              <textarea id="story" name="story" value={form.story} onChange={handleFormChange} />
            </div>

            {/* Award Winner & Status */}
            <SectionHeading>Award Winner & Status</SectionHeading>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="award_category">Award Winner</label>
                <select id="award_category" name="award_category" value={form.award_category} onChange={handleFormChange}>
                  <option value="">No Award</option>
                  {AWARD_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <span style={{ fontSize: "0.75rem", color: "var(--text-light)", marginTop: "0.3rem", display: "block" }}>
                  Selecting a category designates this vehicle as the winner.
                </span>
              </div>
              <div className="form-group">
                <label htmlFor="payment_status">Payment Status</label>
                <select id="payment_status" name="payment_status" value={form.payment_status} onChange={handleFormChange}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="comped">Comped</option>
                  <option value="refunded">Refunded</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
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
                {r.hide_owner_details && (
                  <div
                    style={{
                      background: "#f3e5f5",
                      border: "1px solid #ce93d8",
                      padding: "0.75rem 1rem",
                      marginBottom: "0.5rem",
                      fontSize: "0.85rem",
                      color: "#6a1b9a",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6a1b9a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                    This registrant has requested their personal details be hidden from placards.
                  </div>
                )}
                <DetailRow label="Name" value={`${r.first_name} ${r.last_name}`} />
                <DetailRow label="Email" value={r.email} />
                <DetailRow label="Phone" value={r.phone || "—"} />
                <DetailRow label="Address" value={
                  [r.address_street, [r.address_city, r.address_state].filter(Boolean).join(", "), r.address_zip].filter(Boolean).join(", ") || "—"
                } />
                <DetailRow
                  label="Source"
                  value={
                    r.utm_source
                      ? [r.utm_source, r.utm_medium, r.utm_campaign].filter(Boolean).join(" / ")
                      : "Direct"
                  }
                />
              </DetailSection>

              {/* Map */}
              {(r.address_street || r.address_city) && (() => {
                const addressParts = [r.address_street, r.address_city, r.address_state, r.address_zip].filter(Boolean).join(", ");
                const mapQuery = encodeURIComponent(addressParts);
                return (
                  <DetailSection title="Location">
                    <iframe
                      src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${mapQuery}&zoom=11`}
                      style={{
                        width: "100%",
                        height: "250px",
                        border: "1px solid #eee",
                      }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Registrant location"
                    />
                  </DetailSection>
                );
              })()}

              <DetailSection title="Vehicle Details">
                <DetailRow label="Year" value={String(r.vehicle_year)} />
                <DetailRow label="Make" value={r.vehicle_make} />
                <DetailRow label="Model" value={r.vehicle_model} />
                <DetailRow label="Color" value={r.vehicle_color || "—"} />
              </DetailSection>

              {/* Vehicle Specs (enriched) */}
              {vehicleSpec && (
                <DetailSection title="Vehicle Intelligence">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
                    {vehicleSpec.category && <DetailRow label="Category" value={String(vehicleSpec.category)} />}
                    {vehicleSpec.body_style && <DetailRow label="Body Style" value={String(vehicleSpec.body_style)} />}
                    {vehicleSpec.country_of_origin && <DetailRow label="Origin" value={String(vehicleSpec.country_of_origin)} />}
                    {vehicleSpec.era && <DetailRow label="Era" value={String(vehicleSpec.era)} />}
                    {vehicleSpec.engine_type && <DetailRow label="Engine" value={String(vehicleSpec.engine_type)} />}
                    {vehicleSpec.cylinders != null && <DetailRow label="Cylinders" value={String(vehicleSpec.cylinders)} />}
                    {vehicleSpec.displacement_liters != null && <DetailRow label="Displacement" value={`${vehicleSpec.displacement_liters}L`} />}
                    {vehicleSpec.horsepower != null && <DetailRow label="Horsepower" value={`${vehicleSpec.horsepower} HP`} />}
                    {vehicleSpec.drive_type && <DetailRow label="Drive" value={String(vehicleSpec.drive_type)} />}
                    {vehicleSpec.weight_lbs != null && <DetailRow label="Weight" value={`${Number(vehicleSpec.weight_lbs).toLocaleString()} lbs`} />}
                    {vehicleSpec.original_msrp != null && Number(vehicleSpec.original_msrp) > 0 && <DetailRow label="Original MSRP" value={`$${Number(vehicleSpec.original_msrp).toLocaleString()}`} />}
                    {vehicleSpec.production_numbers != null && Number(vehicleSpec.production_numbers) > 0 && <DetailRow label="Production" value={`${Number(vehicleSpec.production_numbers).toLocaleString()} units`} />}
                  </div>
                  {vehicleSpec.notable_features && (
                    <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #f0f0f0" }}>
                      <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-light)", marginBottom: "0.4rem" }}>Notable Features</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                        {String(vehicleSpec.notable_features).split(",").map((f, i) => (
                          <span key={i} style={{ display: "inline-block", padding: "0.2rem 0.6rem", fontSize: "0.75rem", background: "var(--cream)", color: "var(--charcoal)", fontWeight: 500 }}>
                            {f.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </DetailSection>
              )}

              <DetailSection title="Car's Story">
                {r.story ? (
                  <div style={{ fontSize: "0.9rem", color: "var(--charcoal)", lineHeight: 1.6 }}>
                    {r.story}
                  </div>
                ) : (
                  <p style={{ color: "var(--text-light)", fontSize: "0.85rem" }}>No story provided.</p>
                )}
              </DetailSection>

              <DetailSection title="Payment">
                <DetailRow label="Status" value={r.payment_status} />
                <DetailRow label="This Registration" value={`$${(r.amount_paid / 100).toFixed(2)}`} />
                {(r.donation_cents || 0) > 0 && (
                  <DetailRow label="Donation" value={`$${(r.donation_cents / 100).toFixed(2)}`} />
                )}

                {/* Multi-vehicle checkout context */}
                {siblingRegs.length > 0 && (
                  <div
                    style={{
                      margin: "0.75rem 0",
                      padding: "0.75rem 1rem",
                      background: "var(--cream)",
                      border: "1px solid rgba(0,0,0,0.06)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <p style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-light)" }}>
                      Checkout Summary ({siblingRegs.length + 1} vehicles)
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.2rem 0" }}>
                      <span>#{r.car_number} {r.vehicle_year} {r.vehicle_make} {r.vehicle_model}</span>
                      <span>${(r.amount_paid / 100).toFixed(2)}</span>
                    </div>
                    {siblingRegs.map((s) => (
                      <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.2rem 0" }}>
                        <a href={`/admin/registrations/${s.id}`} style={{ color: "#1565c0", textDecoration: "none" }}>
                          #{s.car_number} {s.vehicle_year} {s.vehicle_make} {s.vehicle_model}
                        </a>
                        <span>${(s.amount_paid / 100).toFixed(2)}</span>
                      </div>
                    ))}
                    {(() => {
                      const totalDonation = (r.donation_cents || 0) + siblingRegs.reduce((sum, s) => sum + (s.donation_cents || 0), 0);
                      if (totalDonation > 0) {
                        return (
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "0.2rem 0" }}>
                            <span>Donation</span>
                            <span>${(totalDonation / 100).toFixed(2)}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0 0", marginTop: "0.25rem", borderTop: "1px solid rgba(0,0,0,0.1)", fontWeight: 600 }}>
                      <span>Transaction Total</span>
                      <span>
                        ${(((r.amount_paid || 0) + (r.donation_cents || 0) + siblingRegs.reduce((sum, s) => sum + (s.amount_paid || 0) + (s.donation_cents || 0), 0)) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {!r.stripe_payment_intent_id && !r.stripe_session_id ? (
                  <>
                    <DetailRow label="Session ID" value="—" />
                    <DetailRow label="Payment Intent" value="—" />
                  </>
                ) : stripeLoading ? (
                  <p style={{ color: "var(--text-light)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    Loading payment details...
                  </p>
                ) : stripeError ? (
                  <div style={{ marginTop: "0.5rem" }}>
                    <p style={{ color: "#c00", fontSize: "0.85rem" }}>{stripeError}</p>
                    <button
                      onClick={() => fetchStripeDetails(
                        r.stripe_payment_intent_id
                          ? { paymentIntentId: r.stripe_payment_intent_id }
                          : { sessionId: r.stripe_session_id! }
                      )}
                      style={{
                        marginTop: "0.4rem",
                        padding: "0.3rem 0.8rem",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        cursor: "pointer",
                        background: "var(--white)",
                        color: "var(--charcoal)",
                        border: "1px solid #ddd",
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : stripeDetails ? (
                  <>
                    {/* Card Info */}
                    {stripeDetails.card && (
                      <>
                        <DetailRow label="Card" value={formatCard(stripeDetails.card)} />
                        <DetailRow
                          label="Expires"
                          value={`${String(stripeDetails.card.exp_month).padStart(2, "0")}/${stripeDetails.card.exp_year}`}
                        />
                        {stripeDetails.card.funding && (
                          <DetailRow label="Funding" value={stripeDetails.card.funding} />
                        )}
                        {stripeDetails.card.country && (
                          <DetailRow label="Card Country" value={stripeDetails.card.country} />
                        )}
                        {stripeDetails.card.wallet && (
                          <DetailRow label="Wallet" value={stripeDetails.card.wallet} />
                        )}
                      </>
                    )}

                    {/* Paid At */}
                    {stripeDetails.payment.created && (
                      <DetailRow
                        label="Paid At"
                        value={new Date(stripeDetails.payment.created * 1000).toLocaleString()}
                      />
                    )}

                    {/* Links */}
                    {(stripeDetails.links.receipt_url || stripeDetails.links.dashboard_url) && (
                      <div style={{ display: "flex", gap: "1rem", marginTop: "0.3rem" }}>
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
                          Links
                        </span>
                        <div style={{ display: "flex", gap: "1rem", fontSize: "0.9rem" }}>
                          {stripeDetails.links.receipt_url && (
                            <a
                              href={stripeDetails.links.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#1565c0", textDecoration: "underline" }}
                            >
                              View Receipt
                            </a>
                          )}
                          {stripeDetails.links.dashboard_url && (
                            <a
                              href={stripeDetails.links.dashboard_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#1565c0", textDecoration: "underline" }}
                            >
                              View in Stripe
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Billing Details */}
                    {stripeDetails.billing && (stripeDetails.billing.name || stripeDetails.billing.address) && (
                      <>
                        <SubSectionHeading>Billing Details</SubSectionHeading>
                        {stripeDetails.billing.name && (
                          <DetailRow label="Name" value={stripeDetails.billing.name} />
                        )}
                        {stripeDetails.billing.address && (
                          <DetailRow label="Address" value={formatAddress(stripeDetails.billing.address)} />
                        )}
                      </>
                    )}

                    {/* Risk Assessment */}
                    {stripeDetails.risk && (
                      <>
                        <SubSectionHeading>Risk Assessment</SubSectionHeading>
                        {stripeDetails.risk.risk_level && (
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
                              Risk Level
                            </span>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "0.15rem 0.5rem",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                background:
                                  stripeDetails.risk.risk_level === "normal"
                                    ? "#e8f5e9"
                                    : stripeDetails.risk.risk_level === "elevated"
                                    ? "#fff3e0"
                                    : "#fce4ec",
                                color:
                                  stripeDetails.risk.risk_level === "normal"
                                    ? "#2e7d32"
                                    : stripeDetails.risk.risk_level === "elevated"
                                    ? "#e65100"
                                    : "#b71c1c",
                              }}
                            >
                              {stripeDetails.risk.risk_level}
                            </span>
                          </div>
                        )}
                        {stripeDetails.risk.risk_score != null && (
                          <DetailRow label="Risk Score" value={String(stripeDetails.risk.risk_score)} />
                        )}
                        {stripeDetails.risk.network_status && (
                          <DetailRow label="Network" value={stripeDetails.risk.network_status} />
                        )}
                      </>
                    )}

                    {/* Fees */}
                    {stripeDetails.fees && (
                      <>
                        <SubSectionHeading>Fees</SubSectionHeading>
                        <DetailRow
                          label="Stripe Fee"
                          value={`$${(stripeDetails.fees.stripe_fee / 100).toFixed(2)}`}
                        />
                        <DetailRow
                          label="Net Amount"
                          value={`$${(stripeDetails.fees.net / 100).toFixed(2)}`}
                        />
                      </>
                    )}

                    {/* Refunds */}
                    {stripeDetails.refunds.length > 0 && (
                      <>
                        <SubSectionHeading>Refunds</SubSectionHeading>
                        {stripeDetails.refunds.map((refund) => (
                          <div
                            key={refund.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "0.4rem 0",
                              borderBottom: "1px solid rgba(0,0,0,0.04)",
                              fontSize: "0.85rem",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "0.15rem 0.5rem",
                                  fontSize: "0.65rem",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.04em",
                                  background: refund.status === "succeeded" ? "#e8f5e9" : "#fff3e0",
                                  color: refund.status === "succeeded" ? "#2e7d32" : "#e65100",
                                }}
                              >
                                {refund.status}
                              </span>
                              <span>${(refund.amount / 100).toFixed(2)}</span>
                              {refund.reason && (
                                <span style={{ color: "var(--text-light)", fontSize: "0.8rem" }}>
                                  ({refund.reason.replace(/_/g, " ")})
                                </span>
                              )}
                            </div>
                            <span style={{ color: "var(--text-light)", fontSize: "0.8rem" }}>
                              {new Date(refund.created * 1000).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Dispute */}
                    {stripeDetails.dispute && (
                      <>
                        <SubSectionHeading>Dispute</SubSectionHeading>
                        <div
                          style={{
                            background: "#fce4ec",
                            padding: "0.75rem 1rem",
                            fontSize: "0.85rem",
                            color: "#b71c1c",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: "0.3rem" }}>
                            Dispute — {stripeDetails.dispute.status.replace(/_/g, " ")}
                          </div>
                          <div>Amount: ${(stripeDetails.dispute.amount / 100).toFixed(2)}</div>
                          <div>Reason: {stripeDetails.dispute.reason.replace(/_/g, " ")}</div>
                          <div>
                            Opened: {new Date(stripeDetails.dispute.created * 1000).toLocaleString()}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Stripe IDs */}
                    <SubSectionHeading>Stripe IDs</SubSectionHeading>
                    <DetailRow label="Session ID" value={r.stripe_session_id || "—"} />
                    <DetailRow label="Payment Intent" value={r.stripe_payment_intent_id || "—"} />
                    {stripeDetails.charge_id && (
                      <DetailRow label="Charge ID" value={stripeDetails.charge_id} />
                    )}
                  </>
                ) : null}
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

              <DetailSection title="Activity Log">
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
                              {" → "}
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
                {r.award_category && (
                  <div style={{
                    background: "#fffde7",
                    border: "1px solid #f9a825",
                    padding: "0.5rem 0.75rem",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f57f17", marginBottom: "0.15rem" }}>
                      Award Winner
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e65100" }}>
                      {r.award_category}
                    </div>
                  </div>
                )}
                <QuickInfoRow
                  label="Check-in"
                  value={r.checked_in ? "Checked In" : "Not Checked In"}
                  valueColor={r.checked_in ? "#2e7d32" : "#e65100"}
                />
                {r.checked_in_at && (
                  <QuickInfoRow label="" value={new Date(r.checked_in_at).toLocaleString()} small />
                )}
                {r.paid_at && (
                  <QuickInfoRow label="Paid" value={new Date(r.paid_at).toLocaleString()} small />
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

      {/* Contact Registrant Modal */}
      {showContact && (
        <>
          <div
            onClick={() => setShowContact(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 999,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "var(--white)",
              padding: "2rem",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              zIndex: 1000,
            }}
          >
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.4rem",
                fontWeight: 400,
                marginBottom: "0.5rem",
              }}
            >
              Contact {r.first_name} {r.last_name}
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "1.5rem" }}>
              Sends an email and creates a help desk ticket for tracking.
            </p>
            <form onSubmit={handleContactSubmit} className="sponsor-form" style={{ maxWidth: "100%", margin: 0 }}>
              <div className="form-group">
                <label htmlFor="contact-subject">Subject</label>
                <input
                  type="text"
                  id="contact-subject"
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  required
                  placeholder="e.g. Regarding your registration"
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  required
                  rows={6}
                  placeholder="Write your message..."
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowContact(false)}
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
                  disabled={contactSending || !contactSubject.trim() || !contactMessage.trim()}
                  style={{
                    padding: "0.6rem 1.5rem",
                    background: "var(--gold)",
                    color: "var(--charcoal)",
                    border: "none",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    cursor: contactSending ? "not-allowed" : "pointer",
                    opacity: contactSending ? 0.6 : 1,
                  }}
                >
                  {contactSending ? "Sending..." : "Send & Create Ticket"}
                </button>
              </div>
            </form>
          </div>
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

function SubSectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "0.8rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--text-light)",
        marginTop: "0.8rem",
        paddingTop: "0.6rem",
        borderTop: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {children}
    </div>
  );
}

function formatCard(card: NonNullable<StripePaymentDetails["card"]>): string {
  const brand = card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : "Card";
  const last4 = card.last4 || "****";
  const wallet = card.wallet ? ` (${card.wallet})` : "";
  return `${brand} ending in ${last4}${wallet}`;
}

function formatAddress(address: NonNullable<NonNullable<StripePaymentDetails["billing"]>["address"]>): string {
  const parts = [
    address.line1,
    address.line2,
    [address.city, address.state, address.postal_code].filter(Boolean).join(", "),
    address.country,
  ].filter(Boolean);
  return parts.join(", ") || "—";
}

function StatusBadge({ label, bg, textColor }: { label: string; bg: string; textColor: string }) {
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

const FIELD_LABELS: Record<string, string> = {
  first_name: "First Name",
  last_name: "Last Name",
  email: "Email",
  phone: "Phone",
  address_street: "Street Address",
  address_city: "City",
  address_state: "State",
  address_zip: "ZIP Code",
  vehicle_year: "Year",
  vehicle_make: "Make",
  vehicle_model: "Model",
  vehicle_color: "Color",
  story: "Story",
  award_category: "Award Winner",
  payment_status: "Payment Status",
  stripe_payment_intent_id: "Payment Intent",
  checked_in: "Checked In",
  ai_image_url: "AI Image",
  donation_cents: "Donation",
  hide_owner_details: "Hide Owner Details",
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

function DropdownItem({
  label,
  onClick,
  disabled = false,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "block",
        width: "100%",
        padding: "0.55rem 1rem",
        fontSize: "0.8rem",
        fontWeight: 400,
        textAlign: "left",
        background: "none",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        color: danger ? "#c00" : "var(--charcoal)",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = "#f5f5f5";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "none";
      }}
    >
      {label}
    </button>
  );
}
