import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase-server";

export const maxDuration = 30;

type AuditIssue = {
  type: "missing_stripe" | "missing_registration" | "amount_mismatch" | "unreconciled_check" | "orphan_charge";
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

export async function GET() {
  const stripe = getStripe();
  const supabase = createServerClient();

  // Fetch all registrations and sponsors
  const [regResult, sponsorResult] = await Promise.all([
    supabase.from("registrations").select("*").in("payment_status", ["paid", "comped", "pending", "refunded"]),
    supabase.from("sponsors").select("*").neq("status", "archived"),
  ]);

  const registrations = regResult.data || [];
  const sponsors = sponsorResult.data || [];

  // Pull Stripe checkout sessions from the last 90 days
  const since = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
  const sessions: Record<string, { id: string; amount_total: number; payment_intent: string | null; payment_status: string; metadata: Record<string, string> }> = {};

  try {
    for await (const session of stripe.checkout.sessions.list({ created: { gte: since }, limit: 100, expand: ["data.payment_intent"] })) {
      sessions[session.id] = {
        id: session.id,
        amount_total: session.amount_total || 0,
        payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
        payment_status: session.payment_status || "",
        metadata: (session.metadata || {}) as Record<string, string>,
      };
    }
  } catch (err) {
    console.error("Failed to fetch Stripe sessions:", err);
  }

  const issues: AuditIssue[] = [];

  // ── Registration Audit ──

  const paidRegs = registrations.filter((r) => r.payment_status === "paid" && r.payment_method === "stripe");
  const cashRegs = registrations.filter((r) => r.payment_status === "paid" && r.payment_method === "cash");
  const compedRegs = registrations.filter((r) => r.payment_status === "comped");
  const pendingRegs = registrations.filter((r) => r.payment_status === "pending");
  const refundedRegs = registrations.filter((r) => r.payment_status === "refunded");

  // Check: Stripe-paid registrations with valid Stripe sessions
  for (const reg of paidRegs) {
    if (!reg.stripe_session_id) {
      issues.push({
        type: "missing_stripe",
        severity: "error",
        description: `Registration #${reg.car_number} marked as Stripe paid but has no Stripe session ID`,
        registration_id: reg.id,
        car_number: reg.car_number,
        name: `${reg.first_name} ${reg.last_name}`,
      });
      continue;
    }

    const session = sessions[reg.stripe_session_id];
    if (!session) {
      // Session might be older than 90 days — just note it
      issues.push({
        type: "missing_stripe",
        severity: "warning",
        description: `Registration #${reg.car_number} has Stripe session ${reg.stripe_session_id.slice(0, 20)}... but session not found in Stripe (may be older than 90 days)`,
        registration_id: reg.id,
        car_number: reg.car_number,
        name: `${reg.first_name} ${reg.last_name}`,
        stripe_session_id: reg.stripe_session_id,
      });
    }
  }

  // Check: Amount mismatches for Stripe sessions with registrations
  // Group registrations by stripe_session_id (multi-vehicle checkouts share a session)
  const regsBySession: Record<string, typeof registrations> = {};
  for (const reg of paidRegs) {
    if (reg.stripe_session_id) {
      if (!regsBySession[reg.stripe_session_id]) regsBySession[reg.stripe_session_id] = [];
      regsBySession[reg.stripe_session_id].push(reg);
    }
  }

  for (const [sessionId, regs] of Object.entries(regsBySession)) {
    const session = sessions[sessionId];
    if (!session) continue;

    const dbTotal = regs.reduce((sum, r) => sum + (r.amount_paid || 0) + (r.donation_cents || 0), 0);
    if (Math.abs(dbTotal - session.amount_total) > 1) {
      issues.push({
        type: "amount_mismatch",
        severity: "error",
        description: `Session ${sessionId.slice(0, 20)}... — DB total $${(dbTotal / 100).toFixed(2)} vs Stripe $${(session.amount_total / 100).toFixed(2)} (${regs.map((r) => `#${r.car_number}`).join(", ")})`,
        registration_id: regs[0].id,
        car_number: regs[0].car_number,
        name: regs.map((r) => `${r.first_name} ${r.last_name}`).join(", "),
        expected_amount: dbTotal,
        actual_amount: session.amount_total,
        stripe_session_id: sessionId,
      });
    }
  }

  // ── Sponsor Audit ──

  const paidSponsors = sponsors.filter((s) => s.status === "paid" && s.payment_method === "stripe");
  const checkSponsors = sponsors.filter((s) => s.payment_method === "check");
  const cashSponsors = sponsors.filter((s) => s.payment_method === "cash");

  for (const sponsor of paidSponsors) {
    if (!sponsor.stripe_session_id) {
      issues.push({
        type: "missing_stripe",
        severity: "error",
        description: `Sponsor "${sponsor.company}" marked as Stripe paid but has no Stripe session ID`,
        sponsor_id: sponsor.id,
        name: sponsor.company,
      });
      continue;
    }

    const session = sessions[sponsor.stripe_session_id];
    if (session) {
      const dbTotal = (sponsor.sponsorship_amount || 0) + (sponsor.donation_cents || 0);
      if (Math.abs(dbTotal - session.amount_total) > 1) {
        issues.push({
          type: "amount_mismatch",
          severity: "error",
          description: `Sponsor "${sponsor.company}" — DB total $${(dbTotal / 100).toFixed(2)} vs Stripe $${(session.amount_total / 100).toFixed(2)}`,
          sponsor_id: sponsor.id,
          name: sponsor.company,
          expected_amount: dbTotal,
          actual_amount: session.amount_total,
          stripe_session_id: sponsor.stripe_session_id,
        });
      }
    }
  }

  // Check: unreconciled check payments
  for (const sponsor of checkSponsors) {
    if (sponsor.status !== "paid") {
      issues.push({
        type: "unreconciled_check",
        severity: "warning",
        description: `Sponsor "${sponsor.company}" — check payment, status: ${sponsor.status} (not marked paid)`,
        sponsor_id: sponsor.id,
        name: sponsor.company,
        expected_amount: sponsor.sponsorship_amount || 0,
      });
    }
  }

  // ── Orphan Stripe Sessions ──
  // Find Stripe sessions that don't match any registration or sponsor
  const knownSessionIds = new Set([
    ...registrations.map((r) => r.stripe_session_id).filter(Boolean),
    ...sponsors.map((s) => s.stripe_session_id).filter(Boolean),
  ]);

  for (const [sessionId, session] of Object.entries(sessions)) {
    if (session.payment_status === "complete" && !knownSessionIds.has(sessionId) && session.amount_total > 0) {
      issues.push({
        type: "orphan_charge",
        severity: "warning",
        description: `Stripe session ${sessionId.slice(0, 20)}... ($${(session.amount_total / 100).toFixed(2)}) has no matching registration or sponsor`,
        stripe_session_id: sessionId,
        actual_amount: session.amount_total,
      });
    }
  }

  // ── Summaries ──
  const stripeRegRevenue = paidRegs.reduce((s, r) => s + (r.amount_paid || 0) + (r.donation_cents || 0), 0);
  const stripeRegBase = paidRegs.reduce((s, r) => s + (r.amount_paid || 0), 0);
  const stripeRegDonations = paidRegs.reduce((s, r) => s + (r.donation_cents || 0), 0);
  const cashRegRevenue = cashRegs.reduce((s, r) => s + (r.amount_paid || 0) + (r.donation_cents || 0), 0);
  const stripeSponsorRevenue = paidSponsors.reduce((s, sp) => s + (sp.sponsorship_amount || 0) + (sp.donation_cents || 0), 0);
  const stripeSponsorBase = paidSponsors.reduce((s, sp) => s + (sp.sponsorship_amount || 0), 0);
  const stripeSponsorDonations = paidSponsors.reduce((s, sp) => s + (sp.donation_cents || 0), 0);
  const checkSponsorRevenue = checkSponsors.filter((s) => s.status === "paid").reduce((s, sp) => s + (sp.sponsorship_amount || 0) + (sp.donation_cents || 0), 0);
  const cashSponsorRevenue = cashSponsors.filter((s) => s.status === "paid").reduce((s, sp) => s + (sp.sponsorship_amount || 0) + (sp.donation_cents || 0), 0);

  const stripeTotal = Object.values(sessions)
    .filter((s) => s.payment_status === "complete")
    .reduce((sum, s) => sum + s.amount_total, 0);

  // Pull actual Stripe balance to compare
  let stripeBalance = 0;
  let stripeTotalFees = 0;
  let stripeTotalNet = 0;
  try {
    const balance = await stripe.balance.retrieve();
    stripeBalance = balance.available.reduce((s, b) => s + b.amount, 0)
      + balance.pending.reduce((s, b) => s + b.amount, 0);

    // Get actual fees from balance transactions
    for await (const txn of stripe.balanceTransactions.list({ created: { gte: since }, limit: 100, type: "charge" })) {
      stripeTotalFees += txn.fee;
      stripeTotalNet += txn.net;
    }
  } catch (err) {
    console.error("Failed to fetch Stripe balance:", err);
  }

  return NextResponse.json({
    summary: {
      registrations: {
        stripe: { count: paidRegs.length, total: stripeRegRevenue, base: stripeRegBase, donations: stripeRegDonations },
        cash: { count: cashRegs.length, total: cashRegRevenue },
        comped: { count: compedRegs.length },
        pending: { count: pendingRegs.length },
        refunded: { count: refundedRegs.length },
      },
      sponsors: {
        stripe: { count: paidSponsors.length, total: stripeSponsorRevenue, base: stripeSponsorBase, donations: stripeSponsorDonations },
        check: { count: checkSponsors.length, total: checkSponsorRevenue, unpaid: checkSponsors.filter((s) => s.status !== "paid").length },
        cash: { count: cashSponsors.length, total: cashSponsorRevenue },
      },
      stripe_gross: stripeTotal,
      stripe_fees: stripeTotalFees,
      stripe_net: stripeTotalNet,
      stripe_balance: stripeBalance,
      db_stripe_total: stripeRegRevenue + stripeSponsorRevenue,
      cash_expected: cashRegRevenue + cashSponsorRevenue,
      check_expected: checkSponsorRevenue,
      sessions_checked: Object.keys(sessions).length,
    },
    issues,
  });
}
