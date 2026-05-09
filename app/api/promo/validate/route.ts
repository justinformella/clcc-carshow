import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const { code, email } = await request.json();

  if (!code || !email) {
    return NextResponse.json({ valid: false, error: "Code and email are required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: promo, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .single();

  if (error || !promo) {
    return NextResponse.json({ valid: false, error: "Invalid promo code" });
  }

  if (promo.used) {
    return NextResponse.json({ valid: false, error: "This code has already been used" });
  }

  if (promo.email.toLowerCase() !== email.toLowerCase().trim()) {
    return NextResponse.json({ valid: false, error: "This code is not associated with your email address" });
  }

  return NextResponse.json({ valid: true, code: promo.code });
}
