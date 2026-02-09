import { NextRequest, NextResponse } from "next/server";
import { sendConfirmation } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { registrationId } = await request.json();

    if (!registrationId) {
      return NextResponse.json(
        { error: "registrationId is required" },
        { status: 400 }
      );
    }

    await sendConfirmation(registrationId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Send confirmation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
