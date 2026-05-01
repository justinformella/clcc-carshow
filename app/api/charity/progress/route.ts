import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const GOAL_CENTS = 1500000; // $15,000

function estimateStripeFee(amountCents: number): number {
  return Math.round(amountCents * 0.029) + 30;
}

export async function GET() {
  const supabase = createServerClient();

  const [regResult, refundResult, sponsorResult, expenseResult, campaignResult] =
    await Promise.all([
      supabase
        .from("registrations")
        .select("amount_paid, donation_cents")
        .eq("payment_status", "paid"),
      supabase
        .from("registrations")
        .select("amount_paid")
        .eq("payment_status", "refunded"),
      supabase
        .from("sponsors")
        .select("sponsorship_amount, donation_cents")
        .eq("status", "paid"),
      supabase.from("show_expenses").select("amount_cents"),
      supabase.from("ad_campaigns").select("spent_cents"),
    ]);

  const regs = regResult.data || [];
  const refunds = refundResult.data || [];
  const sponsors = sponsorResult.data || [];
  const expenses = expenseResult.data || [];
  const campaigns = campaignResult.data || [];

  // Gross revenue
  const regRevenue = regs.reduce(
    (sum, r) => sum + (r.amount_paid || 0),
    0
  );
  const regDonations = regs.reduce(
    (sum, r) => sum + (r.donation_cents || 0),
    0
  );
  const sponsorRevenue = sponsors.reduce(
    (sum, s) => sum + (s.sponsorship_amount || 0),
    0
  );
  const sponsorDonations = sponsors.reduce(
    (sum, s) => sum + (s.donation_cents || 0),
    0
  );
  const totalRevenue =
    regRevenue + regDonations + sponsorRevenue + sponsorDonations;

  // Estimated Stripe fees — match admin: apply to all paid transactions
  const regFees = regs.reduce(
    (sum, r) =>
      sum +
      estimateStripeFee((r.amount_paid || 0) + (r.donation_cents || 0)),
    0
  );
  const sponsorFees = sponsors.reduce(
    (sum, s) =>
      sum +
      estimateStripeFee(
        (s.sponsorship_amount || 0) + (s.donation_cents || 0)
      ),
    0
  );
  const totalFees = regFees + sponsorFees;

  // Refunded amounts
  const refundedAmount = refunds.reduce(
    (sum, r) => sum + (r.amount_paid || 0),
    0
  );

  // Expenses & ad spend
  const totalExpenses = expenses.reduce(
    (sum, e) => sum + (e.amount_cents || 0),
    0
  );
  const totalAdSpend = campaigns.reduce(
    (sum, c) => sum + (c.spent_cents || 0),
    0
  );

  const netForCharity =
    totalRevenue - totalFees - refundedAmount - totalExpenses - totalAdSpend;

  return NextResponse.json(
    {
      raised_cents: Math.max(0, netForCharity),
      goal_cents: GOAL_CENTS,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
