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

type RegistrationMatch = {
  first_name: string;
  last_name: string;
  email: string;
  payment_status: string;
};

type ProspectWithSends = MarketingProspect & { sends: MarketingSend[] };

type Tab = "email" | "announcements" | "ads";

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
        <TabButton label="Announcements" active={activeTab === "announcements"} onClick={() => setActiveTab("announcements")} />
        <TabButton label="Ad Campaigns" active={activeTab === "ads"} onClick={() => setActiveTab("ads")} />
      </div>

      {activeTab === "email" && <EmailOutreachTab />}
      {activeTab === "announcements" && <AnnouncementsTab />}
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

function EmailOutreachTab() {
  const [prospects, setProspects] = useState<ProspectWithSends[]>([]);
  const [regMap, setRegMap] = useState<Map<string, RegistrationMatch>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(MARKETING_TEMPLATES[0].key);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchProspects = useCallback(async () => {
    const supabase = createClient();
    const [prospectResult, sendResult, regResult] = await Promise.all([
      supabase.from("marketing_prospects").select("*").order("created_at", { ascending: false }),
      supabase.from("marketing_sends").select("*").order("sent_at", { ascending: false }),
      supabase.from("registrations").select("first_name, last_name, email, payment_status"),
    ]);

    const sends = sendResult.data || [];
    const combined = (prospectResult.data || []).map((p: MarketingProspect) => ({
      ...p,
      sends: sends.filter((s: MarketingSend) => s.prospect_id === p.id),
    }));

    const map = new Map<string, RegistrationMatch>();
    for (const r of (regResult.data || []) as RegistrationMatch[]) {
      const key = r.email.toLowerCase();
      // Keep the most relevant match (paid > pending > others)
      const existing = map.get(key);
      if (!existing || (r.payment_status === "paid" && existing.payment_status !== "paid")) {
        map.set(key, r);
      }
    }

    setRegMap(map);
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
        regMap={regMap}
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

// ─── Prospect List ───

type SortKey = "name" | "email" | "source" | "created_at" | "sends" | "status" | "registered";
type SortDir = "asc" | "desc";

type StatusFilter = "all" | "ready" | "sent" | "unsubscribed";
type SourceFilter = "all" | "import" | "manual";
type RegisteredFilter = "all" | "paid" | "pending" | "not_registered";
type EmailedFilter = "all" | "emailed" | "not_emailed";

function ProspectListSection({
  prospects,
  selectedIds,
  setSelectedIds,
  selectedTemplate,
  regMap,
}: {
  prospects: ProspectWithSends[];
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  selectedTemplate: string;
  regMap: Map<string, RegistrationMatch>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [registeredFilter, setRegisteredFilter] = useState<RegisteredFilter>("all");
  const [emailedFilter, setEmailedFilter] = useState<EmailedFilter>("all");

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

  const getRegStatus = (p: ProspectWithSends) => {
    const reg = regMap.get(p.email.toLowerCase());
    return reg ? reg.payment_status : null;
  };

  const searchLower = search.toLowerCase();
  const filtered = prospects.filter((p) => {
    if (searchLower && !(p.email.toLowerCase().includes(searchLower) || (p.name || "").toLowerCase().includes(searchLower))) {
      return false;
    }
    if (statusFilter !== "all" && getStatus(p) !== statusFilter) return false;
    if (sourceFilter !== "all" && p.source !== sourceFilter) return false;
    if (registeredFilter !== "all") {
      const regStatus = getRegStatus(p);
      if (registeredFilter === "not_registered" && regStatus !== null) return false;
      if (registeredFilter === "paid" && regStatus !== "paid") return false;
      if (registeredFilter === "pending" && regStatus !== "pending") return false;
    }
    if (emailedFilter !== "all") {
      const hasBeenEmailed = p.sends.some((s) => s.status === "sent");
      if (emailedFilter === "emailed" && !hasBeenEmailed) return false;
      if (emailedFilter === "not_emailed" && hasBeenEmailed) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "name": {
        const regA = regMap.get(a.email.toLowerCase());
        const regB = regMap.get(b.email.toLowerCase());
        const nameA = a.name || (regA ? `${regA.first_name} ${regA.last_name}` : "");
        const nameB = b.name || (regB ? `${regB.first_name} ${regB.last_name}` : "");
        return dir * nameA.localeCompare(nameB);
      }
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
      case "registered": {
        const order: Record<string, number> = { paid: 0, pending: 1 };
        const aVal = getRegStatus(a);
        const bVal = getRegStatus(b);
        const aOrder = aVal !== null ? (order[aVal] ?? 2) : 3;
        const bOrder = bVal !== null ? (order[bVal] ?? 2) : 3;
        return dir * (aOrder - bOrder);
      }
      default:
        return 0;
    }
  });

  const eligible = filtered.filter((p) => !p.unsubscribed);

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectShown = () => {
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

  const selectedCount = [...selectedIds].filter((id) => {
    const p = prospects.find((pr) => pr.id === id);
    return p && !p.unsubscribed;
  }).length;

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h2 style={{ ...sectionHeadingStyle, marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>
          Prospect List
        </h2>
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "var(--text-light)" }}>
          <span><strong style={{ color: "var(--charcoal)" }}>{prospects.length}</strong> total</span>
          {filtered.length !== prospects.length && (
            <span><strong style={{ color: "var(--charcoal)" }}>{filtered.length}</strong> shown</span>
          )}
          <span><strong style={{ color: "var(--gold)" }}>{eligible.length}</strong> eligible</span>
          {selectedCount > 0 && (
            <span><strong style={{ color: "#1565c0" }}>{selectedCount}</strong> selected</span>
          )}
        </div>
      </div>

      {prospects.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-light)", padding: "1rem 0" }}>
          No prospects imported yet. Use the import section above.
        </p>
      ) : (
        <>
          {/* Toolbar: filters + actions in one row */}
          <div style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "0.75rem",
            flexWrap: "wrap",
            alignItems: "center",
            padding: "0.6rem 0.75rem",
            background: "#fafafa",
            border: "1px solid #eee",
          }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              style={{
                padding: "0.4rem 0.6rem",
                border: "1px solid #ddd",
                fontSize: "0.8rem",
                fontFamily: "'Inter', sans-serif",
                width: "180px",
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
            <select
              value={registeredFilter}
              onChange={(e) => setRegisteredFilter(e.target.value as RegisteredFilter)}
              style={filterSelectStyle}
            >
              <option value="all">All Registration</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="not_registered">Not Registered</option>
            </select>
            <select
              value={emailedFilter}
              onChange={(e) => setEmailedFilter(e.target.value as EmailedFilter)}
              style={filterSelectStyle}
            >
              <option value="all">All Emailed</option>
              <option value="emailed">Previously Emailed</option>
              <option value="not_emailed">Never Emailed</option>
            </select>

            <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button onClick={handleSelectShown} style={toolbarLinkStyle}>
                Select shown ({eligible.length})
              </button>
              <span style={{ color: "#ddd" }}>|</span>
              <button onClick={handleDeselectAll} style={toolbarLinkStyle}>
                Clear
              </button>
            </div>
          </div>

          <div style={{ overflow: "auto", maxHeight: "400px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ background: "var(--cream)", textAlign: "left", position: "sticky", top: 0, zIndex: 1 }}>
                  <th style={{ ...prospectThStyle, width: "36px", paddingRight: 0 }}></th>
                  <th style={{ ...sortableThStyle("email"), minWidth: "180px" }} onClick={() => handleSort("email")}>Email{sortArrow("email")}</th>
                  <th style={sortableThStyle("name")} onClick={() => handleSort("name")}>Name{sortArrow("name")}</th>
                  <th style={{ ...sortableThStyle("registered"), textAlign: "center" }} onClick={() => handleSort("registered")}>Registered{sortArrow("registered")}</th>
                  <th style={{ ...sortableThStyle("source"), textAlign: "center" }} onClick={() => handleSort("source")}>Source{sortArrow("source")}</th>
                  <th style={{ ...sortableThStyle("status"), textAlign: "center" }} onClick={() => handleSort("status")}>Status{sortArrow("status")}</th>
                  <th style={{ ...sortableThStyle("sends"), textAlign: "center" }} onClick={() => handleSort("sends")}>Sends{sortArrow("sends")}</th>
                  <th style={{ ...sortableThStyle("created_at"), textAlign: "right" }} onClick={() => handleSort("created_at")}>Added{sortArrow("created_at")}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => {
                  const alreadySent = p.sends.some(
                    (s) => s.template_key === selectedTemplate && s.status === "sent"
                  );
                  const isEligible = !p.unsubscribed;
                  const dimmed = p.unsubscribed;
                  const reg = regMap.get(p.email.toLowerCase());
                  const displayName = p.name || (reg ? `${reg.first_name} ${reg.last_name}` : null);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => isEligible && handleToggle(p.id)}
                      style={{
                        borderBottom: "1px solid #f0f0f0",
                        opacity: dimmed ? 0.45 : 1,
                        cursor: isEligible ? "pointer" : "default",
                        background: selectedIds.has(p.id) ? "rgba(21, 101, 192, 0.04)" : "transparent",
                      }}
                    >
                      <td style={{ ...prospectTdStyle, paddingRight: 0 }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          disabled={!isEligible}
                          onChange={() => handleToggle(p.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: isEligible ? "pointer" : "default" }}
                        />
                      </td>
                      <td style={{ ...prospectTdStyle, fontWeight: 500 }}>{p.email}</td>
                      <td style={{ ...prospectTdStyle, color: displayName ? "var(--charcoal)" : "#ccc" }}>
                        {displayName || "\u2014"}
                        {!p.name && reg && (
                          <span style={{ fontSize: "0.7rem", color: "var(--text-light)", marginLeft: "0.3rem" }}>(reg)</span>
                        )}
                      </td>
                      <td style={{ ...prospectTdStyle, textAlign: "center" }}>
                        {reg ? (
                          <span style={badgeStyle(
                            reg.payment_status === "paid" ? "#e8f5e9" : reg.payment_status === "pending" ? "#fff3e0" : "#f5f5f5",
                            reg.payment_status === "paid" ? "#2e7d32" : reg.payment_status === "pending" ? "#e65100" : "#616161",
                          )}>
                            {reg.payment_status}
                          </span>
                        ) : (
                          <span style={{ color: "#ccc" }}>{"\u2014"}</span>
                        )}
                      </td>
                      <td style={{ ...prospectTdStyle, textAlign: "center" }}>
                        <span style={badgeStyle(p.source === "import" ? "#e3f2fd" : "#f3e5f5", p.source === "import" ? "#1565c0" : "#7b1fa2")}>
                          {p.source}
                        </span>
                      </td>
                      <td style={{ ...prospectTdStyle, textAlign: "center" }}>
                        {p.unsubscribed ? (
                          <span style={badgeStyle("#ffebee", "#c62828")}>Unsub</span>
                        ) : alreadySent ? (
                          <span style={badgeStyle("#e8f5e9", "#2e7d32")}>Sent</span>
                        ) : (
                          <span style={badgeStyle("#f5f5f5", "#616161")}>Ready</span>
                        )}
                      </td>
                      <td style={{ ...prospectTdStyle, textAlign: "center" }}>{p.sends.filter((s) => s.status === "sent").length}</td>
                      <td style={{ ...prospectTdStyle, textAlign: "right", whiteSpace: "nowrap", color: "var(--text-light)", fontSize: "0.78rem" }}>
                        {new Date(p.created_at).toLocaleDateString()}
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
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const template = MARKETING_TEMPLATES.find((t) => t.key === selectedTemplate)!;
  const eligibleSelected = prospects.filter(
    (p) => selectedIds.has(p.id) && !p.unsubscribed
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
            {" "}({selectedIds.size - eligibleSelected.length} excluded: unsubscribed)
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
            {result.failed > 0 && ` | Failed: ${result.failed}`}
          </span>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ANNOUNCEMENTS TAB
// ════════════════════════════════════════════════════════════

type Recipient = { id: string; first_name: string; last_name: string; email: string };

function AnnouncementsTab() {
  const [registrations, setRegistrations] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("registrations")
        .select("id, first_name, last_name, email")
        .in("payment_status", ["paid", "comped"])
        .order("car_number", { ascending: true });
      setRegistrations(data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleToggleRecipient = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      alert("Subject and body are required.");
      return;
    }

    const recipientIds = sendToAll
      ? registrations.map((r) => r.id)
      : Array.from(selectedIds);

    if (recipientIds.length === 0) {
      alert("No recipients selected.");
      return;
    }

    const confirmMsg = `Send announcement to ${recipientIds.length} recipient${recipientIds.length === 1 ? "" : "s"}?`;
    if (!confirm(confirmMsg)) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/email/send-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim(), recipientIds }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to send");
      } else {
        setResult(data);
      }
    } catch {
      alert("Failed to send announcement.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Loading...
      </p>
    );
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionHeadingStyle}>Send Announcement</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "1rem" }}>
        Send a freeform email to paid and comped registrants. Uses the announcement email template.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={labelStyle}>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={inputStyle}
            placeholder="Event update: parking info..."
          />
        </div>
        <div>
          <label style={labelStyle}>Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            style={{ ...inputStyle, resize: "vertical" }}
            placeholder="Write your announcement message here..."
          />
        </div>

        <div>
          <label style={labelStyle}>Recipients</label>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
              <input type="radio" checked={sendToAll} onChange={() => setSendToAll(true)} />
              All paid & comped registrants ({registrations.length})
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
              <input type="radio" checked={!sendToAll} onChange={() => setSendToAll(false)} />
              Select specific
            </label>
          </div>

          {!sendToAll && (
            <div style={{ maxHeight: "200px", overflow: "auto", border: "1px solid #ddd", padding: "0.5rem" }}>
              {registrations.map((r) => (
                <label
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.35rem 0.5rem",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r.id)}
                    onChange={() => handleToggleRecipient(r.id)}
                  />
                  {r.first_name} {r.last_name} — {r.email}
                </label>
              ))}
              {registrations.length === 0 && (
                <p style={{ color: "var(--text-light)", fontSize: "0.85rem", padding: "0.5rem" }}>
                  No paid registrations yet.
                </p>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              ...btnStyle(sending),
              background: sending ? "#ccc" : "var(--gold)",
            }}
          >
            {sending ? "Sending..." : "Send Announcement"}
          </button>
          {result && (
            <span style={{ fontSize: "0.85rem", color: result.failed > 0 ? "#e65100" : "#2e7d32" }}>
              Sent: {result.sent}{result.failed > 0 ? `, Failed: ${result.failed}` : ""}
            </span>
          )}
        </div>
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
