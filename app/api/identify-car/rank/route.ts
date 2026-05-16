import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  const { identified, candidates } = await request.json();

  if (!identified || !candidates) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are matching a car identified from a photo to a list of registered vehicles at a car show.

The photo was identified as: ${identified}

Here are the registered vehicles (index: details):
${candidates}

Rank these by how likely each one is the SAME PHYSICAL CAR from the photo.

You are an automotive expert. Use your knowledge to:
- Recognize that manufacturers use different names for the same car (internal codes, trim names, chassis codes, generation names). Match them intelligently.
- Match colors loosely — paint names vary wildly between what people write and official names. A brownish-red car could be registered as sienna, burgundy, maroon, copper, etc.
- Prioritize the correct generation/era of the car over exact year — people sometimes register approximate years.
- Consider the overall body shape and era — don't match a classic to a modern version of the same nameplate.

Return ONLY a JSON array of objects with the index and a confidence score (0-100) for each plausible match, ordered best first. Example: [{"i": 3, "score": 95}, {"i": 7, "score": 60}]

Only include cars that could plausibly be the same physical car. Omit obvious non-matches entirely.`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.1,
          },
        }),
      }
    );

    if (!res.ok) {
      console.error("Gemini rank error:", await res.text());
      return NextResponse.json({ error: "Ranking failed" }, { status: 500 });
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]";
    const jsonStr = text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();

    const ranked = JSON.parse(jsonStr);
    return NextResponse.json({ ranked });
  } catch (err) {
    console.error("Ranking error:", err);
    return NextResponse.json({ error: "Ranking failed" }, { status: 500 });
  }
}
