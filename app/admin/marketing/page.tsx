"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { MARKETING_TEMPLATES } from "@/types/database";
import type { AdCampaign, MarketingProspect, MarketingSend } from "@/types/database";
import { getMarketingPreviewHtml } from "@/lib/marketing-email-templates";

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

      {activeTab === "email" ? <EmailOutreachTab /> : <AdCampaignsTab />}
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

function EmailOutreachTab() {
  const [prospects, setProspects] = useState<ProspectWithSends[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(MARKETING_TEMPLATES[0].key);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchProspects = useCallback(async () => {
    const supabase = createClient();
    const { data: prospectData } = await supabase
      .from("marketing_prospects")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: sendData } = await supabase
      .from("marketing_sends")
      .select("*")
      .order("sent_at", { ascending: false });

    const sends = sendData || [];
    const combined = (prospectData || []).map((p: MarketingProspect) => ({
      ...p,
      sends: sends.filter((s: MarketingSend) => s.prospect_id === p.id),
    }));

    setProspects(combined);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  if (loading) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Loading...
      </p>
    );
  }

  return (
    <>
      <ImportSection onImported={fetchProspects} />
      <ProspectListSection
        prospects={prospects}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        selectedTemplate={selectedTemplate}
      />
      <SendCampaignSection
        prospects={prospects}
        selectedIds={selectedIds}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        onSent={fetchProspects}
      />
    </>
  );
}

// ─── Import Prospects ───

