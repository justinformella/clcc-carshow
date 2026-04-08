import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { sendSponsorCheckAdminNotification } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, sponsor_id, name, company, email, phone, website, selected_level, check_note } = body;

  if (!token || !sponsor_id || !selected_level) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Verify sponsor and token match
  const { data: sponsor, error: fetchError } = await supabase
    .from("sponsors")
    .select("*")
    .eq("id", sponsor_id)
    .eq("payment_token", token)
    .single();

  if (fetchError || !sponsor) {
    return NextResponse.json({ error: "Invalid sponsor or token" }, { status: 404 });
  }

  if (sponsor.status === "paid") {
    return NextResponse.json({ error: "Sponsorship already paid" }, { status: 400 });
  }

  // Update sponsor
  const { error: updateError } = await supabase
    .from("sponsors")
    .update({
      name,
      company,
      email,
      phone: phone || null,
      website: website || null,
      sponsorship_level: selected_level,
      status: "committed",
      payment_method: "check",
      check_note: check_note || null,
    })
    .eq("id", sponsor_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Send admin notification (non-blocking)
  try {
    await sendSponsorCheckAdminNotification(sponsor_id);
  } catch (err) {
    console.error("[pay-by-check] Admin notification failed:", err);
  }

  return NextResponse.json({ success: true });
}
