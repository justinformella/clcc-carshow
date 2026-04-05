# HF Spaces Background Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate pixel art background removal via a Hugging Face Spaces API, store originals in new DB columns, and add per-asset admin controls for regenerating, stripping backgrounds, and uploading images individually.

**Architecture:** HF Space runs rembg as a FastAPI endpoint. The generation pipeline in `lib/generate-pixel-art.ts` saves raw Imagen output to `_original_url` columns, POSTs side/rear to HF Space for bg removal, and saves transparent versions to main columns. New API routes handle single-image regeneration, bg stripping, and file upload. Admin UI gets action buttons per image card.

**Tech Stack:** Hugging Face Spaces (Python/FastAPI/rembg), Next.js API routes, Supabase (storage + DB), TypeScript/React

---

### Task 1: Create HF Space with rembg API

**Files:**
- Create: `hf-space/app.py` (local reference copy, deployed to HF)
- Create: `hf-space/requirements.txt`

- [ ] **Step 1: Create the HF Space app**

Create `hf-space/app.py`:

```python
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import Response
from rembg.bg import remove
from PIL import Image
import io

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/remove-bg")
async def remove_bg(file: UploadFile = File(...)):
    input_data = await file.read()
    input_image = Image.open(io.BytesIO(input_data))
    output_image = remove(input_image)
    buf = io.BytesIO()
    output_image.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")
```

- [ ] **Step 2: Create requirements.txt**

Create `hf-space/requirements.txt`:

```
fastapi
uvicorn
rembg
onnxruntime
pillow
```

- [ ] **Step 3: Deploy to Hugging Face Spaces**

1. Go to huggingface.co/spaces and create a new Space
2. Name: `clcc-rembg` (or similar)
3. SDK: Docker (or Gradio — FastAPI works under both)
4. Upload `app.py` and `requirements.txt`
5. Wait for build to complete
6. Test: `curl -X POST https://<your-space>.hf.space/remove-bg -F file=@test-image.png -o output.png`
7. Save the Space URL

- [ ] **Step 4: Add env var for the HF Space URL**

Add to `.env.local`:

```
HF_REMBG_URL=https://<your-space>.hf.space
```

Add to Vercel environment variables as well.

- [ ] **Step 5: Commit local reference copy**

```bash
git add hf-space/
git commit -m "docs: add HF Space rembg reference code"
```

---

### Task 2: Add original URL columns to Registration type

**Files:**
- Modify: `types/database.ts:34-36`

- [ ] **Step 1: Add the 3 new fields to the Registration type**

In `types/database.ts`, after line 36 (`pixel_rear_url: string | null;`), add:

```typescript
  pixel_art_original_url: string | null;
  pixel_dashboard_original_url: string | null;
  pixel_rear_original_url: string | null;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add types/database.ts
git commit -m "feat: add pixel_art_original_url columns to Registration type"
```

- [ ] **Step 4: SQL migration — outline for user**

Print the SQL for the user to run in Supabase SQL Editor:

```sql
-- Step 1: Add columns
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS pixel_art_original_url TEXT,
  ADD COLUMN IF NOT EXISTS pixel_dashboard_original_url TEXT,
  ADD COLUMN IF NOT EXISTS pixel_rear_original_url TEXT;

-- Step 2: Backfill — copy current images to _original_url columns
UPDATE registrations
SET
  pixel_art_original_url = pixel_art_url,
  pixel_dashboard_original_url = pixel_dashboard_url,
  pixel_rear_original_url = pixel_rear_url
WHERE
  pixel_art_url IS NOT NULL
  OR pixel_dashboard_url IS NOT NULL
  OR pixel_rear_url IS NOT NULL;
```

---

### Task 3: Add removeBackground helper using HF Space

**Files:**
- Modify: `lib/generate-pixel-art.ts`

- [ ] **Step 1: Add the removeBackground function**

In `lib/generate-pixel-art.ts`, add this function before `generateImage()`:

