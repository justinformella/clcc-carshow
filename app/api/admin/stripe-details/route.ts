import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

export async function GET(request: NextRequest) {
  let paymentIntentId = request.nextUrl.searchParams.get("payment_intent_id");
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!paymentIntentId && !sessionId) {
    return NextResponse.json(
      { error: "payment_intent_id or session_id is required" },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripe();

    // If we only have a session ID, retrieve the session to get the payment intent
    if (!paymentIntentId && sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (!session.payment_intent) {
        return NextResponse.json(
          { error: "No payment intent found for this session (payment may not be completed)" },
          { status: 404 }
        );
      }
      paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent.id;
    }

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId!, {
      expand: [
        "latest_charge",
        "latest_charge.balance_transaction",
        "latest_charge.refunds",
      ],
    });

    const charge = pi.latest_charge as Stripe.Charge | null;
    const balanceTx = charge?.balance_transaction as Stripe.BalanceTransaction | null;
    const card = charge?.payment_method_details?.card;

    // Fetch dispute if charge is disputed
    let dispute: Stripe.Dispute | null = null;
    if (charge?.disputed) {
      const disputes = await stripe.disputes.list({
        charge: charge.id,
        limit: 1,
      });
      dispute = disputes.data[0] || null;
    }

    // Build refunds array
    const refunds = (charge?.refunds?.data || []).map((r) => ({
      id: r.id,
      amount: r.amount,
      status: r.status,
      reason: r.reason,
      created: r.created,
    }));

    const result = {
      payment: {
        status: pi.status,
        amount: pi.amount,
        currency: pi.currency,
        created: pi.created,
      },
      card: card
        ? {
            brand: card.brand,
            last4: card.last4,
            exp_month: card.exp_month,
            exp_year: card.exp_year,
            funding: card.funding,
            country: card.country,
            network: card.network,
            wallet: card.wallet?.type || null,
            checks: {
              cvc: card.checks?.cvc_check || null,
              address_line1: card.checks?.address_line1_check || null,
              address_postal_code: card.checks?.address_postal_code_check || null,
            },
          }
        : null,
      billing: charge?.billing_details
        ? {
            name: charge.billing_details.name,
            email: charge.billing_details.email,
            phone: charge.billing_details.phone,
            address: charge.billing_details.address,
          }
        : null,
      risk: charge?.outcome
        ? {
            risk_level: charge.outcome.risk_level,
            risk_score: charge.outcome.risk_score,
            network_status: charge.outcome.network_status,
            seller_message: charge.outcome.seller_message,
          }
        : null,
      fees: balanceTx
        ? {
            stripe_fee: balanceTx.fee,
            net: balanceTx.net,
          }
        : null,
      refunds,
      dispute: dispute
        ? {
            id: dispute.id,
            status: dispute.status,
            reason: dispute.reason,
            amount: dispute.amount,
            created: dispute.created,
          }
        : null,
      links: {
        receipt_url: charge?.receipt_url || null,
        dashboard_url: charge
          ? `https://dashboard.stripe.com${charge.livemode ? "" : "/test"}/payments/${charge.id}`
          : null,
      },
      charge_id: charge?.id || null,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Stripe details fetch error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch Stripe details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
