import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { sendHelpRequestReplyNotification } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { registration_id, name, email, subject, message, admin_name, admin_email } = body;

    if (!email || !subject || !message) {
      return NextResponse.json(
        { error: "Email, subject, and message are required." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Create the help desk ticket
    const { data: helpRequest, error: insertError } = await supabase
      .from("help_requests")
      .insert({
        name: name || email,
        email,
        subject,
        category: "registration",
        status: "in_progress",
        registration_id: registration_id || null,
      })
      .select()
      .single();

    if (insertError || !helpRequest) {
      console.error("Help request insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create ticket." },
        { status: 500 }
      );
    }

    // Insert the admin's outgoing message
    const { data: msg, error: messageError } = await supabase
      .from("help_request_messages")
      .insert({
        help_request_id: helpRequest.id,
        sender_type: "admin",
        sender_name: admin_name || "Admin",
        sender_email: admin_email || "",
        body: message,
        is_internal: false,
      })
      .select()
      .single();

    if (messageError) {
      console.error("Message insert error:", messageError);
    }

    // Send the email to the registrant
    if (msg) {
      try {
        await sendHelpRequestReplyNotification(helpRequest.id, msg.id);
      } catch (err) {
        console.error("Failed to send contact email:", err);
      }
    }

    return NextResponse.json({
      success: true,
      help_request_id: helpRequest.id,
      request_number: helpRequest.request_number,
    });
  } catch (err) {
    console.error("Create from admin error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
