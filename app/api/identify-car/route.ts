import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("photo") as File;
  const candidatesJson = formData.get("candidates") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No photo provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = file.type || "image/jpeg";

  // Build prompt — if candidates are provided, do identification + ranking in one call
  const hasCandidates = candidatesJson && candidatesJson.length > 2;

  const prompt = hasCandidates
    ? `Identify the car in this photo, then match it to these registrations:
${candidatesJson}

Chassis codes = model names (930=911 Turbo, E30=325i, W124=300E, etc). Colors vary by name. Don't match classic to modern.

Return ONLY raw JSON, no markdown, no explanation:
{"year":NUM,"make":"STR","model":"STR","color":"STR","confidence":0.0-1.0,"notes":"brief","matches":[{"i":IDX,"score":0-100}]}

matches: best match first, only plausible matches, omit below 40.`
    : `You are an expert car identifier. Look at this photo and identify the vehicle.

Return ONLY this JSON (no code fences, no other text):
{
  "year": <single number, best guess, or null if truly unknown>,
  "make": "<manufacturer>",
  "model": "<model name>",
  "color": "<color>",
  "confidence": <0.0 to 1.0>,
  "notes": "<any additional details like trim, generation, or distinguishing features>",
  "matches": []
}

If you cannot identify a car in the image, return:
{"year": null, "make": null, "model": null, "color": null, "confidence": 0, "notes": "No car detected", "matches": []}

Be specific about the model year when possible. Use common manufacturer names (e.g. "Chevrolet" not "Chevy", "Mercedes-Benz" not "Mercedes").`;

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
                { text: prompt },
                { inlineData: { mimeType, data: base64 } },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 8192,
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

    const jsonStr = text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();

    try {
      const result = JSON.parse(jsonStr);
      // Normalize year
      if (typeof result.year === "string") {
        const match = result.year.match(/(\d{4})/);
        result.year = match ? parseInt(match[1]) : null;
      }
      return NextResponse.json(result);
    } catch {
      // Try to extract partial data if JSON is truncated
      console.error("Failed to parse Gemini response as JSON:", jsonStr);
      try {
        const makeMatch = jsonStr.match(/"make"\s*:\s*"([^"]+)"/);
        const modelMatch = jsonStr.match(/"model"\s*:\s*"([^"]+)"/);
        const yearMatch = jsonStr.match(/"year"\s*:\s*"?(\d{4})/);
        const colorMatch = jsonStr.match(/"color"\s*:\s*"([^"]+)"/);
        if (makeMatch) {
          return NextResponse.json({
            year: yearMatch ? parseInt(yearMatch[1]) : null,
            make: makeMatch[1],
            model: modelMatch?.[1] || null,
            color: colorMatch?.[1] || null,
            confidence: 0.7,
            notes: "Partial identification (response was truncated)",
            matches: [],
          });
        }
      } catch {}
      return NextResponse.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
    }
  } catch (err) {
    console.error("Car identification error:", err);
    return NextResponse.json({ error: "Failed to identify car" }, { status: 500 });
  }
}
