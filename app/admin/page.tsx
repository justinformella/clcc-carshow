"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Registration, Sponsor, SponsorStatus, AdCampaign } from "@/types/database";
import { MAX_REGISTRATIONS } from "@/types/database";

export default function AdminDashboard() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const [regResult, sponsorResult, campaignResult] = await Promise.all([
        supabase
          .from("registrations")
          .select("*")
          .in("payment_status", ["paid", "pending"])
          .order("created_at", { ascending: false }),
        supabase
          .from("sponsors")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("ad_campaigns")
          .select("*"),
      ]);

      setRegistrations(regResult.data || []);
      setSponsors((sponsorResult.data as Sponsor[]) || []);
      setCampaigns((campaignResult.data as AdCampaign[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const paidRegistrations = registrations.filter((r) => r.payment_status === "paid");
  const unpaidRegistrations = registrations.filter((r) => r.payment_status === "pending");
  const totalRevenue = paidRegistrations.reduce(
    (sum, r) => sum + (r.amount_paid || 0),
    0
  );
  const checkedIn = registrations.filter((r) => r.checked_in).length;

  const eventDate = new Date("2026-05-17T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const sponsorRevenue = sponsors
    .filter((s) => s.status === "paid")
    .reduce((sum, s) => sum + (s.amount_paid || 0), 0);

  const openSponsors = sponsors.filter((s) => s.status === "prospect" || s.status === "inquired" || s.status === "engaged");
  const openPipeline = openSponsors.reduce((sum, s) => {
    const match = s.sponsorship_level.match(/\$([0-9,]+)/);
    return sum + (match ? parseInt(match[1].replace(/,/g, "")) * 100 : 0);
  }, 0);

  const adRegistrations = registrations.filter((r) => r.utm_source);
  const adSourceCounts: Record<string, number> = {};
  adRegistrations.forEach((r) => {
    const src = r.utm_source!;
    adSourceCounts[src] = (adSourceCounts[src] || 0) + 1;
  });
  const adSourceSummary = Object.entries(adSourceCounts)
    .map(([src, count]) => `${count} ${src}`)
    .join(", ");

  const totalAdSpend = campaigns.reduce((sum, c) => sum + (c.spent_cents || 0), 0);

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

      {/* Event Countdown — full width accent banner */}
      <div
        style={{
          background: "var(--charcoal)",
          padding: "2rem 2.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "var(--gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--charcoal)",
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <p
              style={{
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "var(--gold)",
                marginBottom: "0.25rem",
              }}
            >
              Event Countdown
            </p>
            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)" }}>
              May 17, 2026 &middot; Downtown Crystal Lake
            </p>
          </div>
        </div>
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "3rem",
            color: "var(--gold)",
            lineHeight: 1,
          }}
        >
          {daysUntilEvent > 0 ? `${daysUntilEvent}` : daysUntilEvent === 0 ? "Today!" : "Past"}
          {daysUntilEvent > 0 && (
            <span style={{ fontSize: "1rem", color: "rgba(255,255,255,0.5)", marginLeft: "0.5rem", fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>
              days
            </span>
          )}
        </p>
      </div>

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
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <SummaryCard
          label="Revenue"
          value={`$${(totalRevenue / 100).toLocaleString()}`}
          note={unpaidRegistrations.length > 0
            ? `collected \u00b7 ${unpaidRegistrations.length} unpaid`
            : "collected"}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
        />
        <SummaryCard
          label="Checked In"
          value={`${checkedIn}`}
          note={`of ${registrations.length} registered`}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
        />
        <SummaryCard
          label="Spots Remaining"
          value={`${MAX_REGISTRATIONS - registrations.length}`}
          note="available"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
        />
        <SummaryCard
          label="Sponsors"
          value={`${sponsors.length}`}
          note={`${sponsors.filter((s) => s.status === "paid").length} paid`}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>}
        />
        <SummaryCard
          label="Sponsor Revenue"
          value={`$${(sponsorRevenue / 100).toLocaleString()}`}
          note="from paid sponsors"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
        />
        <SummaryCard
          label="Open Sponsor Pipeline"
          value={openPipeline > 0 ? `$${(openPipeline / 100).toLocaleString()}` : "$0"}
          note={`${openSponsors.length} unpaid`}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
        />
        <SummaryCard
          label="Ad Registrations"
          value={`${adRegistrations.length}`}
          note={adSourceSummary || "none yet"}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>}
        />
        <SummaryCard
          label="Ad Spend"
          value={`$${(totalAdSpend / 100).toLocaleString()}`}
          note={`across ${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""}`}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>}
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
          marginBottom: "3rem",
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
              <th style={thStyle}>Award</th>
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
                <td style={tdStyle}>
                  {reg.award_category ? (
                    <span style={{
                      display: "inline-block",
                      padding: "0.2rem 0.6rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      background: "#fff8e1",
                      color: "#f9a825",
                    }}>
                      {reg.award_category}
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-light)" }}>&mdash;</span>
                  )}
                </td>
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

      {/* Recent Sponsors */}
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.4rem",
          fontWeight: 400,
          marginBottom: "1rem",
        }}
      >
        Recent Sponsors
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
              <th style={thStyle}>Company</th>
              <th style={thStyle}>Contact</th>
              <th style={thStyle}>Level</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {sponsors.slice(0, 5).map((s) => (
              <tr
                key={s.id}
                onClick={() => router.push(`/admin/sponsors/${s.id}`)}
                style={{ borderBottom: "1px solid #eee", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                <td style={tdStyle}>{s.company}</td>
                <td style={tdStyle}>{s.name}</td>
                <td style={tdStyle}>{s.sponsorship_level}</td>
                <td style={tdStyle}>
                  <SponsorStatusBadge status={s.status} />
                </td>
                <td style={tdStyle}>
                  {new Date(s.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {sponsors.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{ ...tdStyle, textAlign: "center", color: "var(--text-light)" }}
                >
                  No sponsors yet
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
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--white)",
        padding: "1.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
        {icon && (
          <span style={{ color: "var(--gold)", display: "flex", flexShrink: 0 }}>{icon}</span>
        )}
        <p
          style={{
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "var(--text-light)",
          }}
        >
          {label}
        </p>
      </div>
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

function SponsorStatusBadge({ status }: { status: SponsorStatus }) {
  const config: Record<SponsorStatus, { label: string; bg: string; color: string }> = {
    prospect: { label: "Prospect", bg: "#ede7f6", color: "#5e35b1" },
    inquired: { label: "Inquired", bg: "#e3f2fd", color: "#1565c0" },
    engaged: { label: "Engaged", bg: "#fff3e0", color: "#e65100" },
    paid: { label: "Paid", bg: "#e8f5e9", color: "#2e7d32" },
  };

  const { label, bg, color } = config[status] || config.prospect;

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
