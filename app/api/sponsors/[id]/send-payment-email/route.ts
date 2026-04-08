import { NextRequest, NextResponse } from "next/server";
import { sendSponsorPaymentLink } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await sendSponsorPaymentLink(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-payment-email] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
