"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { EmailLog } from "@/types/database";

const TYPE_COLORS: Record<string, { label: string; bg: string; color: string }> = {
  confirmation: { label: "Confirmation", bg: "#e8f5e9", color: "#2e7d32" },
  admin_notification: { label: "Admin Notification", bg: "#e3f2fd", color: "#1565c0" },
  announcement: { label: "Announcement", bg: "#fff3e0", color: "#e65100" },
  sponsor_notification: { label: "Sponsor Notification", bg: "#ede7f6", color: "#5e35b1" },
  help_request_confirmation: { label: "Help Confirmation", bg: "#fce4ec", color: "#c62828" },
  help_request_admin_notification: { label: "Help Admin", bg: "#e3f2fd", color: "#1565c0" },
  help_request_reply: { label: "Help Reply", bg: "#fff9c4", color: "#f57f17" },
  email_reply: { label: "Email Reply", bg: "#e0f7fa", color: "#00838f" },
};

export default function EmailLogPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("email_log")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(500);
      setLogs((data as EmailLog[]) || []);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const filtered = logs.filter((log) => {
    if (typeFilter && log.email_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !log.recipient_email.toLowerCase().includes(q) &&
        !log.subject.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const types = [...new Set(logs.map((l) => l.email_type))];

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
        Email Log ({filtered.length})
      </h1>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Search email or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: "200px",
            padding: "0.6rem 1rem",
            border: "1px solid #ddd",
            fontSize: "0.9rem",
            fontFamily: "'Inter', sans-serif",
          }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: "0.6rem 1rem",
            border: "1px solid #ddd",
            fontSize: "0.9rem",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <option value="">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {TYPE_COLORS[t]?.label || t}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--white)",
          overflow: "auto",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.85rem",
          }}
        >
          <thead>
            <tr style={{ background: "var(--cream)", textAlign: "left" }}>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Recipient</th>
              <th style={thStyle}>Subject</th>
              <th style={thStyle}>Sent At</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => {
              const typeConfig = TYPE_COLORS[log.email_type] || {
                label: log.email_type,
                bg: "#f5f5f5",
                color: "#616161",
              };
              return (
                <tr key={log.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.15rem 0.5rem",
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        background: typeConfig.bg,
                        color: typeConfig.color,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {typeConfig.label}
                    </span>
                  </td>
                  <td style={tdStyle}>{log.recipient_email}</td>
                  <td style={{ ...tdStyle, maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.subject}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap", color: "var(--text-light)" }}>
                    {new Date(log.sent_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    color: "var(--text-light)",
                    padding: "2rem",
                  }}
                >
                  {logs.length === 0
                    ? "No emails logged yet. Future emails will appear here."
                    : "No emails match your filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
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
