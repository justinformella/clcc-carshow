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
};

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AuditPage() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [ran, setRan] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit");
      const data = await res.json();
      setSummary(data.summary);
      setIssues(data.issues || []);
      setRan(true);
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
                {errors.length > 0
                  ? `${errors.length} issue${errors.length !== 1 ? "s" : ""} found`
                  : warnings.length > 0
                  ? `${warnings.length} warning${warnings.length !== 1 ? "s" : ""}`
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
                      {(issue.registration_id || issue.sponsor_id) && (
                        <a
                          href={issue.registration_id ? `/admin/registrations/${issue.registration_id}` : `/admin/sponsors/${issue.sponsor_id}`}
                          style={{ fontSize: "0.75rem", color: "var(--gold)", whiteSpace: "nowrap", textDecoration: "none", fontWeight: 600 }}
                        >
                          View →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
