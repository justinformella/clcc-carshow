# Ivy Hall Smoke Show — Design Spec

## Overview

Add a "Smoke Show" mini-game to the arcade, sponsored by Ivy Hall dispensary. The player's car pulls up to the Ivy Hall storefront, a pixel character gets out, goes inside, comes back, gets in the car, then the player mashes a button to do a burnout. Higher RPM = more tire smoke. The car peels out when done.

## Page Location

New phase within the existing arcade page — `activeGame: "smokeshow"`. New component at `app/arcade/components/SmokeShow.tsx`. Follows the same pattern as DynoRoom and DetailTech.

## Action Menu

Add a new button to the action menu:

- **SMOKE SHOW AT IVY HALL** — enters smoke show phase

## Component Interface

```typescript
interface SmokeShowProps {
  playerCar: RaceCar;
  onBack: () => void;
}
```

## Game Flow

### Phase 1: Arrival (auto, ~3s)
- Ivy Hall 8-bit building as background (`pixel-art/8bit/ivy-hall.png`)
- Car enters from left side of canvas, drives to center, stops in front of building
- Engine idle sound plays on arrival

### Phase 2: Ivy Hall Visit (auto, ~5s)
- Driver sprite (small pixel character) exits car from driver side
- Character walks right toward building entrance (~1.5s walk)
- Character enters building (disappears at door)
- Pause (~2s)
- Character walks back out of building
- Character walks left back to car, gets in
- Car door closes

### Phase 3: Burnout (interactive, ~8s max)
- "TAP TO BURN OUT" prompt appears (blinking)
- Player mashes spacebar / taps screen rapidly
- Each tap increases RPM (starts at idle 800, each tap adds ~200-400 RPM)
- RPM decays slowly between taps (~50 RPM/frame) so you have to keep mashing
- Engine audio: reuse `updateEngine(rpm, speed)` from race-audio, RPM drives pitch
- Tire smoke particles spawn from rear tires:
  - Low RPM (< 3000): occasional small gray wisps
  - Mid RPM (3000-5000): steady medium smoke clouds
  - High RPM (5000-redline): heavy dense smoke filling bottom half of screen
  - At redline: smoke is thick, orange/hot particles mixed in
- Rear tires show spinning animation (rotating lines/spokes)
- RPM gauge bar at bottom of screen (same style as dyno)
- Tire screech sound: continuous filtered white noise, volume scales with RPM
- Auto-ends after 8 seconds OR when player hits redline and holds for 1 second

### Phase 4: Launch (auto, ~2s)
- Car rockets off screen to the right
- Trailing thick smoke cloud behind
- Engine roar peaks then fades
- Tire screech fades

### Phase 5: Score (reveal)
- Smoke clears
- Score based on peak RPM as percentage of redline: `Math.round((peakRpm / redline) * 100)`
- Display: "{score}% SMOKE SHOW"
- Labels:
  - 90-100%: "LEGENDARY BURNOUT" (gold, sparkle particles)
  - 70-89%: "SOLID SMOKE SHOW" (gold)
  - 50-69%: "DECENT BURNOUT" (white)
  - Below 50%: "WEAK" (gray)
- "BACK TO GARAGE" link
- Ivy Hall branding visible

## Canvas Layout

Full canvas (800x450):
- Background: Ivy Hall 8-bit building image, scaled to fill
- Car: side-view pixel art, positioned at ground level
- Ground line at ~85% of canvas height
- Smoke particles: spawn at rear tire position, drift left and upward
- RPM gauge: bottom of canvas, same style as dyno

## Sprites

### Driver Character
Generate a simple 16x32 pixel art character sprite sheet via Imagen. One-time generation stored in Supabase at `pixel-art/8bit/driver-sprite.png`.

**Imagen prompt:**
```
8-bit retro pixel art sprite sheet of a small person walking, side view. Four frames of a walking animation arranged horizontally in a single row. The character is about 16 pixels wide and 32 pixels tall. Simple design: dark pants, light shirt, dark hair. Style like a 1990s DOS game character or early Pokemon NPC. Black background. Sharp pixels, no anti-aliasing.
```

**Aspect ratio:** 4:1

The sprite is drawn at the appropriate position and frame during the walk sequence. Frame advances every 8 canvas frames.

**Fallback:** If sprite generation fails, draw a simple colored rectangle (8x16) as the character.

### Walk Sequence
- Exit car: character appears at car's driver door position
- Walk right: 4-frame walk cycle, move ~2px per frame toward building entrance
- Enter building: character reaches door x-position, disappears
- Exit building: character appears at door, faces left
- Walk left: same walk cycle mirrored, move toward car
- Enter car: character reaches car door position, disappears

## Audio

Reuse from existing race-audio system:
- `initAudio()` — on phase enter
- `startEngine()` — when car arrives
- `updateEngine(rpm, speed)` — each frame during burnout, RPM from taps
- `stopEngine()` — after launch

New sounds (inline OscillatorNode):
- **Tire screech:** Filtered white noise, continuous during burnout. Volume and filter frequency scale with RPM. Start on first tap, stop on launch.
- **Launch whoosh:** Quick frequency sweep down (400Hz→100Hz) over 0.3s when car launches.
- **Score reveal:** Reuse 80Hz square wave pulse from dyno.

## Smoke Particle System

Same architecture as dyno exhaust and detail sparkles:

```typescript
type SmokeParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  hot: boolean;
};
```

- Spawn at rear tire position (left side of car if facing right, right if flipped)
- `vx`: drift leftward (-1 to -3), opposite of car facing direction
- `vy`: drift upward (-0.5 to -2)
- `radius`: 3-8px, grows slightly over lifetime
- `life`: 40-80 frames
- Color: `#888` to `#bbb` (gray smoke), hot particles `#ff6622`
- Alpha fades to 0 over lifetime
- Spawn rate per frame: `Math.floor(rpm / 1000)` particles (0 at idle, 6+ at redline)

## Interaction

### Desktop
- `keydown` spacebar: increment RPM
- Can also click/tap the canvas

### Mobile
- Tap anywhere on canvas: increment RPM
- Large "TAP!" overlay button below canvas for easy mobile tapping

## RPM Mechanics

- Start: 800 RPM (idle)
- Each tap: +200 to +400 RPM (randomized for feel)
- Decay: -50 RPM per frame (~3000 RPM/sec decay) when not tapping
- Cap: car's `redline` value (from RaceCar data)
- Peak tracking: store highest RPM reached for scoring

## Background Asset

Use existing `pixel-art/8bit/ivy-hall.png` (already uploaded to Supabase).

## API Endpoint

New endpoint to generate the driver sprite:

`POST /api/registrations/pixel-art/generate-smoke-show`

Generates the driver sprite sheet if it doesn't exist. Same pattern as generate-dyno-room and generate-detail-bay.

## File Changes

| File | Change |
|------|--------|
| `app/arcade/components/SmokeShow.tsx` | New component: full smoke show mini-game |
| `app/arcade/page.tsx` | Add "smokeshow" to ActiveGame type, add button to action menu, import and route to SmokeShow |
| `app/api/registrations/pixel-art/generate-smoke-show/route.ts` | New endpoint: generate driver sprite sheet |

## Ivy Hall Branding

- Header: Ivy Hall 8-bit logo from sponsor record (`pixel-art/8bit/sponsor-{id}.png`) + "IVY HALL" text
- Building is the gameplay backdrop
