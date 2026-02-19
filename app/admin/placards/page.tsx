"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { Registration } from "@/types/database";

export default function PlacardsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

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
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === registrations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(registrations.map((r) => r.id)));
    }
  };

  const handleDownloadPdf = useCallback(async () => {
    setGenerating(true);
    try {
      const toPrint =
        selectedIds.size > 0
          ? registrations.filter((r) => selectedIds.has(r.id))
          : registrations;

      // Dynamic import to keep bundle small
      const [{ pdf }, { PlacardDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/placard-pdf"),
      ]);

      const logoUrl = `${window.location.origin}/images/CLCC_Logo2026.png`;
      const blob = await pdf(<PlacardDocument registrations={toPrint} logoUrl={logoUrl} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CLCC-Placards-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Check console for details.");
    } finally {
      setGenerating(false);
    }
  }, [registrations, selectedIds]);

  if (loading) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Loading...
      </p>
    );
  }

  return (
    <div>
      {/* Header */}
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
        <div>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "2rem",
              fontWeight: 400,
            }}
          >
            Placards
          </h1>
          <p style={{ color: "var(--text-light)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            {registrations.length} vehicle{registrations.length !== 1 ? "s" : ""}
            {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
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
            {selectedIds.size === registrations.length ? "Deselect All" : "Select All"}
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={generating}
            style={{
              padding: "0.6rem 1.5rem",
              background: generating ? "#ccc" : "var(--gold)",
              color: "var(--charcoal)",
              border: "none",
              fontSize: "0.8rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: generating ? "wait" : "pointer",
              opacity: generating ? 0.7 : 1,
            }}
          >
            {generating
              ? "Generating..."
              : `Download PDF ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""}`}
          </button>
        </div>
      </div>

      {/* Preview Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "1rem",
        }}
      >
        {registrations.map((reg) => {
          const selected = selectedIds.has(reg.id);
          const hometown = [reg.address_city, reg.address_state].filter(Boolean).join(", ");

          return (
            <div
              key={reg.id}
              onClick={() => toggleSelection(reg.id)}
              style={{
                cursor: "pointer",
                border: selected ? "2px solid var(--gold)" : "2px solid transparent",
                background: "var(--white)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                transition: "border-color 0.15s",
              }}
            >
              {/* Card header: car number + status */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "2rem",
                    fontWeight: 700,
                    lineHeight: 1,
                    color: "var(--charcoal)",
                  }}
                >
                  #{reg.car_number}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {!reg.checked_in && (
                    <span
                      style={{
                        fontSize: "0.6rem",
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
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      border: selected ? "none" : "1.5px solid #ccc",
                      background: selected ? "var(--gold)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      color: "var(--charcoal)",
                      flexShrink: 0,
                    }}
                  >
                    {selected && "✓"}
                  </span>
                </div>
              </div>

              {/* Vehicle */}
              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.1rem",
                  lineHeight: 1.3,
                  color: "var(--charcoal)",
                }}
              >
                {reg.vehicle_year} {reg.vehicle_make} {reg.vehicle_model}
              </div>

              {/* Owner */}
              <div style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>
                {reg.first_name} {reg.last_name}
                {hometown && <span> &mdash; {hometown}</span>}
              </div>

              {/* Details preview */}
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  marginTop: "auto",
                }}
              >
                {reg.vehicle_color && (
                  <span style={tagStyle}>{reg.vehicle_color}</span>
                )}
                {reg.award_category && (
                  <span
                    style={{
                      ...tagStyle,
                      background: "#fff8e1",
                      color: "#b28704",
                      borderColor: "#D4A44A",
                    }}
                  >
                    {reg.award_category}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const tagStyle: React.CSSProperties = {
  fontSize: "0.65rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  padding: "0.15rem 0.5rem",
  background: "#f5f5f5",
  color: "var(--text-light)",
  border: "1px solid #eee",
};
