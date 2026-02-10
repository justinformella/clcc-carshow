import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getResend } from "@/lib/resend";
import { adminInviteEmail } from "@/lib/email-templates";

const FROM_EMAIL = "Crystal Lake Cars & Coffee <noreply@crystallakecarshow.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crystallakecarshow.com";

function wrapInviteLink(actionLink: string): string {
  // Rewrite redirect_to so Supabase sends the user to /admin/set-password
  const url = new URL(actionLink);
  url.searchParams.set("redirect_to", `${SITE_URL}/admin/set-password`);
  const rewrittenLink = url.toString();

  // Wrap in our intermediate page so link previews don't consume the token
  const encoded = btoa(encodeURIComponent(rewrittenLink));
  return `${SITE_URL}/admin/accept-invite?link=${encoded}`;
}

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
          options: {
            redirectTo: `${SITE_URL}/admin/set-password`,
          },
        });

      if (linkError) {
        if (linkError.message.includes("already been registered")) {
          // Invite was consumed (e.g. by link preview) but user never set password.
          // Send a recovery link so they can still set their password.
          const { data: recoveryData, error: recoveryError } =
            await supabase.auth.admin.generateLink({
              type: "recovery",
              email,
            });

          if (recoveryError || !recoveryData?.properties?.action_link) {
            return NextResponse.json(
              { error: recoveryError?.message || "Failed to generate recovery link" },
              { status: 400 }
            );
          }

          const { subject, html } = adminInviteEmail(
            admin?.name || "there",
            wrapInviteLink(recoveryData.properties.action_link)
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
        wrapInviteLink(inviteLink)
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
          redirectTo: `${SITE_URL}/admin/set-password`,
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
        const { subject, html } = adminInviteEmail(name, wrapInviteLink(inviteLink));
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
