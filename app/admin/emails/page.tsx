"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import type { Registration } from "@/types/database";
import {
  confirmationEmail,
  adminNotificationEmail,
  announcementEmail,
} from "@/lib/email-templates";

type Recipient = Pick<Registration, "id" | "first_name" | "last_name" | "email">;

const sampleReg: Registration = {
  id: "sample",
  car_number: 42,
  first_name: "John",
  last_name: "Smith",
  email: "john@example.com",
  phone: null,
  hometown: "Crystal Lake, IL",
  vehicle_year: 1967,
  vehicle_make: "Ford",
  vehicle_model: "Mustang",
  vehicle_color: "Red",
  engine_specs: null,
  modifications: null,
  story: null,
  award_category: null,
  stripe_session_id: null,
  stripe_payment_intent_id: null,
  payment_status: "paid",
  amount_paid: 3000,
  checked_in: false,
  checked_in_at: null,
  ai_image_url: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  paid_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const sampleConfirmationHtml = confirmationEmail(sampleReg).html;
const sampleAdminHtml = adminNotificationEmail(sampleReg, "#").html;
const sampleAnnouncementHtml = announcementEmail(
  "Parking Update for May 17th",
  "We wanted to let you know about updated parking arrangements for the show. Please arrive by 8:00 AM to ensure you get your assigned spot.\n\nGates open at 7:30 AM and we'll have volunteers directing traffic. Look for the signs marked with your car number.",
  "John"
).html;

export default function EmailsPage() {
  const [registrations, setRegistrations] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);

  // Announcement form
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("registrations")
        .select("id, first_name, last_name, email")
        .eq("payment_status", "paid")
        .order("car_number", { ascending: true });
      setRegistrations(data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleToggleRecipient = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      alert("Subject and body are required.");
      return;
    }

    const recipientIds = sendToAll
      ? registrations.map((r) => r.id)
      : Array.from(selectedIds);

    if (recipientIds.length === 0) {
      alert("No recipients selected.");
      return;
    }

    const confirmMsg = `Send announcement to ${recipientIds.length} recipient${recipientIds.length === 1 ? "" : "s"}?`;
    if (!confirm(confirmMsg)) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/email/send-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim(), recipientIds }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to send");
      } else {
        setResult(data);
      }
    } catch {
      alert("Failed to send announcement.");
    } finally {
      setSending(false);
    }
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
      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "2rem",
          fontWeight: 400,
          marginBottom: "1.5rem",
        }}
      >
        Emails
      </h1>

      {/* Email Templates section */}
      <div
        style={{
          background: "var(--white)",
          padding: "1.5rem 2rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: "1.5rem",
        }}
      >
        <h2
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
          Automatic Email Templates
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          <TemplateRow
            name="Registration Confirmation"
            description="Sent automatically to the registrant after successful Stripe payment. Includes car number, vehicle info, category, and event date."
            previewHtml={sampleConfirmationHtml}
          />
          <TemplateRow
            name="Admin Notification"
            description="Sent automatically to all configured admins when a new paid registration comes in. Includes registrant name, email, vehicle, and a link to their admin detail page."
            previewHtml={sampleAdminHtml}
          />
          <TemplateRow
            name="Announcement"
            description="Manually sent from this page. Freeform subject and body, sent to selected paid registrants."
            previewHtml={sampleAnnouncementHtml}
          />
        </div>
      </div>

      {/* Send Announcement section */}
      <div
        style={{
          background: "var(--white)",
          padding: "1.5rem 2rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h2
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
          Send Announcement
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={inputStyle}
              placeholder="Event update: parking info..."
            />
          </div>
          <div>
            <label style={labelStyle}>Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="Write your announcement message here..."
            />
          </div>

          {/* Recipient selection */}
          <div>
            <label style={labelStyle}>Recipients</label>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
                <input
                  type="radio"
                  checked={sendToAll}
                  onChange={() => setSendToAll(true)}
                />
                All paid registrants ({registrations.length})
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
                <input
                  type="radio"
                  checked={!sendToAll}
                  onChange={() => setSendToAll(false)}
                />
                Select specific
              </label>
            </div>

            {!sendToAll && (
              <div
                style={{
                  maxHeight: "200px",
                  overflow: "auto",
                  border: "1px solid #ddd",
                  padding: "0.5rem",
                }}
              >
                {registrations.map((r) => (
                  <label
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.35rem 0.5rem",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => handleToggleRecipient(r.id)}
                    />
                    {r.first_name} {r.last_name} — {r.email}
                  </label>
                ))}
                {registrations.length === 0 && (
                  <p style={{ color: "var(--text-light)", fontSize: "0.85rem", padding: "0.5rem" }}>
                    No paid registrations yet.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Send button + result */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <button
              onClick={handleSend}
              disabled={sending}
              style={{
                padding: "0.6rem 1.5rem",
                background: "var(--gold)",
                color: "var(--charcoal)",
                border: "none",
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                cursor: sending ? "not-allowed" : "pointer",
                opacity: sending ? 0.6 : 1,
              }}
            >
              {sending ? "Sending..." : "Send Announcement"}
            </button>

            {result && (
              <span style={{ fontSize: "0.85rem", color: result.failed > 0 ? "#e65100" : "#2e7d32" }}>
                Sent: {result.sent}{result.failed > 0 ? `, Failed: ${result.failed}` : ""}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function TemplateRow({ name, description, previewHtml }: { name: string; description: string; previewHtml: string }) {
  const [open, setOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (open && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
      }
    }
  }, [open, previewHtml]);

  return (
    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          padding: "0.75rem 0",
        }}
      >
        <span
          style={{
            minWidth: "200px",
            fontWeight: 600,
            fontSize: "0.85rem",
            color: "var(--charcoal)",
          }}
        >
          {name}
        </span>
        <span style={{ fontSize: "0.85rem", color: "var(--text-light)", lineHeight: 1.5, flex: 1 }}>
          {description}
        </span>
        <button
          onClick={() => setOpen(!open)}
          style={{
            background: "transparent",
            border: "1px solid #ddd",
            padding: "0.3rem 0.8rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            cursor: "pointer",
            color: "var(--charcoal)",
            whiteSpace: "nowrap",
          }}
        >
          {open ? "Hide Preview" : "Preview"}
        </button>
      </div>
      {open && (
        <div style={{ padding: "0 0 1rem", display: "flex", justifyContent: "center" }}>
          <iframe
            ref={iframeRef}
            style={{
              width: "640px",
              height: "480px",
              border: "1px solid #ddd",
              background: "#f5f5f5",
            }}
            title={`${name} preview`}
          />
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-light)",
  marginBottom: "0.3rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 1rem",
  border: "1px solid #ddd",
  fontSize: "0.9rem",
  fontFamily: "'Inter', sans-serif",
  boxSizing: "border-box",
};
