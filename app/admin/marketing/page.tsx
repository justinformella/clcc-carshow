"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { AdCampaign, MarketingProspect, MarketingSend } from "@/types/database";
import { customMarketingEmailHtml } from "@/lib/marketing-email-templates";
import { freeCarOfferEmail, FREE_CAR_DEFAULT_SUBJECT, FREE_CAR_DEFAULT_BODY } from "@/lib/email-templates";

type RegistrationUtm = {
  id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  payment_status: string;
};

type ProspectWithSends = MarketingProspect & { sends: MarketingSend[] };

type Tab = "email" | "ads";

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("email");

  return (
    <>
      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "2rem",
          fontWeight: 400,
          marginBottom: "1.5rem",
        }}
      >
        Marketing
      </h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: "1.5rem", borderBottom: "2px solid #eee" }}>
        <TabButton label="Email Outreach" active={activeTab === "email"} onClick={() => setActiveTab("email")} />
        <TabButton label="Ad Campaigns" active={activeTab === "ads"} onClick={() => setActiveTab("ads")} />
      </div>

      {activeTab === "email" && <EmailOutreachTab />}
      {activeTab === "ads" && <AdCampaignsTab />}
    </>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.75rem 1.5rem",
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid var(--gold)" : "2px solid transparent",
        marginBottom: "-2px",
        fontSize: "0.85rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: active ? "var(--gold)" : "var(--text-light)",
        cursor: "pointer",
        transition: "color 0.2s, border-color 0.2s",
      }}
    >
      {label}
    </button>
  );
}

// ════════════════════════════════════════════════════════════
// EMAIL OUTREACH TAB
// ════════════════════════════════════════════════════════════

type EmailSubTab = "compose" | "free-car" | "import";

