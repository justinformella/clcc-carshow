# Detail Tech — Design Spec

## Overview

Add a "Detail Tech" mini-game to the `/race` page. After selecting a car, players choose DETAIL TECH from the action menu. The car appears in a detail bay and the player cleans it inside and out using a scratch-off mechanic — click to spray, drag to wipe. Uses existing side-view and dashboard pixel art. Ends with a showroom score and before/after reveal.

## Page Location

New phase within the existing `/race` page component — `phase: "detail"`. No separate route. Follows the same pattern as the dyno phase.

## Action Menu Updates

After car selection, the action menu shows four options:

- **DRAG RACE** — existing, unchanged
- **HIT THE DYNO AT URW** — existing, unchanged
- **DETAIL TECH** — enters detail phase (new)
- **CRUISE ROUTE 14** — enabled button (renamed from "CRUISE CRYSTAL LAKE", remove disabled state and "COMING SOON" label)

## Phase Flow (Updated)

```
select → action-menu → matchup → countdown → racing → finished
                ↓
              dyno → action-menu
                ↓
             detail → action-menu
                ↓
             cruise (user wiring separately)
```

- Action menu "DETAIL TECH" → detail phase
- Detail "BACK TO GARAGE" → action-menu

## Detail Phase Layout

Top to bottom:
1. **Header:** "DETAIL TECH" in gold, Detail Tech logo rendered below
2. **Canvas:** 100% width, ~50% viewport height. Contains the car on the detail bay background with grime overlay.
3. **Progress bar:** Horizontal bar showing percentage cleaned, fills left-to-right.
4. **Status text:** Current phase label ("EXTERIOR" / "INTERIOR") and percentage.
5. **Controls:**
   - Before starting: "START DETAIL" button
   - During detailing: instructions ("Click to spray · Drag to wipe")
   - After reveal: showroom score display
6. **Navigation:** "BACK TO GARAGE" link

## Generated Assets

Two one-time 8-bit pixel art assets generated via Imagen and stored in Supabase storage. Same pattern as the dyno room background.

### Detail Bay Background

**Storage path:** `pixel-art/detail-bay.png`

**Imagen prompt:**
```
8-bit retro pixel art side view of an automotive detailing bay interior. Clean white tile walls, polished gray concrete floor with a drain grate. Bright overhead fluorescent strip lights. On the left wall, a pegboard with hanging spray bottles, microfiber towels, and a buffer/polisher. A rolling red tool cart with detailing supplies. A pressure washer on the right side. The floor is wet with a subtle shine. Open garage door on the right showing daylight outside. Style like a 1990s DOS racing game. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic. Side-on view, no perspective distortion.
```

**Aspect ratio:** 16:9

### Detail Tech Logo

**Storage path:** `pixel-art/detail-tech-logo.png`

**Imagen prompt:**
```
8-bit retro pixel art logo for "DETAIL TECH" automotive detailing shop. Bold blocky pixel letters spelling "DETAIL TECH" with a subtle shine/sparkle effect on the letters. Color scheme: gold text on transparent/black background. A small pixel art spray bottle icon next to the text. Style like a 1990s DOS game title screen logo. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic.
```

**Aspect ratio:** 4:1

### Generation Flow

1. On first load of the detail phase, check if each asset exists in Supabase storage
2. If not, generate via Imagen and upload
3. Cache the URLs in React refs so they're only fetched once per session

**Fallback:** If generation fails, draw "DETAIL TECH" as canvas text (gold, Press Start 2P font) and use a dark background with simple rectangles for the bay.

### API Endpoint

New endpoint: `POST /api/registrations/pixel-art/generate-detail-bay`

Same pattern as `/api/registrations/pixel-art/generate-dyno-room`. Generates both assets (bay background + logo) if they don't already exist.

## Canvas Rendering

### Background Layer
- Draw the detail bay background image scaled to fill the canvas
- Detail Tech logo rendered subtly in the background (low opacity)

### Car Sprite
- Load the car's side view (`pixelArt`) for exterior phase
- Load the car's dashboard view (`pixelDash` or `pixel_dashboard_url`) for interior phase
- Position centered in the detail bay
- Scale to ~40% of canvas width (exterior) or fill canvas (interior/dashboard)
- Respect `flipped` flag with `ctx.scale(-1, 1)`

### Grime Overlay

A separate offscreen canvas (`grimeCanvas`) the same size as the main canvas. Filled with a semi-transparent grime texture on phase start.

**Grime appearance:**
- Base: `rgba(80, 60, 30, 0.45)` — brown-tinted translucent layer
- Noise: random darker/lighter spots painted on init for texture variation
- Drawn on top of the car sprite each frame

**Erasing grime (scratch-off mechanic):**
- Use `globalCompositeOperation: 'destination-out'` on the grime canvas
- **Click/tap:** Erase a circle (radius ~25px) at the click point. Represents a spray burst.
- **Drag/touch-move:** Erase circles along the drag path (every ~8px of movement). Represents wiping.
- Both interactions clear the grime from the offscreen canvas, revealing the clean car underneath.

