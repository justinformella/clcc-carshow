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

    const presenting = sponsors.filter((s) => {
      const level = s.sponsorship_level.toLowerCase();
      return level.includes("presenting") || level.includes("platinum");
    });
    const premier = sponsors.filter((s) => {
      const level = s.sponsorship_level.toLowerCase();
      return level.includes("premier") || level.includes("gold");
    });
    const community = sponsors.filter((s) => {
      const level = s.sponsorship_level.toLowerCase();
      return level.includes("community") || level.includes("silver");
    });

    return NextResponse.json({ presenting, premier, community });
  } catch {
    return NextResponse.json({ presenting: [], premier: [], community: [] });
  }
}
