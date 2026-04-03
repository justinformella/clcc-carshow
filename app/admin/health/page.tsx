"use client";

import { useEffect, useState } from "react";

type ServiceStatus = {
  name: string;
  status: "ok" | "error" | "missing";
  latencyMs?: number;
  error?: string;
};

type HealthData = {
  timestamp: string;
  services: ServiceStatus[];
};

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    fetch("/api/admin/health")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const statusColor = (s: string) =>
    s === "ok" ? "#16a34a" : s === "error" ? "#dc2626" : "#ca8a04";

  const statusIcon = (s: string) =>
    s === "ok" ? "●" : s === "error" ? "✕" : "○";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", color: "var(--charcoal)", fontWeight: 400 }}>
            Service Health
          </h1>
          {data && (
            <p style={{ fontSize: "0.8rem", color: "var(--text-light)", marginTop: "0.25rem" }}>
              Last checked: {new Date(data.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            padding: "0.5rem 1.25rem",
            background: loading ? "rgba(0,0,0,0.04)" : "var(--charcoal)",
            color: loading ? "var(--text-light)" : "#fff",
            border: "none",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {loading ? "Checking..." : "Refresh"}
        </button>
      </div>

      {data && (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {data.services.map((svc) => (
            <div
              key={svc.name}
              style={{
                background: "var(--white)",
                border: "1px solid rgba(0,0,0,0.08)",
                borderLeft: `4px solid ${statusColor(svc.status)}`,
                padding: "1.25rem 1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "1.5rem", color: statusColor(svc.status), lineHeight: 1 }}>
                  {statusIcon(svc.status)}
                </span>
                <div>
                  <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--charcoal)" }}>{svc.name}</p>
                  {svc.error && (
                    <p style={{ fontSize: "0.8rem", color: "#dc2626", marginTop: "0.2rem", fontFamily: "monospace", wordBreak: "break-all" }}>
                      {svc.error}
                    </p>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.25rem 0.75rem",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    background: svc.status === "ok" ? "rgba(22,163,74,0.08)" : svc.status === "error" ? "rgba(220,38,38,0.08)" : "rgba(202,138,4,0.08)",
                    color: statusColor(svc.status),
                  }}
                >
                  {svc.status === "ok" ? "Connected" : svc.status === "error" ? "Error" : "Not Configured"}
                </span>
                {svc.latencyMs != null && (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-light)", marginTop: "0.3rem", fontVariantNumeric: "tabular-nums" }}>
                    {svc.latencyMs}ms
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!data && !loading && (
        <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
          Failed to load health data
        </p>
      )}
    </div>
  );
}
