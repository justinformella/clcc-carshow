"use client";

import { useState } from "react";

type AuditIssue = {
  type: string;
  severity: "error" | "warning" | "info";
  description: string;
  registration_id?: string;
  sponsor_id?: string;
  car_number?: number;
  name?: string;
  expected_amount?: number;
  actual_amount?: number;
  stripe_session_id?: string;
  stripe_payment_intent?: string;
};

type AuditSummary = {
  registrations: {
    stripe: { count: number; total: number; base: number; donations: number };
    cash: { count: number; total: number };
    comped: { count: number };
    pending: { count: number };
    refunded: { count: number };
  };
  sponsors: {
    stripe: { count: number; total: number; base: number; donations: number };
    check: { count: number; total: number; unpaid: number };
    cash: { count: number; total: number };
  };
  stripe_gross: number;
  stripe_fees: number;
  stripe_net: number;
  stripe_balance: number;
  db_stripe_total: number;
  cash_expected: number;
  check_expected: number;
  sessions_checked: number;
  total_reg_revenue: number;
  total_sponsor_revenue: number;
  total_donation_revenue: number;
  total_gross: number;
  ad_spend: number;
  show_expenses: number;
  refunded: number;
};

type LineItem = {
  type: "registration" | "sponsor" | "orphan";
  car_number?: number;
  name: string;
  id: string;
  status?: string;
  stripe_session_id: string | null;
  db_amount: number;
  stripe_amount: number | null;
  match: boolean;
  payment_method: string;
  stripe_detail?: {
    charged: boolean;
    refunded: boolean;
    amount_charged: number;
    amount_refunded: number;
    charge_date: string | null;
    refund_date: string | null;
    stripe_status: string;
  };
};

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AuditPage() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<AuditSummary | null>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("audit_summary");
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  const [issues, setIssues] = useState<AuditIssue[]>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("audit_issues");
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("audit_lines");
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
  const [ran, setRan] = useState(() => {
    if (typeof window !== "undefined") return !!sessionStorage.getItem("audit_summary");
    return false;
  });
  const [lastRun, setLastRun] = useState<string | null>(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("audit_last_run");
    return null;
  });

  const runAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit");
      const data = await res.json();
      setSummary(data.summary);
      setIssues(data.issues || []);
      setLineItems(data.lineItems || []);
      setRan(true);
      const now = new Date().toLocaleString();
      setLastRun(now);
      sessionStorage.setItem("audit_summary", JSON.stringify(data.summary));
      sessionStorage.setItem("audit_issues", JSON.stringify(data.issues || []));
      sessionStorage.setItem("audit_lines", JSON.stringify(data.lineItems || []));
      sessionStorage.setItem("audit_last_run", now);
    } catch {
      alert("Audit failed");
    } finally {
      setLoading(false);
    }
  };

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 400 }}>
            Financial Audit
          </h1>
          <p style={{ color: "var(--text-light)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Cross-reference Stripe charges against registrations and sponsors
            {lastRun && <span> · Last run: {lastRun}</span>}
          </p>
        </div>
        <button
          onClick={runAudit}
          disabled={loading}
          style={{
            padding: "0.6rem 1.5rem",
            background: loading ? "#ccc" : "var(--gold)",
            color: "var(--charcoal)",
            border: "none",
            fontSize: "0.8rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Running Audit..." : ran ? "Re-Run Audit" : "Run Audit"}
        </button>
      </div>

      {!ran && !loading && (
        <div style={{ background: "var(--white)", padding: "3rem", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <p style={{ color: "var(--text-light)", fontSize: "0.9rem" }}>
            Click &ldquo;Run Audit&rdquo; to pull live data from Stripe and compare against the database.
          </p>
        </div>
      )}

      {summary && (
        <>
          {/* Status banner */}
          <div style={{
            background: errors.length > 0 ? "#fef2f2" : warnings.length > 0 ? "#fffbeb" : "#f0fdf4",
            border: `2px solid ${errors.length > 0 ? "#fca5a5" : warnings.length > 0 ? "#fde68a" : "#86efac"}`,
            padding: "1.25rem 1.5rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}>
            <span style={{ fontSize: "1.5rem" }}>
              {errors.length > 0 ? "⚠️" : warnings.length > 0 ? "⚡" : "✅"}
            </span>
            <div>
              <p style={{ fontWeight: 600, color: "var(--charcoal)", fontSize: "1rem" }}>
                {issues.length > 0
                  ? `${issues.length} issue${issues.length !== 1 ? "s" : ""} found`
                  : "All clear — no discrepancies found"}
              </p>
              <p style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>
                Checked {summary.sessions_checked} Stripe sessions against {summary.registrations.stripe.count + summary.registrations.cash.count + summary.registrations.comped.count} registrations and {summary.sponsors.stripe.count + summary.sponsors.check.count + summary.sponsors.cash.count} sponsors
              </p>
            </div>
          </div>

          {/* Reconciliation Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
            {/* Stripe Reconciliation */}
            <div style={{ background: "var(--white)", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 400, marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #eee" }}>
                Stripe Reconciliation
              </h3>
              <div style={{ fontSize: "0.85rem" }}>
                <p style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-light)", marginBottom: "0.4rem" }}>Gross Charges</p>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ color: "var(--text-light)" }}>Registration charges ({summary.registrations.stripe.count})</span>
                  <span style={{ fontWeight: 600 }}>{fmtMoney(summary.registrations.stripe.total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", fontSize: "0.8rem", paddingLeft: "1rem", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ color: "var(--text-light)" }}>↳ Fees: {fmtMoney(summary.registrations.stripe.base)} + Donations: {fmtMoney(summary.registrations.stripe.donations)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ color: "var(--text-light)" }}>Sponsor charges ({summary.sponsors.stripe.count})</span>
                  <span style={{ fontWeight: 600 }}>{fmtMoney(summary.sponsors.stripe.total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", fontSize: "0.8rem", paddingLeft: "1rem", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ color: "var(--text-light)" }}>↳ Sponsorship: {fmtMoney(summary.sponsors.stripe.base)} + Donations: {fmtMoney(summary.sponsors.stripe.donations)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #f5f5f5", fontWeight: 600 }}>
                  <span>DB Stripe total (gross)</span>
                  <span>{fmtMoney(summary.db_stripe_total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ color: "var(--text-light)" }}>Stripe says gross</span>
                  <span style={{ fontWeight: 600 }}>{fmtMoney(summary.stripe_gross)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ color: "var(--text-light)" }}>Gross difference</span>
                  <span style={{ fontWeight: 600, color: Math.abs(summary.stripe_gross - summary.db_stripe_total) > 1 ? "#c62828" : "#2e7d32" }}>
                    {fmtMoney(summary.stripe_gross - summary.db_stripe_total)}
                  </span>
                </div>

                <p style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-light)", marginTop: "0.75rem", marginBottom: "0.4rem" }}>After Fees</p>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ color: "var(--text-light)" }}>Stripe processing fees</span>
                  <span style={{ fontWeight: 600, color: "#c62828" }}>({fmtMoney(summary.stripe_fees)})</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ color: "var(--text-light)" }}>Net after fees</span>
                  <span style={{ fontWeight: 600 }}>{fmtMoney(summary.stripe_net)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderTop: "2px solid #ddd", marginTop: "0.25rem" }}>
                  <span style={{ fontWeight: 700 }}>Stripe balance</span>
                  <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--charcoal)" }}>{fmtMoney(summary.stripe_balance)}</span>
                </div>
              </div>
            </div>

            {/* Cash & Check Summary */}
            <div style={{ background: "var(--white)", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 400, marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #eee" }}>
                Cash &amp; Check Expected
              </h3>
              <div style={{ fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ color: "var(--text-light)" }}>Cash registrations ({summary.registrations.cash.count})</span>
                  <span style={{ fontWeight: 600 }}>{fmtMoney(summary.registrations.cash.total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ color: "var(--text-light)" }}>Cash sponsors ({summary.sponsors.cash.count})</span>
                  <span style={{ fontWeight: 600 }}>{fmtMoney(summary.sponsors.cash.total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ color: "var(--text-light)" }}>Check sponsors ({summary.sponsors.check.count})</span>
                  <span style={{ fontWeight: 600 }}>{fmtMoney(summary.check_expected)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderTop: "2px solid #ddd", marginTop: "0.25rem" }}>
                  <span style={{ fontWeight: 600 }}>Total cash/check expected</span>
                  <span style={{ fontWeight: 700, color: "var(--charcoal)" }}>{fmtMoney(summary.cash_expected + summary.check_expected)}</span>
                </div>
              </div>
            </div>

            {/* Registration Breakdown */}
            <div style={{ background: "var(--white)", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 400, marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #eee" }}>
                Registration Breakdown
              </h3>
              <div style={{ fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ color: "var(--text-light)" }}>Stripe paid</span>
                  <span><strong>{summary.registrations.stripe.count}</strong> · {fmtMoney(summary.registrations.stripe.total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ color: "var(--text-light)" }}>Cash paid</span>
                  <span><strong>{summary.registrations.cash.count}</strong> · {fmtMoney(summary.registrations.cash.total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ color: "var(--text-light)" }}>Comped</span>
                  <span><strong>{summary.registrations.comped.count}</strong></span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ color: "var(--text-light)" }}>Pending</span>
                  <span><strong>{summary.registrations.pending.count}</strong></span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0" }}>
                  <span style={{ color: "var(--text-light)" }}>Refunded</span>
                  <span><strong>{summary.registrations.refunded.count}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Net Summary */}
          <div style={{
            background: "var(--charcoal)",
            padding: "1.5rem 2rem",
            marginBottom: "1.5rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.5rem",
          }}>
            {(() => {
              const totalCollected = summary.stripe_balance + summary.cash_expected + summary.check_expected;
              const totalDeductions = summary.ad_spend + summary.show_expenses + summary.refunded;
              const netForCharity = totalCollected - totalDeductions;
              return [
                { label: "Stripe Balance", value: summary.stripe_balance },
                { label: "Cash + Check", value: summary.cash_expected + summary.check_expected },
                { label: "Total Collected", value: totalCollected },
                { label: "Expenses", value: -summary.show_expenses, red: true },
                { label: "Ad Spend", value: -summary.ad_spend, red: summary.ad_spend > 0 },
                { label: "Net for Charity", value: netForCharity, gold: true, large: true },
              ].map((item) => (
                <div key={item.label}>
                  <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.5)", marginBottom: "0.25rem" }}>
                    {item.label}
                  </p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: item.large ? "2rem" : "1.3rem", color: item.red ? "#ff6b6b" : item.gold ? "var(--gold)" : "#fff" }}>
                    {fmtMoney(item.value)}
                  </p>
                </div>
              ));
            })()}
          </div>

          {/* Issues List */}
          {issues.length > 0 && (
            <div style={{ background: "var(--white)", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "1.5rem" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 400, marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #eee" }}>
                Issues ({issues.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {issues.map((issue, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "0.75rem 1rem",
                      background: issue.severity === "error" ? "#fef2f2" : issue.severity === "warning" ? "#fffbeb" : "#f0fdf4",
                      borderLeft: `4px solid ${issue.severity === "error" ? "#dc2626" : issue.severity === "warning" ? "#d97706" : "#16a34a"}`,
                      fontSize: "0.85rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                      <div>
                        <span style={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: issue.severity === "error" ? "#dc2626" : issue.severity === "warning" ? "#d97706" : "#16a34a",
                          marginRight: "0.5rem",
                        }}>
                          {issue.type.replace(/_/g, " ")}
                        </span>
                        <span style={{ color: "var(--charcoal)" }}>{issue.description}</span>
                      </div>
                      <div style={{ display: "flex", gap: "0.75rem", flexShrink: 0 }}>
                        {(issue.registration_id || issue.sponsor_id) && (
                          <a
                            href={issue.registration_id ? `/admin/registrations/${issue.registration_id}` : `/admin/sponsors/${issue.sponsor_id}`}
                            style={{ fontSize: "0.75rem", color: "var(--gold)", whiteSpace: "nowrap", textDecoration: "none", fontWeight: 600 }}
                          >
                            View →
                          </a>
                        )}
                        {(issue.stripe_payment_intent || issue.stripe_session_id) && (
                          <a
                            href={issue.stripe_payment_intent
                              ? `https://dashboard.stripe.com/payments/${issue.stripe_payment_intent}`
                              : `https://dashboard.stripe.com/search#query=${issue.stripe_session_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "0.75rem", color: "#635bff", whiteSpace: "nowrap", textDecoration: "none", fontWeight: 600 }}
                          >
                            View in Stripe →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Line-by-Line Audit */}
          {lineItems.length > 0 && (
            <div style={{ background: "var(--white)", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "1.5rem" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 400, marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #eee" }}>
                Line-by-Line Audit ({lineItems.length})
              </h3>
              <div style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ background: "#fafafa", textAlign: "left" }}>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>Method</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>DB Amount</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Stripe Amount</th>
                      <th style={{ ...thStyle, textAlign: "center" }}>Match</th>
                      <th style={thStyle}>Stripe Status</th>
                      <th style={thStyle} />
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f0f0f0", background: !item.match ? "#fef2f2" : undefined }}>
                        <td style={{ padding: "0.5rem 0.75rem" }}>
                          <span style={{
                            fontSize: "0.65rem",
                            fontWeight: 600,
                            padding: "2px 6px",
                            textTransform: "uppercase",
                            background: item.type === "orphan" ? "#fff3e0" : item.type === "registration" ? "#e3f2fd" : "#fce4ec",
                            color: item.type === "orphan" ? "#e65100" : item.type === "registration" ? "#1565c0" : "#c62828",
                          }}>
                            {item.type === "orphan" ? "Orphan" : item.type === "registration" ? `Reg #${item.car_number}` : "Sponsor"}
                          </span>
                          {item.status && (item.status === "archived" || item.status === "refunded") && (
                            <span style={{ fontSize: "0.6rem", fontWeight: 600, padding: "1px 5px", marginLeft: "0.3rem", background: item.status === "refunded" ? "#ffebee" : "#f5f5f5", color: item.status === "refunded" ? "#c62828" : "#666", textTransform: "uppercase" }}>
                              {item.status}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", fontWeight: 500 }}>{item.name}</td>
                        <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-light)" }}>{item.payment_method}</td>
                        <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", fontWeight: 600 }}>{fmtMoney(item.db_amount)}</td>
                        <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", fontWeight: 600 }}>
                          {item.stripe_amount !== null ? fmtMoney(item.stripe_amount) : "—"}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", textAlign: "center" }}>
                          {item.payment_method === "cash" || item.payment_method === "check" ? (
                            <span style={{ color: "var(--text-light)", fontSize: "0.75rem" }}>n/a</span>
                          ) : item.match ? (
                            <span style={{ color: "#2e7d32" }}>✓</span>
                          ) : (
                            <span style={{ color: "#c62828", fontWeight: 700 }}>✗</span>
                          )}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem" }}>
                          {item.stripe_detail ? (
                            <div>
                              {item.stripe_detail.stripe_status === "test" ? (
                                <span style={{ color: "#999" }}>Test</span>
                              ) : item.stripe_detail.refunded ? (
                                <span style={{ color: "#c62828" }}>
                                  Refunded {fmtMoney(item.stripe_detail.amount_refunded)}
                                  {item.stripe_detail.refund_date && (
                                    <span style={{ display: "block", fontSize: "0.65rem", color: "var(--text-light)" }}>
                                      {new Date(item.stripe_detail.refund_date).toLocaleDateString()}
                                    </span>
                                  )}
                                </span>
                              ) : item.stripe_detail.charged ? (
                                <span style={{ color: "#2e7d32" }}>
                                  Charged {fmtMoney(item.stripe_detail.amount_charged)}
                                  {item.stripe_detail.charge_date && (
                                    <span style={{ display: "block", fontSize: "0.65rem", color: "var(--text-light)" }}>
                                      {new Date(item.stripe_detail.charge_date).toLocaleDateString()}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span style={{ color: "#e65100" }}>{item.stripe_detail.stripe_status}</span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "#999" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>
                          {item.type === "orphan" ? (
                            <a
                              href={`https://dashboard.stripe.com/search#query=${item.stripe_session_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: "0.7rem", color: "#635bff", textDecoration: "none", fontWeight: 600 }}
                            >
                              Stripe
                            </a>
                          ) : (
                            <a
                              href={item.type === "registration" ? `/admin/registrations/${item.id}` : `/admin/sponsors/${item.id}`}
                              style={{ fontSize: "0.7rem", color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}
                            >
                              View
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  fontWeight: 600,
  fontSize: "0.65rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-light)",
  whiteSpace: "nowrap",
};
