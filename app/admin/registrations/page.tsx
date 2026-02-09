"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Registration } from "@/types/database";

export default function RegistrationsPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("registrations-view") as "table" | "cards") || "table";
    }
    return "table";
  });

  const handleViewMode = (mode: "table" | "cards") => {
    setViewMode(mode);
    localStorage.setItem("registrations-view", mode);
  };

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      let query = supabase
        .from("registrations")
        .select("*")
        .order("car_number", { ascending: true });

      if (showArchived) {
        query = query.in("payment_status", ["paid", "pending", "archived"]);
      } else {
        query = query.in("payment_status", ["paid", "pending"]);
      }

      const { data } = await query;
      setRegistrations(data || []);
      setLoading(false);
    };
    fetchData();
  }, [showArchived]);

  const filtered = registrations.filter((r) => {
    const matchesSearch =
      !search ||
      `${r.first_name} ${r.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      `${r.vehicle_year} ${r.vehicle_make} ${r.vehicle_model}`
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesCategory =
      !categoryFilter || r.preferred_category === categoryFilter;

    const matchesStatus =
      !statusFilter ||
      (statusFilter === "checked_in" && r.checked_in) ||
      (statusFilter === "not_checked_in" && !r.checked_in);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const exportCSV = () => {
    const headers = [
      "Car #",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Hometown",
      "Year",
      "Make",
      "Model",
      "Color",
      "Engine Specs",
      "Modifications",
      "Story",
      "Category",
      "Checked In",
      "Registered At",
    ];

    const rows = filtered.map((r) => [
      r.car_number,
      r.first_name,
      r.last_name,
      r.email,
      r.phone || "",
      r.hometown || "",
      r.vehicle_year,
      r.vehicle_make,
      r.vehicle_model,
      r.vehicle_color || "",
      r.engine_specs || "",
      r.modifications || "",
      r.story || "",
      r.preferred_category,
      r.checked_in ? "Yes" : "No",
      new Date(r.created_at).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clcc-registrations-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Loading...
      </p>
    );
  }

  const categories = [...new Set(registrations.map((r) => r.preferred_category))];

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
          Registrations ({filtered.length})
        </h1>
        <button
          onClick={exportCSV}
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
          Export CSV
        </button>
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
          placeholder="Search name, email, or vehicle..."
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
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: "0.6rem 1rem",
            border: "1px solid #ddd",
            fontSize: "0.9rem",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
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
          <option value="checked_in">Checked In</option>
          <option value="not_checked_in">Not Checked In</option>
        </select>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.85rem",
            color: "var(--text-light)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show Archived
        </label>
      </div>

      {/* View toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            border: "1px solid #ddd",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => handleViewMode("table")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 1.4rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: viewMode === "table" ? "var(--charcoal)" : "var(--white)",
              color: viewMode === "table" ? "var(--white)" : "var(--text-light)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="1" width="14" height="3" rx="0.5" />
              <rect x="1" y="6.5" width="14" height="3" rx="0.5" />
              <rect x="1" y="12" width="14" height="3" rx="0.5" />
            </svg>
            Table
          </button>
          <button
            onClick={() => handleViewMode("cards")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 1.4rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              border: "none",
              borderLeft: "1px solid #ddd",
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: viewMode === "cards" ? "var(--charcoal)" : "var(--white)",
              color: viewMode === "cards" ? "var(--white)" : "var(--text-light)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="1" width="6" height="6" rx="0.5" />
              <rect x="9" y="1" width="6" height="6" rx="0.5" />
              <rect x="1" y="9" width="6" height="6" rx="0.5" />
              <rect x="9" y="9" width="6" height="6" rx="0.5" />
            </svg>
            Cards
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
        /* Table view */
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
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Vehicle</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Hometown</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((reg) => (
                <tr
                  key={reg.id}
                  onClick={() => router.push(`/admin/registrations/${reg.id}`)}
                  style={{
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                    opacity: reg.payment_status === "archived" ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td style={tdStyle}>{reg.car_number}</td>
                  <td style={tdStyle}>
                    {reg.first_name} {reg.last_name}
                  </td>
                  <td style={tdStyle}>{reg.email}</td>
                  <td style={tdStyle}>
                    {reg.vehicle_year} {reg.vehicle_make} {reg.vehicle_model}
                  </td>
                  <td style={tdStyle}>{reg.preferred_category}</td>
                  <td style={tdStyle}>{reg.hometown || "—"}</td>
                  <td style={tdStyle}>
                    <StatusBadge reg={reg} />
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
                    No registrations found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Card view */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {filtered.map((reg) => (
            <div
              key={reg.id}
              onClick={() => router.push(`/admin/registrations/${reg.id}`)}
              style={{
                background: "var(--white)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                cursor: "pointer",
                overflow: "hidden",
                opacity: reg.payment_status === "archived" ? 0.6 : 1,
                transition: "box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)")}
            >
              {/* Image */}
              {reg.ai_image_url ? (
                <img
                  src={reg.ai_image_url}
                  alt={`${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`}
                  style={{
                    width: "100%",
                    height: "200px",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "200px",
                    background: "var(--cream)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-light)",
                    fontSize: "0.8rem",
                  }}
                >
                  No image
                </div>
              )}

              {/* Card body */}
              <div style={{ padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.3rem" }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem" }}>
                    <span style={{ color: "var(--gold)" }}>#{reg.car_number}</span>{" "}
                    {reg.first_name} {reg.last_name}
                  </span>
                  <StatusBadge reg={reg} />
                </div>
                <p style={{ fontSize: "0.9rem", color: "var(--charcoal)", margin: "0.25rem 0" }}>
                  {reg.vehicle_year} {reg.vehicle_make} {reg.vehicle_model}
                  {reg.vehicle_color ? ` — ${reg.vehicle_color}` : ""}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.6rem", fontSize: "0.78rem", color: "var(--text-light)" }}>
                  <span>{reg.preferred_category}</span>
                  <span>{reg.hometown || ""}</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem", gridColumn: "1 / -1" }}>
              No registrations found
            </p>
          )}
        </div>
      )}
    </>
  );
}

function StatusBadge({ reg }: { reg: Registration }) {
  let label: string;
  let bg: string;
  let color: string;

  if (reg.payment_status === "archived") {
    label = "Archived";
    bg = "#f5f5f5";
    color = "#616161";
  } else if (reg.payment_status === "pending") {
    label = "Unpaid";
    bg = "#fff3e0";
    color = "#e65100";
  } else if (reg.checked_in) {
    label = "Checked In";
    bg = "#e8f5e9";
    color = "#2e7d32";
  } else {
    label = "Paid";
    bg = "#e3f2fd";
    color = "#1565c0";
  }

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