function ImportSection({ onImported }: { onImported: () => void }) {
  const [raw, setRaw] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    added: number;
    skippedRegistered: number;
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
            {result.skippedRegistered > 0 && ` | Already registered: ${result.skippedRegistered}`}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Prospect List ───

type SortKey = "name" | "email" | "source" | "created_at" | "sends" | "status";
type SortDir = "asc" | "desc";

type StatusFilter = "all" | "ready" | "sent" | "unsubscribed";
type SourceFilter = "all" | "import" | "manual";

function ProspectListSection({
  prospects,
  selectedIds,
  setSelectedIds,
  selectedTemplate,
}: {
  prospects: ProspectWithSends[];
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  selectedTemplate: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "created_at" ? "desc" : "asc");
    }
  };

  const getStatus = (p: ProspectWithSends) => {
    if (p.unsubscribed) return "unsubscribed";
    if (p.sends.some((s) => s.template_key === selectedTemplate && s.status === "sent")) return "sent";
    return "ready";
  };

  const searchLower = search.toLowerCase();
  const filtered = prospects.filter((p) => {
    if (searchLower && !(p.email.toLowerCase().includes(searchLower) || (p.name || "").toLowerCase().includes(searchLower))) {
      return false;
    }
    if (statusFilter !== "all" && getStatus(p) !== statusFilter) return false;
    if (sourceFilter !== "all" && p.source !== sourceFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "name":
        return dir * (a.name || "").localeCompare(b.name || "");
      case "email":
        return dir * a.email.localeCompare(b.email);
      case "source":
        return dir * a.source.localeCompare(b.source);
      case "created_at":
        return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "sends":
        return dir * (a.sends.filter((s) => s.status === "sent").length - b.sends.filter((s) => s.status === "sent").length);
      case "status": {
        const order = { ready: 0, sent: 1, unsubscribed: 2 };
        return dir * (order[getStatus(a)] - order[getStatus(b)]);
      }
      default:
        return 0;
    }
  });

  const eligible = filtered.filter(
    (p) =>
      !p.unsubscribed &&
      !p.sends.some((s) => s.template_key === selectedTemplate && s.status === "sent")
  );

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(eligible.map((p) => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " \u25B2" : " \u25BC";
  };

  const sortableThStyle = (key: SortKey): React.CSSProperties => ({
    ...prospectThStyle,
    cursor: "pointer",
    userSelect: "none",
    color: sortKey === key ? "var(--gold)" : "var(--text-light)",
  });

  return (
    <div style={cardStyle}>
      <h2 style={sectionHeadingStyle}>
        Prospect List
        <span style={{ fontWeight: 400, fontSize: "0.85rem", color: "var(--text-light)", marginLeft: "0.5rem" }}>
          ({prospects.length} total, {filtered.length} shown, {eligible.length} eligible)
        </span>
      </h2>

      {prospects.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-light)", padding: "1rem 0" }}>
          No prospects imported yet. Use the import section above.
        </p>
      ) : (
        <>
          {/* Filters */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email..."
              style={{
                padding: "0.5rem 0.75rem",
                border: "1px solid #ddd",
                fontSize: "0.85rem",
                fontFamily: "'Inter', sans-serif",
                minWidth: "200px",
                flex: "1 1 200px",
                maxWidth: "300px",
              }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              style={filterSelectStyle}
            >
              <option value="all">All Statuses</option>
              <option value="ready">Ready</option>
              <option value="sent">Sent</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
              style={filterSelectStyle}
            >
              <option value="all">All Sources</option>
              <option value="import">Import</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <button onClick={handleSelectAll} style={smallBtnStyle}>
              Select All Eligible ({eligible.length})
            </button>
            <button onClick={handleDeselectAll} style={smallBtnStyle}>
              Deselect All
            </button>
          </div>

          <div style={{ overflow: "auto", maxHeight: "400px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "var(--cream)", textAlign: "left", position: "sticky", top: 0 }}>
                  <th style={prospectThStyle}></th>
                  <th style={sortableThStyle("name")} onClick={() => handleSort("name")}>Name{sortArrow("name")}</th>
                  <th style={sortableThStyle("email")} onClick={() => handleSort("email")}>Email{sortArrow("email")}</th>
                  <th style={sortableThStyle("source")} onClick={() => handleSort("source")}>Source{sortArrow("source")}</th>
                  <th style={sortableThStyle("created_at")} onClick={() => handleSort("created_at")}>Added{sortArrow("created_at")}</th>
                  <th style={sortableThStyle("sends")} onClick={() => handleSort("sends")}>Sends{sortArrow("sends")}</th>
                  <th style={sortableThStyle("status")} onClick={() => handleSort("status")}>Status{sortArrow("status")}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => {
                  const alreadySent = p.sends.some(
                    (s) => s.template_key === selectedTemplate && s.status === "sent"
                  );
                  const isEligible = !p.unsubscribed && !alreadySent;
                  const dimmed = !isEligible;

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: "1px solid #eee",
                        opacity: dimmed ? 0.5 : 1,
                      }}
                    >
                      <td style={prospectTdStyle}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          disabled={!isEligible}
                          onChange={() => handleToggle(p.id)}
                        />
                      </td>
                      <td style={prospectTdStyle}>{p.name || "\u2014"}</td>
                      <td style={prospectTdStyle}>{p.email}</td>
                      <td style={prospectTdStyle}>
                        <span style={badgeStyle(p.source === "import" ? "#e3f2fd" : "#f3e5f5", p.source === "import" ? "#1565c0" : "#7b1fa2")}>
                          {p.source}
                        </span>
                      </td>
                      <td style={{ ...prospectTdStyle, whiteSpace: "nowrap" }}>
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td style={prospectTdStyle}>{p.sends.filter((s) => s.status === "sent").length}</td>
                      <td style={prospectTdStyle}>
                        {p.unsubscribed ? (
                          <span style={badgeStyle("#ffebee", "#c62828")}>Unsubscribed</span>
                        ) : alreadySent ? (
                          <span style={badgeStyle("#e8f5e9", "#2e7d32")}>Sent</span>
                        ) : (
                          <span style={badgeStyle("#f5f5f5", "#616161")}>Ready</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Send Campaign ───

function SendCampaignSection({
  prospects,
  selectedIds,
  selectedTemplate,
  setSelectedTemplate,
  onSent,
}: {
  prospects: ProspectWithSends[];
  selectedIds: Set<string>;
  selectedTemplate: string;
  setSelectedTemplate: (key: string) => void;
  onSent: () => void;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; skipped: number } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const template = MARKETING_TEMPLATES.find((t) => t.key === selectedTemplate)!;
  const eligibleSelected = prospects.filter(
    (p) =>
      selectedIds.has(p.id) &&
      !p.unsubscribed &&
      !p.sends.some((s) => s.template_key === selectedTemplate && s.status === "sent")
  );

  useEffect(() => {
    if (showPreview && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(getMarketingPreviewHtml(selectedTemplate as Parameters<typeof getMarketingPreviewHtml>[0]));
        doc.close();
      }
    }
  }, [showPreview, selectedTemplate]);

  const handleSend = async () => {
    if (eligibleSelected.length === 0) {
      alert("No eligible recipients selected.");
      return;
    }

    const msg = `Send "${template.label}" to ${eligibleSelected.length} recipient${eligibleSelected.length === 1 ? "" : "s"}?`;
    if (!confirm(msg)) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/marketing/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: selectedTemplate,
          prospectIds: eligibleSelected.map((p) => p.id),
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
      <h2 style={sectionHeadingStyle}>Send Campaign</h2>

      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <label style={labelStyle}>Template</label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            style={inputStyle}
          >
            {MARKETING_TEMPLATES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => setShowPreview(!showPreview)} style={smallBtnStyle}>
          {showPreview ? "Hide Preview" : "Preview"}
        </button>
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
            title="Template preview"
          />
        </div>
      )}

      <div style={{ fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "1rem" }}>
        <strong>{eligibleSelected.length}</strong> eligible recipient{eligibleSelected.length === 1 ? "" : "s"} selected
        {selectedIds.size > eligibleSelected.length && (
          <span style={{ color: "#e65100" }}>
            {" "}({selectedIds.size - eligibleSelected.length} excluded: already sent or unsubscribed)
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <button
          onClick={handleSend}
          disabled={sending || eligibleSelected.length === 0}
          style={{
            ...btnStyle(sending || eligibleSelected.length === 0),
            background: sending || eligibleSelected.length === 0 ? "#ccc" : "var(--gold)",
          }}
        >
          {sending ? "Sending..." : `Send to ${eligibleSelected.length} Recipient${eligibleSelected.length === 1 ? "" : "s"}`}
        </button>
        {result && (
          <span style={{ fontSize: "0.85rem", color: result.failed > 0 ? "#e65100" : "#2e7d32" }}>
            Sent: {result.sent}
            {result.skipped > 0 && ` | Skipped: ${result.skipped}`}
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
  padding: "0.5rem 0.75rem",
  border: "1px solid #ddd",
  fontSize: "0.85rem",
  fontFamily: "'Inter', sans-serif",
  minWidth: "140px",
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
