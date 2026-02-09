"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Registration } from "@/types/database";

type Recipient = Pick<Registration, "id" | "first_name" | "last_name" | "email">;

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
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <TemplateRow
            name="Registration Confirmation"
            description="Sent automatically to the registrant after successful Stripe payment. Includes car number, vehicle info, category, and event date."
          />
          <TemplateRow
            name="Admin Notification"
            description="Sent automatically to all configured admins when a new paid registration comes in. Includes registrant name, email, vehicle, and a link to their admin detail page."
          />
          <TemplateRow
            name="Announcement"
            description="Manually sent from this page. Freeform subject and body, sent to selected paid registrants."
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

function TemplateRow({ name, description }: { name: string; description: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "1rem",
        alignItems: "baseline",
        padding: "0.5rem 0",
        borderBottom: "1px solid rgba(0,0,0,0.04)",
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
      <span style={{ fontSize: "0.85rem", color: "var(--text-light)", lineHeight: 1.5 }}>
        {description}
      </span>
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
