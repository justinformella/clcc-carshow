import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const registrationId = formData.get("registration_id") as string;
    const type = formData.get("type") as string;
    const file = formData.get("file") as File | null;

    if (!registrationId || !["side", "dashboard", "rear"].includes(type) || !file) {
      return NextResponse.json({ error: "Provide registration_id, type (side|dashboard|rear), and file" }, { status: 400 });
    }

    const supabase = createServerClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const ts = Date.now();

    const fileName = (type === "side" || type === "rear")
      ? `${type}-${registrationId}-transparent.png`
      : `${type}-${registrationId}.png`;

    await supabase.storage.from("pixel-art").upload(fileName, buffer, { contentType: "image/png", upsert: true });
    const url = `${supabase.storage.from("pixel-art").getPublicUrl(fileName).data.publicUrl}?v=${ts}`;

    const mainCol = type === "side" ? "pixel_art_url" : type === "rear" ? "pixel_rear_url" : "pixel_dashboard_url";
    await supabase
      .from("registrations")
      .update({ [mainCol]: url })
      .eq("id", registrationId);

    return NextResponse.json({ url });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Failed to upload" }, { status: 500 });
  }
}
