import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export type PublicSponsor = {
  company: string;
  sponsorship_level: string;
  logo_url: string | null;
  pixel_logo_url: string | null;
  website: string | null;
};

export type SponsorTier = {
  label: string;
  sponsors: PublicSponsor[];
  isPresenting: boolean;
};

function isPresenting(level: string): boolean {
  const l = level.toLowerCase();
  return l.includes("presenting") || l.includes("platinum");
}

export async function GET() {
  try {
    const supabase = createServerClient();

    // Fetch tiers for normalization and ordering
    const { data: tiers } = await supabase
      .from("sponsorship_tiers")
      .select("name, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    const tierList = tiers || [];

    const { data } = await supabase
      .from("sponsors")
      .select("company, sponsorship_level, logo_url, pixel_logo_url, website")
      .in("status", ["paid", "engaged"])
      .order("company");

    const sponsors = data || [];

    // Normalize sponsor levels to match tier names
    // Handles old format "Premier Sponsor ($1,000)" -> "Premier Sponsor"
    // and legacy names like "Gold Sponsor ($500)" -> "Community Sponsor"
    const LEGACY_MAP: Record<string, string> = {
      "Gold Sponsor": "Community Sponsor",
      "Platinum Sponsor": "Presenting Sponsor",
    };

    function normalizeTierName(level: string): string {
      // Try exact match first
      const exactMatch = tierList.find((t) => t.name === level);
      if (exactMatch) return exactMatch.name;

      // Try prefix match (strips price suffix)
      const prefixMatch = tierList.find((t) => level.startsWith(t.name));
      if (prefixMatch) return prefixMatch.name;

      // Try legacy name mapping
      const stripped = level.replace(/\s*\(\$[\d,]+\)\s*$/, "");
      for (const [legacy, canonical] of Object.entries(LEGACY_MAP)) {
        if (stripped.startsWith(legacy)) {
          return canonical;
        }
      }

      return stripped;
    }

    // Group by normalized tier name
    const grouped: Record<string, PublicSponsor[]> = {};
    for (const s of sponsors) {
      const normalName = normalizeTierName(s.sponsorship_level);
      if (!grouped[normalName]) {
        grouped[normalName] = [];
      }
      grouped[normalName].push(s);
    }

    // Build ordered tiers using display_order from the tiers table
    const tierOrder: Record<string, number> = {};
    for (const t of tierList) {
      tierOrder[t.name] = t.display_order;
    }

    const result: SponsorTier[] = Object.keys(grouped)
      .sort((a, b) => (tierOrder[a] ?? 99) - (tierOrder[b] ?? 99))
      .map((name) => ({
        label: name.replace(/Sponsor$/, "Sponsors"),
        sponsors: grouped[name],
        isPresenting: isPresenting(name),
      }));

    return NextResponse.json({ tiers: result });
  } catch {
    return NextResponse.json({ tiers: [] });
  }
}
