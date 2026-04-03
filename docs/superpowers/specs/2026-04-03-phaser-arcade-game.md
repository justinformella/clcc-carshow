# Phaser Arcade Game — Full Design Spec

**Date:** 2026-04-03
**Status:** Draft
**Route:** `/arcade` (new, does not replace `/race`)

## Overview

Port the CLCC drag racing game from a raw canvas/React implementation to Phaser 3, hosted at `/arcade`. The current `/race` page stays untouched. The Phaser version upgrades the visual style from basic canvas row rendering to an F-Zero/Super Mario Kart inspired Mode 7 pseudo-3D perspective with parallax backgrounds, sprite-based cars, particle effects, and proper scene management.

The game uses the same data source (`/api/race`) and the same quarter-mile physics model (SAE Net HP, drivetrain factors, per-car redline/gears/top speed) as the current version.

---

## Sub-Project 1: Core Engine + Track Scene

**Goal:** Phaser 3 running inside Next.js at `/arcade` with a Mode 7-style scrolling road and a static player car sprite.

### Technical Setup

- **Install:** `phaser` npm package
- **Route:** `app/arcade/page.tsx` — a client component that mounts the Phaser game into a div
- **Layout:** `app/arcade/layout.tsx` — metadata, Press Start 2P font, dark background (matches 8-bit layout)
- **Game config:** 800×600 base resolution, `Phaser.SCALE.FIT` to fill the container, pixel art rendering mode (`pixelArt: true` in game config)
- **Scene structure:** Phaser scenes are classes. Sub-project 1 creates only `RaceScene`

### Mode 7 Track Rendering

Instead of drawing the road row-by-row on a 2D canvas, use Phaser's built-in camera and texture capabilities:

- Create a road texture (a repeating pixel art strip with lane markings, shoulders, and center line) as a tileable image
- Render it on a large plane, then use Phaser's camera perspective transform to create the vanishing-point illusion
- Alternative simpler approach: use a pre-rendered road sprite that scrolls vertically, with scale/position tricks for the pseudo-3D effect. This is how many SNES games actually worked — not true Mode 7, but a layered sprite trick.

**Recommended approach:** The layered sprite approach is more reliable in Phaser 3 (true Mode 7 requires shader work). Stack 3 layers:
1. **Sky layer** — static or slow-scroll gradient with parallax clouds/stars
2. **Horizon layer** — distant scenery (pixel art cityscape/trees) scrolling slowly
3. **Road layer** — a perspective-projected road image that scrolls based on player speed

The road image would be a pre-made pixel art asset (or generated at runtime on an offscreen canvas) showing the road from a first-person driver perspective. Speed is simulated by scrolling this image downward faster.

### Player Car

- A pixel art sprite at the bottom-center of the screen (the dashboard view is replaced by seeing your car from behind, like OutRun or F-Zero)
- The car sprite is the existing `pixelRear` image from the registration data
- Car sways left/right slightly based on steering input (visual only — no lane mechanics in sub-project 1)

### What This Sub-Project Produces

- `/arcade` loads and shows a Phaser game
- A pixel art road scrolls toward the player
- Parallax sky/horizon layers create depth
- A player car sprite sits at the bottom of the screen
- Holding space/up makes the road scroll faster (speed increases)
- No opponent, no physics, no UI — just the visual foundation

---

## Sub-Project 2: Car Physics + Race Mechanics

**Goal:** Port the quarter-mile physics model into Phaser so the race produces realistic times.

### Physics System (as a Phaser plugin or scene method)

Port these from the current `/race` implementation:
- `netHP()` — SAE Gross to Net HP conversion for pre-1972 cars
- `quarterMileET()` — base ET formula with drivetrain factor
- `drivetrainFactor()` — transmission type penalty/bonus
- `calibratePlayer()` — binary search simulation to find correct maxSpeed
- `topSpeedMPH()` / `trapSpeedMPH()` — speed display calculations
- Per-gear speed caps with exponential curve: `0.20 + 0.80 × (gear/total)^1.4`
- RPM climb rate scaled to redline: `redline × 0.004`
- Speed directly proportional to RPM position in gear (no smoothing)
- Auto-shift at 92% of redline, RPM drops to 45% of redline on shift
- Rev limiter cuts acceleration at redline in top gear

### Opponent AI

- Same acceleration curve as current: `oppMaxSpeed × accelCurve × (0.85 + wobble)`
- Opponent reaction time: random 0.15–0.40s delay after green
- Opponent car appears on the track as a sprite that grows/shrinks based on relative position (ahead = smaller toward horizon, behind = larger and sliding off screen)

### Race State Machine

Phaser scenes handle this naturally:
- `CountdownState` → `RacingState` → `FinishState` (within RaceScene)
- Or separate scenes: `CountdownScene` → `RaceScene` → `ResultScene`

### HUD

