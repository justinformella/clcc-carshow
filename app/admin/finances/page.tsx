"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Registration, Sponsor, AdCampaign, SponsorshipTier, ShowExpense } from "@/types/database";
import { REGISTRATION_PRICE_CENTS, MAX_REGISTRATIONS as MAX_REGISTRATIONS_DEFAULT } from "@/types/database";
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
  const [tiers, setTiers] = useState<SponsorshipTier[]>([]);
  const [expenses, setExpenses] = useState<ShowExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState<"registration" | "sponsorship" | "donation" | null>(null);
  const [maxRegistrations, setMaxRegistrations] = useState(MAX_REGISTRATIONS_DEFAULT);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "registration" | "sponsorship">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "refunded">("all");

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const [regResult, sponsorResult, campaignResult, settingResult, tierResult, expenseResult] = await Promise.all([
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
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", "max_registrations")
          .maybeSingle(),
        supabase
          .from("sponsorship_tiers")
          .select("*")
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("show_expenses")
          .select("*")
          .order("date", { ascending: false }),
      ]);

      setRegistrations(regResult.data || []);
      setSponsors((sponsorResult.data as Sponsor[]) || []);
      setCampaigns((campaignResult.data as AdCampaign[]) || []);
      setTiers((tierResult.data as SponsorshipTier[]) || []);
      setExpenses((expenseResult.data as ShowExpense[]) || []);
      if (settingResult.data?.value) {
        const v = parseInt(settingResult.data.value, 10);
        if (!isNaN(v)) setMaxRegistrations(v);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // === Computed values ===

  const paidRegs = registrations.filter((r) => r.payment_status === "paid");
  const pendingRegs = registrations.filter((r) => r.payment_status === "pending");
  const refundedRegs = registrations.filter((r) => r.payment_status === "refunded");
  const paidSponsors = sponsors.filter((s) => s.status === "paid");
  const confirmedSponsors = sponsors.filter((s) => s.status === "paid" || s.status === "engaged");

  const regRevenue = paidRegs.reduce((sum, r) => sum + (r.amount_paid || 0), 0);
  const sponsorRevenue = paidSponsors.reduce((sum, s) => sum + (s.sponsorship_amount || 0), 0);
  const regDonationRevenue = paidRegs.reduce((sum, r) => sum + (r.donation_cents || 0), 0);
  const sponsorDonationRevenue = paidSponsors.reduce((sum, s) => sum + (s.donation_cents || 0), 0);
  const donationRevenue = regDonationRevenue + sponsorDonationRevenue;
  const donorCount = paidRegs.filter((r) => (r.donation_cents || 0) > 0).length + paidSponsors.filter((s) => (s.donation_cents || 0) > 0).length;
  const refundedAmount = refundedRegs.reduce((sum, r) => sum + (r.amount_paid || 0), 0);

  const pendingSponsors = sponsors.filter((s) =>
    s.status === "prospect" || s.status === "inquired"
  );
  const pendingSponsorValue = pendingSponsors.reduce((sum, s) => {
    const match = s.sponsorship_level.match(/\$([0-9,]+)/);
    return sum + (match ? parseInt(match[1].replace(/,/g, "")) * 100 : 0);
  }, 0);
  const pendingRegValue = pendingRegs.reduce((sum, r) => sum + (r.amount_paid || 0), 0);

  const totalRevenue = regRevenue + sponsorRevenue + donationRevenue;

  // Stripe fee estimate: applied to each paid registration (incl. donation) and paid sponsor
  const regFees = paidRegs.reduce((sum, r) => sum + estimateStripeFee((r.amount_paid || 0) + (r.donation_cents || 0)), 0);
  const sponsorFees = paidSponsors.reduce((sum, s) => sum + estimateStripeFee((s.sponsorship_amount || 0) + (s.donation_cents || 0)), 0);
  const totalFees = regFees + sponsorFees;

  const netAfterFees = totalRevenue - totalFees;

  // Projected income from committed but unpaid sponsors
  const committedUnpaid = sponsors.filter((s) => s.status === "engaged" && s.sponsorship_amount === 0);
  const committedProjected = committedUnpaid.reduce((sum, s) => {
    const match = s.sponsorship_level.match(/\$([0-9,]+)/);
    return sum + (match ? parseInt(match[1].replace(/,/g, "")) * 100 : 0);
  }, 0);
  const projectedTotal = totalRevenue + committedProjected;

  // Full capacity estimate: max registrations × $30 + avg donation rate + committed sponsors
  const avgDonationPerReg = paidRegs.length > 0 ? donationRevenue / paidRegs.length : 0;
  const fullCapacityReg = maxRegistrations * REGISTRATION_PRICE_CENTS;
  const fullCapacityDonations = Math.round(avgDonationPerReg * maxRegistrations);
  const fullCapacityTotal = fullCapacityReg + fullCapacityDonations + sponsorRevenue + committedProjected;

  const totalAdSpend = campaigns.reduce((sum, c) => sum + (c.spent_cents || 0), 0);

  const totalShowExpenses = expenses.reduce((sum, e) => sum + e.amount_cents, 0);
  const netForCharity = totalRevenue - totalFees - refundedAmount - totalAdSpend - totalShowExpenses;

  // Sponsorship tier breakdown
  const tierBreakdown: Record<string, { count: number; total: number }> = {};
  paidSponsors.forEach((s) => {
    const tier = s.sponsorship_level;
    if (!tierBreakdown[tier]) tierBreakdown[tier] = { count: 0, total: 0 };
    tierBreakdown[tier].count++;
    tierBreakdown[tier].total += s.sponsorship_amount || 0;
  });

  // Sponsor breakdown by tier and status
  const activeSponsors = sponsors.filter((s) => s.status !== "archived");

  // Helper: extract tier name from sponsorship_level string
  const extractTierName = (level: string) => {
    // Match tier names like "Community Sponsor ($500)" → "Community Sponsor"
    // Also handles plain tier names without price like "Community Sponsor"
    return level.replace(/\s*\(\$[0-9,]+\)\s*$/, "").trim();
  };

  // Helper: get tier price from tiers table, falling back to parsing the string
  const getTierPrice = (level: string): number => {
    const tierName = extractTierName(level);
    const tier = tiers.find((t) => t.name === tierName);
    if (tier) return tier.price_cents;
    const match = level.match(/\$([0-9,]+)/);
    return match ? parseInt(match[1].replace(/,/g, "")) * 100 : 0;
  };

  // Build a comprehensive breakdown by tier
  const sponsorTierData = (() => {
    const tierMap: Record<string, {
      tierName: string;
      priceCents: number;
      paid: Sponsor[];
      engaged: Sponsor[];
      committed: Sponsor[];
      inquired: Sponsor[];
      prospect: Sponsor[];
    }> = {};

    // Initialize from the tiers table
    for (const t of tiers) {
      tierMap[t.name] = {
        tierName: t.name,
        priceCents: t.price_cents,
        paid: [], engaged: [], committed: [], inquired: [], prospect: [],
      };
    }

    // Bucket each active sponsor into its tier
    for (const s of activeSponsors) {
      const tierName = extractTierName(s.sponsorship_level);
      if (!tierMap[tierName]) {
        tierMap[tierName] = {
          tierName,
          priceCents: getTierPrice(s.sponsorship_level),
          paid: [], engaged: [], committed: [], inquired: [], prospect: [],
        };
      }
      const bucket = tierMap[tierName];
      const status = s.status as string;
      if (status === "paid") bucket.paid.push(s);
      else if (status === "engaged") bucket.engaged.push(s);
      else if (status === "committed") bucket.committed.push(s);
      else if (status === "inquired") bucket.inquired.push(s);
      else if (status === "prospect") bucket.prospect.push(s);
    }

    // Sort by tier price descending
    return Object.values(tierMap).sort((a, b) => b.priceCents - a.priceCents);
  })();

  const totalSponsorPipeline = sponsorTierData.reduce((sum, t) => {
    const confirmedValue = t.paid.reduce((s, sp) => s + (sp.sponsorship_amount || 0), 0)
      + (t.engaged.length + t.committed.length) * t.priceCents;
    const pipelineValue = (t.inquired.length + t.prospect.length) * t.priceCents;
    return sum + confirmedValue + pipelineValue;
  }, 0);

  // === Chart data ===

  // Area chart data — cumulative revenue over time
  const areaData = (() => {
    const dayMap: Record<string, { reg: number; sponsor: number; donation: number }> = {};
    paidRegs.forEach((r) => {
      const day = (r.paid_at || r.created_at).slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { reg: 0, sponsor: 0, donation: 0 };
      dayMap[day].reg += r.amount_paid || 0;
      dayMap[day].donation += r.donation_cents || 0;
    });
    sponsors.filter((s) => s.status === "paid").forEach((s) => {
      const day = (s.paid_at || s.created_at).slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { reg: 0, sponsor: 0, donation: 0 };
      dayMap[day].sponsor += s.sponsorship_amount || 0;
    });
    const sortedDays = Object.keys(dayMap).sort();
    let cumReg = 0;
    let cumSponsor = 0;
    let cumDonation = 0;
    return sortedDays.map((day) => {
      cumReg += dayMap[day].reg;
      cumSponsor += dayMap[day].sponsor;
      cumDonation += dayMap[day].donation;
      const d = new Date(day + "T00:00:00");
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        registrations: cumReg,
        sponsorships: cumSponsor,
        donations: cumDonation,
        total: cumReg + cumSponsor + cumDonation,
      };
    });
  })();

  // Donut chart data
  const donutData = [
    { name: "Registrations", value: regRevenue },
    { name: "Sponsorships", value: sponsorRevenue },
    ...(regDonationRevenue > 0 ? [{ name: "Reg. Donations", value: regDonationRevenue }] : []),
    ...(sponsorDonationRevenue > 0 ? [{ name: "Sponsor Donations", value: sponsorDonationRevenue }] : []),
  ];

  // === Unified transaction list ===

  const allTransactions: Transaction[] = [
    ...registrations
      .filter((r) => r.payment_status !== "archived")
      .map((r) => ({
        id: r.id,
        date: r.created_at,
        type: "registration" as const,
        description: `${r.first_name} ${r.last_name} — ${r.vehicle_year} ${r.vehicle_make} ${r.vehicle_model}${(r.donation_cents || 0) > 0 ? ` + $${(r.donation_cents / 100).toFixed(0)} donation` : ""}`,
        amountCents: (r.amount_paid || 0) + (r.donation_cents || 0),
        feeCents: r.payment_status === "paid" ? estimateStripeFee((r.amount_paid || 0) + (r.donation_cents || 0)) : 0,
        netCents:
          r.payment_status === "paid"
            ? (r.amount_paid || 0) + (r.donation_cents || 0) - estimateStripeFee((r.amount_paid || 0) + (r.donation_cents || 0))
            : 0,
        status: r.payment_status,
        detailUrl: `/admin/registrations/${r.id}`,
      })),
    ...sponsors.map((s) => ({
      id: s.id,
      date: s.status === "paid" ? (s.paid_at || s.created_at) : s.created_at,
      type: "sponsorship" as const,
      description: `${s.company} — ${s.sponsorship_level}`,
      amountCents: s.sponsorship_amount || 0,
      feeCents: (s.status === "paid" || s.status === "engaged") ? estimateStripeFee(s.sponsorship_amount || 0) : 0,
      netCents:
        (s.status === "paid" || s.status === "engaged")
          ? (s.sponsorship_amount || 0) - estimateStripeFee(s.sponsorship_amount || 0)
          : 0,
      status: (s.status === "paid" || s.status === "engaged") ? "paid" : s.status === "prospect" || s.status === "inquired" ? "pending" : s.status,
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
    const header = "Date,Type,Description,Amount,Donation,Est. Fee,Net,Status";
    const rows = filtered.map((t) => {
      // Look up donation for registration transactions
      const donation = t.type === "registration"
        ? registrations.find((r) => r.id === t.id)?.donation_cents || 0
        : 0;
      return [
        new Date(t.date).toLocaleDateString(),
        t.type === "registration" ? "Registration" : "Sponsorship",
        `"${t.description.replace(/"/g, '""')}"`,
        fmtMoney(t.amountCents),
        donation > 0 ? fmtMoney(donation) : "$0.00",
        fmtMoney(t.feeCents),
        fmtMoney(t.netCents),
        t.status.charAt(0).toUpperCase() + t.status.slice(1),
      ].join(",");
    });
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
            {fmtMoney(totalFees + refundedAmount + totalAdSpend + totalShowExpenses)}
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
          onClick={() => setDetailModal("registration")}
        />
        <SummaryCard
          label="Sponsorship Revenue"
          value={fmtMoney(sponsorRevenue)}
          note={`${paidSponsors.length} paid · ${confirmedSponsors.length - paidSponsors.length} committed`}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>}
          onClick={() => setDetailModal("sponsorship")}
        />
        <SummaryCard
          label="Donation Revenue"
          value={fmtMoney(donationRevenue)}
          note={`Reg: ${fmtMoney(regDonationRevenue)} · Sponsors: ${fmtMoney(sponsorDonationRevenue)}`}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>}
          onClick={() => setDetailModal("donation")}
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

      {/* ── Forecast Section ── */}
      <div
        style={{
          background: "var(--charcoal)",
          padding: "2rem",
          marginBottom: "3rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", fontWeight: 400, color: "#fff", margin: 0 }}>
              Full Capacity Forecast
            </h2>
            <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.35)", marginLeft: "0.5rem" }}>
              {maxRegistrations} vehicles at ${REGISTRATION_PRICE_CENTS / 100}/each
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1px", background: "rgba(255,255,255,0.08)", marginBottom: "1.5rem" }}>
            {[
              { label: "Registration Revenue", value: fmtMoney(fullCapacityReg), detail: `${maxRegistrations} × $${REGISTRATION_PRICE_CENTS / 100}` },
              { label: "Est. Donations", value: fmtMoney(fullCapacityDonations), detail: paidRegs.length > 0 ? `${fmtMoney(Math.round(avgDonationPerReg))} avg/registrant` : "no donation data yet" },
              { label: "Sponsor Revenue", value: fmtMoney(sponsorRevenue + committedProjected), detail: (() => {
                const paid = sponsors.filter((s) => s.status === "paid").length;
                const committed = committedUnpaid.length;
                if (paid > 0 && committed > 0) return `${paid} paid + ${committed} committed`;
                if (paid > 0) return `${paid} paid`;
                if (committed > 0) return `${committed} committed`;
                return "no sponsors";
              })() },
              { label: "Gross Revenue", value: fmtMoney(fullCapacityTotal), highlight: true, detail: "total before fees" },
              { label: "Est. Stripe Fees", value: `- ${fmtMoney(Math.round(estimateStripeFee(REGISTRATION_PRICE_CENTS) * maxRegistrations + (fullCapacityDonations > 0 ? estimateStripeFee(Math.round(avgDonationPerReg)) * maxRegistrations : 0)))}`, detail: "~2.9% + $0.30/txn" },
              { label: "Net to Charity", value: fmtMoney(fullCapacityTotal - Math.round(estimateStripeFee(REGISTRATION_PRICE_CENTS) * maxRegistrations + (fullCapacityDonations > 0 ? estimateStripeFee(Math.round(avgDonationPerReg)) * maxRegistrations : 0)) - totalAdSpend - totalShowExpenses), highlight: true, detail: "after fees, ad spend & expenses", gold: true },
            ].map((item) => (
              <div key={item.label} style={{ background: "var(--charcoal)", padding: "1.25rem 1rem" }}>
                <p style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.35)", marginBottom: "0.4rem" }}>{item.label}</p>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: item.highlight ? "1.6rem" : "1.3rem",
                  color: (item as { gold?: boolean }).gold ? "#c9a84c" : "#fff",
                  lineHeight: 1,
                  marginBottom: "0.3rem",
                }}>
                  {item.value}
                </p>
                <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }}>{item.detail}</p>
              </div>
            ))}
          </div>

          {/* Progress toward capacity */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>
                {paidRegs.length} of {maxRegistrations} spots filled
              </span>
              <span style={{ fontSize: "0.7rem", color: "#c9a84c", fontWeight: 600 }}>
                {Math.round((paidRegs.length / maxRegistrations) * 100)}%
              </span>
            </div>
            <div style={{ height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min((paidRegs.length / maxRegistrations) * 100, 100)}%`,
                background: "linear-gradient(to right, #c9a84c, #e8c860)",
                borderRadius: "3px",
                transition: "width 1s ease",
              }} />
            </div>
          </div>
        </div>
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
                  <linearGradient id="gradDonation" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.green} stopOpacity={0.02} />
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
                    const label = name === "registrations" ? "Registrations" : name === "sponsorships" ? "Sponsorships" : name === "donations" ? "Donations" : "Total";
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
                  stroke={COLORS.reg}
                  strokeWidth={2}
                  fill="url(#gradReg)"
                />
                <Area
                  type="monotone"
                  dataKey="sponsorships"
                  stroke={COLORS.sponsor}
                  strokeWidth={2}
                  fill="url(#gradSponsor)"
                />
                <Area
                  type="monotone"
                  dataKey="donations"
                  stroke={COLORS.green}
                  strokeWidth={2}
                  fill="url(#gradDonation)"
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
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ width: "10px", height: "10px", background: COLORS.green, display: "inline-block", borderRadius: "2px" }} />
              <span style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>Donations</span>
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
                    {donationRevenue > 0 && <Cell fill={COLORS.green} />}
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

      {/* ── 3b. Sponsorship Finance Breakdown ── */}
      <div
        style={{
          background: "var(--white)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          padding: "1.5rem 2rem",
          marginBottom: "3rem",
        }}
      >
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.4rem",
            fontWeight: 400,
            marginBottom: "1.5rem",
          }}
        >
          Sponsorship Breakdown
        </h2>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.85rem",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
              <th style={{ padding: "0.6rem 1rem", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-light)" }}>Tier</th>
              <th style={{ padding: "0.6rem 1rem", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-light)", textAlign: "right" }}>Rate</th>
              <th style={{ padding: "0.6rem 1rem", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#2e7d32", textAlign: "center" }}>Paid</th>
              <th style={{ padding: "0.6rem 1rem", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#1565c0", textAlign: "center" }}>Committed</th>
              <th style={{ padding: "0.6rem 1rem", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#e65100", textAlign: "center" }}>Pipeline</th>
              <th style={{ padding: "0.6rem 1rem", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#2e7d32", textAlign: "right" }}>Paid $</th>
              <th style={{ padding: "0.6rem 1rem", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#1565c0", textAlign: "right" }}>Committed $</th>
              <th style={{ padding: "0.6rem 1rem", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#e65100", textAlign: "right" }}>Pipeline $</th>
            </tr>
          </thead>
          <tbody>
            {sponsorTierData.map((t) => {
              const paidCents = t.paid.reduce((s, sp) => s + (sp.sponsorship_amount || 0) + (sp.donation_cents || 0), 0);
              const paidDonations = t.paid.reduce((s, sp) => s + (sp.donation_cents || 0), 0);
              const committedCount = t.engaged.length + t.committed.length;
              const committedCents = committedCount * t.priceCents;
              const pipelineCount = t.inquired.length + t.prospect.length;
              const pipelineCents = pipelineCount * t.priceCents;
              const totalSponsors = t.paid.length + committedCount + pipelineCount;

              if (totalSponsors === 0) return null;

              return (
                <tr key={t.tierName} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 500 }}>{t.tierName}</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "var(--text-light)" }}>{fmtMoney(t.priceCents)}</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                    {t.paid.length > 0 ? (
                      <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", fontSize: "0.7rem", fontWeight: 600, background: "#e8f5e9", color: "#2e7d32" }}>
                        {t.paid.length}
                      </span>
                    ) : (
                      <span style={{ color: "#ccc" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                    {committedCount > 0 ? (
                      <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", fontSize: "0.7rem", fontWeight: 600, background: "#e3f2fd", color: "#1565c0" }}>
                        {committedCount}
                      </span>
                    ) : (
                      <span style={{ color: "#ccc" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                    {pipelineCount > 0 ? (
                      <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", fontSize: "0.7rem", fontWeight: 600, background: "#fff3e0", color: "#e65100" }}>
                        {pipelineCount}
                      </span>
                    ) : (
                      <span style={{ color: "#ccc" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: paidCents > 0 ? "#2e7d32" : "var(--text-light)" }}>
                    {paidCents > 0 ? fmtMoney(paidCents) : "—"}
                    {paidDonations > 0 && (
                      <div style={{ fontSize: "0.7rem", fontWeight: 400, color: "#2e7d32" }}>+ {fmtMoney(paidDonations)} donations</div>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 500, color: committedCents > 0 ? "#1565c0" : "var(--text-light)" }}>
                    {committedCents > 0 ? fmtMoney(committedCents) : "—"}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: pipelineCents > 0 ? "#e65100" : "var(--text-light)" }}>
                    {pipelineCents > 0 ? fmtMoney(pipelineCents) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid #ddd" }}>
              <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Total</td>
              <td />
              <td style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 600 }}>
                {sponsorTierData.reduce((s, t) => s + t.paid.length, 0)}
              </td>
              <td style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 600 }}>
                {sponsorTierData.reduce((s, t) => s + t.engaged.length + t.committed.length, 0)}
              </td>
              <td style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 600 }}>
                {sponsorTierData.reduce((s, t) => s + t.inquired.length + t.prospect.length, 0)}
              </td>
              <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "#2e7d32" }}>
                {fmtMoney(sponsorTierData.reduce((s, t) => s + t.paid.reduce((s2, sp) => s2 + (sp.sponsorship_amount || 0) + (sp.donation_cents || 0), 0), 0))}
              </td>
              <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "#1565c0" }}>
                {fmtMoney(sponsorTierData.reduce((s, t) => s + (t.engaged.length + t.committed.length) * t.priceCents, 0))}
              </td>
              <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "#e65100" }}>
                {fmtMoney(sponsorTierData.reduce((s, t) => s + (t.inquired.length + t.prospect.length) * t.priceCents, 0))}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Sponsor names by status */}
        <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
          {[
            { label: "Paid", color: "#2e7d32", bg: "#e8f5e9", items: activeSponsors.filter((s) => s.status === "paid") },
            { label: "Committed", color: "#1565c0", bg: "#e3f2fd", items: activeSponsors.filter((s) => s.status === "engaged" || (s.status as string) === "committed") },
            { label: "Pipeline", color: "#e65100", bg: "#fff3e0", items: activeSponsors.filter((s) => s.status === "prospect" || s.status === "inquired") },
          ].map(({ label, color, bg, items }) => (
            <div key={label}>
              <h4 style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color, marginBottom: "0.5rem" }}>
                {label} ({items.length})
              </h4>
              {items.length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>None</p>
              ) : (
                items.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => router.push(`/admin/sponsors/${s.id}`)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.4rem 0.6rem",
                      marginBottom: "0.3rem",
                      background: bg,
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    <span style={{ fontWeight: 500, color: "var(--charcoal)" }}>{s.company}</span>
                    <span style={{ fontSize: "0.75rem", color }}>
                      {extractTierName(s.sponsorship_level)}
                      {` · ${fmtMoney((s.sponsorship_amount || 0) + (s.donation_cents || 0) || getTierPrice(s.sponsorship_level))}`}
                    </span>
                  </div>
                ))
              )}
            </div>
          ))}
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
            <LedgerRow label="Gross Revenue (Registration Donations)" amount={regDonationRevenue} />
            {sponsorDonationRevenue > 0 && (
              <LedgerRow label="Gross Revenue (Sponsor Donations)" amount={sponsorDonationRevenue} />
            )}
            <LedgerRow label="Total Gross Revenue" amount={totalRevenue} bold separator />
            <LedgerRow label="Less: Stripe Processing Fees (est.)" amount={-totalFees} />
            <LedgerRow label="Less: Refunds Issued" amount={-refundedAmount} />
            <LedgerRow label="Less: Ad Spend" amount={-totalAdSpend} />
            <LedgerRow label="Less: Show Expenses" amount={-totalShowExpenses} />
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

      {/* Detail Modal */}
      {detailModal && (
        <>
          <div
            onClick={() => setDetailModal(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 999,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "var(--white)",
              padding: "2rem",
              width: "100%",
              maxWidth: "700px",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              zIndex: 1000,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", fontWeight: 400, margin: 0 }}>
                {detailModal === "registration" ? "Registration Revenue" : detailModal === "sponsorship" ? "Sponsorship Revenue" : "Donation Revenue"}
              </h2>
              <button
                onClick={() => setDetailModal(null)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-light)", padding: "0.25rem" }}
              >
                &times;
              </button>
            </div>

            {detailModal === "registration" && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--cream)", textAlign: "left" }}>
                    <th style={modalThStyle}>Name</th>
                    <th style={modalThStyle}>Vehicle</th>
                    <th style={modalThStyle}>Amount</th>
                    <th style={modalThStyle}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paidRegs.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={modalTdStyle}>{r.first_name} {r.last_name}</td>
                      <td style={modalTdStyle}>{r.vehicle_year} {r.vehicle_make} {r.vehicle_model}</td>
                      <td style={modalTdStyle}>{fmtMoney(r.amount_paid || 0)}</td>
                      <td style={modalTdStyle}>{r.paid_at ? new Date(r.paid_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                  {paidRegs.length === 0 && (
                    <tr><td colSpan={4} style={{ ...modalTdStyle, textAlign: "center", color: "var(--text-light)" }}>No paid registrations yet</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 600, borderTop: "2px solid #ddd" }}>
                    <td colSpan={2} style={modalTdStyle}>Total</td>
                    <td style={modalTdStyle}>{fmtMoney(regRevenue)}</td>
                    <td style={modalTdStyle}></td>
                  </tr>
                </tfoot>
              </table>
            )}

            {detailModal === "sponsorship" && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--cream)", textAlign: "left" }}>
                    <th style={modalThStyle}>Company</th>
                    <th style={modalThStyle}>Level</th>
                    <th style={modalThStyle}>Status</th>
                    <th style={modalThStyle}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paidSponsors.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={modalTdStyle}>{s.company}</td>
                      <td style={modalTdStyle}>{s.sponsorship_level}</td>
                      <td style={modalTdStyle}><span style={{ background: "#e8f5e9", color: "#2e7d32", padding: "0.1rem 0.4rem", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase" }}>Paid</span></td>
                      <td style={modalTdStyle}>{fmtMoney(s.sponsorship_amount || 0)}</td>
                    </tr>
                  ))}
                  {paidSponsors.length === 0 && (
                    <tr><td colSpan={4} style={{ ...modalTdStyle, textAlign: "center", color: "var(--text-light)" }}>No paid sponsors yet</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 600, borderTop: "2px solid #ddd" }}>
                    <td colSpan={3} style={modalTdStyle}>Total (Paid)</td>
                    <td style={modalTdStyle}>{fmtMoney(sponsorRevenue)}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {detailModal === "donation" && (
              <>
                <h4 style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-light)", margin: "0 0 0.5rem" }}>Registration Donations</h4>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                  <thead>
                    <tr style={{ background: "var(--cream)", textAlign: "left" }}>
                      <th style={modalThStyle}>Name</th>
                      <th style={modalThStyle}>Email</th>
                      <th style={modalThStyle}>Donation</th>
                      <th style={modalThStyle}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.filter((r) => (r.donation_cents || 0) > 0 && r.payment_status === "paid").map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={modalTdStyle}>{r.first_name} {r.last_name}</td>
                        <td style={modalTdStyle}>{r.email}</td>
                        <td style={modalTdStyle}>{fmtMoney(r.donation_cents || 0)}</td>
                        <td style={modalTdStyle}>{r.paid_at ? new Date(r.paid_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                    {registrations.filter((r) => (r.donation_cents || 0) > 0 && r.payment_status === "paid").length === 0 && (
                      <tr><td colSpan={4} style={{ ...modalTdStyle, textAlign: "center", color: "var(--text-light)" }}>No registration donations yet</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 600, borderTop: "2px solid #ddd" }}>
                      <td colSpan={2} style={modalTdStyle}>Subtotal</td>
                      <td style={modalTdStyle}>{fmtMoney(regDonationRevenue)}</td>
                      <td style={modalTdStyle}></td>
                    </tr>
                  </tfoot>
                </table>

                <h4 style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-light)", margin: "0 0 0.5rem" }}>Sponsor Donations</h4>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ background: "var(--cream)", textAlign: "left" }}>
                      <th style={modalThStyle}>Company</th>
                      <th style={modalThStyle}>Contact</th>
                      <th style={modalThStyle}>Donation</th>
                      <th style={modalThStyle}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sponsors.filter((s) => (s.donation_cents || 0) > 0 && s.status === "paid").map((s) => (
                      <tr key={s.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={modalTdStyle}>{s.company}</td>
                        <td style={modalTdStyle}>{s.name}</td>
                        <td style={modalTdStyle}>{fmtMoney(s.donation_cents || 0)}</td>
                        <td style={modalTdStyle}>{s.paid_at ? new Date(s.paid_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                    {sponsors.filter((s) => (s.donation_cents || 0) > 0 && s.status === "paid").length === 0 && (
                      <tr><td colSpan={4} style={{ ...modalTdStyle, textAlign: "center", color: "var(--text-light)" }}>No sponsor donations yet</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 600, borderTop: "2px solid #ddd" }}>
                      <td colSpan={2} style={modalTdStyle}>Subtotal</td>
                      <td style={modalTdStyle}>{fmtMoney(sponsorDonationRevenue)}</td>
                      <td style={modalTdStyle}></td>
                    </tr>
                    <tr style={{ fontWeight: 700, borderTop: "1px solid #ddd" }}>
                      <td colSpan={2} style={modalTdStyle}>Total Donations</td>
                      <td style={modalTdStyle}>{fmtMoney(donationRevenue)}</td>
                      <td style={modalTdStyle}></td>
                    </tr>
                  </tfoot>
                </table>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}

const modalThStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  fontWeight: 600,
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-light)",
};

const modalTdStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
};

// ── Components ──

function SummaryCard({
  label,
  value,
  note,
  icon,
  onClick,
}: {
  label: string;
  value: string;
  note: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--white)",
        padding: "1.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = "var(--gold)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = "transparent";
          e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
          e.currentTarget.style.transform = "translateY(0)";
        }
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
    engaged: { label: "Committed", bg: "#fff3e0", color: "#e65100" },
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
