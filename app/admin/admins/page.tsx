"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Admin } from "@/types/database";

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("organizer");
  const [adding, setAdding] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Admin["role"] | null>(null);

  const fetchAdmins = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("admins")
      .select("*")
      .order("created_at", { ascending: true });
    setAdmins(data || []);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setCurrentUserEmail(user.email.toLowerCase());
        const { data } = await supabase
          .from("admins")
          .select("role")
          .ilike("email", user.email)
          .maybeSingle();
        if (data?.role) setCurrentUserRole(data.role);
      }
      await fetchAdmins();
    };
    init();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setAdding(true);

    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to add user");
        setAdding(false);
        return;
      }

      setName("");
      setEmail("");
      setRole("organizer");
      await fetchAdmins();
    } catch {
      alert("Failed to add user.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (admin: Admin) => {
    if (currentUserEmail && admin.email.toLowerCase() === currentUserEmail) {
      alert("You cannot remove yourself.");
      return;
    }
    if (!confirm(`Remove ${admin.name} (${admin.email})?`)) return;

    const supabase = createClient();
    await supabase.from("admins").delete().eq("id", admin.id);
    await fetchAdmins();
  };

  const handleResendInvite = async (admin: Admin) => {
    setResending(admin.id);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: admin.email, resendOnly: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to resend invite");
      } else if (data.invited) {
        alert(`Invite email sent to ${admin.email}`);
      } else {
        alert(`${admin.email} has already accepted their invite.`);
      }
    } catch {
      alert("Failed to resend invite.");
    } finally {
      setResending(null);
    }
  };

  if (loading || currentUserRole === null) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Loading...
      </p>
    );
  }

  const isAdmin = currentUserRole === "admin";

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
        User Management
      </h1>

      {/* Add User Form — admin only */}
      {isAdmin && (
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
            Add User
          </h2>
          <form
            onSubmit={handleAdd}
            style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}
          >
            <div style={{ flex: 1, minWidth: "160px" }}>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={inputStyle}
                placeholder="Jane Doe"
              />
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
                placeholder="jane@example.com"
              />
            </div>
            <div style={{ minWidth: "140px" }}>
              <label style={labelStyle}>Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={inputStyle}
              >
                <option value="organizer">Organizer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={adding}
              style={{
                padding: "0.6rem 1.5rem",
                background: "var(--gold)",
                color: "var(--charcoal)",
                border: "none",
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                cursor: adding ? "not-allowed" : "pointer",
                opacity: adding ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {adding ? "Adding..." : "Add User"}
            </button>
          </form>
        </div>
      )}

      {/* Users Table */}
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
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Date Added</th>
              <th style={thStyle}>Last Login</th>
              {isAdmin && <th style={thStyle}></th>}
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={tdStyle}>{admin.name}</td>
                <td style={tdStyle}>{admin.email}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.2rem 0.6rem",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      background: admin.role === "admin" ? "#fff3e0" : "#e3f2fd",
                      color: admin.role === "admin" ? "#e65100" : "#1565c0",
                    }}
                  >
                    {admin.role}
                  </span>
                </td>
                <td style={tdStyle}>
                  {new Date(admin.created_at).toLocaleDateString()}
                </td>
                <td style={{ ...tdStyle, color: admin.last_login_at ? "var(--charcoal)" : "var(--text-light)" }}>
                  {admin.last_login_at
                    ? new Date(admin.last_login_at).toLocaleString()
                    : "Never"}
                </td>
                {isAdmin && (
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {!admin.last_login_at && (
                        <button
                          onClick={() => handleResendInvite(admin)}
                          disabled={resending === admin.id}
                          style={{
                            background: "transparent",
                            border: "1px solid #1565c0",
                            color: "#1565c0",
                            padding: "0.3rem 0.8rem",
                            fontSize: "0.75rem",
                            cursor: resending === admin.id ? "not-allowed" : "pointer",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            opacity: resending === admin.id ? 0.6 : 1,
                          }}
                        >
                          {resending === admin.id ? "Sending..." : "Resend Invite"}
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(admin)}
                        style={{
                          background: "transparent",
                          border: "1px solid #c00",
                          color: "#c00",
                          padding: "0.3rem 0.8rem",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {admins.length === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 6 : 5}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    color: "var(--text-light)",
                  }}
                >
                  No users configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
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
