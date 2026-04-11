import { NextRequest, NextResponse } from "next/server";
import { sendSponsorReceipt } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await sendSponsorReceipt(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-receipt] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send receipt" },
      { status: 500 }
    );
  }
}
