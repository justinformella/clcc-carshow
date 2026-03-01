import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = createServerClient();

  const { raw } = await request.json();
  if (!raw || typeof raw !== "string") {
    return NextResponse.json({ error: "Missing email list" }, { status: 400 });
  }

  // Parse lines: supports "email", "Name <email>", "name,email", "name, email"
  const lines = raw.split(/\r?\n/).map((l: string) => l.trim().replace(/,\s*$/, "")).filter(Boolean);
  const parsed: { email: string; name: string | null }[] = [];

  for (const line of lines) {
    // "Name <email>" format (name may be quoted)
    const angleMatch = line.match(/^"?(.+?)"?\s*<([^>]+)>$/);
    if (angleMatch) {
      const name = angleMatch[1].trim();
      const email = angleMatch[2].trim().toLowerCase();
      // If name is just the email repeated, treat as no name
      parsed.push({ name: name === email ? null : name, email });
      continue;
    }

    // "name,email" or "name, email" CSV format
    const commaMatch = line.match(/^([^,]+),\s*([^,\s]+@[^,\s]+)$/);
    if (commaMatch) {
      parsed.push({ name: commaMatch[1].trim(), email: commaMatch[2].trim().toLowerCase() });
      continue;
    }

    // Plain email
    const emailMatch = line.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    if (emailMatch) {
      parsed.push({ name: null, email: line.toLowerCase() });
      continue;
    }

    // Skip unparseable lines
  }

  if (parsed.length === 0) {
    return NextResponse.json({ error: "No valid emails found" }, { status: 400 });
  }

  // Check which emails already exist as prospects
  const emails = parsed.map((p) => p.email);
  const { data: existingProspects } = await supabase
    .from("marketing_prospects")
    .select("email")
    .in("email", emails);
  const existingProspectEmails = new Set((existingProspects || []).map((p: { email: string }) => p.email.toLowerCase()));

  let added = 0;
  let skippedDuplicate = 0;

  const toInsert: { email: string; name: string | null; source: string }[] = [];

  for (const { email, name } of parsed) {
    if (existingProspectEmails.has(email)) {
      skippedDuplicate++;
      continue;
    }
    toInsert.push({ email, name, source: "import" });
    existingProspectEmails.add(email); // prevent dupes within same batch
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("marketing_prospects").insert(toInsert);
    if (error) {
      console.error("[import-prospects] Insert error:", error);
      return NextResponse.json({ error: "Failed to import: " + error.message }, { status: 500 });
    }
    added = toInsert.length;
  }

  return NextResponse.json({
    total: parsed.length,
    added,
    skippedDuplicate,
  });
}
