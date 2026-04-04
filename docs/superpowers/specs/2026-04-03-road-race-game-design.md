# Road Race Game — Design Spec

## Overview

A top-down 8-bit road racing game built in Phaser 3, replacing the current `/arcade` RaceScene. Players race their car show vehicles through real Crystal Lake, IL locations in point-to-point sprints against 3 AI opponents. Each car has unique top-down sprites, cockpit HUD, exhaust/tire effects, and engine audio.

## Architecture

### Phase 1: Standalone at /arcade
- Replace RaceScene, physics.ts, and road.ts inside `/arcade`
- Keep working scenes: BootScene, TitleScene, SelectScene, MatchupScene
- `/race` remains untouched

### Phase 2: Integration with /race (future)
- `/race` car picker adds a "Drag Race" / "Road Race" mode selector after car selection
- `PhaserGame.tsx` accepts optional `selectedCar` prop — if provided, skips Title/Select and goes to TrackSelectScene → RaceScene
- Standalone `/arcade` mode continues to work with its own select flow

### File Plan

**Delete:**
- `components/arcade/scenes/RaceScene.ts` (853 lines — pseudo-3D, gutted)
- `components/arcade/road.ts` (220 lines — pseudo-3D road renderer)
- `components/arcade/horizon.ts` (39 lines — pseudo-3D horizon)
- `components/arcade/physics.ts` (345 lines — drag race physics, not applicable)

**Keep as-is:**
- `components/arcade/PhaserGame.tsx` (modify to accept optional `selectedCar` prop + add TrackSelectScene)
- `components/arcade/scenes/BootScene.ts` (67 lines — loads car data from API)
- `components/arcade/scenes/TitleScene.ts` (84 lines — title screen)
- `components/arcade/scenes/SelectScene.ts` (160 lines — car picker grid)
- `components/arcade/scenes/MatchupScene.ts` (182 lines — pre-race comparison, adapt for 4 cars)

**New files:**
- `components/arcade/scenes/TrackSelectScene.ts` — pick from 3 tracks
- `components/arcade/scenes/RaceScene.ts` — new top-down racing game loop
- `components/arcade/topdown-physics.ts` — 2D car physics (acceleration, braking, steering, drift, friction)
- `components/arcade/track.ts` — track data format, tile rendering, collision boundaries
- `components/arcade/tracks/lakefront.ts` — Lakefront Sprint track data
- `components/arcade/tracks/downtown.ts` — Downtown Dash track data
- `components/arcade/tracks/route14.ts` — Route 14 Blitz track data
- `components/arcade/ai.ts` — AI opponent driving behavior
- `components/arcade/hud.ts` — cockpit HUD overlay system
- `components/arcade/effects.ts` — exhaust trails, tire marks, drift smoke
- `components/arcade/race-audio.ts` — keep existing, extend with per-car engine profiles

## Scene Flow

```
BootScene (load car data from /api/race, load track assets)
    ↓
TitleScene ("CLCC ARCADE" — ENTER GARAGE)
    ↓
SelectScene (pick your car from the garage grid)
    ↓
TrackSelectScene [NEW] (pick from 3 Crystal Lake tracks)
    ↓
MatchupScene (show your car + 3 AI opponents, track preview)
    ↓
RaceScene [NEW] (top-down point-to-point race)
    ↓
ResultsScreen (overlay within RaceScene — times, placements)
    ↓
Back to TrackSelectScene or SelectScene
```

When `selectedCar` prop is provided (Phase 2 integration):
```
BootScene → TrackSelectScene → MatchupScene → RaceScene
```

## Game Mechanics

### Controls
- **Accelerate:** UP arrow / W / hold SPACE
- **Brake/Reverse:** DOWN arrow / S
- **Steer:** LEFT/RIGHT arrows / A/D
- **Touch:** Virtual joystick (left side) + accelerate/brake buttons (right side)

