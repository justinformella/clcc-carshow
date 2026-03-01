import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { sendHelpRequestReplyNotification } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message, is_internal, status } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    // Verify admin auth
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    // Verify user is an admin
    const { data: admin } = await supabase
      .from("admins")
      .select("*")
      .eq("email", user.email)
      .single();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Insert message
    const { data: newMessage, error: messageError } = await supabase
      .from("help_request_messages")
      .insert({
        help_request_id: id,
        sender_type: "admin",
        sender_name: admin.name,
        sender_email: admin.email,
        body: message,
        is_internal: is_internal || false,
      })
      .select()
      .single();

    if (messageError || !newMessage) {
      console.error("Help request reply insert error:", messageError);
      return NextResponse.json(
        { error: "Failed to send reply." },
        { status: 500 }
      );
    }

    // Optionally update status
    if (status) {
      const updateData: Record<string, unknown> = { status };
      if (status === "resolved") updateData.resolved_at = new Date().toISOString();
      if (status === "closed") updateData.closed_at = new Date().toISOString();

      await supabase
        .from("help_requests")
        .update(updateData)
        .eq("id", id);
    }

    // Send reply notification to submitter (unless internal)
    if (!is_internal) {
      try {
        await sendHelpRequestReplyNotification(id, newMessage.id);
      } catch (err) {
        console.error("Failed to send help request reply notification:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Help request reply error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
