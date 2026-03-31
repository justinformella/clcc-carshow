import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { MAX_REGISTRATIONS } from "@/types/database";

export async function GET() {
  try {
    const supabase = createServerClient();
    const [countResult, settingResult] = await Promise.all([
      supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .in("payment_status", ["paid", "comped"]),
      supabase
        .from("app_settings")
        .select("value")
        .eq("key", "max_registrations")
        .maybeSingle(),
    ]);

    const count = countResult.count || 0;
    const max = settingResult.data?.value
      ? parseInt(settingResult.data.value, 10) || MAX_REGISTRATIONS
      : MAX_REGISTRATIONS;

    return NextResponse.json({ count, max });
  } catch {
    return NextResponse.json({ count: 0, max: MAX_REGISTRATIONS });
  }
}