### Top-Down Physics
- Car has position (x, y), rotation (angle), and velocity (speed + direction)
- **Acceleration:** Applies force in the direction the car faces. Rate varies by car HP/weight ratio.
- **Steering:** Rotates the car. Steering effectiveness scales with speed — slow = tight turns, fast = wide arcs. This naturally creates skill-based cornering.
- **Braking:** Decelerates. At high speed + sharp turn = drift (rear slides out). Visual tire marks + smoke.
- **Friction:** Road surface slows car when not accelerating. Off-road (grass/dirt) has much higher friction + speed penalty.
- **Collision with walls:** Bounce + speed loss. Collision with other cars: both deflect, minor speed loss.
- **Max speed:** Derived from car stats. Each car feels different — heavy muscle car has high top speed but slow steering; light import is nimble but lower top speed.

### Car Stats → Gameplay Feel

| Stat | Affects |
|------|---------|
| HP/Weight ratio | Acceleration rate, top speed |
| Weight | Momentum (harder to stop/turn at speed), collision mass |
| Drivetrain (RWD/FWD/AWD) | Drift behavior, traction out of corners |
| Era/Category | Visual exhaust style, engine audio profile |

### AI Opponents
- 3 AI cars selected randomly from the garage (excluding player's pick)
- AI follows a pre-computed path of waypoints along the track centerline
- **Difficulty variance:** Each AI car gets a skill modifier (0.85–1.0) affecting how tightly they follow the racing line and their throttle management
- AI respects car stats — a heavy truck AI is slower but harder to bump off line
- AI avoids other cars with basic steering adjustments
- No rubber-banding — if you're faster, you win. Car stats and driving skill determine outcome.

### Race Format
- **Point-to-point sprint** — start line to finish line, no laps
- **Rolling start:** All 4 cars lined up in a 2×2 grid, countdown, go
- **Track scrolls** with the player's car — camera follows player, locked to center
- **Minimap** in corner showing full track outline + car positions
- **Race length:** 60–120 seconds depending on track

## Tracks

All tracks start near Redline Motor Condos (Teckler Blvd, Crystal Lake, IL).

### Track 1: Lakefront Sprint
- **Route:** Teckler Blvd → Route 14 → Crystal Lake Ave → Dole Ave → Lakeshore Drive → Main Beach
- **Palette:** Sunset / golden hour. Warm oranges, lake reflections, long shadows.
- **Scenery:** Industrial start, tree-lined residential transition, lakefront finish with water, Dole Mansion silhouette, park benches, fishing pier
- **Character:** The intro track. Medium width roads, one sharp turn onto Dole Ave, gentle curves. Forgiving.
- **Length:** ~60 seconds

### Track 2: Downtown Dash
- **Route:** Route 14 → Williams Street → Crystal Lake Ave → past Raue Center → historic downtown grid → Virginia Street
- **Palette:** Night. Dark blue sky, warm streetlamp pools, neon shop signs, theater marquee glow.
- **Scenery:** Brick storefronts, the 1929 Raue Center marquee, café tables, parked cars, crosswalks, street lamps
- **Character:** The technical track. Narrow streets, tight 90° turns through the grid, parked cars as obstacles. Rewards precision.
- **Length:** ~75 seconds

### Track 3: Route 14 Blitz
- **Route:** Teckler Blvd → east on Route 14 (Northwest Highway) → commercial corridor → finish near Randall Road
- **Palette:** Late night. Dark sky, bright commercial signage, headlight glow on wet asphalt.
- **Scenery:** Strip malls, parking lots, neon signs, fast food joints, delivery trucks, traffic lights
- **Character:** The speed track. Wide 4-lane road, long straights, but cross traffic at intersections and delivery trucks to dodge. Highest top speeds.
- **Length:** ~90 seconds

### Track Data Format
Each track is defined as:
- **Tile grid:** 2D array of tile types (road, grass, sidewalk, water, building, etc.)
- **Path waypoints:** Ordered list of (x, y) points defining the route from start to finish (used for AI, minimap, and camera)
- **Spawn points:** 4 starting positions in 2×2 grid
- **Finish line:** Position + orientation
- **Scenery objects:** List of positioned decorative sprites (trees, lamps, signs, buildings) with depth sorting
- **Collision boundaries:** Polygons for buildings, walls, water — cars bounce off these

## Car Personality Systems

### A. High-Detail Top-Down Sprites
- Each car in the garage gets a unique 32×48px (or similar) top-down pixel art sprite
- Sprites show actual body shape: hood scoops, spoilers, convertible tops, truck beds, racing stripes
- Colored to match the car's actual color from the database
- Use Phaser's built-in sprite rotation on a single top-down sprite (simpler than pre-rendering 16+ angles, and Phaser handles it well at pixel art scale)
- **Asset generation:** Generate via AI image tool or hand-pixel. Store in Supabase storage alongside existing pixelArt/pixelDash/pixelRear fields. New field: `pixelTopDown`

### B. Cockpit HUD Overlay
- Semi-transparent strip along the bottom 15-20% of screen
- Shows per-car dashboard elements:
  - **Tachometer** — round analog gauge for classics, digital bar for moderns, minimal screen for EVs
  - **Speedometer** — matching style to tach
  - **Gear indicator** — current gear
  - **Steering wheel silhouette** — rotates with player input
- Interior color tinted to match car era (orange/wood for 60s-70s, grey for 80s-90s, carbon for modern)
- Rendered as a Phaser overlay group, swapped per car selection

### C. Signature Exhaust & Tire Effects
- **Exhaust:**
  - V8 muscle cars: dark grey puffs from dual exhaust points, bursts on acceleration
  - Turbocharged: blue-white flame pops on deceleration (anti-lag style)
  - EVs: clean blue particle glow trail, no smoke
  - Diesel trucks: thick dark clouds on hard acceleration
- **Tire marks:**
  - RWD: rear tires leave marks on drift, fishtail pattern
  - FWD: front tires scrub on hard turns
  - AWD: all 4 tires leave light marks, more controlled drift
- **Drift smoke:** White particle puff clouds when car is sliding (drift angle > threshold)
- All effects are Phaser particle emitters, configured per car category

### D. Per-Car Engine Audio
- Extend existing `race-audio.ts` Web Audio system
- **V8:** Low-frequency sawtooth (80-120 Hz base), rich harmonics, burble on decel
- **Inline-4 Turbo:** Higher frequency (200-300 Hz base), triangle wave, blow-off valve pop on gear shift
- **Flat/Boxer:** Distinctive uneven pulse pattern
- **EV:** Sine wave whir (400-800 Hz), ascending with speed, quiet
- **Diesel:** Low square wave (60-80 Hz), rough, heavy
- Engine pitch scales with speed. Volume scales with throttle input.
- Opponent cars have quieter, distance-attenuated versions of their engine sound

## Visual Style

- **Resolution:** Game renders at native screen resolution (as current /arcade does) but all sprites and tiles use an 8-bit pixel art aesthetic with `image-rendering: pixelated`
- **Tile size:** 32×32 pixel tiles for the track (good balance of detail and performance)
- **Camera:** Follows player car, centered. Smooth lerp follow (not instant snap).
- **Lighting:** Per-track palette. Sunset warm tones, night with light pools, late-night neon glow.
- **Road texture:** Asphalt with lane markings, crosswalks, manhole covers. Varies by track section.
- **Buildings:** Simple colored rectangles with lit window details, signs, awnings. Not full 3D — pixel art flat tops viewed from above.
- **Trees:** Circular canopy sprites with shadow underneath. Vary size and shade.
- **Water (lakefront track):** Animated blue tiles with subtle wave pattern and reflection shimmer.

## HUD / UI During Race

- **Cockpit overlay:** Bottom 15-20% (see Car Personality section)
- **Position indicator:** "2nd / 4" in top-left
- **Minimap:** Top-right corner, ~120×120px. Shows full track outline, colored dots for all 4 cars.
- **Timer:** Top-center, elapsed race time
- **Speed:** Shown in cockpit HUD tachometer/speedometer

## Results Screen

- Overlay on top of the frozen race view
- **Placement:** 1st through 4th with finish times
- **Your car** highlighted with stats (top speed reached, drift count, time)
- **Buttons:** "RACE AGAIN" (same track/cars), "NEW TRACK" (back to TrackSelectScene), "NEW CAR" (back to SelectScene)

## What We're NOT Building (Scope Limits)

- No power-ups or items (that's a future layer, not v1)
- No multiplayer (single player vs AI only)
- No track editor (tracks are hand-authored data files)
- No car upgrades or tuning
- No leaderboards (future feature)
- No destruction/damage model
- No weather system (palette is fixed per track)
