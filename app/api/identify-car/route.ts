import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("photo") as File;

  if (!file) {
    return NextResponse.json({ error: "No photo provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = file.type || "image/jpeg";

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an expert car identifier. Look at this photo and identify the vehicle.

Return ONLY a JSON object with these fields (no markdown, no code fences, just raw JSON):
{
  "year": <number or null if uncertain>,
  "make": "<manufacturer>",
  "model": "<model name>",
  "color": "<color>",
  "confidence": <0.0 to 1.0>,
  "notes": "<any additional details like trim, generation, or distinguishing features>"
}

If you cannot identify a car in the image, return:
{"year": null, "make": null, "model": null, "color": null, "confidence": 0, "notes": "No car detected"}

Be specific about the model year when possible. Use common manufacturer names (e.g. "Chevrolet" not "Chevy", "Mercedes-Benz" not "Mercedes").`,
                },
                {
                  inlineData: {
                    mimeType,
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.1,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini vision error:", err);
      return NextResponse.json({ error: "Failed to identify car" }, { status: 500 });
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      console.error("Gemini returned no text. Full response:", JSON.stringify(data));
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    console.log("Gemini raw response:", text);

    // Parse JSON from response (strip code fences if present)
    const jsonStr = text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();

    try {
      const result = JSON.parse(jsonStr);
      return NextResponse.json(result);
    } catch (parseErr) {
      console.error("Failed to parse Gemini response as JSON:", jsonStr);
      return NextResponse.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
    }
  } catch (err) {
    console.error("Car identification error:", err);
    return NextResponse.json({ error: "Failed to identify car" }, { status: 500 });
  }
}
