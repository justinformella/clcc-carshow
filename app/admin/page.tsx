"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Registration } from "@/types/database";
import { MAX_REGISTRATIONS } from "@/types/database";

export default function AdminDashboard() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("registrations")
        .select("*")
        .in("payment_status", ["paid", "pending"])
        .order("created_at", { ascending: false });

      setRegistrations(data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const totalRevenue = registrations.reduce(
    (sum, r) => sum + (r.amount_paid || 0),
    0
  );
  const checkedIn = registrations.filter((r) => r.checked_in).length;

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
          marginBottom: "2rem",
        }}
      >
        Dashboard
      </h1>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.5rem",
          marginBottom: "3rem",
        }}
      >
        <SummaryCard
          label="Registrations"
          value={`${registrations.length}`}
          note={`of ${MAX_REGISTRATIONS} max`}
        />
        <SummaryCard
          label="Revenue"
          value={`$${(totalRevenue / 100).toLocaleString()}`}
          note="total collected"
        />
        <SummaryCard
          label="Checked In"
          value={`${checkedIn}`}
          note={`of ${registrations.length} registered`}
        />
        <SummaryCard
          label="Spots Remaining"
          value={`${MAX_REGISTRATIONS - registrations.length}`}
          note="available"
        />
      </div>

      {/* Recent Registrations */}
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.4rem",
          fontWeight: 400,
          marginBottom: "1rem",
        }}
      >
        Recent Registrations
      </h2>
      <div
        style={{
          background: "var(--white)",
          overflow: "auto",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr
              style={{
                background: "var(--cream)",
                textAlign: "left",
              }}
            >
              <th style={thStyle}>#</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Vehicle</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {registrations.slice(0, 10).map((reg) => (
              <tr
                key={reg.id}
                onClick={() => router.push(`/admin/registrations/${reg.id}`)}
                style={{ borderBottom: "1px solid #eee", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                <td style={tdStyle}>{reg.car_number}</td>
                <td style={tdStyle}>
                  {reg.first_name} {reg.last_name}
                </td>
                <td style={tdStyle}>
                  {reg.vehicle_year} {reg.vehicle_make} {reg.vehicle_model}
                </td>
                <td style={tdStyle}>{reg.preferred_category}</td>
                <td style={tdStyle}>
                  {reg.payment_status === "pending" ? (
                    <StatusBadge label="Unpaid" color="#e65100" bg="#fff3e0" />
                  ) : (
                    <StatusBadge
                      label={reg.checked_in ? "Checked In" : "Paid"}
                      color={reg.checked_in ? "#2e7d32" : "#1565c0"}
                      bg={reg.checked_in ? "#e8f5e9" : "#e3f2fd"}
                    />
                  )}
                </td>
                <td style={tdStyle}>
                  {new Date(reg.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {registrations.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ ...tdStyle, textAlign: "center", color: "var(--text-light)" }}
                >
                  No registrations yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div
      style={{
        background: "var(--white)",
        padding: "1.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      <p
        style={{
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: "var(--text-light)",
          marginBottom: "0.5rem",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "2.2rem",
          color: "var(--charcoal)",
        }}
      >
        {value}
      </p>
      <p style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>{note}</p>
    </div>
  );
}

function StatusBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.6rem",
        fontSize: "0.75rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
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
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-light)",
};

const tdStyle: React.CSSProperties = {
  padding: "0.8rem 1rem",
};
