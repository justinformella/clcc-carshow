import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getStripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase-server";
import { fetchEvents, resolveEvent } from "@/lib/events";

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
  stripe_payment_intent?: string;
};

const DAY_SECONDS = 24 * 60 * 60;
// Stripe activity for a show is considered settled this long after show day
const POST_SHOW_DAYS = 45;

// Midnight (Central time, the show's timezone) at the start of a YYYY-MM-DD date, in unix seconds.
// Uses the real America/Chicago offset for that date (CDT -5 in summer, CST -6 in winter).
function startOfShowDay(date: string): number {
  const utcMidnight = new Date(`${date}T00:00:00Z`);
  const tz = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", timeZoneName: "shortOffset" })
    .formatToParts(utcMidnight)
    .find((p) => p.type === "timeZoneName")?.value;
  const match = tz?.match(/GMT([+-]\d+)/);
  const offsetHours = match ? parseInt(match[1], 10) : -5;
  return Math.floor(utcMidnight.getTime() / 1000) - offsetHours * 3600;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const stripe = getStripe();
  const supabase = createServerClient();
  const ev = await resolveEvent(supabase, new URL(request.url).searchParams.get("event"));

  // Fetch this event's registrations and sponsors, plus every event's Stripe
  // session ids so another year's charges are never reported as orphans here
  const [regResult, sponsorResult, campaignResult, expenseResult, allRegSessions, allSponsorSessions, allEvents] = await Promise.all([
    supabase.from("registrations").select("*").eq("event_id", ev.id),
    supabase.from("sponsors").select("*").eq("event_id", ev.id),
    supabase.from("ad_campaigns").select("spent_cents").eq("event_id", ev.id),
    supabase.from("show_expenses").select("amount_cents").eq("event_id", ev.id),
    supabase.from("registrations").select("stripe_session_id, event_id").not("stripe_session_id", "is", null),
    supabase.from("sponsors").select("stripe_session_id, event_id").not("stripe_session_id", "is", null),
    fetchEvents(supabase),
  ]);

  const registrations = regResult.data || [];
  const sponsors = sponsorResult.data || [];
  const totalAdSpend = (campaignResult.data || []).reduce((s: number, c: { spent_cents: number }) => s + (c.spent_cents || 0), 0);
  const totalShowExpenses = (expenseResult.data || []).reduce((s: number, e: { amount_cents: number }) => s + (e.amount_cents || 0), 0);

  // ── Stripe window for this event ──
  // A show's Stripe season ends POST_SHOW_DAYS after show day (late sponsor
  // payments, payouts). Sessions are fetched from the day after the previous
  // show (or, for the first show, from just before its earliest registration/
  // sponsor) through that cutoff (now, for the current show). Sessions that
  // belong to another event's rows are dropped. Sessions with no DB row at all
  // (orphans) and payouts are split at the previous show's cutoff so each one
  // is counted under exactly one event.
  const nowSec = Math.floor(Date.now() / 1000);
  const prevEvent = allEvents.find((e) => e.year < ev.year) || null;
  const showCutoff = (date: string) => startOfShowDay(date) + (POST_SHOW_DAYS + 1) * DAY_SECONDS;
  const createdTimes = [...registrations, ...sponsors]
    .map((r) => (r.created_at ? Math.floor(new Date(r.created_at).getTime() / 1000) : NaN))
    .filter((t) => !isNaN(t));
  const earliestRow = createdTimes.length > 0 ? Math.min(...createdTimes) - DAY_SECONDS : null;
  const fetchStart = prevEvent
    ? Math.min(startOfShowDay(prevEvent.event_date) + DAY_SECONDS, earliestRow ?? Infinity)
    : earliestRow ?? startOfShowDay(ev.event_date) - 365 * DAY_SECONDS;
  const windowEnd = ev.is_current ? nowSec : Math.min(nowSec, showCutoff(ev.event_date));
  const partitionStart = prevEvent ? showCutoff(prevEvent.event_date) : fetchStart;

  const thisEventSessionIds = new Set<string>();
  const otherEventSessionIds = new Set<string>();
  for (const row of [...(allRegSessions.data || []), ...(allSponsorSessions.data || [])]) {
    if (!row.stripe_session_id) continue;
    if (row.event_id === ev.id) thisEventSessionIds.add(row.stripe_session_id);
    else otherEventSessionIds.add(row.stripe_session_id);
  }

  // Pull Stripe checkout sessions in this event's window
  const sessions: Record<string, { id: string; amount_total: number; payment_intent: string | null; payment_status: string; metadata: Record<string, string> }> = {};

  try {
    for await (const session of stripe.checkout.sessions.list({ created: { gte: fetchStart, lte: windowEnd }, limit: 100, expand: ["data.payment_intent"] })) {
      if (!thisEventSessionIds.has(session.id)) {
        // Another year's checkout: not ours
        if (otherEventSessionIds.has(session.id)) continue;
        // Unmatched checkout: attribute it to one event only
        if (session.created < partitionStart) continue;
      }
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

  // Sessions this event's rows point to but that fall outside the window
  // (e.g. a sponsor who paid months after the show): fetch them directly so
  // they still count toward this event.
  const missingIds = [...thisEventSessionIds].filter((id) => !sessions[id]);
  for (let i = 0; i < missingIds.length; i += 10) {
    await Promise.all(
      missingIds.slice(i, i + 10).map(async (id) => {
        try {
          const session = await stripe.checkout.sessions.retrieve(id, { expand: ["payment_intent"] });
          sessions[session.id] = {
            id: session.id,
            amount_total: session.amount_total || 0,
            payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
            payment_status: session.payment_status || "",
            metadata: (session.metadata || {}) as Record<string, string>,
          };
        } catch {
          // Not found in this Stripe account: reported as missing below
        }
      })
    );
  }

  const issues: AuditIssue[] = [];

  // ── Registration Audit ──

  const allPaidRegs = registrations.filter((r) => r.payment_status === "paid" || r.payment_status === "comped");
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
      // Session might be outside this event's Stripe window — just note it
      issues.push({
        type: "missing_stripe",
        severity: "warning",
        description: `Registration #${reg.car_number} has Stripe session ${reg.stripe_session_id.slice(0, 20)}... but session not found in Stripe (may be outside this show's Stripe window)`,
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
    if ((session.payment_status === "complete" || session.payment_status === "paid") && !knownSessionIds.has(sessionId) && session.amount_total > 0) {
      // Check if this charge was refunded — if so, skip it
      let refunded = false;
      if (session.payment_intent) {
        try {
          const pi = await stripe.paymentIntents.retrieve(session.payment_intent);
          if (pi.status === "canceled" || (pi.amount_received > 0 && pi.amount_received === (pi.latest_charge as { amount_refunded?: number } | null)?.amount_refunded)) {
            refunded = true;
          }
          // Check charges for refunds
          const charges = await stripe.charges.list({ payment_intent: session.payment_intent, limit: 1 });
          if (charges.data[0]?.refunded) {
            refunded = true;
          }
        } catch {}
      }

      if (!refunded) {
        const piId = session.payment_intent;
        issues.push({
          type: "orphan_charge",
          severity: "warning",
          description: `Stripe charge of $${(session.amount_total / 100).toFixed(2)} has no matching registration or sponsor`,
          stripe_session_id: sessionId,
          stripe_payment_intent: piId || undefined,
          actual_amount: session.amount_total,
        });
      }
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
    .filter((s) => s.payment_status === "complete" || s.payment_status === "paid")
    .reduce((sum, s) => sum + (s.amount_total || 0), 0);

  // Pull actual Stripe balance and payouts. The balance on hand belongs to the
  // current show only (a past show's money has been paid out); payouts are
  // limited to this event's partition of the timeline.
  let stripeBalance = 0;
  let stripeTotalPayouts = 0;
  try {
    if (ev.is_current) {
      const balance = await stripe.balance.retrieve();
      stripeBalance = (balance.available || []).reduce((s, b) => s + (b.amount || 0), 0)
        + (balance.pending || []).reduce((s, b) => s + (b.amount || 0), 0);
    }

    // Get this event's payouts
    // Past shows end exclusively at their cutoff so a payout at that exact
    // second isn't also counted by the next show (which starts there).
    const payoutRange = ev.is_current ? { gte: partitionStart, lte: windowEnd } : { gte: partitionStart, lt: windowEnd };
    for await (const payout of stripe.payouts.list({ created: payoutRange, limit: 100 })) {
      if (payout.status === "paid") {
        stripeTotalPayouts += (payout.amount || 0);
      }
    }
  } catch (err) {
    console.error("Failed to fetch Stripe balance/payouts:", err);
  }

  // Derive: fees = gross - payouts - balance (accounting identity)
  const stripeTotalFees = stripeTotal - stripeTotalPayouts - stripeBalance;
  const stripeTotalNet = stripeTotalPayouts + stripeBalance; // what you actually received

  // Check gross total mismatch
  const dbStripeTotal = stripeRegRevenue + stripeSponsorRevenue;
  if (Math.abs(stripeTotal - dbStripeTotal) > 100) {
    issues.push({
      type: "amount_mismatch",
      severity: "error",
      description: `Stripe gross total ($${(stripeTotal / 100).toFixed(2)}) differs from DB Stripe total ($${(dbStripeTotal / 100).toFixed(2)}) by $${(Math.abs(stripeTotal - dbStripeTotal) / 100).toFixed(2)}`,
      expected_amount: dbStripeTotal,
      actual_amount: stripeTotal,
    });
  }

  // ── Line-by-line audit ──
  // Build a per-session breakdown comparing DB vs Stripe
  const lineItems: {
    type: "registration" | "sponsor" | "orphan";
    car_number?: number;
    name: string;
    status?: string;
    id: string;
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
  }[] = [];

  // Group registrations by session for multi-vehicle checkouts
  for (const [sessionId, regs] of Object.entries(regsBySession)) {
    const session = sessions[sessionId];
    const dbTotal = regs.reduce((s, r) => s + (r.amount_paid || 0) + (r.donation_cents || 0), 0);
    const stripeAmt = session ? session.amount_total : null;
    lineItems.push({
      type: "registration",
      car_number: regs[0].car_number,
      name: regs.length === 1
        ? `${regs[0].first_name} ${regs[0].last_name}`
        : `${regs[0].first_name} ${regs[0].last_name} (${regs.length} cars)`,
      id: regs[0].id,
      stripe_session_id: sessionId,
      db_amount: dbTotal,
      stripe_amount: stripeAmt,
      match: stripeAmt !== null ? Math.abs(dbTotal - stripeAmt) <= 1 : false,
      payment_method: "stripe",
    });
  }

  // Cash registrations
  for (const reg of cashRegs) {
    lineItems.push({
      type: "registration",
      car_number: reg.car_number,
      name: `${reg.first_name} ${reg.last_name}`,
      id: reg.id,
      stripe_session_id: null,
      db_amount: (reg.amount_paid || 0) + (reg.donation_cents || 0),
      stripe_amount: null,
      match: true,
      payment_method: "cash",
    });
  }

  // Sponsors
  for (const sp of [...paidSponsors, ...checkSponsors.filter((s) => s.status === "paid"), ...cashSponsors.filter((s) => s.status === "paid")]) {
    const session = sp.stripe_session_id ? sessions[sp.stripe_session_id] : null;
    const dbTotal = (sp.sponsorship_amount || 0) + (sp.donation_cents || 0);
    const stripeAmt = session ? session.amount_total : null;
    lineItems.push({
      type: "sponsor",
      name: sp.company,
      id: sp.id,
      stripe_session_id: sp.stripe_session_id || null,
      db_amount: dbTotal,
      stripe_amount: stripeAmt,
      match: sp.payment_method === "stripe" ? (stripeAmt !== null ? Math.abs(dbTotal - stripeAmt) <= 1 : false) : true,
      payment_method: sp.payment_method || "unknown",
    });
  }

  // Archived/refunded registrations with Stripe sessions — pull full charge details
  const archivedRegs = registrations.filter((r) =>
    (r.payment_status === "archived" || r.payment_status === "refunded") && r.stripe_session_id
  );

  // Dedupe by stripe_session_id to avoid fetching the same session multiple times
  const archivedBySession: Record<string, typeof archivedRegs> = {};
  for (const reg of archivedRegs) {
    if (reg.stripe_session_id) {
      if (!archivedBySession[reg.stripe_session_id]) archivedBySession[reg.stripe_session_id] = [];
      archivedBySession[reg.stripe_session_id].push(reg);
    }
  }

  for (const [sessionId, regs] of Object.entries(archivedBySession)) {
    let session = sessions[sessionId];
    const isTest = sessionId.startsWith("cs_test_");

    // Fetch actual charge details from Stripe for live sessions
    let stripeDetail: typeof lineItems[0]["stripe_detail"];
    if (!isTest) {
      try {
        // If session not in our cache, fetch it directly
        if (!session) {
          const fetched = await stripe.checkout.sessions.retrieve(sessionId);
          session = {
            id: fetched.id,
            amount_total: fetched.amount_total || 0,
            payment_intent: typeof fetched.payment_intent === "string" ? fetched.payment_intent : fetched.payment_intent?.id || null,
            payment_status: fetched.payment_status || "",
            metadata: (fetched.metadata || {}) as Record<string, string>,
          };
        }

        if (session.payment_intent) {
          const charges = await stripe.charges.list({ payment_intent: session.payment_intent, limit: 1 });
          const charge = charges.data[0];
          if (charge) {
            stripeDetail = {
              charged: charge.paid,
              refunded: charge.refunded,
              amount_charged: charge.amount,
              amount_refunded: charge.amount_refunded,
              charge_date: charge.created ? new Date(charge.created * 1000).toISOString() : null,
              refund_date: charge.refunded && charge.refunds?.data?.[0]?.created
                ? new Date(charge.refunds.data[0].created * 1000).toISOString()
                : null,
              stripe_status: charge.refunded ? "refunded" : charge.paid ? "charged" : charge.status,
            };
          } else {
            stripeDetail = {
              charged: false, refunded: false, amount_charged: 0, amount_refunded: 0,
              charge_date: null, refund_date: null, stripe_status: "no charge found",
            };
          }
        } else {
          // Session exists but no payment intent — payment was never completed
          stripeDetail = {
            charged: false, refunded: false, amount_charged: 0, amount_refunded: 0,
            charge_date: null, refund_date: null,
            stripe_status: session.payment_status === "unpaid" ? "abandoned (never paid)" : session.payment_status || "unknown",
          };
        }
      } catch {
        stripeDetail = {
          charged: false, refunded: false, amount_charged: 0, amount_refunded: 0,
          charge_date: null, refund_date: null, stripe_status: "session not found in Stripe",
        };
      }
    } else {
      stripeDetail = {
        charged: false, refunded: false, amount_charged: 0, amount_refunded: 0,
        charge_date: null, refund_date: null, stripe_status: "test",
      };
    }

    const reg = regs[0];
    lineItems.push({
      type: "registration",
      car_number: reg.car_number,
      name: regs.length === 1
        ? `${reg.first_name} ${reg.last_name}`
        : `${reg.first_name} ${reg.last_name} (${regs.length} cars)`,
      id: reg.id,
      status: reg.payment_status,
      stripe_session_id: sessionId,
      db_amount: regs.reduce((s, r) => s + (r.amount_paid || 0) + (r.donation_cents || 0), 0),
      stripe_amount: session ? session.amount_total : null,
      match: true,
      payment_method: reg.payment_method || "stripe",
      stripe_detail: stripeDetail,
    });
  }

  // Orphan Stripe sessions — charges with no DB record at all
  for (const [sessionId, session] of Object.entries(sessions)) {
    if ((session.payment_status === "complete" || session.payment_status === "paid") && !knownSessionIds.has(sessionId) && session.amount_total > 0) {
      let stripeDetail: typeof lineItems[0]["stripe_detail"];
      if (session.payment_intent) {
        try {
          const charges = await stripe.charges.list({ payment_intent: session.payment_intent, limit: 1 });
          const charge = charges.data[0];
          if (charge) {
            stripeDetail = {
              charged: charge.paid,
              refunded: charge.refunded,
              amount_charged: charge.amount,
              amount_refunded: charge.amount_refunded,
              charge_date: charge.created ? new Date(charge.created * 1000).toISOString() : null,
              refund_date: charge.refunded && charge.refunds?.data?.[0]?.created
                ? new Date(charge.refunds.data[0].created * 1000).toISOString()
                : null,
              stripe_status: charge.refunded ? "refunded" : charge.paid ? "charged" : charge.status,
            };
          }
        } catch {}
      }

      const isRefunded = stripeDetail?.refunded;
      if (!isRefunded) {
        issues.push({
          type: "orphan_charge",
          severity: "warning",
          description: `Stripe charge of $${(session.amount_total / 100).toFixed(2)} has no matching registration or sponsor`,
          stripe_session_id: sessionId,
          stripe_payment_intent: session.payment_intent || undefined,
          actual_amount: session.amount_total,
        });
      }

      lineItems.push({
        type: "orphan",
        name: isRefunded ? "Refunded (no DB record)" : "Unknown charge",
        id: sessionId,
        status: isRefunded ? "refunded" : "orphan",
        stripe_session_id: sessionId,
        db_amount: 0,
        stripe_amount: session.amount_total,
        match: !!isRefunded,
        payment_method: "stripe",
        stripe_detail: stripeDetail,
      });
    }
  }

  // ── Cross-page totals (matching finances page logic) ──
  const allPaidSponsors = sponsors.filter((s) => s.status === "paid" || s.status === "engaged");
  const totalRegRevenue = allPaidRegs.reduce((s, r) => s + (r.amount_paid || 0), 0);
  const totalSponsorRevenue = allPaidSponsors.reduce((s, sp) => s + (sp.sponsorship_amount || 0), 0);
  const totalDonationRevenue = allPaidRegs.reduce((s, r) => s + (r.donation_cents || 0), 0)
    + allPaidSponsors.reduce((s, sp) => s + (sp.donation_cents || 0), 0);
  const totalGross = totalRegRevenue + totalSponsorRevenue + totalDonationRevenue;

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
      stripe_payouts: stripeTotalPayouts,
      stripe_balance: stripeBalance,
      db_stripe_total: stripeRegRevenue + stripeSponsorRevenue,
      cash_expected: cashRegRevenue + cashSponsorRevenue,
      check_expected: checkSponsorRevenue,
      sessions_checked: Object.keys(sessions).length,
      // Totals matching finances page
      total_reg_revenue: totalRegRevenue,
      total_sponsor_revenue: totalSponsorRevenue,
      total_donation_revenue: totalDonationRevenue,
      total_gross: totalGross,
      ad_spend: totalAdSpend,
      show_expenses: totalShowExpenses,
      refunded: registrations.filter((r) => r.payment_status === "refunded").reduce((s, r) => s + (r.amount_paid || 0), 0),
    },
    issues,
    lineItems,
  });
}
