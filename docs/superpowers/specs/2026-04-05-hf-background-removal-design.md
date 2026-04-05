# HF Spaces Background Removal + Per-Asset Controls — Design Spec

## Overview

Automate background removal for race game pixel art assets using a Hugging Face Spaces API (rembg). Store both original (black background) and processed (transparent) versions. Add per-asset admin controls for regenerating, stripping backgrounds, and uploading images individually.

## Components

### 1. Hugging Face Space

A minimal FastAPI app deployed as a free HF Space.

**Endpoint:** `POST /remove-bg`
- Input: PNG image bytes (multipart form upload)
- Output: PNG image bytes with background removed
- Model: rembg with U2Net (same as local script)

**Deployment:** Free CPU tier. No GPU needed — 5-10 seconds per image is fine for this use case.

**Reliability:** If the HF endpoint is down or times out (30s timeout), fall back to uploading the raw image with black background. Don't block generation.

### 2. Database Schema Changes

Add 3 new columns to `registrations` table:

```sql
ALTER TABLE registrations
  ADD COLUMN pixel_art_original_url TEXT,
  ADD COLUMN pixel_dashboard_original_url TEXT,
  ADD COLUMN pixel_rear_original_url TEXT;
```

**Column mapping:**
| Column | Content |
|--------|---------|
| `pixel_art_url` | Transparent side view (processed) |
| `pixel_art_original_url` | Original side view (black background from Imagen) |
| `pixel_dashboard_url` | Dashboard view (no processing needed) |
| `pixel_dashboard_original_url` | Same as dashboard (kept for consistency) |
| `pixel_rear_url` | Transparent rear view (processed) |
| `pixel_rear_original_url` | Original rear view (black background from Imagen) |

### 3. Generation Pipeline Changes

In `lib/generate-pixel-art.ts`, update `generatePixelArt()`:

```
Imagen generates side, dashboard, rear (black background)
  ↓
Upload all 3 raw images to Supabase storage
  ↓
Save raw URLs to _original_url columns
  ↓
POST side and rear to HF Space /remove-bg endpoint
  ↓
Upload transparent PNGs to Supabase storage (overwrite or new filename)
  ↓
Save transparent URLs to main columns (pixel_art_url, pixel_rear_url)
  ↓
Dashboard: same URL for both main and _original columns (no bg removal needed)
```

**Fallback:** If HF Space call fails, main columns get the raw (black background) URL — same as _original_url. User can manually strip later via admin.

**Storage filenames:**
- Original: `side-{id}.png`, `rear-{id}.png` (same as today)
- Transparent: `side-{id}-transparent.png`, `rear-{id}-transparent.png`

### 4. New API Endpoints

**`POST /api/registrations/pixel-art/regenerate`**
- Body: `{ registration_id, type: "side" | "dashboard" | "rear" }`
- Regenerates just that single image via Imagen
- Runs background removal for side/rear
- Updates both _original_url and main url columns
- Returns new URLs

**`POST /api/registrations/pixel-art/strip-bg`**
- Body: `{ registration_id, type: "side" | "rear" }`
- Downloads the image from _original_url
- POSTs to HF Space
- Uploads transparent version
- Updates main url column
- Returns new URL

**`POST /api/registrations/pixel-art/upload`**
- Body: multipart form with `registration_id`, `type` ("side" | "dashboard" | "rear"), and `file` (PNG)
- Uploads the file to Supabase storage
- Updates the main url column
- Returns new URL

### 5. Admin UI Changes

On `app/admin/registrations/[id]/page.tsx`, in the pixel art images section:

Below each of the 3 image cards (Side, Dashboard, Rear), add action buttons:

**Side and Rear cards:**
- "Regenerate" — calls `/api/registrations/pixel-art/regenerate` with the type
- "Strip BG" — calls `/api/registrations/pixel-art/strip-bg` with the type (only enabled if _original_url exists)
- "Upload" — file input that calls `/api/registrations/pixel-art/upload`

**Dashboard card:**
- "Regenerate" — calls regenerate endpoint
- "Upload" — file input

Buttons are small, styled consistently with existing admin buttons. Show a loading spinner during operations. Refresh the image after completion by appending `?v={timestamp}` to bust cache.

### 6. TypeScript Type Updates

Add new fields to the `Registration` type in `types/database.ts`:

```typescript
pixel_art_original_url: string | null;
pixel_dashboard_original_url: string | null;
pixel_rear_original_url: string | null;
```

### 7. HF Space Code

`app.py` for the Hugging Face Space:

```python
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import Response
from rembg.bg import remove
from PIL import Image
import io

app = FastAPI()

@app.post("/remove-bg")
async def remove_bg(file: UploadFile = File(...)):
    input_data = await file.read()
    input_image = Image.open(io.BytesIO(input_data))
    output_image = remove(input_image)
    buf = io.BytesIO()
    output_image.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")
```

`requirements.txt`:
```
fastapi
uvicorn
rembg
onnxruntime
pillow
```

## File Changes Summary

| File | Change |
|------|--------|
| `types/database.ts` | Add 3 `_original_url` fields to Registration type |
| `lib/generate-pixel-art.ts` | Save originals to new columns, POST to HF Space for bg removal, save transparent to main columns |
| `app/api/registrations/pixel-art/route.ts` | Update generateRearOnly to match new pipeline |
| `app/api/registrations/pixel-art/regenerate/route.ts` | New — single image regeneration |
| `app/api/registrations/pixel-art/strip-bg/route.ts` | New — strip bg from existing original |
| `app/api/registrations/pixel-art/upload/route.ts` | New — manual file upload for an asset |
| `app/admin/registrations/[id]/page.tsx` | Add Regenerate, Strip BG, Upload buttons per image card |
| HF Space (separate repo) | FastAPI + rembg app |

## SQL Migration

```sql
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS pixel_art_original_url TEXT,
  ADD COLUMN IF NOT EXISTS pixel_dashboard_original_url TEXT,
  ADD COLUMN IF NOT EXISTS pixel_rear_original_url TEXT;
```
