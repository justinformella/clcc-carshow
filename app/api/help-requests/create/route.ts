import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import {
  sendHelpRequestConfirmation,
  sendHelpRequestAdminNotification,
} from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, email, subject, message, website } = body;

    // Honeypot check — bots fill hidden fields
    if (website) {
      // Return success to avoid tipping off bots
      return NextResponse.json({ success: true, request_number: 0 });
    }

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Name, email, subject, and message are required." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Rate limit: same email can't submit more than 1 request per 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("help_requests")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", fiveMinutesAgo);

    if (count && count > 0) {
      return NextResponse.json(
        { error: "Please wait a few minutes before submitting another request." },
        { status: 429 }
      );
    }

    // Auto-link: look up submitter email in registrations table
    const { data: registration } = await supabase
      .from("registrations")
      .select("id")
      .ilike("email", email)
      .eq("payment_status", "paid")
      .limit(1)
      .maybeSingle();

    const { data: helpRequest, error: insertError } = await supabase
      .from("help_requests")
      .insert({
        name,
        email,
        subject,
        category: "general",
        registration_id: registration?.id || null,
      })
      .select()
      .single();

    if (insertError || !helpRequest) {
      console.error("Help request insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to submit request. Please try again." },
        { status: 500 }
      );
    }

    // Insert initial message
    const { error: messageError } = await supabase
      .from("help_request_messages")
      .insert({
        help_request_id: helpRequest.id,
        sender_type: "submitter",
        sender_name: name,
        sender_email: email,
        body: message,
      });

    if (messageError) {
      console.error("Help request message insert error:", messageError);
    }

    // Send emails (non-blocking for the response)
    try {
      await sendHelpRequestConfirmation(helpRequest.id);
    } catch (err) {
      console.error("Failed to send help request confirmation:", err);
    }

    try {
      await sendHelpRequestAdminNotification(helpRequest.id);
    } catch (err) {
      console.error("Failed to send help request admin notification:", err);
    }

    return NextResponse.json({
      success: true,
      request_number: helpRequest.request_number,
    });
  } catch (err) {
    console.error("Help request create error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
