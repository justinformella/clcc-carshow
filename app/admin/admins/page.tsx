"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Admin } from "@/types/database";

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [adding, setAdding] = useState(false);

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
    fetchAdmins();
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
        alert(data.error || "Failed to add admin");
        setAdding(false);
        return;
      }

      setName("");
      setEmail("");
      setRole("admin");
      await fetchAdmins();
    } catch {
      alert("Failed to add admin.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (admin: Admin) => {
    if (!confirm(`Remove ${admin.name} (${admin.email}) as an admin?`)) return;

    const supabase = createClient();
    await supabase.from("admins").delete().eq("id", admin.id);
    await fetchAdmins();
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
        Admin Management
      </h1>

      {/* Add Admin Form */}
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
          Add Admin
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
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
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
            {adding ? "Adding..." : "Add Admin"}
          </button>
        </form>
      </div>

      {/* Admins Table */}
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
              <th style={thStyle}></th>
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
                      background: admin.role === "owner" ? "#fff3e0" : "#e3f2fd",
                      color: admin.role === "owner" ? "#e65100" : "#1565c0",
                    }}
                  >
                    {admin.role}
                  </span>
                </td>
                <td style={tdStyle}>
                  {new Date(admin.created_at).toLocaleDateString()}
                </td>
                <td style={tdStyle}>
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
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    color: "var(--text-light)",
                  }}
                >
                  No admins configured. Add one above to receive notification emails.
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
