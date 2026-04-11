import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const VALID_GAMES = ["drag", "cruise", "smokeshow", "detail", "bmwshowroom"];
const ASC_GAMES = ["drag", "cruise"]; // lower score = better

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { game, initials, score, carId, carName, carPixelArt, fullName, metadata } = body;

    if (!game || !VALID_GAMES.includes(game)) {
      return NextResponse.json({ error: "Invalid game" }, { status: 400 });
    }
    if (!initials || !/^[A-Z]{3}$/.test(initials)) {
      return NextResponse.json({ error: "Initials must be 3 uppercase letters" }, { status: 400 });
    }
    if (typeof score !== "number" || isNaN(score)) {
      return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }
    if (!carId || !carName) {
      return NextResponse.json({ error: "Car info required" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("arcade_scores")
      .insert({
        game,
        initials,
        score,
        car_id: carId,
        car_name: carName,
        car_pixel_art: carPixelArt || null,
        full_name: fullName || null,
        metadata: metadata || {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("Score insert error:", error);
      return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("Score POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const game = searchParams.get("game");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

    if (!game || !VALID_GAMES.includes(game)) {
      return NextResponse.json({ error: "Invalid game" }, { status: 400 });
    }

    const supabase = createServerClient();
    const ascending = ASC_GAMES.includes(game);

    const { data, error } = await supabase
      .from("arcade_scores")
      .select("id, initials, score, car_name, car_pixel_art, full_name, metadata, created_at")
      .eq("game", game)
      .order("score", { ascending })
      .limit(limit);

    if (error) {
      console.error("Score fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
    }

    return NextResponse.json({ scores: data || [] });
  } catch (err) {
    console.error("Score GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
