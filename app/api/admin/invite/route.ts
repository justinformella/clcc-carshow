import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getResend } from "@/lib/resend";
import { adminInviteEmail } from "@/lib/email-templates";

const FROM_EMAIL = "Crystal Lake Cars & Coffee <noreply@crystallakecarshow.com>";

export async function POST(request: NextRequest) {
  try {
    const { name, email: rawEmail, role, resendOnly } = await request.json();
    const email = rawEmail?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Resend-only: generate a new invite link and send via Resend
    if (resendOnly) {
      // Look up admin name from admins table
      const { data: admin } = await supabase
        .from("admins")
        .select("name")
        .eq("email", email)
        .single();

      const { data: linkData, error: linkError } =
        await supabase.auth.admin.generateLink({
          type: "invite",
          email,
        });

      if (linkError) {
        if (linkError.message.includes("already been registered")) {
          return NextResponse.json({ success: true, invited: false });
        }
        return NextResponse.json(
          { error: linkError.message },
          { status: 400 }
        );
      }

      const inviteLink = linkData?.properties?.action_link;
      if (!inviteLink) {
        return NextResponse.json(
          { error: "Failed to generate invite link" },
          { status: 500 }
        );
      }

      const { subject, html } = adminInviteEmail(
        admin?.name || "there",
        inviteLink
      );

      const resend = getResend();
      const { error: sendError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject,
        html,
      });

      if (sendError) {
        return NextResponse.json(
          { error: sendError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, invited: true });
    }

    // New admin invite flow
    if (!name) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Generate invite link (doesn't send email)
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          data: { name, role: role || "admin" },
        },
      });

    let authUserId: string | null = null;

    if (linkError) {
      // If user already exists in auth, that's okay — just add to admins table
      if (!linkError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: linkError.message },
          { status: 400 }
        );
      }
    } else {
      authUserId = linkData?.user?.id ?? null;

      // Send the invite email via Resend
      const inviteLink = linkData?.properties?.action_link;
      if (inviteLink) {
        const { subject, html } = adminInviteEmail(name, inviteLink);
        const resend = getResend();
        const { error: sendError } = await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject,
          html,
        });

        if (sendError) {
          console.error("Failed to send invite email via Resend:", sendError.message);
        }
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
      invited: !linkError,
      authUserId,
    });
  } catch (err) {
    console.error("Admin invite error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to invite admin" },
      { status: 500 }
    );
  }
}