**Progress tracking:**
- After each interaction, sample the grime canvas alpha channel at regular intervals (every 8th pixel) to calculate percentage cleared.
- Display as a progress bar and percentage text below the canvas.

### Sparkle Particles

Spawn at the point of contact when erasing grime. Same particle system architecture as dyno exhaust.

- Small circles (1-3px radius), white and gold colors
- Burst outward from contact point in random directions
- Each particle lives ~20 frames, fading alpha to 0
- Spawn 3-5 particles per click, 1-2 per drag step
- Occasional larger "star" particle (4-pointed, drawn with lines)

### Shine Sweep (Post-Clean)

After each pass reaches 100% (or player clicks "DONE"), a diagonal white gradient sweeps across the car from left to right over ~1 second.

- Implemented as a moving linear gradient with `globalCompositeOperation: 'lighter'`
- Gradient width ~20% of canvas, moves from -20% to 120%
- Low opacity (0.15-0.25) so it's a subtle highlight, not a whiteout
- Triggers the transition to the next phase

## Audio

Reuse `initAudio()` from existing audio system. New sounds implemented inline with `OscillatorNode` (same approach as dyno spec reveal):

- **Spray sound:** Short white noise burst, 80ms duration. Triggered on click.
- **Wipe sound:** Low-frequency filtered noise, continuous while dragging. Start on mousedown, stop on mouseup.
- **Sparkle sound:** Very short high-pitched ping (2000Hz sine, 30ms), triggered with sparkle particles. Randomize pitch slightly (±200Hz).
- **Shine sweep sound:** Rising tone sweep from 200Hz to 800Hz over 1s, low volume. Accompanies the shine sweep animation.
- **Score reveal sound:** Reuse the 80Hz square wave pulse from dyno spec reveal.

## Game Phases

### 1. Idle
- Detail bay background drawn
- Car side view displayed with full grime overlay
- "START DETAIL" button visible
- Header shows "DETAIL TECH" with logo

### 2. Exterior Detail
- Player clicks/drags to remove grime from exterior (side view)
- Progress bar fills as grime is removed
- Sparkle particles at contact points
- Spray/wipe sounds on interaction
- Phase label: "EXTERIOR"
- Auto-completes when progress hits 95%+, or player can click "DONE" at any time (minimum 50% to proceed)
- Shine sweep plays on completion

### 3. Interior Detail
- Canvas transitions to dashboard view with fresh grime overlay
- Same click/drag mechanic
- Phase label: "INTERIOR"
- Same completion rules (95% auto-complete or manual "DONE" at 50%+)
- Shine sweep plays on completion

### 4. Reveal
- Before/after comparison:
  - Car side view shown split — left half with grime, right half clean
  - Sliding divider animates from left to right over 1.5s, revealing the clean car
- Showroom score fades in below:
  - Score = (exterior_pct × 0.6 + interior_pct × 0.4), displayed as X/100
  - Score label based on value:
    - 95-100: "SHOWROOM PERFECT" (gold text, sparkle particles around score)
    - 80-94: "SHOW READY" (gold text)
    - 60-79: "STREET CLEAN" (white text)
    - Below 60: "NEEDS WORK" (gray text)
  - Score number counts up from 0 to final value over 0.5s (same animation as dyno spec reveal)
- "BACK TO GARAGE" link visible

## Interaction Handling

### Mouse Events (Desktop)
- `mousedown` on canvas: Start spray. Record position. Erase circle at point.
- `mousemove` while button held: Wipe along path. Erase circles at intervals.
- `mouseup`: Stop wipe sound.

### Touch Events (Mobile)
- `touchstart`: Same as mousedown. Prevent default to avoid scrolling.
- `touchmove`: Same as mousemove with drag.
- `touchend`: Same as mouseup.

### Coordinate Mapping
- Convert mouse/touch page coordinates to canvas coordinates using `canvas.getBoundingClientRect()` and canvas resolution scaling.
- Only erase within the car sprite bounds (not the background).

## Data Requirements

All data available from existing `/api/race` response:
- `car.pixelArt` — side view image URL
- `car.pixelDash` — dashboard image URL (fallback to `pixel_dashboard_url`)
- `car.flipped` — flip direction flag
- `car.name`, `car.year`, `car.carNumber` — for display

No new API endpoints needed beyond the asset generation endpoint.

## File Changes

| File | Change |
|------|--------|
| `app/race/page.tsx` | Add "detail" phase. Add detail canvas, grime overlay, interaction handlers, sparkle particles, progress tracking, reveal animation, score display. Update action menu: add DETAIL TECH button, rename cruise to CRUISE ROUTE 14, enable cruise button. |
| `app/api/registrations/pixel-art/generate-detail-bay/route.ts` | New endpoint. Generate detail bay background + Detail Tech logo via Imagen, upload to Supabase storage. |

Two file changes. The `/race` page follows the existing single-file pattern with all phases.

## Phase Type Update

```typescript
type Phase = "loading" | "title" | "select" | "action-menu" | "dyno" | "detail" | "countdown" | "racing" | "finished";
```