function EmailOutreachTab() {
  const [subTab, setSubTab] = useState<EmailSubTab>("compose");

  return (
    <>
      {/* Subtabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: "1.5rem", borderBottom: "2px solid #eee" }}>
        {([
          { key: "compose" as const, label: "Compose Email" },
          { key: "free-car" as const, label: "Free Car Promo" },
          { key: "import" as const, label: "Import Prospects" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            style={{
              padding: "0.6rem 1.25rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              background: "transparent",
              border: "none",
              borderBottom: subTab === t.key ? "3px solid var(--gold)" : "3px solid transparent",
              color: subTab === t.key ? "var(--charcoal)" : "var(--text-light)",
              cursor: "pointer",
              transition: "color 0.2s, border-color 0.2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "compose" && <ComposeEmailSubTab />}
      {subTab === "free-car" && <FreeCarPromoSection />}
      {subTab === "import" && <ImportProspectsSubTab />}
    </>
  );
}

function ImportProspectsSubTab() {
  return <ImportSection onImported={() => {}} />;
}

type ComposeRecipient = {
  id: string;
  email: string;
  name: string;
  type: "prospect" | "registrant" | "sponsor";
  status: string;
  prospectId?: string;
};

type RecipientFilter = "all" | "prospect" | "registrant" | "sponsor";

function ComposeEmailSubTab() {
  const [recipients, setRecipients] = useState<ComposeRecipient[]>([]);
  const [prospects, setProspects] = useState<ProspectWithSends[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<RecipientFilter>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "email" | "type" | "status">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [prospectResult, sendResult, regResult, sponsorResult] = await Promise.all([
      supabase.from("marketing_prospects").select("*").order("created_at", { ascending: false }),
      supabase.from("marketing_sends").select("*").order("sent_at", { ascending: false }),
      supabase.from("registrations").select("id, first_name, last_name, email, payment_status").in("payment_status", ["paid", "comped", "pending"]),
      supabase.from("sponsors").select("id, name, company, email, status").neq("status", "archived"),
    ]);

    const sends = sendResult.data || [];
    const combinedProspects = (prospectResult.data || []).map((p: MarketingProspect) => ({
      ...p,
      sends: sends.filter((s: MarketingSend) => s.prospect_id === p.id),
    }));
    setProspects(combinedProspects);

    // Build unified recipient list, deduped by email
    const seen = new Set<string>();
    const all: ComposeRecipient[] = [];

    // Registrants first
    for (const r of (regResult.data || []) as { id: string; first_name: string; last_name: string; email: string; payment_status: string }[]) {
      const key = r.email.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        all.push({
          id: `reg_${r.id}`,
          email: r.email,
          name: `${r.first_name} ${r.last_name}`,
          type: "registrant",
          status: r.payment_status,
        });
      }
    }

    // Sponsors
    for (const s of (sponsorResult.data || []) as { id: string; name: string; company: string; email: string; status: string }[]) {
      const key = s.email.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        all.push({
          id: `spon_${s.id}`,
          email: s.email,
          name: s.company || s.name,
          type: "sponsor",
          status: s.status,
        });
      }
    }

    // Prospects
    for (const p of combinedProspects) {
      if (p.unsubscribed) continue;
      const key = p.email.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        all.push({
          id: `pros_${p.id}`,
          email: p.email,
          name: p.name || "",
          type: "prospect",
          status: "prospect",
          prospectId: p.id,
        });
      }
    }

    setRecipients(all);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>Loading...</p>;
  }

  const searchLower = search.toLowerCase();
  const filtered = recipients.filter((r) => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (searchLower && !r.email.toLowerCase().includes(searchLower) && !r.name.toLowerCase().includes(searchLower)) return false;
    return true;
  }).sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "name": return dir * (a.name || "").localeCompare(b.name || "");
      case "email": return dir * a.email.localeCompare(b.email);
      case "type": return dir * a.type.localeCompare(b.type);
      case "status": return dir * a.status.localeCompare(b.status);
      default: return 0;
    }
  });

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortArrow = (key: typeof sortKey) => sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const selectedEmails = recipients.filter((r) => selectedIds.has(r.id)).map((r) => r.email);
  const selectedProspectIds = recipients.filter((r) => selectedIds.has(r.id) && r.prospectId).map((r) => r.prospectId!);

  const typeCounts = {
    all: recipients.length,
    registrant: recipients.filter((r) => r.type === "registrant").length,
    sponsor: recipients.filter((r) => r.type === "sponsor").length,
    prospect: recipients.filter((r) => r.type === "prospect").length,
  };

  const statusBadge = (type: string, status: string) => {
    const configs: Record<string, { label: string; bg: string; color: string }> = {
      paid: { label: "Paid", bg: "#e8f5e9", color: "#2e7d32" },
      comped: { label: "Comped", bg: "#ede7f6", color: "#5e35b1" },
      pending: { label: "Pending", bg: "#fff3e0", color: "#e65100" },
      engaged: { label: "Committed", bg: "#e3f2fd", color: "#1565c0" },
      prospect: { label: "Prospect", bg: "#f5f5f5", color: "#666" },
      inquired: { label: "Inquired", bg: "#e3f2fd", color: "#1565c0" },
    };
    const c = configs[status] || { label: status, bg: "#f5f5f5", color: "#666" };
    return (
      <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "2px 6px", background: c.bg, color: c.color, textTransform: "uppercase" }}>
        {c.label}
      </span>
    );
  };

  const typeBadge = (type: string) => {
    const configs: Record<string, { label: string; bg: string; color: string }> = {
      registrant: { label: "Registrant", bg: "#e3f2fd", color: "#1565c0" },
      sponsor: { label: "Sponsor", bg: "#fce4ec", color: "#c62828" },
      prospect: { label: "Prospect", bg: "#f5f5f5", color: "#666" },
    };
    const c = configs[type] || { label: type, bg: "#f5f5f5", color: "#666" };
    return (
      <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "2px 6px", background: c.bg, color: c.color, textTransform: "uppercase" }}>
        {c.label}
      </span>
    );
  };

  return (
    <>
      <div style={cardStyle}>
        <h2 style={sectionHeadingStyle}>Select Recipients</h2>

        {/* Filters */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          {(["all", "registrant", "sponsor", "prospect"] as RecipientFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: "0.35rem 0.8rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                border: typeFilter === t ? "2px solid var(--gold)" : "1px solid #ddd",
                background: typeFilter === t ? "#fffdf7" : "var(--white)",
                color: "var(--charcoal)",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {t === "all" ? "All" : t === "registrant" ? "Registrants" : t === "sponsor" ? "Sponsors" : "Prospects"} ({typeCounts[t]})
            </button>
          ))}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            style={{ padding: "0.35rem 0.6rem", border: "1px solid #ddd", fontSize: "0.75rem", fontFamily: "'Inter', sans-serif", width: "160px" }}
          />
        </div>

        {/* Select controls */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem", alignItems: "center" }}>
          <button
            onClick={() => {
              if (selectedIds.size === filtered.length && filtered.length > 0) setSelectedIds(new Set());
              else setSelectedIds(new Set(filtered.map((r) => r.id)));
            }}
            style={smallBtnStyle}
          >
            {selectedIds.size === filtered.length && filtered.length > 0 ? "Deselect All" : `Select Shown (${filtered.length})`}
          </button>
          {selectedIds.size > 0 && (
            <button onClick={() => setSelectedIds(new Set())} style={smallBtnStyle}>Clear Selection</button>
          )}
          <span style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>
            <strong>{selectedIds.size}</strong> selected
          </span>
        </div>

        {/* Table */}
        <div style={{ maxHeight: "400px", overflow: "auto", border: "1px solid #eee" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ background: "#fafafa", position: "sticky", top: 0 }}>
                <th style={{ ...prospectThStyle, width: "36px" }} />
                <th style={{ ...prospectThStyle, cursor: "pointer", userSelect: "none", color: sortKey === "name" ? "var(--gold)" : undefined }} onClick={() => handleSort("name")}>Name{sortArrow("name")}</th>
                <th style={{ ...prospectThStyle, cursor: "pointer", userSelect: "none", color: sortKey === "email" ? "var(--gold)" : undefined }} onClick={() => handleSort("email")}>Email{sortArrow("email")}</th>
                <th style={{ ...prospectThStyle, textAlign: "center", cursor: "pointer", userSelect: "none", color: sortKey === "type" ? "var(--gold)" : undefined }} onClick={() => handleSort("type")}>Type{sortArrow("type")}</th>
                <th style={{ ...prospectThStyle, textAlign: "center", cursor: "pointer", userSelect: "none", color: sortKey === "status" ? "var(--gold)" : undefined }} onClick={() => handleSort("status")}>Status{sortArrow("status")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "0.4rem 0.75rem" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => {
                        const next = new Set(selectedIds);
                        if (next.has(r.id)) next.delete(r.id);
                        else next.add(r.id);
                        setSelectedIds(next);
                      }}
                      style={{ cursor: "pointer" }}
                    />
                  </td>
                  <td style={{ padding: "0.4rem 0.75rem", fontWeight: 500 }}>{r.name || "—"}</td>
                  <td style={{ padding: "0.4rem 0.75rem", color: "var(--text-light)" }}>{r.email}</td>
                  <td style={{ padding: "0.4rem 0.75rem", textAlign: "center" }}>{typeBadge(r.type)}</td>
                  <td style={{ padding: "0.4rem 0.75rem", textAlign: "center" }}>{statusBadge(r.type, r.status)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-light)" }}>No recipients match your filter</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ComposeCustomEmailSection
        prospects={prospects}
        selectedIds={new Set(selectedProspectIds)}
        selectedEmails={selectedEmails}
        onSent={fetchData}
      />
    </>
  );
}

// ─── Free Car Promo ───

type PromoRegistrant = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  vehicle_year: number;
  vehicle_make: string;
  vehicle_model: string;
  hasCode: boolean;
  codeUsed: boolean;
};

