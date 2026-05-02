import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createServerClient();

  const { data } = await supabase
    .from("registrations")
    .select("vehicle_year, vehicle_make, vehicle_model, pixel_art_url")
    .eq("payment_status", "paid")
    .not("pixel_art_url", "is", null)
    .eq("game_eligible", true)
    .limit(8);

  return NextResponse.json(
    {
      cars: (data || []).map((r) => ({
        name: `${r.vehicle_year} ${r.vehicle_make} ${r.vehicle_model}`,
        pixelArt: r.pixel_art_url,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
      },
    }
  );
}
