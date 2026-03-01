import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createServiceClient } from "@/lib/supabase-server";
import { createServerClient } from "@supabase/ssr";
import { getResend } from "@/lib/resend";
import { adminPasswordResetEmail } from "@/lib/email-templates";

const FROM_EMAIL = "Crystal Lake Cars & Coffee <noreply@crystallakecarshow.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crystallakecarshow.com";

function createAuthClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // No-op: route handlers don't need to set cookies here
        },
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Authorize: only admins can send reset links
    const authSupabase = createAuthClient(request);
    const { data: { user: caller } } = await authSupabase.auth.getUser();
    if (!caller?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: callerAdmin } = await supabase
      .from("admins")
      .select("role")
      .ilike("email", caller.email)
      .maybeSingle();

    if (callerAdmin?.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can send reset links" },
        { status: 403 }
      );
    }

    const { email: rawEmail } = await request.json();
    const email = rawEmail?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Look up admin name
    const { data: admin } = await supabase
      .from("admins")
      .select("name")
      .ilike("email", email)
      .maybeSingle();

    if (!admin) {
      return NextResponse.json(
        { error: "User not found in admins table" },
        { status: 404 }
      );
    }

    // Generate recovery link via Supabase admin API
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${SITE_URL}/admin/set-password`,
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json(
        { error: linkError?.message || "Failed to generate reset link" },
        { status: 400 }
      );
    }

    // Point redirect directly to set-password page (client-side handles hash fragments)
    const actionLink = linkData.properties.action_link;
    const url = new URL(actionLink);
    url.searchParams.set("redirect_to", `${SITE_URL}/admin/set-password`);
    const rewrittenLink = url.toString();
    // Wrap through intermediate page to prevent link preview bots from consuming the token
    const encoded = btoa(encodeURIComponent(rewrittenLink));
    const safeLink = `${SITE_URL}/admin/accept-invite?link=${encoded}`;

    const { subject, html } = adminPasswordResetEmail(admin.name, safeLink);

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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin reset password error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send reset link" },
      { status: 500 }
    );
  }
}
