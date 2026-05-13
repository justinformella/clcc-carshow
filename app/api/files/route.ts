import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const BUCKET = "public-files";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crystallakecarshow.com";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase.storage.from(BUCKET).list("", {
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const files = (data || [])
    .filter((f) => f.name !== ".emptyFolderPlaceholder")
    .map((f) => ({
      name: f.name,
      size: f.metadata?.size || 0,
      created_at: f.created_at,
      url: `${SITE_URL}/files/${f.name}`,
    }));

  return NextResponse.json({ files });
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Sanitize filename: lowercase, replace spaces with hyphens, remove special chars
  const sanitized = file.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(sanitized, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ name: sanitized, url: `${SITE_URL}/files/${sanitized}` });
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerClient();
  const { name } = await request.json();

  if (!name) {
    return NextResponse.json({ error: "File name required" }, { status: 400 });
  }

  const { error } = await supabase.storage.from(BUCKET).remove([name]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
