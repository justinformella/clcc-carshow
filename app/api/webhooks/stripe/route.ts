import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase-server";
import { generateCarImage } from "@/lib/generate-car-image";
import { sendConfirmation, sendAdminNotification } from "@/lib/email";
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

      const { error } = await supabase
        .from("registrations")
        .update({
          payment_status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .in("id", registrationIds);

      if (error) {
        console.error("Failed to update registrations:", error);
        return NextResponse.json(
          { error: "Failed to update registrations" },
          { status: 500 }
        );
      }

      // Generate AI car images and send emails for each registration
      for (const regId of registrationIds) {
        generateCarImage(regId).catch((err) =>
          console.error(`Background image generation failed for ${regId}:`, err)
        );

        sendConfirmation(regId).catch((err) =>
          console.error(`Confirmation email failed for ${regId}:`, err)
        );
      }

      // Notify admins once (for the first registration)
      sendAdminNotification(registrationIds[0]).catch((err) =>
        console.error("Admin notification email failed:", err)
      );
    }
  }

  return NextResponse.json({ received: true });
}
