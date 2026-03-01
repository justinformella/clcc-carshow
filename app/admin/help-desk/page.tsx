"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { HelpRequest, HelpRequestStatus, Admin } from "@/types/database";
import { HELP_REQUEST_STATUSES } from "@/types/database";

export default function HelpDeskPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [requestsRes, adminsRes] = await Promise.all([
        supabase.from("help_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("admins").select("*").order("name"),
      ]);

      setRequests((requestsRes.data as HelpRequest[]) || []);
      setAdmins((adminsRes.data as Admin[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = requests.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.subject.toLowerCase().includes(q) ||
      String(r.request_number).includes(q);

    const matchesStatus = !statusFilter || r.status === statusFilter;
    const matchesAssignee =
      !assigneeFilter ||
      (assigneeFilter === "unassigned" ? !r.assigned_to : r.assigned_to === assigneeFilter);

    return matchesSearch && matchesStatus && matchesAssignee;
  });

  if (loading) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Loading...
      </p>
    );
  }

  return (
    <>
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
          Help Desk ({filtered.length})
        </h1>
      </div>

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
          placeholder="Search name, email, subject, or #..."
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "0.6rem 1rem",
            border: "1px solid #ddd",
            fontSize: "0.9rem",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <option value="">All Status</option>
          {HELP_REQUEST_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          style={{
            padding: "0.6rem 1rem",
            border: "1px solid #ddd",
            fontSize: "0.9rem",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <option value="">All Assignees</option>
          <option value="unassigned">Unassigned</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
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
              <th style={thStyle}>#</th>
              <th style={thStyle}>Subject</th>
              <th style={thStyle}>From</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Assigned To</th>
              <th style={thStyle}>Priority</th>
              <th style={thStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                onClick={() => router.push(`/admin/help-desk/${r.id}`)}
                style={{
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                <td style={tdStyle}>{r.request_number}</td>
                <td style={{ ...tdStyle, maxWidth: "250px" }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.subject}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div>{r.name}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-light)" }}>{r.email}</div>
                </td>
                <td style={tdStyle}>
                  <StatusBadge status={r.status} />
                </td>
                <td style={tdStyle}>
                  {r.assigned_to ? (admins.find((a) => a.id === r.assigned_to)?.name || "\u2014") : "\u2014"}
                </td>
                <td style={tdStyle}>
                  <PriorityBadge priority={r.priority} />
                </td>
                <td style={tdStyle}>
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    color: "var(--text-light)",
                  }}
                >
                  No requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

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

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "high") {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "0.2rem 0.6rem",
          fontSize: "0.7rem",
          fontWeight: 600,
          textTransform: "uppercase",
          background: "#ffebee",
          color: "#c62828",
        }}
      >
        High
      </span>
    );
  }
  if (priority === "low") {
    return (
      <span style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>Low</span>
    );
  }
  return <span style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>Normal</span>;
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
