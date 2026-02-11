"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Registration, Sponsor, AdCampaign } from "@/types/database";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type Transaction = {
  id: string;
  date: string;
  type: "registration" | "sponsorship";
  description: string;
  amountCents: number;
  feeCents: number;
  netCents: number;
  status: string;
  detailUrl: string;
};

const COLORS = {
  reg: "#1565c0",
  sponsor: "#7b1fa2",
  green: "#2e7d32",
  red: "#c62828",
};

function estimateStripeFee(amountCents: number): number {
  return Math.round(amountCents * 0.029) + 30;
}

function fmtMoney(cents: number): string {
  const abs = Math.abs(cents);
  const str = `$${(abs / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return cents < 0 ? `(${str})` : str;
}


export default function FinancesPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "registration" | "sponsorship">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "refunded">("all");

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const [regResult, sponsorResult, campaignResult] = await Promise.all([
        supabase
          .from("registrations")
          .select("*")
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

  // === Computed values ===

  const paidRegs = registrations.filter((r) => r.payment_status === "paid");
  const pendingRegs = registrations.filter((r) => r.payment_status === "pending");
  const refundedRegs = registrations.filter((r) => r.payment_status === "refunded");

  const regRevenue = paidRegs.reduce((sum, r) => sum + (r.amount_paid || 0), 0);
  const refundedAmount = refundedRegs.reduce((sum, r) => sum + (r.amount_paid || 0), 0);

  const paidSponsors = sponsors.filter((s) => s.status === "paid");
  const sponsorRevenue = paidSponsors.reduce((sum, s) => sum + (s.amount_paid || 0), 0);

  const pendingSponsorStatuses = ["engaged", "inquired"] as const;
  const pendingSponsors = sponsors.filter((s) =>
    pendingSponsorStatuses.includes(s.status as "engaged" | "inquired")
  );
  const pendingSponsorValue = pendingSponsors.reduce((sum, s) => {
    const match = s.sponsorship_level.match(/\$([0-9,]+)/);
    return sum + (match ? parseInt(match[1].replace(/,/g, "")) * 100 : 0);
  }, 0);
  const pendingRegValue = pendingRegs.reduce((sum, r) => sum + (r.amount_paid || 0), 0);

  const totalRevenue = regRevenue + sponsorRevenue;

  // Stripe fee estimate: applied to each paid registration and paid sponsor
  const regFees = paidRegs.reduce((sum, r) => sum + estimateStripeFee(r.amount_paid || 0), 0);
  const sponsorFees = paidSponsors.reduce((sum, s) => sum + estimateStripeFee(s.amount_paid || 0), 0);
  const totalFees = regFees + sponsorFees;

  const netAfterFees = totalRevenue - totalFees;

  const totalAdSpend = campaigns.reduce((sum, c) => sum + (c.spent_cents || 0), 0);

  const netForCharity = totalRevenue - totalFees - refundedAmount - totalAdSpend;

  // Sponsorship tier breakdown
  const tierBreakdown: Record<string, { count: number; total: number }> = {};
  paidSponsors.forEach((s) => {
    const tier = s.sponsorship_level;
    if (!tierBreakdown[tier]) tierBreakdown[tier] = { count: 0, total: 0 };
    tierBreakdown[tier].count++;
    tierBreakdown[tier].total += s.amount_paid || 0;
  });

  // === Chart data ===

  // Area chart data — cumulative revenue over time
  const areaData = (() => {
    const dayMap: Record<string, { reg: number; sponsor: number }> = {};
    paidRegs.forEach((r) => {
      const day = (r.paid_at || r.created_at).slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { reg: 0, sponsor: 0 };
      dayMap[day].reg += r.amount_paid || 0;
    });
    paidSponsors.forEach((s) => {
      const day = (s.paid_at || s.created_at).slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { reg: 0, sponsor: 0 };
      dayMap[day].sponsor += s.amount_paid || 0;
    });
    const sortedDays = Object.keys(dayMap).sort();
    let cumReg = 0;
    let cumSponsor = 0;
    return sortedDays.map((day) => {
      cumReg += dayMap[day].reg;
      cumSponsor += dayMap[day].sponsor;
      const d = new Date(day + "T00:00:00");
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        registrations: cumReg,
        sponsorships: cumSponsor,
        total: cumReg + cumSponsor,
      };
    });
  })();

  // Donut chart data
  const donutData = [
    { name: "Registrations", value: regRevenue },
    { name: "Sponsorships", value: sponsorRevenue },
  ];

  // === Unified transaction list ===

  const allTransactions: Transaction[] = [
    ...registrations
      .filter((r) => r.payment_status !== "archived")
      .map((r) => ({
        id: r.id,
        date: r.created_at,
        type: "registration" as const,
        description: `${r.first_name} ${r.last_name} — ${r.vehicle_year} ${r.vehicle_make} ${r.vehicle_model}`,
        amountCents: r.amount_paid || 0,
        feeCents: r.payment_status === "paid" ? estimateStripeFee(r.amount_paid || 0) : 0,
        netCents:
          r.payment_status === "paid"
            ? (r.amount_paid || 0) - estimateStripeFee(r.amount_paid || 0)
            : 0,
        status: r.payment_status,
        detailUrl: `/admin/registrations/${r.id}`,
      })),
    ...sponsors.map((s) => ({
      id: s.id,
      date: s.status === "paid" ? (s.paid_at || s.created_at) : s.created_at,
      type: "sponsorship" as const,
      description: `${s.company} — ${s.sponsorship_level}`,
      amountCents: s.amount_paid || 0,
      feeCents: s.status === "paid" ? estimateStripeFee(s.amount_paid || 0) : 0,
      netCents:
        s.status === "paid"
          ? (s.amount_paid || 0) - estimateStripeFee(s.amount_paid || 0)
          : 0,
      status: s.status === "paid" ? "paid" : s.status === "prospect" || s.status === "inquired" || s.status === "engaged" ? "pending" : s.status,
      detailUrl: `/admin/sponsors/${s.id}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Apply filters
  const filtered = allTransactions.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // === CSV Export ===

  function exportCSV() {
    const header = "Date,Type,Description,Amount,Est. Fee,Net,Status";
    const rows = filtered.map((t) =>
      [
        new Date(t.date).toLocaleDateString(),
        t.type === "registration" ? "Registration" : "Sponsorship",
        `"${t.description.replace(/"/g, '""')}"`,
        fmtMoney(t.amountCents),
        fmtMoney(t.feeCents),
        fmtMoney(t.netCents),
        t.status.charAt(0).toUpperCase() + t.status.slice(1),
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clcc-finances-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Loading...
      </p>
    );
  }

  return (
    <>
      {/* ── 1. Hero Banner — Net Available for Charity ── */}
      <div
        style={{
          background: "var(--charcoal)",
          padding: "2rem 2.5rem",
          marginBottom: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1.5rem",
        }}
      >
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
            Gross Revenue
          </p>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.8rem",
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1,
            }}
          >
            {fmtMoney(totalRevenue)}
          </p>
        </div>

        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "var(--gold)",
              marginBottom: "0.35rem",
            }}
          >
            Net Available for Charity
          </p>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "3.2rem",
              color: "var(--gold)",
              lineHeight: 1,
            }}
          >
            {fmtMoney(netForCharity)}
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "var(--gold)",
              marginBottom: "0.25rem",
            }}
          >
            Total Deductions
          </p>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.8rem",
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1,
            }}
          >
            {fmtMoney(totalFees + refundedAmount + totalAdSpend)}
          </p>
        </div>
      </div>

      {/* ── 2. KPI Summary Cards (4) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.5rem",
          marginBottom: "3rem",
        }}
      >
        <SummaryCard
          label="Registration Revenue"
          value={fmtMoney(regRevenue)}
          note={`${paidRegs.length} of ${registrations.length} registrations paid`}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <SummaryCard
          label="Sponsorship Revenue"
          value={fmtMoney(sponsorRevenue)}
          note={`${paidSponsors.length} sponsors paid`}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>}
        />
        <SummaryCard
          label="Pending"
          value={`${pendingRegs.length + pendingSponsors.length}`}
          note={`${fmtMoney(pendingRegValue + pendingSponsorValue)} awaiting payment`}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <SummaryCard
          label="Net After Fees"
          value={fmtMoney(netAfterFees)}
          note="after Stripe processing"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
        />
      </div>

      {/* ── 3. Two-column chart row ── */}
      <div
        className="finances-chart-row"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
          marginBottom: "3rem",
        }}
      >
        {/* Left — Revenue Over Time (AreaChart) */}
        <div
          style={{
            background: "var(--white)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            padding: "1.5rem",
          }}
        >
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.2rem",
              fontWeight: 400,
              marginBottom: "1rem",
            }}
          >
            Revenue Over Time
          </h2>
          {areaData.length === 0 ? (
            <div
              style={{
                height: "280px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-light)",
              }}
            >
              No revenue data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={areaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.reg} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.reg} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradSponsor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.sponsor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.sponsor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#999" }}
                  axisLine={{ stroke: "#ddd" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${(v / 100).toLocaleString()}`}
                  tick={{ fontSize: 11, fill: "#999" }}
                  axisLine={false}
                  tickLine={false}
                  width={65}
                />
                <Tooltip
                  formatter={(value: number | undefined, name: string | undefined) => {
                    const v = typeof value === "number" ? value : 0;
                    const label = name === "registrations" ? "Registrations" : name === "sponsorships" ? "Sponsorships" : "Total";
                    return [fmtMoney(v), label];
                  }}
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={{
                    background: "var(--white)",
                    border: "1px solid #ddd",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                    fontSize: "0.85rem",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="registrations"
                  stackId="1"
                  stroke={COLORS.reg}
                  strokeWidth={2}
                  fill="url(#gradReg)"
                />
                <Area
                  type="monotone"
                  dataKey="sponsorships"
                  stackId="1"
                  stroke={COLORS.sponsor}
                  strokeWidth={2}
                  fill="url(#gradSponsor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {/* Legend */}
          <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", padding: "0.75rem 0 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ width: "10px", height: "10px", background: COLORS.reg, display: "inline-block", borderRadius: "2px" }} />
              <span style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>Registrations</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ width: "10px", height: "10px", background: COLORS.sponsor, display: "inline-block", borderRadius: "2px" }} />
              <span style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>Sponsorships</span>
            </div>
          </div>
        </div>

        {/* Right — Revenue Split (Donut PieChart) */}
        <div
          style={{
            background: "var(--white)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            padding: "1.5rem",
          }}
        >
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.2rem",
              fontWeight: 400,
              marginBottom: "1rem",
            }}
          >
            Revenue Split
          </h2>
          {totalRevenue === 0 ? (
            <div
              style={{
                height: "280px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-light)",
              }}
            >
              No revenue data yet
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={2}
                    dataKey="value"
                    animationDuration={800}
                  >
                    <Cell fill={COLORS.reg} />
                    <Cell fill={COLORS.sponsor} />
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) => fmtMoney(typeof value === "number" ? value : 0)}
                    contentStyle={{
                      background: "var(--white)",
                      border: "1px solid #ddd",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                      fontSize: "0.85rem",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -60%)",
                  textAlign: "center",
                  pointerEvents: "none",
                }}
              >
                <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-light)", marginBottom: "0.15rem" }}>
                  Total
                </p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: "var(--charcoal)" }}>
                  {fmtMoney(totalRevenue)}
                </p>
              </div>
            </div>
          )}

          {/* Tier breakdown + pipeline */}
          <div style={{ fontSize: "0.85rem", color: "var(--text-light)", marginTop: "0.5rem" }}>
            {Object.entries(tierBreakdown).map(([tier, data]) => (
              <p key={tier} style={{ margin: "0.15rem 0" }}>
                {data.count} {tier} = {fmtMoney(data.total)}
              </p>
            ))}
            {Object.keys(tierBreakdown).length === 0 && <p>No paid sponsors yet</p>}
            {pendingSponsors.length > 0 && (
              <p style={{ marginTop: "0.35rem" }}>
                Pipeline: {pendingSponsors.length} unpaid &middot; ~{fmtMoney(pendingSponsorValue)} est.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Financial Summary (P&L Ledger) ── */}
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.4rem",
          fontWeight: 400,
          marginBottom: "1rem",
        }}
      >
        Financial Summary
      </h2>
      <div
        style={{
          background: "var(--white)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          padding: "2rem",
          marginBottom: "3rem",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
          <tbody>
            <LedgerRow label="Gross Revenue (Registrations)" amount={regRevenue} />
            <LedgerRow label="Gross Revenue (Sponsorships)" amount={sponsorRevenue} />
            <LedgerRow label="Total Gross Revenue" amount={totalRevenue} bold separator />
            <LedgerRow label="Less: Stripe Processing Fees (est.)" amount={-totalFees} />
            <LedgerRow label="Less: Refunds Issued" amount={-refundedAmount} />
            <LedgerRow label="Less: Ad Spend" amount={-totalAdSpend} />
            <LedgerRow
              label="Net Available for Charity"
              amount={netForCharity}
              bold
              separator
              highlight
            />
          </tbody>
        </table>
      </div>

      {/* ── 6. Transaction History ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.4rem",
            fontWeight: 400,
          }}
        >
          Transaction History
        </h2>
        <button
          onClick={exportCSV}
          style={{
            padding: "0.5rem 1.25rem",
            background: "var(--charcoal)",
            color: "var(--gold)",
            border: "none",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
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
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Search name, company, vehicle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: "1 1 200px",
            padding: "0.6rem 1rem",
            border: "1px solid #ddd",
            fontSize: "0.9rem",
            background: "var(--white)",
          }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | "registration" | "sponsorship")}
          style={{
            padding: "0.6rem 1rem",
            border: "1px solid #ddd",
            fontSize: "0.9rem",
            background: "var(--white)",
            cursor: "pointer",
          }}
        >
          <option value="all">All Types</option>
          <option value="registration">Registrations</option>
          <option value="sponsorship">Sponsorships</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "paid" | "pending" | "refunded")}
          style={{
            padding: "0.6rem 1rem",
            border: "1px solid #ddd",
            fontSize: "0.9rem",
            background: "var(--white)",
            cursor: "pointer",
          }}
        >
          <option value="all">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
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
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ background: "var(--cream)", textAlign: "left" }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Description</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Est. Fee</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Net</th>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, width: "40px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr
                key={`${t.type}-${t.id}`}
                style={{ borderBottom: "1px solid #eee", cursor: "pointer" }}
                onClick={() => router.push(t.detailUrl)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                <td style={tdStyle}>{new Date(t.date).toLocaleDateString()}</td>
                <td style={tdStyle}>
                  <TypeBadge type={t.type} />
                </td>
                <td style={tdStyle}>{t.description}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {fmtMoney(t.amountCents)}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--text-light)" }}>
                  {t.feeCents > 0 ? fmtMoney(t.feeCents) : "\u2014"}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {t.netCents > 0 ? fmtMoney(t.netCents) : "\u2014"}
                </td>
                <td style={tdStyle}>
                  <TransactionStatusBadge status={t.status} />
                </td>
                <td style={{ ...tdStyle, textAlign: "center", color: "var(--text-light)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{ ...tdStyle, textAlign: "center", color: "var(--text-light)", padding: "2rem 1rem" }}
                >
                  No transactions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Responsive: stack chart columns on narrow screens */}
      <style>{`
        @media (max-width: 900px) {
          .finances-chart-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}

// ── Components ──

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

function TypeBadge({ type }: { type: "registration" | "sponsorship" }) {
  const isReg = type === "registration";
  return (
    <StatusBadge
      label={isReg ? "Registration" : "Sponsorship"}
      color={isReg ? "#1565c0" : "#7b1fa2"}
      bg={isReg ? "#e3f2fd" : "#f3e5f5"}
    />
  );
}

function TransactionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; color: string }> = {
    paid: { label: "Paid", bg: "#e8f5e9", color: "#2e7d32" },
    pending: { label: "Pending", bg: "#fff3e0", color: "#e65100" },
    refunded: { label: "Refunded", bg: "#ffebee", color: "#c62828" },
    prospect: { label: "Prospect", bg: "#ede7f6", color: "#5e35b1" },
    inquired: { label: "Inquired", bg: "#e3f2fd", color: "#1565c0" },
    engaged: { label: "Engaged", bg: "#fff3e0", color: "#e65100" },
  };

  const { label, bg, color } = config[status] || { label: status, bg: "#f5f5f5", color: "#666" };

  return <StatusBadge label={label} color={color} bg={bg} />;
}

function LedgerRow({
  label,
  amount,
  bold,
  separator,
  highlight,
}: {
  label: string;
  amount: number;
  bold?: boolean;
  separator?: boolean;
  highlight?: boolean;
}) {
  return (
    <tr>
      <td
        style={{
          padding: "0.6rem 0",
          fontWeight: bold ? 700 : 400,
          borderTop: separator ? "2px solid var(--charcoal)" : undefined,
          color: highlight ? "#2e7d32" : "var(--charcoal)",
          fontSize: highlight ? "1.1rem" : undefined,
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: "0.6rem 0",
          textAlign: "right",
          fontWeight: bold ? 700 : 400,
          fontVariantNumeric: "tabular-nums",
          borderTop: separator ? "2px solid var(--charcoal)" : undefined,
          color: highlight ? "#2e7d32" : amount < 0 ? "#c62828" : "var(--charcoal)",
          fontSize: highlight ? "1.1rem" : undefined,
        }}
      >
        {fmtMoney(amount)}
      </td>
    </tr>
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
