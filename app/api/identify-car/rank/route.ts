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

Rank these by how likely each one is the same car from the photo. Consider:
- Model match (911 Turbo matches "911", "930", "911 Turbo" etc.)
- Year proximity
- Color similarity (burgundy ≈ maroon ≈ wine ≈ dark red)
- Generation/trim details

Return ONLY a JSON array of the indices in order from best match to worst match. Only include likely matches (skip obvious non-matches). Example: [3, 7, 1]

Return only the JSON array, no other text.`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 256,
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
