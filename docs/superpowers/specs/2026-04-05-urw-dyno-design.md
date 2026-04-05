# URW Dyno Page — Design Spec

## Overview

Add a dyno experience to the `/race` page. After selecting a car, players choose between Drag Race, Hit the Dyno, or Cruise Crystal Lake (coming soon). The dyno page shows the car's side-view pixel art on animated dyno rollers with URW Automotive branding, plays engine sounds as RPM climbs, then reveals the car's specs with a punchy animation.

## Page Location

New phase within the existing `/race` page component — `phase: "dyno"`. No separate route. Follows the same pattern as the existing phases (loading, title, select, countdown, racing, finished).

## Action Menu

After car selection (`selectCar()`), instead of immediately setting up the matchup, show an action menu phase (`phase: "action-menu"`):

- **DRAG RACE** — sets up opponent + matchup as before, enters countdown phase
- **HIT THE DYNO** — enters dyno phase
- **CRUISE CRYSTAL LAKE** — disabled button with "COMING SOON" label

Styled consistently with existing `/race` UI: Press Start 2P font, gold/dark palette, centered layout.

## Dyno Phase Layout

Top to bottom:
1. **Header:** "URW AUTOMOTIVE" in gold, "DYNO ROOM" in white below
2. **Canvas:** 100% width, ~50% viewport height. Contains:
   - URW logo rendered as 8-bit text/graphic in the background (subtle, dark)
   - Two dyno roller cylinders at the bottom
   - Car side-view pixel art sitting on the rollers
   - Exhaust particle effects behind the car
3. **RPM Gauge:** horizontal bar spanning the width, fills left-to-right during the pull
4. **Controls/Results area:**
   - Before pull: "START DYNO" button
   - During pull: RPM number display
   - After pull: spec results grid
5. **Navigation:** "BACK TO GARAGE" link

## Background Asset: Dyno Room

Generate a static 8-bit pixel art background image of the URW dyno room using the Imagen API (same `generateImage()` function used for car pixel art). This is a **one-time generation** — the image is stored in Supabase storage at `pixel-art/urw-dyno-room.png` and reused for every car.

**Imagen prompt:**
```
8-bit retro pixel art side view of an automotive dyno room interior. Clean white walls,
polished gray concrete floor. A chassis dynamometer (roller dyno) is embedded in the floor
with two large metal rollers visible. On the left side, a dyno computer kiosk/control station
with a monitor showing a graph display. A technician in a dark uniform stands next to the kiosk
holding a clipboard. On the back wall, the text "URW AUTOMOTIVE" is painted in large bold black
letters. Fluorescent ceiling lights. An open garage door on the right side showing daylight outside.
Style like a 1990s DOS racing game. Sharp pixels, no anti-aliasing, authentic retro video game
aesthetic. Side-on view, no perspective distortion.
```

**Aspect ratio:** 16:9

**Generation flow:**
1. On first load of the dyno phase, check if `urw-dyno-room.png` exists in Supabase storage
2. If not, generate it via Imagen and upload
3. Cache the URL in a React ref so it's only fetched once per session

**Fallback:** If generation fails or image isn't available, draw a simple canvas fallback — dark room with "URW AUTOMOTIVE" text and basic rectangles for the dyno.

## Canvas Rendering

The dyno room background image is drawn as the base layer on the canvas. The car sprite, rollers, exhaust, and effects are drawn on top via `requestAnimationFrame`.

### Background Layer
- Draw the pre-generated dyno room image scaled to fill the canvas
- This replaces the plain dark background — gives the scene a real environment

### Dyno Rollers (animated overlay)
- Two circles (radius ~30px) positioned to align with the rollers in the background image
- Semi-transparent dark gray fill with lighter spoke lines that rotate based on current RPM
- Roller rotation speed = `rpm / 1000` radians per frame
- Positioned at bottom-center of the canvas where the dyno sits in the background art

