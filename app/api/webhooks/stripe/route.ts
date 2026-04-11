import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase-server";
import { generateCarImage } from "@/lib/generate-car-image";
import { sendConfirmation, sendAdminNotification, sendSponsorReceipt, sendSponsorPaymentAdminNotification } from "@/lib/email";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const registrationIds = (
      session.metadata?.registration_ids || session.metadata?.registration_id || ""
    ).split(",").filter(Boolean);

    if (registrationIds.length > 0) {
      const supabase = createServerClient();

      // Only update registrations that are still pending — don't overwrite archived/refunded/comped
      const { error } = await supabase
        .from("registrations")
        .update({
          payment_status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .in("id", registrationIds)
        .eq("payment_status", "pending");

      if (error) {
        console.error("Failed to update registrations:", error);
        return NextResponse.json(
          { error: "Failed to update registrations" },
          { status: 500 }
        );
      }

      // Run image generation and emails after response (keeps function alive)
      after(async () => {
        for (const regId of registrationIds) {
          try {
            await generateCarImage(regId);
          } catch (err) {
            console.error(`Background image generation failed for ${regId}:`, err);
          }

          try {
            await sendConfirmation(regId);
          } catch (err) {
            console.error(`Confirmation email failed for ${regId}:`, err);
          }

          // Enrich vehicle specs
          try {
            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "https://crystallakecarshow.com"}/api/registrations/enrich`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ registration_id: regId }),
            });
          } catch (err) {
            console.error(`Vehicle spec enrichment failed for ${regId}:`, err);
          }

          // Generate pixel art for racing game
          try {
            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "https://crystallakecarshow.com"}/api/registrations/pixel-art`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ registration_id: regId }),
            });
          } catch (err) {
            console.error(`Pixel art generation failed for ${regId}:`, err);
          }
        }

        // Check if admin notifications are enabled
        const { data: notifSetting } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "admin_notification_emails")
          .maybeSingle();

        if (notifSetting?.value !== "false") {
          try {
            await sendAdminNotification(registrationIds[0]);
          } catch (err) {
            console.error("Admin notification email failed:", err);
          }
        }
      });
    }

    // Handle sponsor payments
    const sponsorId = session.metadata?.sponsor_id;
    if (sponsorId) {
      const supabase = createServerClient();

      const donationCents = parseInt(session.metadata?.donation_cents || "0", 10) || 0;
      const tierAmount = (session.amount_total || 0) - donationCents;

      const { error } = await supabase
        .from("sponsors")
        .update({
          status: "paid",
          sponsorship_amount: tierAmount,
          donation_cents: donationCents,
          paid_at: new Date().toISOString(),
          payment_method: "stripe",
          stripe_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
          ...(session.metadata?.tier_name ? { sponsorship_level: session.metadata.tier_name } : {}),
        })
        .eq("id", sponsorId);

      if (error) {
        console.error("Failed to update sponsor:", error);
        return NextResponse.json({ error: "Failed to update sponsor" }, { status: 500 });
      }

      after(async () => {
        try {
          await sendSponsorReceipt(sponsorId);
        } catch (err) {
          console.error("Sponsor receipt email failed:", err);
        }

        try {
          await sendSponsorPaymentAdminNotification(sponsorId, "stripe");
        } catch (err) {
          console.error("Sponsor payment admin notification failed:", err);
        }
      });
    }
  }

  return NextResponse.json({ received: true });
}
