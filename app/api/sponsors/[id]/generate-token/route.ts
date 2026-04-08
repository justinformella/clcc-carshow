import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { randomUUID } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: sponsor, error: fetchError } = await supabase
    .from("sponsors")
    .select("id, payment_token, sponsorship_level")
    .eq("id", id)
    .single();

  if (fetchError || !sponsor) {
    return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
  }

  const token = sponsor.payment_token || randomUUID();

  const updates: Record<string, unknown> = { payment_token: token };
  if (!sponsor.payment_token) {
    updates.original_level = sponsor.sponsorship_level;
  }

  const { error: updateError } = await supabase
    .from("sponsors")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const paymentUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://crystallakecarshow.com"}/sponsor/pay/${token}`;

  return NextResponse.json({ token, paymentUrl });
}
