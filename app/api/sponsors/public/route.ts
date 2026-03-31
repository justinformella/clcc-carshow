import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("sponsors")
      .select("company, sponsorship_level, logo_url, website")
      .in("status", ["paid", "engaged"])
      .order("company");

    const sponsors = data || [];

    const presenting = sponsors.filter((s) =>
      s.sponsorship_level.toLowerCase().includes("presenting")
    );
    const premier = sponsors.filter((s) =>
      s.sponsorship_level.toLowerCase().includes("premier")
    );
    const community = sponsors.filter((s) =>
      s.sponsorship_level.toLowerCase().includes("community")
    );

    return NextResponse.json({ presenting, premier, community });
  } catch {
    return NextResponse.json({ presenting: [], premier: [], community: [] });
  }
}
