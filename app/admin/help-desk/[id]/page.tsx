"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type {
  HelpRequest,
  HelpRequestMessage,
  HelpRequestAuditLogEntry,
  HelpRequestStatus,
  HelpRequestPriority,
  Admin,
} from "@/types/database";
import {
  HELP_REQUEST_STATUSES,
  HELP_REQUEST_PRIORITIES,
} from "@/types/database";

export default function HelpRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [request, setRequest] = useState<HelpRequest | null>(null);
  const [messages, setMessages] = useState<HelpRequestMessage[]>([]);
  const [auditLog, setAuditLog] = useState<HelpRequestAuditLogEntry[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);

  // Reply form
  const [replyBody, setReplyBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [replyStatus, setReplyStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  // Sidebar updates
  const [updating, setUpdating] = useState(false);

  const fetchRequest = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("help_requests")
      .select("*")
      .eq("id", id)
      .single();
    setRequest(data as HelpRequest | null);
    setLoading(false);
  }, [id]);

  const fetchMessages = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("help_request_messages")
      .select("*")
      .eq("help_request_id", id)
      .order("created_at", { ascending: true });
    setMessages((data as HelpRequestMessage[]) || []);
  }, [id]);

  const fetchAuditLog = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("help_request_audit_log")
      .select("*")
      .eq("help_request_id", id)
      .order("created_at", { ascending: false });
    setAuditLog((data as HelpRequestAuditLogEntry[]) || []);
  }, [id]);

  useEffect(() => {
    const fetchAdmins = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("admins").select("*").order("name");
      setAdmins((data as Admin[]) || []);
    };

    fetchRequest();
    fetchMessages();
    fetchAuditLog();
    fetchAdmins();
  }, [fetchRequest, fetchMessages, fetchAuditLog]);

  const getAuthToken = async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSending(true);

    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/help-requests/${id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: replyBody,
          is_internal: isInternal,
          status: replyStatus || undefined,
        }),
      });

      if (res.ok) {
        setReplyBody("");
        setIsInternal(false);
        setReplyStatus("");
        await Promise.all([fetchMessages(), fetchRequest(), fetchAuditLog()]);
      }
    } catch (err) {
      console.error("Reply error:", err);
    } finally {
      setSending(false);
    }
  };

  const handleFieldUpdate = async (field: string, value: string) => {
    setUpdating(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/help-requests/${id}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (res.ok) {
        await Promise.all([fetchRequest(), fetchAuditLog()]);
      }
    } catch (err) {
      console.error("Update error:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const res = await fetch(`/api/help-requests/${id}/suggest`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.suggestion) {
        setReplyBody(data.suggestion);
      }
    } catch (err) {
      console.error("Suggest error:", err);
    } finally {
      setSuggesting(false);
    }
  };

  if (loading) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Loading...
      </p>
    );
  }

  if (!request) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Request not found
      </p>
    );
  }

  return (
    <>
      {/* Back link */}
      <button
        onClick={() => router.push("/admin/help-desk")}
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
        &larr; Back to Help Desk
      </button>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.75rem",
            fontWeight: 400,
          }}
        >
          #{request.request_number}: {request.subject}
        </h1>
        <StatusBadge status={request.status} />
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {/* Left column — Conversation thread */}
        <div>
          <div
            style={{
              background: "var(--white)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #eee" }}>
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.15rem",
                  margin: 0,
                }}
              >
                Conversation
              </h3>
            </div>

            <div style={{ padding: "1rem 1.5rem" }}>
              {messages.length === 0 ? (
                <p style={{ color: "var(--text-light)", fontSize: "0.85rem" }}>
                  No messages yet.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        padding: "1rem",
                        background: msg.is_internal
                          ? "#fffde7"
                          : msg.sender_type === "admin"
                          ? "#f5f5f5"
                          : "var(--white)",
                        border: msg.is_internal
                          ? "1px solid #fff9c4"
                          : "1px solid #eee",
                        borderRadius: "4px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--charcoal)" }}>
                            {msg.sender_name}
                          </span>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.1rem 0.4rem",
                              fontSize: "0.65rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              background: msg.sender_type === "admin" ? "#e3f2fd" : "#e8f5e9",
                              color: msg.sender_type === "admin" ? "#1565c0" : "#2e7d32",
                            }}
                          >
                            {msg.sender_type}
                          </span>
                          {msg.is_internal && (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "0.1rem 0.4rem",
                                fontSize: "0.65rem",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                background: "#fff9c4",
                                color: "#f57f17",
                              }}
                            >
                              Internal Note
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--charcoal)",
                          lineHeight: 1.6,
                          margin: 0,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {msg.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reply form */}
            <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #eee" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
                <button
                  type="button"
                  onClick={handleSuggest}
                  disabled={suggesting}
                  style={{
                    padding: "0.4rem 1rem",
                    background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                    border: "none",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    cursor: suggesting ? "not-allowed" : "pointer",
                    color: "#fff",
                    opacity: suggesting ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M10 2L10.0001 2C10 5.31371 12.6863 8 16 8C12.6863 8 10 10.6863 10 14C10 10.6863 7.31371 8 4 8C7.31371 8 10 5.31371 10 2Z"/><path d="M18 12C18 14.2091 19.7909 16 22 16C19.7909 16 18 17.7909 18 20C18 17.7909 16.2091 16 14 16C16.2091 16 18 14.2091 18 12Z"/></svg>
                  {suggesting ? "Generating..." : "Suggest Reply"}
                </button>
              </div>
              <form onSubmit={handleReply}>
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Write a reply..."
                  rows={8}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    fontSize: "0.9rem",
                    fontFamily: "'Inter', sans-serif",
                    resize: "vertical",
                    marginBottom: "0.75rem",
                    boxSizing: "border-box",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        fontSize: "0.85rem",
                        color: "var(--text-light)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                      />
                      Internal note
                    </label>
                    <select
                      value={replyStatus}
                      onChange={(e) => setReplyStatus(e.target.value)}
                      style={{
                        padding: "0.4rem 0.75rem",
                        border: "1px solid #ddd",
                        fontSize: "0.8rem",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      <option value="">No status change</option>
                      {HELP_REQUEST_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !replyBody.trim()}
                    style={{
                      padding: "0.5rem 1.5rem",
                      background: "var(--gold)",
                      color: "var(--charcoal)",
                      border: "none",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      cursor: sending || !replyBody.trim() ? "not-allowed" : "pointer",
                      opacity: sending || !replyBody.trim() ? 0.6 : 1,
                    }}
                  >
                    {sending ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right column — Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Request Info */}
          <SidebarCard title="Request Info">
            <SidebarField label="Status">
              <select
                value={request.status}
                onChange={(e) => handleFieldUpdate("status", e.target.value)}
                disabled={updating}
                style={selectStyle}
              >
                {HELP_REQUEST_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </SidebarField>
            <SidebarField label="Priority">
              <select
                value={request.priority}
                onChange={(e) => handleFieldUpdate("priority", e.target.value)}
                disabled={updating}
                style={selectStyle}
              >
                {HELP_REQUEST_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </SidebarField>
            <SidebarField label="Assigned To">
              <select
                value={request.assigned_to || ""}
                onChange={(e) => handleFieldUpdate("assigned_to", e.target.value)}
                disabled={updating}
                style={selectStyle}
              >
                <option value="">Unassigned</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </SidebarField>
          </SidebarCard>

          {/* Submitter Info */}
          <SidebarCard title="Submitter Info">
            <SidebarField label="Name">
              <span style={{ fontSize: "0.9rem" }}>{request.name}</span>
            </SidebarField>
            <SidebarField label="Email">
              <a href={`mailto:${request.email}`} style={{ fontSize: "0.9rem", color: "#1565c0" }}>
                {request.email}
              </a>
            </SidebarField>
          </SidebarCard>

          {/* Linked Registration */}
          {request.registration_id && (
            <SidebarCard title="Linked Registration">
              <Link
                href={`/admin/registrations/${request.registration_id}`}
                style={{
                  color: "#1565c0",
                  fontSize: "0.85rem",
                  textDecoration: "underline",
                }}
              >
                View Registration
              </Link>
            </SidebarCard>
          )}

          {/* Timestamps */}
          <SidebarCard title="Timestamps">
            <SidebarField label="Created">
              <span style={{ fontSize: "0.8rem" }}>
                {new Date(request.created_at).toLocaleString()}
              </span>
            </SidebarField>
            <SidebarField label="Updated">
              <span style={{ fontSize: "0.8rem" }}>
                {new Date(request.updated_at).toLocaleString()}
              </span>
            </SidebarField>
            {request.resolved_at && (
              <SidebarField label="Resolved">
                <span style={{ fontSize: "0.8rem" }}>
                  {new Date(request.resolved_at).toLocaleString()}
                </span>
              </SidebarField>
            )}
            {request.closed_at && (
              <SidebarField label="Closed">
                <span style={{ fontSize: "0.8rem" }}>
                  {new Date(request.closed_at).toLocaleString()}
                </span>
              </SidebarField>
            )}
          </SidebarCard>

          {/* Activity Log */}
          <SidebarCard title="Activity Log">
            {auditLog.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {auditLog.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: "0.4rem 0",
                      borderBottom: "1px solid rgba(0,0,0,0.04)",
                      fontSize: "0.8rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.2rem",
                      }}
                    >
                      <span style={{ fontWeight: 500, color: "var(--charcoal)", fontSize: "0.75rem" }}>
                        {entry.actor_email || "System"}
                      </span>
                      <span style={{ color: "var(--text-light)", fontSize: "0.7rem", whiteSpace: "nowrap" }}>
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                      {Object.entries(entry.changed_fields).map(([field, vals]) => (
                        <div key={field} style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>
                          <span style={{ fontWeight: 500, color: "var(--charcoal)" }}>
                            {formatFieldLabel(field)}
                          </span>
                          {": "}
                          {formatAuditValue(vals.old, field, admins)}
                          {" \u2192 "}
                          {formatAuditValue(vals.new, field, admins)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-light)", fontSize: "0.8rem", margin: 0 }}>
                No changes recorded yet.
              </p>
            )}
          </SidebarCard>
        </div>
      </div>

      {/* Responsive override for mobile */}
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

/* ─── Helper Components ─── */

function StatusBadge({ status }: { status: HelpRequestStatus }) {
  const config: Record<HelpRequestStatus, { label: string; bg: string; color: string }> = {
    open: { label: "Open", bg: "#e3f2fd", color: "#1565c0" },
    in_progress: { label: "In Progress", bg: "#fff3e0", color: "#e65100" },
    waiting_on_submitter: { label: "Waiting", bg: "#f3e5f5", color: "#7b1fa2" },
    resolved: { label: "Resolved", bg: "#e8f5e9", color: "#2e7d32" },
    closed: { label: "Closed", bg: "#f5f5f5", color: "#616161" },
  };

  const { label, bg, color } = config[status] || config.open;

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

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--white)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      <div
        style={{
          padding: "0.75rem 1.25rem",
          borderBottom: "1px solid #eee",
        }}
      >
        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1rem",
            margin: 0,
          }}
        >
          {title}
        </h3>
      </div>
      <div style={{ padding: "1rem 1.25rem" }}>{children}</div>
    </div>
  );
}

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.4rem 0",
        borderBottom: "1px solid #f5f5f5",
      }}
    >
      <span style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>{label}</span>
      {children}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "0.3rem 0.5rem",
  border: "1px solid #ddd",
  fontSize: "0.8rem",
  fontFamily: "'Inter', sans-serif",
  maxWidth: "160px",
};

const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  priority: "Priority",
  category: "Category",
  assigned_to: "Assigned To",
  subject: "Subject",
  internal_notes: "Internal Notes",
};

function formatFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAuditValue(val: unknown, field: string, admins: Admin[]): string {
  if (val === null || val === undefined) return "\u2014";
  if (field === "assigned_to") {
    const admin = admins.find((a) => a.id === val);
    return admin?.name || "\u2014";
  }
  const str = String(val);
  if (str.length > 40) return str.slice(0, 37) + "...";
  return str;
}
