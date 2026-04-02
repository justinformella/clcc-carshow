# Race Track Redesign: Pseudo-3D Arcade Racer View

**Date:** 2026-04-01
**Status:** Approved

## Overview

Replace the flat road CSS rendering in the racing game with a classic arcade-style pseudo-3D track (OutRun/Rad Racer style). Add rear-view pixel art generation for opponent cars. The dashboard remains unchanged.

## 1. Rear-View Pixel Art Generation

### New Database Field

Add `pixel_rear_url TEXT` column to the `registrations` table.

### Generation Prompt

```
8-bit retro pixel art rear view of a [year] [make] [model] in [color].
The car is seen from directly behind, showing taillights, rear bumper, and rear window.
Style like a 1990s DOS racing game (OutRun, Rad Racer).
Black background, car fills the frame.
Sharp pixels, no anti-aliasing, authentic retro video game aesthetic.
```

- Same image generation pipeline (Gemini primary, OpenAI fallback)
- Same aspect ratio (16:9) and resolution (1536x1024)
- Storage path: `pixel-art/rear-{registrationId}.png`

### Integration Points

- **Stripe webhook (`app/api/webhooks/stripe/route.ts`):** Add rear-view generation call in the `after()` block alongside existing side + dash generation.
- **Batch backfill:** Extend `POST /api/registrations/pixel-art` to support `{ batch_rear: true }` mode that generates rear views for all paid/comped cars missing `pixel_rear_url`.
- **Single generation:** Extend `generatePixelArt()` in `lib/generate-pixel-art.ts` to also generate the rear view alongside side + dash. Existing images are never overwritten or regenerated.

### Race API Changes

Add `pixelRear: string | null` to the `/api/race` GET response, sourced from `r.pixel_rear_url`.

## 2. Pseudo-3D Road Rendering

### Technology

Canvas 2D element filling the top ~65% of the race view (above the dashboard).

### Road Drawing

- **Horizon line** at ~30% from top of canvas
- **Road segments** drawn row-by-row from bottom to horizon, each row narrower (perspective scaling)
- **Two lanes** separated by a dashed white center line that converges toward the vanishing point
- **Grass/gravel shoulders** on each side with alternating color stripes (green/dark-green) that scroll vertically to convey speed
- **Road surface** with subtle alternating dark/light grey stripe bands for scrolling illusion
- **Sky** gradient above horizon (dark blue)

### Scrolling

- Road stripe offset increments proportionally to player speed each frame
- Shoulder stripe offset scrolls at the same rate
- Creates the sensation of forward movement

### Vanishing Point

- Single vanishing point at horizontal center, ~30% from top
- All road edges, lane markings, and shoulder lines converge to this point
- Opponent car scale and position derived from this same perspective system

## 3. Opponent Car Rendering

### Sprite Approach

- DOM `<img>` element overlaid on top of the canvas (not drawn into canvas)
- Uses `pixel_rear_url` with `imageRendering: pixelated`
- Positioned absolutely within the race view container

### Position Mapping

Based on `deltaDistance = playerPos - opponentPos`:

| Delta | Meaning | Visual |
|-------|---------|--------|
| Large negative | Opponent far ahead | Small sprite near horizon, in adjacent lane |
| Small negative | Opponent slightly ahead | Medium sprite, upper-mid road |
| Zero | Even | Full-size sprite beside player, mid-road |
| Small positive | Player slightly ahead | Large sprite, lower-mid road |
| Large positive | Player far ahead | Sprite slides off bottom of screen |

### Lane Positioning

- Opponent is always in the adjacent lane (offset left or right of center)
- The horizontal offset accounts for perspective: less offset near horizon, more offset near bottom
- Lane assignment is fixed for the race (e.g., opponent always in left lane)

### Scale

- At even position: ~120px wide
- Scales down toward ~30px as they approach the horizon
- Scales up beyond 120px briefly as they fall behind before going off-screen

## 4. Dashboard (No Changes)

- Remains at bottom ~35% of screen
- Pixel art dash background image, speedometer, RPM, gear readouts
- "HOLD TO ACCELERATE" button stays below on mobile
- All existing styling and positioning unchanged

## 5. Race Physics (Minimal Changes)

- Core physics unchanged: player acceleration, RPM, gear shifting, opponent AI curve
- Add `deltaDistance` computation each frame for visual mapping
- No changes to win conditions, timing, or race outcome logic

## 6. File Changes Summary

| File | Change |
|------|--------|
| `lib/generate-pixel-art.ts` | Add rear-view generation (third image alongside side + dash) |
| `app/api/registrations/pixel-art/route.ts` | Add `batch_rear` mode for backfill |
| `app/api/webhooks/stripe/route.ts` | Already calls pixel-art endpoint; no change needed (generates all views) |
| `app/api/race/route.ts` | Add `pixel_rear_url` to select, expose as `pixelRear` |
| `app/race/page.tsx` | Replace CSS road with Canvas 2D pseudo-3D road, update opponent rendering |
| `types/database.ts` | Add `pixel_rear_url` to Registration type |

### SQL Migration (run in Supabase SQL Editor)

```sql
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS pixel_rear_url TEXT;
```
