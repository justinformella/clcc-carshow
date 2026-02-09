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
    const registrationId = session.metadata?.registration_id;

    if (registrationId) {
      const supabase = createServerClient();

      const { error } = await supabase
        .from("registrations")
        .update({
          payment_status: "paid",
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("id", registrationId);

      if (error) {
        console.error("Failed to update registration:", error);
        return NextResponse.json(
          { error: "Failed to update registration" },
          { status: 500 }
        );
      }

      // Generate AI car image in the background (don't block webhook response)
      generateCarImage(registrationId).catch((err) =>
        console.error("Background image generation failed:", err)
      );

      // Send confirmation email to registrant
      sendConfirmation(registrationId).catch((err) =>
        console.error("Confirmation email failed:", err)
      );

      // Notify admins of new registration
      sendAdminNotification(registrationId).catch((err) =>
        console.error("Admin notification email failed:", err)
      );
    }
  }

  return NextResponse.json({ received: true });
}