```typescript
/**
 * Remove background from an image via Hugging Face Space rembg API.
 * Returns transparent PNG buffer. Falls back to original if HF is unavailable.
 */
export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const hfUrl = process.env.HF_REMBG_URL;
  if (!hfUrl) {
    console.warn("HF_REMBG_URL not set — skipping background removal");
    return imageBuffer;
  }

  try {
    const formData = new FormData();
    formData.append("file", new Blob([imageBuffer], { type: "image/png" }), "image.png");

    const res = await fetch(`${hfUrl}/remove-bg`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(60000), // 60s timeout
    });

    if (!res.ok) {
      console.error(`HF rembg failed: ${res.status} ${res.statusText}`);
      return imageBuffer;
    }

    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (err) {
    console.error("HF rembg error:", err);
    return imageBuffer; // fallback to original
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add lib/generate-pixel-art.ts
git commit -m "feat: add removeBackground helper via HF Space rembg API"
```

---

### Task 4: Update generatePixelArt to save originals and strip backgrounds

**Files:**
- Modify: `lib/generate-pixel-art.ts:53-118`

- [ ] **Step 1: Update the generatePixelArt function**

Replace the section from `const sideBuffer = sideRaw;` through the database update (lines 90-116) with:

```typescript
  // Upload raw originals to storage
  await supabase.storage.createBucket("pixel-art", {
    public: true,
    allowedMimeTypes: ["image/png"],
  });

  const sideOrigName = `side-${registrationId}.png`;
  const dashOrigName = `dash-${registrationId}.png`;
  const rearOrigName = `rear-${registrationId}.png`;

  await Promise.all([
    supabase.storage.from("pixel-art").upload(sideOrigName, sideRaw, { contentType: "image/png", upsert: true }),
    supabase.storage.from("pixel-art").upload(dashOrigName, dashBuffer, { contentType: "image/png", upsert: true }),
    supabase.storage.from("pixel-art").upload(rearOrigName, rearRaw, { contentType: "image/png", upsert: true }),
  ]);

  const ts = Date.now();
  const sideOrigUrl = `${supabase.storage.from("pixel-art").getPublicUrl(sideOrigName).data.publicUrl}?v=${ts}`;
  const dashOrigUrl = `${supabase.storage.from("pixel-art").getPublicUrl(dashOrigName).data.publicUrl}?v=${ts}`;
  const rearOrigUrl = `${supabase.storage.from("pixel-art").getPublicUrl(rearOrigName).data.publicUrl}?v=${ts}`;

  // Strip backgrounds from side and rear via HF Space
  const [sideClean, rearClean] = await Promise.all([
    removeBackground(sideRaw),
    removeBackground(rearRaw),
  ]);

  // Upload transparent versions
  const sideTransName = `side-${registrationId}-transparent.png`;
  const rearTransName = `rear-${registrationId}-transparent.png`;

  await Promise.all([
    supabase.storage.from("pixel-art").upload(sideTransName, sideClean, { contentType: "image/png", upsert: true }),
    supabase.storage.from("pixel-art").upload(rearTransName, rearClean, { contentType: "image/png", upsert: true }),
  ]);

  const sideUrl = `${supabase.storage.from("pixel-art").getPublicUrl(sideTransName).data.publicUrl}?v=${ts}`;
  const dashUrl = dashOrigUrl; // dashboard doesn't need bg removal
  const rearUrl = `${supabase.storage.from("pixel-art").getPublicUrl(rearTransName).data.publicUrl}?v=${ts}`;

  // Save both original and transparent URLs
  await supabase
    .from("registrations")
    .update({
      pixel_art_url: sideUrl,
      pixel_dashboard_url: dashUrl,
      pixel_rear_url: rearUrl,
      pixel_art_original_url: sideOrigUrl,
      pixel_dashboard_original_url: dashOrigUrl,
      pixel_rear_original_url: rearOrigUrl,
    })
    .eq("id", registrationId);

  return { sideUrl, dashUrl, rearUrl };
```

- [ ] **Step 2: Clean up — remove the unused `const sideBuffer = sideRaw;` and `const rearBuffer = rearRaw;` lines**

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add lib/generate-pixel-art.ts
git commit -m "feat: save original + transparent pixel art, strip bg via HF Space"
```

---

### Task 5: Create single-image regenerate API endpoint

**Files:**
- Create: `app/api/registrations/pixel-art/regenerate/route.ts`

- [ ] **Step 1: Create the endpoint**

Create `app/api/registrations/pixel-art/regenerate/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateImage, buildRearPrompt, removeBackground } from "@/lib/generate-pixel-art";

