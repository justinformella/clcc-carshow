"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Registration } from "@/types/database";
import Placard from "@/components/Placard";
import { placardPrintStyles, openPlacardPrintWindow } from "@/lib/placard-print";

export default function PlacardsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("registrations")
        .select("*")
        .neq("payment_status", "archived")
        .order("car_number", { ascending: true });

      setRegistrations(data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === registrations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(registrations.map((r) => r.id)));
    }
  };

  const handlePrint = () => {
    const toPrint =
      selectedIds.size > 0
        ? registrations.filter((r) => selectedIds.has(r.id))
        : registrations;
    openPlacardPrintWindow(toPrint);
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
      <style>{placardPrintStyles}</style>
      <div>
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
            Placards
          </h1>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={selectAll}
              style={{
                padding: "0.6rem 1.5rem",
                background: "var(--white)",
                color: "var(--charcoal)",
                border: "1px solid #ddd",
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                cursor: "pointer",
              }}
            >
              {selectedIds.size === registrations.length
                ? "Deselect All"
                : "Select All"}
            </button>
            <button
              onClick={handlePrint}
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
              Print {selectedIds.size > 0 ? `(${selectedIds.size})` : "All"}
            </button>
          </div>
        </div>

        {/* Preview Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {registrations.map((reg) => (
            <div
              key={reg.id}
              onClick={() => toggleSelection(reg.id)}
              style={{
                cursor: "pointer",
                border: selectedIds.has(reg.id)
                  ? "2px solid var(--gold)"
                  : "2px solid transparent",
                background: "var(--white)",
                padding: "0.5rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  transform: "scale(0.4)",
                  transformOrigin: "top left",
                  width: "11in",
                  height: "8.5in",
                  pointerEvents: "none",
                }}
              >
                <Placard registration={reg} />
              </div>
              <div
                style={{
                  marginTop: `calc(-8.5in * 0.6 + 0.5rem)`,
                  padding: "0.5rem",
                  fontSize: "0.8rem",
                  color: "var(--text-light)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  position: "relative",
                  background: "var(--white)",
                }}
              >
                <span>
                  #{reg.car_number} — {reg.first_name} {reg.last_name}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {!reg.checked_in && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        padding: "0.15rem 0.5rem",
                        background: "#fff3e0",
                        color: "#e65100",
                      }}
                    >
                      Not Checked In
                    </span>
                  )}
                  {reg.vehicle_year} {reg.vehicle_make} {reg.vehicle_model}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
