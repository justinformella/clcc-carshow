import { NextRequest, NextResponse } from "next/server";
import { sendAnnouncement } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { subject, body, recipientIds } = await request.json();

    if (!subject || !body || !recipientIds?.length) {
      return NextResponse.json(
        { error: "subject, body, and recipientIds are required" },
        { status: 400 }
      );
    }

    const result = await sendAnnouncement(subject, body, recipientIds);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Send announcement error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send announcement" },
      { status: 500 }
    );
  }
}
