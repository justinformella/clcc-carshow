import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export type PublicSponsor = {
  company: string;
  sponsorship_level: string;
  logo_url: string | null;
  website: string | null;
};

export type SponsorTier = {
  label: string;
  sponsors: PublicSponsor[];
  isPresenting: boolean;
};

// Order tiers by price descending
const TIER_ORDER: Record<string, number> = {
  "Presenting Sponsor ($2,500)": 1,
  "Premier Sponsor ($1,000)": 2,
  "Gold Sponsor ($500)": 3,
  "Community Sponsor ($500)": 4,
};

function tierSort(a: string, b: string): number {
  return (TIER_ORDER[a] ?? 99) - (TIER_ORDER[b] ?? 99);
}

function isPresenting(level: string): boolean {
  const l = level.toLowerCase();
  return l.includes("presenting") || l.includes("platinum");
}

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("sponsors")
      .select("company, sponsorship_level, logo_url, website")
      .in("status", ["paid", "engaged"])
      .order("company");

    const sponsors = data || [];

    // Group by exact sponsorship_level
    const grouped: Record<string, PublicSponsor[]> = {};
    for (const s of sponsors) {
      if (!grouped[s.sponsorship_level]) {
        grouped[s.sponsorship_level] = [];
      }
      grouped[s.sponsorship_level].push(s);
    }

    // Build ordered tiers
    const tiers: SponsorTier[] = Object.keys(grouped)
      .sort(tierSort)
      .map((level) => ({
        label: level,
        sponsors: grouped[level],
        isPresenting: isPresenting(level),
      }));

    return NextResponse.json({ tiers });
  } catch {
    return NextResponse.json({ tiers: [] });
  }
}
