"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { Registration } from "@/types/database";

export default function CheckInPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("registrations")
      .select("*")
      .eq("payment_status", "paid")
      .order("car_number", { ascending: true });

    setRegistrations(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckIn = async (reg: Registration) => {
    const supabase = createClient();
    const newCheckedIn = !reg.checked_in;

    const { error } = await supabase
      .from("registrations")
      .update({
        checked_in: newCheckedIn,
        checked_in_at: newCheckedIn ? new Date().toISOString() : null,
      })
      .eq("id", reg.id);

    if (!error) {
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === reg.id
            ? {
                ...r,
                checked_in: newCheckedIn,
                checked_in_at: newCheckedIn
                  ? new Date().toISOString()
                  : null,
              }
            : r
        )
      );
    }
  };

  const filtered = registrations.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      `${r.first_name} ${r.last_name}`.toLowerCase().includes(s) ||
      String(r.car_number).includes(s) ||
      `${r.vehicle_year} ${r.vehicle_make} ${r.vehicle_model}`
        .toLowerCase()
        .includes(s)
    );
  });

  const checkedInCount = registrations.filter((r) => r.checked_in).length;

  if (loading) {
    return (
      <p
        style={{
          color: "var(--text-light)",
          textAlign: "center",
          padding: "3rem",
        }}
      >
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
          Check-In
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "var(--white)",
            padding: "0.8rem 1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.5rem",
          }}
        >
          <span style={{ color: "var(--gold)" }}>{checkedInCount}</span>
          <span style={{ color: "var(--text-light)", fontSize: "1rem" }}>/</span>
          <span style={{ color: "var(--charcoal)" }}>
            {registrations.length}
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--text-light)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginLeft: "0.5rem",
            }}
          >
            checked in
          </span>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name, car number, or vehicle..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
        style={{
          width: "100%",
          padding: "1rem 1.5rem",
          border: "2px solid var(--gold)",
          fontSize: "1.1rem",
          fontFamily: "'Inter', sans-serif",
          marginBottom: "1.5rem",
          outline: "none",
        }}
      />

      {/* Registration Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: "1rem",
        }}
      >
        {filtered.map((reg) => (
          <div
            key={reg.id}
            style={{
              background: "var(--white)",
              padding: "1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              borderLeft: `4px solid ${
                reg.checked_in ? "#4caf50" : "var(--gold)"
              }`,
              opacity: reg.checked_in ? 0.7 : 1,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "0.8rem",
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "1.3rem",
                    color: "var(--charcoal)",
                  }}
                >
                  #{reg.car_number}{" "}
                  <span style={{ fontSize: "1rem" }}>
                    {reg.first_name} {reg.last_name}
                  </span>
                </p>
                <p
                  style={{
                    color: "var(--text-light)",
                    fontSize: "0.9rem",
                    marginTop: "0.3rem",
                  }}
                >
                  {reg.vehicle_year} {reg.vehicle_make} {reg.vehicle_model}
                  {reg.vehicle_color ? ` — ${reg.vehicle_color}` : ""}
                </p>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--gold)",
                    marginTop: "0.2rem",
                  }}
                >
                  {reg.preferred_category}
                </p>
              </div>
              <button
                onClick={() => handleCheckIn(reg)}
                style={{
                  padding: "0.8rem 1.5rem",
                  background: reg.checked_in ? "#e8f5e9" : "var(--gold)",
                  color: reg.checked_in ? "#2e7d32" : "var(--charcoal)",
                  border: "none",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  minWidth: "110px",
                }}
              >
                {reg.checked_in ? "Undo" : "Check In"}
              </button>
            </div>
            {reg.checked_in && reg.checked_in_at && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#4caf50",
                }}
              >
                Checked in at{" "}
                {new Date(reg.checked_in_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p style={{ color: "var(--text-light)", gridColumn: "1 / -1" }}>
            {search ? "No matching registrations" : "No registrations found"}
          </p>
        )}
      </div>
    </>
  );
}
