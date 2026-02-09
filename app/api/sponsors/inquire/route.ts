import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { sendSponsorAdminNotification } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, company, email, phone, sponsorship_level, message } = body;

    if (!name || !company || !email) {
      return NextResponse.json(
        { error: "Name, company, and email are required." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: sponsor, error: insertError } = await supabase
      .from("sponsors")
      .insert({
        name,
        company,
        email,
        phone: phone || null,
        sponsorship_level: sponsorship_level || "Other / Not Sure",
        message: message || null,
        status: "inquired",
      })
      .select()
      .single();

    if (insertError || !sponsor) {
      console.error("Sponsor insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to submit inquiry. Please try again." },
        { status: 500 }
      );
    }

    // Send admin notification (await so errors surface)
    let notificationError: string | null = null;
    try {
      await sendSponsorAdminNotification(sponsor.id);
    } catch (err) {
      notificationError = err instanceof Error ? err.message : "Unknown notification error";
      console.error("Failed to send sponsor admin notification:", err);
    }

    return NextResponse.json({ success: true, notificationError });
  } catch (err) {
    console.error("Sponsor inquiry error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
