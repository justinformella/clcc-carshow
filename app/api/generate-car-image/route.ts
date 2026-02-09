import { NextRequest, NextResponse } from "next/server";
import { generateCarImage } from "@/lib/generate-car-image";

export async function POST(request: NextRequest) {
  try {
    const { registrationId } = await request.json();

    if (!registrationId) {
      return NextResponse.json({ error: "Registration ID required" }, { status: 400 });
    }

    const imageUrl = await generateCarImage(registrationId);

    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error("Image generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Image generation failed" },
      { status: 500 }
    );
  }
}
