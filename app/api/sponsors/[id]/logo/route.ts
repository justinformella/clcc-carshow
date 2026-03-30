import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("logo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Upload to Supabase Storage
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const filePath = `sponsor-logos/${id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("public-assets")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("public-assets")
      .getPublicUrl(filePath);

    const logoUrl = urlData.publicUrl;

    // Update the sponsor record
    const { error: updateError } = await supabase
      .from("sponsors")
      .update({ logo_url: logoUrl })
      .eq("id", id);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update sponsor" },
        { status: 500 }
      );
    }

    return NextResponse.json({ logo_url: logoUrl });
  } catch (err) {
    console.error("Logo upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload logo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Get current logo URL to find the file path
    const { data: sponsor } = await supabase
      .from("sponsors")
      .select("logo_url")
      .eq("id", id)
      .single();

    if (sponsor?.logo_url) {
      // Extract file path from URL
      const urlParts = sponsor.logo_url.split("/public-assets/");
      if (urlParts[1]) {
        await supabase.storage
          .from("public-assets")
          .remove([urlParts[1]]);
      }
    }

    // Clear the logo_url
    await supabase
      .from("sponsors")
      .update({ logo_url: null })
      .eq("id", id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Logo delete error:", err);
    return NextResponse.json(
      { error: "Failed to delete logo" },
      { status: 500 }
    );
  }
}