function FreeCarPromoSection() {
  const [registrants, setRegistrants] = useState<PromoRegistrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; skipped: number; failed: number } | null>(null);
  const [promoSubject, setPromoSubject] = useState(FREE_CAR_DEFAULT_SUBJECT);
  const [promoBody, setPromoBody] = useState(FREE_CAR_DEFAULT_BODY);
  const [showPromoPreview, setShowPromoPreview] = useState(false);
  const promoIframeRef = useRef<HTMLIFrameElement>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [regResult, codeResult] = await Promise.all([
      supabase.from("registrations").select("id, first_name, last_name, email, vehicle_year, vehicle_make, vehicle_model").in("payment_status", ["paid", "comped"]).order("created_at", { ascending: true }),
      supabase.from("promo_codes").select("email, used"),
    ]);

    const codes = codeResult.data || [];
    const codeMap = new Map<string, boolean>();
    for (const c of codes as { email: string; used: boolean }[]) {
      codeMap.set(c.email.toLowerCase(), c.used);
    }

    // Dedupe by email
    const seen = new Set<string>();
    const unique: PromoRegistrant[] = [];
    for (const r of (regResult.data || []) as { id: string; first_name: string; last_name: string; email: string; vehicle_year: number; vehicle_make: string; vehicle_model: string }[]) {
      const key = r.email.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push({
          ...r,
          hasCode: codeMap.has(key),
          codeUsed: codeMap.get(key) || false,
        });
      }
    }

    setRegistrants(unique);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const eligible = registrants.filter((r) => !r.hasCode);
  const totalCodes = registrants.filter((r) => r.hasCode).length;
  const usedCodes = registrants.filter((r) => r.codeUsed).length;

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectEligible = () => {
    if (selectedIds.size === eligible.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligible.map((r) => r.id)));
    }
  };

  const handleSend = async () => {
    const toSend = registrants.filter((r) => selectedIds.has(r.id) && !r.hasCode);
    if (toSend.length === 0) {
      alert("No eligible registrants selected.");
      return;
    }
    if (!confirm(`Send free car offer to ${toSend.length} registrant${toSend.length !== 1 ? "s" : ""}?`)) return;

    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/marketing/send-free-car-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_ids: toSend.map((r) => r.id),
          subject: promoSubject,
          body: promoBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to send");
      } else {
        setSendResult({ sent: data.sent || 0, skipped: data.skipped || 0, failed: data.failed || 0 });
        setSelectedIds(new Set());
        fetchData();
      }
    } catch {
      alert("Failed to send free car offers");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div style={cardStyle}>
        <h2 style={sectionHeadingStyle}>Free Car Promo</h2>
        <p style={{ color: "var(--text-light)", fontSize: "0.85rem" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionHeadingStyle}>Free Car Promo</h2>

      <p style={{ fontSize: "0.8rem", color: "var(--text-light)", marginBottom: "1rem", lineHeight: 1.5 }}>
        Send unique promo codes to paid &amp; comped registrants for one free additional vehicle registration.
        The CTA button and promo code are added automatically.
      </p>

      {/* Subject & Body */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
        <div>
          <label style={labelStyle}>Subject</label>
          <input
            type="text"
            value={promoSubject}
            onChange={(e) => setPromoSubject(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Body (shown above the register button &amp; promo code)</label>
          <textarea
            value={promoBody}
            onChange={(e) => setPromoBody(e.target.value)}
            rows={5}
            style={{ ...inputStyle, resize: "vertical", minHeight: "100px", lineHeight: 1.6 }}
          />
          <p style={{ fontSize: "0.7rem", color: "var(--text-light)", marginTop: "0.3rem" }}>
            Supports **bold** and *italic*. Blank lines create new paragraphs. &quot;Hi [Name]&quot; is added automatically.
          </p>
        </div>
        <div>
          <button
            onClick={() => {
              setShowPromoPreview(!showPromoPreview);
              if (!showPromoPreview) {
                setTimeout(() => {
                  if (promoIframeRef.current) {
                    const doc = promoIframeRef.current.contentDocument;
                    if (doc) {
                      doc.open();
                      doc.write(freeCarOfferEmail("John", "ABC123", "#", promoSubject, promoBody).html);
                      doc.close();
                    }
                  }
                }, 50);
              }
            }}
            style={smallBtnStyle}
          >
            {showPromoPreview ? "Hide Preview" : "Preview Email"}
          </button>
        </div>
      </div>

      {showPromoPreview && (
        <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
          <iframe
            ref={promoIframeRef}
            style={{ width: "640px", maxWidth: "100%", height: "600px", border: "1px solid #ddd", background: "#f5f5f5" }}
            title="Free car promo preview"
          />
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
        <span><strong style={{ color: "var(--charcoal)" }}>{registrants.length}</strong> paid registrants</span>
        <span><strong style={{ color: "#2e7d32" }}>{totalCodes}</strong> codes sent</span>
        <span><strong style={{ color: "#1565c0" }}>{usedCodes}</strong> redeemed</span>
        <span><strong style={{ color: "var(--gold)" }}>{eligible.length}</strong> eligible</span>
        {selectedIds.size > 0 && <span><strong style={{ color: "#7b1fa2" }}>{selectedIds.size}</strong> selected</span>}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={handleSelectEligible} style={smallBtnStyle}>
          {selectedIds.size === eligible.length && eligible.length > 0 ? "Deselect All" : `Select All Eligible (${eligible.length})`}
        </button>
        <button
          onClick={handleSend}
          disabled={sending || selectedIds.size === 0}
          style={{
            ...btnStyle(sending || selectedIds.size === 0),
            background: sending || selectedIds.size === 0 ? "#ccc" : "var(--gold)",
          }}
        >
          {sending ? "Sending..." : `Send to ${selectedIds.size} Registrant${selectedIds.size !== 1 ? "s" : ""}`}
        </button>
        {sendResult && (
          <span style={{ fontSize: "0.85rem", color: sendResult.failed > 0 ? "#e65100" : "#2e7d32" }}>
            Sent: {sendResult.sent}{sendResult.skipped > 0 && ` · Skipped: ${sendResult.skipped}`}{sendResult.failed > 0 && ` · Failed: ${sendResult.failed}`}
          </span>
        )}
      </div>

      {/* Registrant list */}
      <div style={{ maxHeight: "400px", overflow: "auto", border: "1px solid #eee" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ background: "#fafafa", position: "sticky", top: 0 }}>
              <th style={{ ...prospectThStyle, width: "36px" }} />
              <th style={prospectThStyle}>Name</th>
              <th style={prospectThStyle}>Email</th>
              <th style={prospectThStyle}>Vehicle</th>
              <th style={{ ...prospectThStyle, textAlign: "center" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {registrants.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0", opacity: r.hasCode ? 0.6 : 1 }}>
                <td style={{ padding: "0.5rem 0.75rem" }}>
                  {!r.hasCode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => handleToggle(r.id)}
                      style={{ cursor: "pointer" }}
                    />
                  )}
                </td>
                <td style={{ padding: "0.5rem 0.75rem", fontWeight: 500 }}>{r.first_name} {r.last_name}</td>
                <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-light)" }}>{r.email}</td>
                <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-light)" }}>{r.vehicle_year} {r.vehicle_make} {r.vehicle_model}</td>
                <td style={{ padding: "0.5rem 0.75rem", textAlign: "center" }}>
                  {r.codeUsed ? (
                    <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", background: "#e8f5e9", color: "#2e7d32", textTransform: "uppercase" }}>Redeemed</span>
                  ) : r.hasCode ? (
                    <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", background: "#e3f2fd", color: "#1565c0", textTransform: "uppercase" }}>Sent</span>
                  ) : (
                    <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", background: "#fff3e0", color: "#e65100", textTransform: "uppercase" }}>Eligible</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Import Prospects ───

function ImportSection({ onImported }: { onImported: () => void }) {
  const [raw, setRaw] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    added: number;
    skippedDuplicate: number;
  } | null>(null);

  const handleImport = async () => {
    if (!raw.trim()) return;
    setImporting(true);
    setResult(null);

    try {
      const res = await fetch("/api/marketing/import-prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: raw.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Import failed");
      } else {
        setResult(data);
        setRaw("");
        onImported();
      }
    } catch {
      alert("Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={cardStyle}>
      <h2 style={sectionHeadingStyle}>Import Prospects</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "0.75rem" }}>
        Paste email addresses below. Supports: <code>email</code>, <code>Name &lt;email&gt;</code>, or <code>name, email</code> formats (one per line).
      </p>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={6}
        placeholder={"john@example.com\nJane Doe <jane@example.com>\nBob Smith, bob@example.com"}
        style={{ ...inputStyle, resize: "vertical", marginBottom: "0.75rem" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <button onClick={handleImport} disabled={importing || !raw.trim()} style={btnStyle(importing)}>
          {importing ? "Importing..." : "Import"}
        </button>
        {result && (
          <span style={{ fontSize: "0.85rem", color: "#2e7d32" }}>
            Added: {result.added}
            {result.skippedDuplicate > 0 && ` | Already imported: ${result.skippedDuplicate}`}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Compose Custom Email ───

function ComposeCustomEmailSection({
  prospects,
  selectedIds,
  selectedEmails,
  onSent,
}: {
  prospects: ProspectWithSends[];
  selectedIds: Set<string>;
  selectedEmails?: string[];
  onSent: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Register Now");
  const [ctaUrl, setCtaUrl] = useState("https://crystallakecarshow.com/register");
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const eligibleSelected = prospects.filter(
    (p) => selectedIds.has(p.id) && !p.unsubscribed
  );
  const totalRecipients = selectedEmails ? selectedEmails.length : eligibleSelected.length;

  useEffect(() => {
    if (showPreview && iframeRef.current && subject && body) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(customMarketingEmailHtml(subject, body, ctaLabel || undefined, ctaUrl || undefined));
        doc.close();
      }
    }
  }, [showPreview, subject, body, ctaLabel, ctaUrl]);

  const handleSend = async () => {
    if (!subject || !body) {
      alert("Subject and body are required.");
      return;
    }
    if (totalRecipients === 0) {
      alert("No recipients selected. Select recipients from the list above.");
      return;
    }

    const msg = `Send "${subject}" to ${totalRecipients} recipient${totalRecipients === 1 ? "" : "s"}?`;
    if (!confirm(msg)) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/marketing/send-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          cta_label: ctaLabel || null,
          cta_url: ctaUrl || null,
          prospect_ids: eligibleSelected.map((p) => p.id),
          emails: selectedEmails || [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Send failed");
      } else {
        setResult(data);
        onSent();
      }
    } catch {
      alert("Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={cardStyle}>
      <h2 style={sectionHeadingStyle}>Compose Custom Email</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label style={labelStyle}>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Don't miss out! Registration is open..."
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email here. Supports basic formatting — see guide below."
            rows={10}
            style={{ ...inputStyle, resize: "vertical", minHeight: "200px", lineHeight: 1.6 }}
          />
          <div style={{ marginTop: "0.5rem", padding: "0.75rem 1rem", background: "#fafafa", border: "1px solid #eee", fontSize: "0.78rem", color: "var(--text-light)", lineHeight: 1.8 }}>
            <strong style={{ color: "var(--charcoal)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Formatting Guide</strong>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.25rem 2rem", marginTop: "0.4rem" }}>
              <span><code style={{ background: "#eee", padding: "1px 4px" }}>**bold text**</code> → <strong>bold text</strong></span>
              <span><code style={{ background: "#eee", padding: "1px 4px" }}>*italic text*</code> → <em>italic text</em></span>
              <span><code style={{ background: "#eee", padding: "1px 4px" }}>[link text](https://url)</code> → link</span>
              <span><code style={{ background: "#eee", padding: "1px 4px" }}>- bullet item</code> → bullet list</span>
              <span>Blank line → new paragraph</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>CTA Button Label (optional)</label>
            <input
              type="text"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="e.g. Register Now"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>CTA Button URL (optional)</label>
            <input
              type="url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://crystallakecarshow.com/register"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
        <button
          onClick={() => setShowPreview(!showPreview)}
          disabled={!subject || !body}
          style={{
            ...smallBtnStyle,
            opacity: !subject || !body ? 0.5 : 1,
            cursor: !subject || !body ? "not-allowed" : "pointer",
          }}
        >
          {showPreview ? "Hide Preview" : "Preview Email"}
        </button>
        <span style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>
          <strong>{totalRecipients}</strong> recipient{totalRecipients === 1 ? "" : "s"} selected
        </span>
      </div>

      {showPreview && (
        <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
          <iframe
            ref={iframeRef}
            style={{
              width: "640px",
              maxWidth: "100%",
              height: "600px",
              border: "1px solid #ddd",
              background: "#f5f5f5",
            }}
            title="Custom email preview"
          />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <button
          onClick={handleSend}
          disabled={sending || !subject || !body || totalRecipients === 0}
          style={{
            ...btnStyle(sending || !subject || !body || totalRecipients === 0),
            background: sending || !subject || !body || totalRecipients === 0 ? "#ccc" : "var(--gold)",
          }}
        >
          {sending ? "Sending..." : `Send to ${totalRecipients} Recipient${totalRecipients === 1 ? "" : "s"}`}
        </button>
        {result && (
          <span style={{ fontSize: "0.85rem", color: result.failed > 0 ? "#e65100" : "#2e7d32" }}>
            Sent: {result.sent}
            {result.failed > 0 && ` | Failed: ${result.failed}`}
          </span>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// AD CAMPAIGNS TAB
// ════════════════════════════════════════════════════════════

function AdCampaignsTab() {
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
      {/* Action bar */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
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
              const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : "\u2014";
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
                    {c.budget_cents != null ? `$${(c.budget_cents / 100).toLocaleString()}` : "\u2014"}
                  </td>
                  <td style={tdStyle}>${(c.spent_cents / 100).toLocaleString()}</td>
                  <td style={tdStyle}>{c.impressions.toLocaleString()}</td>
                  <td style={tdStyle}>{c.clicks.toLocaleString()}</td>
                  <td style={tdStyle}>{ctr}{ctr !== "\u2014" ? "%" : ""}</td>
                  <td style={tdStyle}>{regs}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                    {c.start_date ? new Date(c.start_date + "T00:00:00").toLocaleDateString() : "\u2014"}
                    {c.end_date ? ` \u2013 ${new Date(c.end_date + "T00:00:00").toLocaleDateString()}` : ""}
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

// ════════════════════════════════════════════════════════════
// SHARED COMPONENTS & STYLES
// ════════════════════════════════════════════════════════════

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

const cardStyle: React.CSSProperties = {
  background: "var(--white)",
  padding: "1.5rem 2rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  marginBottom: "1.5rem",
};

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: "'Playfair Display', serif",
  fontSize: "1.1rem",
  fontWeight: 400,
  marginBottom: "1rem",
  paddingBottom: "0.5rem",
  borderBottom: "1px solid rgba(0,0,0,0.08)",
  color: "var(--charcoal)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-light)",
  marginBottom: "0.3rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 1rem",
  border: "1px solid #ddd",
  fontSize: "0.9rem",
  fontFamily: "'Inter', sans-serif",
  boxSizing: "border-box",
};

const btnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "0.6rem 1.5rem",
  background: disabled ? "#ccc" : "var(--gold)",
  color: "var(--charcoal)",
  border: "none",
  fontSize: "0.8rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.6 : 1,
});

const filterSelectStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem",
  border: "1px solid #ddd",
  fontSize: "0.8rem",
  fontFamily: "'Inter', sans-serif",
};

const toolbarLinkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  fontSize: "0.75rem",
  color: "#1565c0",
  cursor: "pointer",
  textDecoration: "none",
  fontFamily: "'Inter', sans-serif",
};

const smallBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #ddd",
  padding: "0.4rem 0.8rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  cursor: "pointer",
  color: "var(--charcoal)",
  whiteSpace: "nowrap",
};

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

const prospectThStyle: React.CSSProperties = {
  padding: "0.8rem 1rem",
  fontWeight: 600,
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-light)",
  whiteSpace: "nowrap",
};

const prospectTdStyle: React.CSSProperties = {
  padding: "0.6rem 1rem",
};

const badgeStyle = (bg: string, color: string): React.CSSProperties => ({
  display: "inline-block",
  padding: "0.2rem 0.6rem",
  fontSize: "0.7rem",
  fontWeight: 600,
  textTransform: "uppercase",
  background: bg,
  color,
});