- Speed (MPH), RPM, Gear displayed as Phaser text objects overlaid on the game
- RPM text turns red near redline (88% of car's redline)
- Position indicator or progress bar showing distance to finish

### What This Sub-Project Produces

- Holding accelerate makes the car go through gears with realistic RPM/speed
- Quarter-mile times match the current game's predictions
- An opponent car sprite is visible on the track
- HUD shows speed, RPM, gear
- Race ends when either car crosses 1000 distance units

---

## Sub-Project 3: UI Scenes

**Goal:** Full game flow from title screen to results, all as Phaser scenes.

### Scene Flow

```
BootScene → TitleScene → SelectScene → MatchupScene → CountdownScene → RaceScene → ResultScene
                                            ↑                                          |
                                            └──────────────────────────────────────────┘
```

### BootScene
- Load all shared assets (fonts, common sprites)
- Fetch car data from `/api/race`
- Show a loading bar
- Transition to TitleScene

### TitleScene
- Redline Motor Condos hero background (the existing pixel art image)
- "CLCC ARCADE" / "WELCOME TO REDLINE MOTOR CONDOS" text
- "ENTER GARAGE" button
- Starts the select screen chiptune music on click (user gesture for audio)
- "BACK TO SITE" link

### SelectScene
- Car grid showing pixel art thumbnails with stats (HP, weight, engine, displacement, drivetrain)
- Dimmed Redline Motor Condos background
- "CLCC ARCADE / Redline Motor Condos / Choose Your Ride" header
- Clicking a car transitions to MatchupScene

### MatchupScene
- P1 vs CPU display with car images, names, stat comparison
- Predicted quarter-mile times shown
- "RACE" and "SHUFFLE" buttons
- "Pick different car" link back to SelectScene

### CountdownScene (or phase within RaceScene)
- Christmas tree: 3 amber lights → green
- Jump detection: holding accelerate during amber = foul + 0.5s penalty
- Foul buzzer sound
- Transition to RaceScene on green

### ResultScene
- Checkered flag flash (1s)
- "YOU WIN" / "YOU LOSE" with car images and times
- Reaction time display (RT) for both player and CPU
- "REMATCH" and "NEW CAR" buttons

### What This Sub-Project Produces

- Complete game flow navigable through Phaser scenes
- All screens from the current game represented
- Scene transitions with pixel-style wipes or fades

---

## Sub-Project 4: Audio + Visual Polish

**Goal:** Port the chiptune audio system and add visual enhancements only possible in Phaser.

### Audio

Port from `lib/race-audio.ts`:
- Countdown beeps (440Hz / 880Hz square waves)
- Engine sound (sawtooth + distortion, frequency mapped to RPM)
- Gear shift sound (frequency sweep)
- Win/lose jingles
- Select screen background music (100 BPM pentatonic)
- Race background music (140 BPM)
- Foul buzzer

Use Phaser's built-in Web Audio support or keep the existing `race-audio.ts` module (it's framework-agnostic, just Web Audio API).

### Visual Polish

- **Track skins** — 4 color palettes (night, dusk, dawn, midnight blue) randomly selected. Applied to the road/sky/horizon layers
- **Parallax layers** — clouds or stars at different scroll speeds
- **Particle effects:**
  - Exhaust puffs from player car (small gray circles emitted behind car, fade and rise)
  - Sparks on gear shift (brief orange particle burst)
  - Confetti on win (colored particles falling from top)
- **Finish line effects:**
  - White screen flash
  - Checkered flag sprite drops in with bounce
  - "FINISH!" text with glow
- **Speed lines** — at high speed, subtle diagonal lines streak across the screen edges for velocity feel
- **Screen shake** — minor camera shake on gear shifts

### What This Sub-Project Produces

- Full audio parity with current game
- Visual effects that make the game feel alive
- Track variety via color skins
- Satisfying feedback on shifts, finish, win/lose

---

## Sub-Project 5: Data Integration + Branding

**Goal:** Connect to the live car data and apply Redline Motor Condos / CLCC branding.

### Data

- Fetch from `/api/race` in BootScene
- Car data includes: name, year, hp, weight, redline, gears, topSpeed, trans, pixelArt, pixelRear, category, engineType, displacement, driveType
- Player car selection stores the full RaceCar object for physics
- Opponent randomly selected from remaining cars

### Pixel Art Sprites

- Player car: `pixelRear` image (viewed from behind on track)
- Opponent car: `pixelRear` image (scaled by distance)
- Car select thumbnails: `pixelArt` image (side profile)
- Fallback: colored rectangle with car number if no pixel art

### Branding

- Title scene: Redline Motor Condos hero background image from Supabase
- Select scene: dimmed Redline background, "CLCC ARCADE / Redline Motor Condos" header
- Marquee-style "★ CLCC ARCADE ★" in gold on relevant scenes
- Track-side banner sprites with "CLCC" and "REDLINE MOTOR CONDOS" that scroll past during the race

### Links

- Navigation between `/arcade` and the main site
- "BACK TO SITE" links on title/select scenes
- The 8-bit page's Arcade section links to `/arcade` instead of `/race`
- The Arcade nav link on the 8-bit page points to `/arcade`

### What This Sub-Project Produces

- The game uses real registered car data and pixel art
- Redline Motor Condos branding throughout
- Proper integration with the rest of the CLCC site

---

## Implementation Order

Each sub-project depends on the previous:

1. **Core Engine + Track** — Phaser boots, road renders, car sprite visible
2. **Physics + Race** — actual drag race with realistic times
3. **UI Scenes** — full game flow from title to results
4. **Audio + Polish** — sound, particles, track skins, effects
5. **Data + Branding** — live car data, pixel art sprites, CLCC/Redline branding

Sub-projects 1-3 could use hardcoded test data (a couple of fake cars). Sub-project 5 connects to the real API. Sub-project 4 can happen in parallel with 5.

## Technology

- **Phaser 3** (latest stable) — game engine
- **Next.js** — host, routing, API
- **TypeScript** — all game code
- **Web Audio API** — chiptune audio (existing module or Phaser's audio)
- No additional game libraries needed — Phaser handles sprites, input, scenes, cameras, particles, text
