import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const { name, email: rawEmail, role } = await request.json();
    const email = rawEmail?.toLowerCase().trim();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Create Supabase Auth user with invite (sends password reset email)
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { name, role: role || "admin" },
    });

    if (authError) {
      // If user already exists in auth, that's okay — just add to admins table
      if (!authError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: authError.message },
          { status: 400 }
        );
      }
    }

    // Add to admins table for notification emails
    const { error: insertError } = await supabase
      .from("admins")
      .insert({ name, email, role: role || "admin" });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      invited: !authError,
      authUserId: authData?.user?.id ?? null,
    });
  } catch (err) {
    console.error("Admin invite error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to invite admin" },
      { status: 500 }
    );
  }
}
