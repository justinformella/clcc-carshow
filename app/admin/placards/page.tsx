"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Registration } from "@/types/database";
import Placard from "@/components/Placard";

export default function PlacardsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [printMode, setPrintMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("registrations")
        .select("*")
        .eq("payment_status", "paid")
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
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 100);
  };

  const toPrint =
    selectedIds.size > 0
      ? registrations.filter((r) => selectedIds.has(r.id))
      : registrations;

  if (loading) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Loading...
      </p>
    );
  }

  // Print view
  if (printMode) {
    return (
      <div className="print-container">
        <style>{placardPrintStyles}</style>
        {toPrint.map((reg) => (
          <Placard key={reg.id} registration={reg} />
        ))}
      </div>
    );
  }

  return (
    <>
      <style>{placardPrintStyles}</style>

      <div className="no-print">
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
                  transform: "scale(0.6)",
                  transformOrigin: "top left",
                  height: "300px",
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
              >
                <Placard registration={reg} />
              </div>
              <div
                style={{
                  padding: "0.5rem",
                  fontSize: "0.8rem",
                  color: "var(--text-light)",
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "-150px",
                  position: "relative",
                  background: "var(--white)",
                }}
              >
                <span>
                  #{reg.car_number} — {reg.first_name} {reg.last_name}
                </span>
                <span>
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

const placardPrintStyles = `
  .placard {
    width: 5.5in;
    height: 8.5in;
    padding: 0.5in;
    border: 1px solid #ddd;
    page-break-after: always;
    page-break-inside: avoid;
    font-family: 'Inter', sans-serif;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }

  .placard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.3in;
    padding-bottom: 0.15in;
    border-bottom: 2px solid #C9A962;
  }

  .placard-event {
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #6B6B6B;
  }

  .placard-number {
    font-family: 'Playfair Display', serif;
    font-size: 36pt;
    color: #C9A962;
    line-height: 1;
  }

  .placard-vehicle {
    font-family: 'Playfair Display', serif;
    font-size: 22pt;
    color: #1C1C1C;
    margin-bottom: 0.1in;
    line-height: 1.2;
  }

  .placard-owner {
    font-size: 14pt;
    color: #2D2D2D;
    margin-bottom: 0.1in;
  }

  .placard-hometown {
    color: #6B6B6B;
  }

  .placard-category {
    display: inline-block;
    padding: 4pt 12pt;
    background: #C9A962;
    color: #1C1C1C;
    font-size: 9pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.2in;
  }

  .placard-details {
    border-top: 1px solid #eee;
    padding-top: 0.15in;
    margin-bottom: 0.15in;
  }

  .placard-detail {
    display: flex;
    gap: 0.15in;
    margin-bottom: 0.08in;
    font-size: 10pt;
    color: #2D2D2D;
    line-height: 1.5;
  }

  .placard-detail-label {
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #C9A962;
    font-weight: 600;
    min-width: 1in;
    flex-shrink: 0;
  }

  .placard-story {
    flex: 1;
    border-top: 1px solid #eee;
    padding-top: 0.15in;
    margin-bottom: 0.15in;
  }

  .placard-story p {
    font-size: 10pt;
    color: #2D2D2D;
    line-height: 1.6;
    margin-top: 0.05in;
  }

  .placard-footer {
    margin-top: auto;
    padding-top: 0.15in;
    border-top: 2px solid #1C1C1C;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #6B6B6B;
    text-align: center;
  }

  @media print {
    .no-print {
      display: none !important;
    }

    body {
      margin: 0;
      padding: 0;
    }

    .placard {
      border: none;
      margin: 0;
    }
  }

  @media screen {
    .print-container {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: center;
    }
  }
`;
