"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { HelpRequest, HelpRequestStatus, HelpRequestCategory, HelpRequestPriority, HelpRequestMessage, Admin } from "@/types/database";
import { HELP_REQUEST_STATUSES, HELP_REQUEST_CATEGORIES, HELP_REQUEST_PRIORITIES } from "@/types/database";

type TicketWithLastMessage = HelpRequest & {
  lastMessage?: HelpRequestMessage;
  hasNewReply: boolean;
};

const CLOSED_STATUSES: HelpRequestStatus[] = ["resolved", "closed"];

export default function HelpDeskPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketWithLastMessage[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTicket, setNewTicket] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    category: "general" as HelpRequestCategory,
    priority: "normal" as HelpRequestPriority,
  });

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [requestsRes, adminsRes, messagesRes] = await Promise.all([
        supabase.from("help_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("admins").select("*").order("name"),
        supabase.from("help_request_messages").select("*").order("created_at", { ascending: false }),
      ]);

      const requests = (requestsRes.data as HelpRequest[]) || [];
      const messages = (messagesRes.data as HelpRequestMessage[]) || [];
      setAdmins((adminsRes.data as Admin[]) || []);

      // Get the latest message per ticket
      const lastMessageMap = new Map<string, HelpRequestMessage>();
      for (const msg of messages) {
        if (!lastMessageMap.has(msg.help_request_id)) {
          lastMessageMap.set(msg.help_request_id, msg);
        }
      }

      const enriched: TicketWithLastMessage[] = requests.map((r) => {
        const lastMsg = lastMessageMap.get(r.id);
        return {
          ...r,
          lastMessage: lastMsg,
          hasNewReply: !!lastMsg && lastMsg.sender_type === "submitter" && !CLOSED_STATUSES.includes(r.status),
        };
      });

      setTickets(enriched);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleCreateTicket = async () => {
    if (!newTicket.name || !newTicket.email || !newTicket.subject || !newTicket.message) return;
    setCreating(true);
    try {
      const supabase = createClient();
      const { data: helpRequest, error: insertError } = await supabase
        .from("help_requests")
        .insert({
          name: newTicket.name,
          email: newTicket.email,
          subject: newTicket.subject,
          category: newTicket.category,
          priority: newTicket.priority,
        })
        .select()
        .single();

      if (insertError || !helpRequest) {
        alert(`Failed to create ticket: ${insertError?.message || "Unknown error"}`);
        setCreating(false);
        return;
      }

      await supabase.from("help_request_messages").insert({
        help_request_id: helpRequest.id,
        sender_type: "submitter",
        sender_name: newTicket.name,
        sender_email: newTicket.email,
        body: newTicket.message,
      });

      router.push(`/admin/help-desk/${helpRequest.id}`);
    } catch {
      alert("Failed to create ticket.");
    } finally {
      setCreating(false);
    }
  };

  const filtered = tickets.filter((r) => {
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

  const openTickets = filtered.filter((t) => !CLOSED_STATUSES.includes(t.status));
  const closedTickets = filtered.filter((t) => CLOSED_STATUSES.includes(t.status));
  const newReplyCount = openTickets.filter((t) => t.hasNewReply).length;

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
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "2rem",
              fontWeight: 400,
            }}
          >
            Help Desk
          </h1>
          {newReplyCount > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.25rem 0.7rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                background: "#dc2626",
                color: "#fff",
                borderRadius: "12px",
              }}
            >
              {newReplyCount} new {newReplyCount === 1 ? "reply" : "replies"}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          style={{
            padding: "0.6rem 1.5rem",
            background: "var(--gold)",
            color: "var(--charcoal)",
            border: "none",
            fontSize: "0.8rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            cursor: "pointer",
          }}
        >
          + New Ticket
        </button>
      </div>

      {/* New Ticket Modal */}
      {showNewForm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewForm(false); }}
        >
          <div style={{ background: "var(--white)", width: "100%", maxWidth: "520px", padding: "2rem", boxShadow: "0 8px 30px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", fontWeight: 400 }}>New Ticket</h2>
              <button onClick={() => setShowNewForm(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-light)" }}>&times;</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Name *</label>
                  <input type="text" value={newTicket.name} onChange={(e) => setNewTicket({ ...newTicket, name: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Email *</label>
                  <input type="email" value={newTicket.email} onChange={(e) => setNewTicket({ ...newTicket, email: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Subject *</label>
                <input type="text" value={newTicket.subject} onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Category</label>
                  <select value={newTicket.category} onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value as HelpRequestCategory })} style={inputStyle}>
                    {HELP_REQUEST_CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Priority</label>
                  <select value={newTicket.priority} onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as HelpRequestPriority })} style={inputStyle}>
                    {HELP_REQUEST_PRIORITIES.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Message *</label>
                <textarea value={newTicket.message} onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button onClick={() => setShowNewForm(false)} style={{ padding: "0.6rem 1.25rem", background: "var(--white)", color: "var(--charcoal)", border: "1px solid #ddd", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleCreateTicket} disabled={creating || !newTicket.name || !newTicket.email || !newTicket.subject || !newTicket.message} style={{ padding: "0.6rem 1.25rem", background: creating ? "#ccc" : "var(--gold)", color: "var(--charcoal)", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: creating ? "wait" : "pointer", opacity: (!newTicket.name || !newTicket.email || !newTicket.subject || !newTicket.message) ? 0.5 : 1 }}>
                  {creating ? "Creating..." : "Create Ticket"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search name, email, subject, or #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: "200px", padding: "0.6rem 1rem", border: "1px solid #ddd", fontSize: "0.9rem", fontFamily: "'Inter', sans-serif" }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "0.6rem 1rem", border: "1px solid #ddd", fontSize: "0.9rem", fontFamily: "'Inter', sans-serif" }}>
          <option value="">All Status</option>
          {HELP_REQUEST_STATUSES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
        </select>
        <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} style={{ padding: "0.6rem 1rem", border: "1px solid #ddd", fontSize: "0.9rem", fontFamily: "'Inter', sans-serif" }}>
          <option value="">All Assignees</option>
          <option value="unassigned">Unassigned</option>
          {admins.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
        </select>
      </div>

      {/* Open Tickets */}
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.25rem",
          fontWeight: 400,
          paddingBottom: "0.5rem",
          borderBottom: "1px solid rgba(0,0,0,0.1)",
          marginBottom: "1rem",
        }}
      >
        Open ({openTickets.length})
      </h2>

      {openTickets.length === 0 ? (
        <p style={{ color: "var(--text-light)", fontSize: "0.85rem", marginBottom: "2.5rem", padding: "1rem 0" }}>
          No open tickets.
        </p>
      ) : (
        <div style={{ background: "var(--white)", overflow: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "2.5rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--cream)", textAlign: "left" }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Subject</th>
                <th style={thStyle}>From</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Assigned To</th>
                <th style={thStyle}>Priority</th>
                <th style={thStyle}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {openTickets.map((r) => (
                <TicketRow key={r.id} ticket={r} admins={admins} onClick={() => router.push(`/admin/help-desk/${r.id}`)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Closed Tickets */}
      {closedTickets.length > 0 && (
        <>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.25rem",
              fontWeight: 400,
              paddingBottom: "0.5rem",
              borderBottom: "1px solid rgba(0,0,0,0.1)",
              marginBottom: "1rem",
              color: "var(--text-light)",
            }}
          >
            Closed ({closedTickets.length})
          </h2>
          <div style={{ background: "var(--white)", overflow: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", opacity: 0.7 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "var(--cream)", textAlign: "left" }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Subject</th>
                  <th style={thStyle}>From</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Assigned To</th>
                  <th style={thStyle}>Date</th>
                </tr>
              </thead>
              <tbody>
                {closedTickets.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/admin/help-desk/${r.id}`)}
                    style={{ borderBottom: "1px solid #eee", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td style={tdStyle}>{r.request_number}</td>
                    <td style={{ ...tdStyle, maxWidth: "250px" }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.subject}</div>
                    </td>
                    <td style={tdStyle}>
                      <div>{r.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-light)" }}>{r.email}</div>
                    </td>
                    <td style={tdStyle}><StatusBadge status={r.status} /></td>
                    <td style={tdStyle}>{r.assigned_to ? (admins.find((a) => a.id === r.assigned_to)?.name || "\u2014") : "\u2014"}</td>
                    <td style={tdStyle}>{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function TicketRow({ ticket: r, admins, onClick }: { ticket: TicketWithLastMessage; admins: Admin[]; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      style={{
        borderBottom: "1px solid #eee",
        cursor: "pointer",
        background: r.hasNewReply ? "#fff8f8" : undefined,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = r.hasNewReply ? "#ffefef" : "var(--cream)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = r.hasNewReply ? "#fff8f8" : "")}
    >
      <td style={tdStyle}>{r.request_number}</td>
      <td style={{ ...tdStyle, maxWidth: "250px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: r.hasNewReply ? 600 : 400 }}>
            {r.subject}
          </div>
          {r.hasNewReply && (
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#dc2626",
                flexShrink: 0,
              }}
            />
          )}
        </div>
      </td>
      <td style={tdStyle}>
        <div>{r.name}</div>
        <div style={{ fontSize: "0.78rem", color: "var(--text-light)" }}>{r.email}</div>
      </td>
      <td style={tdStyle}><StatusBadge status={r.status} /></td>
      <td style={tdStyle}>{r.assigned_to ? (admins.find((a) => a.id === r.assigned_to)?.name || "\u2014") : "\u2014"}</td>
      <td style={tdStyle}><PriorityBadge priority={r.priority} /></td>
      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
        {new Date(r.updated_at).toLocaleDateString()}
      </td>
    </tr>
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
    <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", background: bg, color }}>
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "high") {
    return <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", background: "#ffebee", color: "#c62828" }}>High</span>;
  }
  if (priority === "low") {
    return <span style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>Low</span>;
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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.7rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-light)",
  marginBottom: "0.3rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  border: "1px solid #ddd",
  fontSize: "0.9rem",
  fontFamily: "'Inter', sans-serif",
};
