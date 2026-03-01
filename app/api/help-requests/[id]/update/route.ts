import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

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

    // Build update data from allowed fields
    const allowedFields = ["status", "priority", "category", "assigned_to", "internal_notes"];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field] === "" ? null : body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    // Auto-set resolved_at/closed_at based on status transitions
    if (updateData.status === "resolved") {
      updateData.resolved_at = new Date().toISOString();
    } else if (updateData.status === "closed") {
      updateData.closed_at = new Date().toISOString();
    } else if (updateData.status && updateData.status !== "resolved" && updateData.status !== "closed") {
      // Clear resolved/closed timestamps if reopened
      updateData.resolved_at = null;
      updateData.closed_at = null;
    }

    const { error } = await supabase
      .from("help_requests")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Help request update error:", error);
      return NextResponse.json(
        { error: "Failed to update request." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Help request update error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