export async function POST(request: NextRequest) {
  try {
    const { registration_id, type } = await request.json();

    if (!registration_id || !["side", "dashboard", "rear"].includes(type)) {
      return NextResponse.json({ error: "Provide registration_id and type (side|dashboard|rear)" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: reg, error } = await supabase
      .from("registrations")
      .select("vehicle_year, vehicle_make, vehicle_model, vehicle_color")
      .eq("id", registration_id)
      .single();

    if (error || !reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const carDesc = `${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`;
    const color = reg.vehicle_color || "silver";

    let prompt: string;
    if (type === "side") {
      prompt = `8-bit retro pixel art side profile view of a ${carDesc} in ${color}. ` +
        `The car should be facing right, detailed pixel art style like a 1990s DOS racing game. ` +
        `Black background. The car should fill most of the frame. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic.`;
    } else if (type === "rear") {
      prompt = buildRearPrompt(carDesc, color);
    } else {
      prompt = `8-bit retro pixel art interior dashboard view from the driver seat of a ${carDesc}. ` +
        `Show the steering wheel, instrument cluster with speedometer and tachometer, and windshield. ` +
        `Style like a 1990s DOS racing game (Test Drive, Street Rod). ` +
        `Detailed pixel art with authentic retro video game aesthetic. View should be from behind the steering wheel looking forward.`;
    }

    const rawBuffer = await generateImage(prompt);
    const ts = Date.now();

    // Upload original
    const origName = `${type}-${registration_id}.png`;
    await supabase.storage.from("pixel-art").upload(origName, rawBuffer, { contentType: "image/png", upsert: true });
    const origUrl = `${supabase.storage.from("pixel-art").getPublicUrl(origName).data.publicUrl}?v=${ts}`;

    // For side/rear, also strip background
    let mainUrl = origUrl;
    if (type === "side" || type === "rear") {
      const cleanBuffer = await removeBackground(rawBuffer);
      const transName = `${type}-${registration_id}-transparent.png`;
      await supabase.storage.from("pixel-art").upload(transName, cleanBuffer, { contentType: "image/png", upsert: true });
      mainUrl = `${supabase.storage.from("pixel-art").getPublicUrl(transName).data.publicUrl}?v=${ts}`;
    }

    // Map type to column names
    const mainCol = type === "side" ? "pixel_art_url" : type === "rear" ? "pixel_rear_url" : "pixel_dashboard_url";
    const origCol = type === "side" ? "pixel_art_original_url" : type === "rear" ? "pixel_rear_original_url" : "pixel_dashboard_original_url";

    await supabase
      .from("registrations")
      .update({ [mainCol]: mainUrl, [origCol]: origUrl })
      .eq("id", registration_id);

    return NextResponse.json({ url: mainUrl, originalUrl: origUrl });
  } catch (err) {
    console.error("Regenerate error:", err);
    return NextResponse.json({ error: "Failed to regenerate" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add app/api/registrations/pixel-art/regenerate/route.ts
git commit -m "feat: add single-image regenerate API endpoint"
```

---

### Task 6: Create strip-bg API endpoint

**Files:**
- Create: `app/api/registrations/pixel-art/strip-bg/route.ts`

- [ ] **Step 1: Create the endpoint**

Create `app/api/registrations/pixel-art/strip-bg/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { removeBackground } from "@/lib/generate-pixel-art";

export async function POST(request: NextRequest) {
  try {
    const { registration_id, type } = await request.json();

    if (!registration_id || !["side", "rear"].includes(type)) {
      return NextResponse.json({ error: "Provide registration_id and type (side|rear)" }, { status: 400 });
    }

    const supabase = createServerClient();
    const origCol = type === "side" ? "pixel_art_original_url" : "pixel_rear_original_url";

    const { data: reg, error } = await supabase
      .from("registrations")
      .select(origCol)
      .eq("id", registration_id)
      .single();

    if (error || !reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const origUrl = (reg as Record<string, string | null>)[origCol];
    if (!origUrl) {
      return NextResponse.json({ error: "No original image to strip" }, { status: 400 });
    }

    // Download original image
    const imgRes = await fetch(origUrl);
    if (!imgRes.ok) {
      return NextResponse.json({ error: "Failed to download original image" }, { status: 500 });
    }
    const rawBuffer = Buffer.from(await imgRes.arrayBuffer());

    // Strip background
    const cleanBuffer = await removeBackground(rawBuffer);

    // Upload transparent version
    const ts = Date.now();
    const transName = `${type}-${registration_id}-transparent.png`;
    await supabase.storage.from("pixel-art").upload(transName, cleanBuffer, { contentType: "image/png", upsert: true });
    const mainUrl = `${supabase.storage.from("pixel-art").getPublicUrl(transName).data.publicUrl}?v=${ts}`;

    // Update main column
    const mainCol = type === "side" ? "pixel_art_url" : "pixel_rear_url";
    await supabase
      .from("registrations")
      .update({ [mainCol]: mainUrl })
      .eq("id", registration_id);

    return NextResponse.json({ url: mainUrl });
  } catch (err) {
    console.error("Strip BG error:", err);
    return NextResponse.json({ error: "Failed to strip background" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add app/api/registrations/pixel-art/strip-bg/route.ts
git commit -m "feat: add strip-bg API endpoint using HF Space"
```

---

### Task 7: Create upload API endpoint

**Files:**
- Create: `app/api/registrations/pixel-art/upload/route.ts`

- [ ] **Step 1: Create the endpoint**

Create `app/api/registrations/pixel-art/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const registrationId = formData.get("registration_id") as string;
    const type = formData.get("type") as string;
    const file = formData.get("file") as File | null;

    if (!registrationId || !["side", "dashboard", "rear"].includes(type) || !file) {
      return NextResponse.json({ error: "Provide registration_id, type (side|dashboard|rear), and file" }, { status: 400 });
    }

    const supabase = createServerClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const ts = Date.now();

    // Upload to storage — use the transparent filename for side/rear, original for dashboard
    const fileName = (type === "side" || type === "rear")
      ? `${type}-${registrationId}-transparent.png`
      : `${type}-${registrationId}.png`;

    await supabase.storage.from("pixel-art").upload(fileName, buffer, { contentType: "image/png", upsert: true });
    const url = `${supabase.storage.from("pixel-art").getPublicUrl(fileName).data.publicUrl}?v=${ts}`;

    // Update the main column
    const mainCol = type === "side" ? "pixel_art_url" : type === "rear" ? "pixel_rear_url" : "pixel_dashboard_url";
    await supabase
      .from("registrations")
      .update({ [mainCol]: url })
      .eq("id", registrationId);

    return NextResponse.json({ url });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Failed to upload" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add app/api/registrations/pixel-art/upload/route.ts
git commit -m "feat: add pixel art manual upload API endpoint"
```

---

### Task 8: Add per-asset action buttons to admin UI

**Files:**
- Modify: `app/admin/registrations/[id]/page.tsx:937-970`

- [ ] **Step 1: Replace the pixel art images section**

Replace the existing pixel art grid (lines 937-970) with a version that includes action buttons per image:

```typescript
                {/* Pixel Art Images */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                  {([
                    { label: "Side", type: "side", url: r.pixel_art_url, origUrl: r.pixel_art_original_url, hasBgStrip: true },
                    { label: "Dashboard", type: "dashboard", url: r.pixel_dashboard_url, origUrl: r.pixel_dashboard_original_url, hasBgStrip: false },
                    { label: "Rear", type: "rear", url: r.pixel_rear_url, origUrl: r.pixel_rear_original_url, hasBgStrip: true },
                  ] as const).map(({ label, type, url, origUrl, hasBgStrip }) => (
                    <div key={label}>
                      <div
                        onClick={() => url && setLightboxUrl(url)}
                        style={{
                          aspectRatio: "16/9",
                          background: "#111",
                          borderRadius: "6px",
                          overflow: "hidden",
                          marginBottom: "0.4rem",
                          cursor: url ? "zoom-in" : "default",
                          transition: "box-shadow 0.2s",
                        }}
                        onMouseEnter={(e) => { if (url) e.currentTarget.style.boxShadow = "0 0 0 2px var(--gold)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                      >
                        {url ? (
                          <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" as const }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: "0.75rem" }}>Not generated</div>
                        )}
                      </div>
                      <p style={{ fontSize: "0.75rem", color: url ? "var(--charcoal)" : "var(--text-light)", fontWeight: 500, textAlign: "center", marginBottom: "0.4rem" }}>
                        {label}
                      </p>
                      <div style={{ display: "flex", gap: "0.3rem", justifyContent: "center", flexWrap: "wrap" }}>
                        <PixelArtAction
                          label="Regen"
                          onClick={async () => {
                            const res = await fetch("/api/registrations/pixel-art/regenerate", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ registration_id: r.id, type }),
                            });
                            if (res.ok) window.location.reload();
                          }}
                        />
                        {hasBgStrip && origUrl && (
                          <PixelArtAction
                            label="Strip BG"
                            onClick={async () => {
                              const res = await fetch("/api/registrations/pixel-art/strip-bg", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ registration_id: r.id, type }),
                              });
                              if (res.ok) window.location.reload();
                            }}
                          />
                        )}
                        <PixelArtAction
                          label="Upload"
                          isUpload
                          onUpload={async (file) => {
                            const fd = new FormData();
                            fd.append("registration_id", r.id);
                            fd.append("type", type);
                            fd.append("file", file);
                            const res = await fetch("/api/registrations/pixel-art/upload", { method: "POST", body: fd });
                            if (res.ok) window.location.reload();
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
```

- [ ] **Step 2: Add the PixelArtAction helper component**

Add this component at the bottom of the file (before the closing export or after the last component):

```typescript
function PixelArtAction({ label, onClick, isUpload, onUpload }: {
  label: string;
  onClick?: () => Promise<void>;
  isUpload?: boolean;
  onUpload?: (file: File) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleClick = async () => {
    if (isUpload) {
      fileRef.current?.click();
      return;
    }
    if (!onClick) return;
    setLoading(true);
    try { await onClick(); } finally { setLoading(false); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    setLoading(true);
    try { await onUpload(file); } finally { setLoading(false); }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          padding: "0.2rem 0.5rem",
          fontSize: "0.65rem",
          fontWeight: 600,
          textTransform: "uppercase",
          background: loading ? "#eee" : "var(--cream)",
          color: "var(--charcoal)",
          border: "1px solid #ddd",
          cursor: loading ? "wait" : "pointer",
          letterSpacing: "0.04em",
        }}
      >
        {loading ? "..." : label}
      </button>
      {isUpload && (
        <input
          ref={fileRef}
          type="file"
          accept="image/png"
          style={{ display: "none" }}
          onChange={handleFile}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Add `useRef` to the imports if not already present**

Check the imports at the top of the file. If `useRef` is not already imported from React, add it.

- [ ] **Step 4: Update the registration query to select the new _original_url columns**

Find where the registration is fetched (the `.select("*")` query). If it uses `select("*")` it will automatically include the new columns. If it uses explicit column names, add the 3 new columns.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 6: Commit**

```bash
git add app/admin/registrations/[id]/page.tsx
git commit -m "feat: add per-asset Regenerate, Strip BG, Upload buttons in admin"
```

---

### Task 9: Update strip-backgrounds.py for bulk upload mode

**Files:**
- Modify: `scripts/strip-backgrounds.py`

- [ ] **Step 1: Update the upload logic to write transparent URLs to main columns via REST API**

In `scripts/strip-backgrounds.py`, update the `process_file` function's upload branch to also update the database column. Add after the storage upload:

```python
    if not preview_dir:
        # ... existing upload code ...

        # Also update the registration's main pixel art URL
        # Extract registration ID from filename: side-{uuid}.png or rear-{uuid}.png
        parts = filename.replace(".png", "").split("-", 1)
        if len(parts) == 2:
            img_type = parts[0]  # "side" or "rear"
            reg_id = parts[1]
            trans_name = f"{img_type}-{reg_id}-transparent.png"

            # Upload as transparent filename
            supabase_upload(trans_name, png_bytes)

            # Update DB column
            col = "pixel_art_url" if img_type == "side" else "pixel_rear_url"
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{trans_name}?v={int(time.time())}"
            update_url = f"{SUPABASE_URL}/rest/v1/registrations?id=eq.{reg_id}"
            requests.patch(update_url, headers={**HEADERS, "Content-Type": "application/json", "Prefer": "return=minimal"},
                          json={col: public_url})
```

- [ ] **Step 2: Add `import time` at the top of the file**

- [ ] **Step 3: Commit**

```bash
git add scripts/strip-backgrounds.py
git commit -m "feat: update strip-backgrounds.py to upload transparent versions and update DB"
```
