"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { AdCampaign } from "@/types/database";

type RegistrationUtm = {
  id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  payment_status: string;
};

export default function MarketingPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationUtm[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [campResult, regResult] = await Promise.all([
        supabase.from("ad_campaigns").select("*").order("created_at", { ascending: false }),
        supabase.from("registrations").select("id, utm_source, utm_medium, utm_campaign, payment_status").in("payment_status", ["paid", "pending"]),
      ]);
      setCampaigns((campResult.data as AdCampaign[]) || []);
      setRegistrations((regResult.data as RegistrationUtm[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = campaigns.filter((c) => {
    if (platformFilter && c.platform !== platformFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  const regCountByUtmCampaign = (utmCampaign: string | null) => {
    if (!utmCampaign) return 0;
    return registrations.filter((r) => r.utm_campaign === utmCampaign).length;
  };

  const totalSpend = filtered.reduce((sum, c) => sum + (c.spent_cents || 0), 0);
  const totalImpressions = filtered.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const totalClicks = filtered.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const totalAdRegs = registrations.filter((r) => r.utm_source).length;

  const platforms = [...new Set(campaigns.map((c) => c.platform))];

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
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "2rem",
            fontWeight: 400,
          }}
        >
          Marketing
        </h1>
        <button
          onClick={() => router.push("/admin/marketing/new")}
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
          Add Campaign
        </button>
      </div>

      {/* Summary row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <MiniCard label="Total Spend" value={`$${(totalSpend / 100).toLocaleString()}`} />
        <MiniCard label="Impressions" value={totalImpressions.toLocaleString()} />
        <MiniCard label="Clicks" value={totalClicks.toLocaleString()} />
        <MiniCard label="Ad Registrations" value={`${totalAdRegs}`} />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          style={{
            padding: "0.6rem 1rem",
            border: "1px solid #ddd",
            fontSize: "0.9rem",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <option value="">All Platforms</option>
          {platforms.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
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
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--white)",
          overflow: "auto",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "var(--cream)", textAlign: "left" }}>
              <th style={thStyle}>Platform</th>
              <th style={thStyle}>Campaign</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Budget</th>
              <th style={thStyle}>Spent</th>
              <th style={thStyle}>Impressions</th>
              <th style={thStyle}>Clicks</th>
              <th style={thStyle}>CTR</th>
              <th style={thStyle}>Regs</th>
              <th style={thStyle}>Dates</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : "—";
              const regs = regCountByUtmCampaign(c.utm_campaign);
              return (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/admin/marketing/${c.id}`)}
                  style={{ borderBottom: "1px solid #eee", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.2rem 0.6rem",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        background: platformColor(c.platform).bg,
                        color: platformColor(c.platform).text,
                      }}
                    >
                      {c.platform}
                    </span>
                  </td>
                  <td style={tdStyle}>{c.campaign_name}</td>
                  <td style={tdStyle}>
                    <CampaignStatusBadge status={c.status} />
                  </td>
                  <td style={tdStyle}>
                    {c.budget_cents != null ? `$${(c.budget_cents / 100).toLocaleString()}` : "—"}
                  </td>
                  <td style={tdStyle}>${(c.spent_cents / 100).toLocaleString()}</td>
                  <td style={tdStyle}>{c.impressions.toLocaleString()}</td>
                  <td style={tdStyle}>{c.clicks.toLocaleString()}</td>
                  <td style={tdStyle}>{ctr}{ctr !== "—" ? "%" : ""}</td>
                  <td style={tdStyle}>{regs}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                    {c.start_date ? new Date(c.start_date + "T00:00:00").toLocaleDateString() : "—"}
                    {c.end_date ? ` – ${new Date(c.end_date + "T00:00:00").toLocaleDateString()}` : ""}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={{ ...tdStyle, textAlign: "center", color: "var(--text-light)" }}>
                  No campaigns found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--white)", padding: "1rem 1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
      <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-light)", marginBottom: "0.3rem" }}>
        {label}
      </p>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: "var(--charcoal)" }}>
        {value}
      </p>
    </div>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string }> = {
    active: { bg: "#e8f5e9", color: "#2e7d32" },
    paused: { bg: "#fff3e0", color: "#e65100" },
    completed: { bg: "#f5f5f5", color: "#616161" },
  };
  const { bg, color } = config[status] || config.active;

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
      {status}
    </span>
  );
}

function platformColor(platform: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    facebook: { bg: "#e3f2fd", text: "#1565c0" },
    instagram: { bg: "#fce4ec", text: "#ad1457" },
    google: { bg: "#fff3e0", text: "#e65100" },
    tiktok: { bg: "#f3e5f5", text: "#7b1fa2" },
  };
  return map[platform] || { bg: "#f5f5f5", text: "#616161" };
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