### Car Sprite
- Load the car's `pixelArt` (side view) image
- Position centered on the rollers
- Scale to ~40% of canvas width
- Vibration: vertical offset = `Math.sin(time * freq) * amplitude`
  - Idle: freq=8, amplitude=1px
  - During pull: freq scales 8→20, amplitude scales 1→4px proportional to RPM
  - Peak: freq=25, amplitude=5px for 0.5s then settles

### Exhaust Particles
- Spawn behind the car (left side since car faces right)
- Small circles (2-4px radius), dark gray to light gray
- Drift leftward + slightly upward
- Spawn rate increases with RPM (1/frame at idle → 3/frame at redline)
- Each particle lives ~30 frames, fading alpha to 0
- At high RPM, occasional orange/red particle mixed in

## Audio

Reuse existing `lib/race-audio.ts` functions:
- `initAudio()` — called when entering dyno phase
- `startEngine()` — called when "START DYNO" is pressed
- `updateEngine(rpm, speed)` — called each frame during the pull, RPM from 800→redline
- `stopEngine()` — called when pull completes

New sound for spec reveal: a quick 80Hz square wave pulse, 50ms duration. One per spec line revealed. Implemented inline (simple `OscillatorNode`, no changes to `race-audio.ts` needed).

## Dyno Pull Sequence

Triggered by "START DYNO" button. Total duration: ~8 seconds.

1. **Idle (0-1s):** RPM sits at 800. Gentle vibration. Light exhaust.
2. **Ramp (1-7s):** RPM climbs from 800 to car's redline (from `car.redline` field, default 6500). Smooth ease-in-out curve: `800 + (redline - 800) * easeInOut(t)`. Vibration and exhaust intensity scale linearly with RPM.
3. **Peak (7-8s):** RPM holds at redline for 1 second. Max vibration. Heavy exhaust with orange particles.
4. **Cooldown:** RPM drops to 0 over 0.5s. Engine stops. Vibration stops.
5. **Results:** Spec reveal begins.

## Spec Reveal

After the pull completes, specs appear one at a time, 0.4s apart:

| Spec | Source | Display |
|------|--------|---------|
| Horsepower | `car.hp` | "325 HP" |
| Weight | `car.weight` | "3,200 LBS" |
| Power/Weight | `car.pwr` | "101.6 HP/TON" |
| Quarter Mile | computed via `quarterMileET()` | "13.2s" |
| Trap Speed | computed via `trapSpeedMPH()` | "108 MPH" |

Each number counts up from 0 to final value over 0.3s using `requestAnimationFrame`. Gold color for the number, gray for the label. Arranged in a centered grid, 2-3 columns.

A short 80Hz pulse sound plays when each spec line starts revealing.

## Data Requirements

All data is already available from the existing `/api/race` response and the physics functions in `app/race/page.tsx`:
- `car.hp`, `car.weight`, `car.pwr` — direct fields
- `car.redline` — for RPM target
- `car.pixelArt` — side view image URL
- `quarterMileET()`, `trapSpeedMPH()` — already defined in the page

No new API endpoints or database changes needed.

## File Changes

| File | Change |
|------|--------|
| `app/race/page.tsx` | Add "action-menu" and "dyno" phases. Add action menu UI after car select. Add dyno canvas + animation + spec reveal. Wire phase transitions. |

Single file change. The `/race` page is already a large single-file component with all phases — this follows the existing pattern.

## Phase Flow (Updated)

```
loading → title → select → action-menu → matchup → countdown → racing → finished
                              ↓
                            dyno → action-menu
```

- Select → car picked → action-menu
- Action menu "DRAG RACE" → picks opponent → matchup (existing flow)
- Action menu "HIT THE DYNO" → dyno phase
- Dyno "BACK TO GARAGE" → action-menu (or select, user's choice)
- Action menu "CRUISE" → disabled/coming soon
