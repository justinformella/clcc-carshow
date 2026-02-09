import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { count, error } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "paid");

    if (error) {
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
