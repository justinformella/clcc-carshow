"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Registration, Sponsor, SponsorStatus, AdCampaign, Admin } from "@/types/database";
import { MAX_REGISTRATIONS } from "@/types/database";

export default function AdminDashboard() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);
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

      // Fetch current admin record
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: adminData } = await supabase
          .from("admins")
          .select("*")
          .eq("email", user.email)
          .single();
        if (adminData) setCurrentAdmin(adminData as Admin);
      }

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

  const mySponsors = currentAdmin
    ? sponsors.filter((s) => s.assigned_to === currentAdmin.id)
    : [];

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
          marginBottom: "2rem",
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

      {/* ─── Registrations ─── */}
      <SectionHeader title="Registrations" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2.5rem",
        }}
      >
        <DashboardCard
          href="/admin/registrations"
          label="Registrations"
          value={`${registrations.length}`}
          note={`of ${MAX_REGISTRATIONS} max`}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <DashboardCard
          href="/admin/finances"
          label="Revenue"
          value={`$${(totalRevenue / 100).toLocaleString()}`}
          note={unpaidRegistrations.length > 0
            ? `collected \u00b7 ${unpaidRegistrations.length} unpaid`
            : "collected"}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
        />
        <DashboardCard
          href="/admin/check-in"
          label="Checked In"
          value={`${checkedIn}`}
          note={`of ${registrations.length} registered`}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
        />
        <DashboardCard
          href="/admin/registrations"
          label="Spots Remaining"
          value={`${MAX_REGISTRATIONS - registrations.length}`}
          note="available"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
        />
      </div>

      {/* ─── Sponsors & Revenue | Marketing ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "2.5rem",
          marginBottom: "2.5rem",
        }}
      >
        {/* Left: Sponsors & Revenue */}
        <div>
          <SectionHeader title="Sponsors & Revenue" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1.25rem",
            }}
          >
            <DashboardCard
              href="/admin/sponsors"
              label="Sponsors"
              value={`${sponsors.length}`}
              note={`${sponsors.filter((s) => s.status === "paid").length} paid`}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>}
            />
            <DashboardCard
              href="/admin/finances"
              label="Sponsor Revenue"
              value={`$${(sponsorRevenue / 100).toLocaleString()}`}
              note="from paid sponsors"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
            />
            <DashboardCard
              href="/admin/sponsors"
              label="Open Pipeline"
              value={openPipeline > 0 ? `$${(openPipeline / 100).toLocaleString()}` : "$0"}
              note={`${openSponsors.length} unpaid`}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
            />
          </div>
        </div>

        {/* Right: Marketing */}
        <div>
          <SectionHeader title="Marketing" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1.25rem",
            }}
          >
            <DashboardCard
              href="/admin/marketing"
              label="Ad Registrations"
              value={`${adRegistrations.length}`}
              note={adSourceSummary || "none yet"}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>}
            />
            <DashboardCard
              href="/admin/marketing"
              label="Ad Spend"
              value={`$${(totalAdSpend / 100).toLocaleString()}`}
              note={`across ${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""}`}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>}
            />
          </div>
        </div>
      </div>

      {/* ─── My Sponsors ─── */}
      <SectionHeader title="My Sponsors" />
      {mySponsors.length === 0 ? (
        <div
          style={{
            background: "var(--white)",
            border: "1px solid rgba(0,0,0,0.08)",
            padding: "2rem",
            textAlign: "center",
            color: "var(--text-light)",
            fontSize: "0.9rem",
          }}
        >
          No sponsors assigned to you yet.{" "}
          <Link href="/admin/sponsors" style={{ color: "var(--gold)", textDecoration: "underline" }}>
            View all sponsors
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {mySponsors.map((s) => (
            <Link
              key={s.id}
              href={`/admin/sponsors/${s.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  background: "var(--white)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  padding: "1.25rem 1.5rem",
                  transition: "all 0.15s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--gold)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)";
                  e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <p style={{ fontWeight: 600, fontSize: "1rem", color: "var(--charcoal)" }}>
                    {s.company}
                  </p>
                  <SponsorStatusBadge status={s.status} />
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "0.25rem" }}>
                  {s.name}
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
                  {s.sponsorship_level}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

/* ─── Helper Components ─── */

function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "1.25rem",
        fontWeight: 400,
        paddingBottom: "0.5rem",
        borderBottom: "1px solid rgba(0,0,0,0.1)",
        marginBottom: "1.25rem",
      }}
    >
      {title}
    </h2>
  );
}

function DashboardCard({
  href,
  label,
  value,
  note,
  icon,
}: {
  href: string;
  label: string;
  value: string;
  note: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          background: "var(--white)",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          padding: "1.5rem",
          transition: "all 0.15s ease",
          cursor: "pointer",
          height: "100%",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--gold)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)";
          e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)";
          e.currentTarget.style.transform = "translateY(0)";
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
    </Link>
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
