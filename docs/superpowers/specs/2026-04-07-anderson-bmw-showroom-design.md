# Anderson BMW Showroom — Design Spec

## Overview

A trivia/guessing mini-game sponsored by Anderson BMW. The player visits the Anderson BMW showroom and is shown a series of BMW models spanning classic to current. For each car, they can sit inside and view the interior, then guess the horsepower and original MSRP. Closer guesses earn more points. At the end, they get a score and rating.

## Concept

"You walk into Anderson BMW. The salesperson challenges you: how well do you really know BMWs?" The game tests car knowledge in a fun, low-pressure way while showcasing real BMW models and the Anderson BMW brand. Between questions, players can hop in the driver's seat for an interior view.

## Page Location

New phase within the existing arcade page — `activeGame: "bmwshowroom"`. New component at `app/arcade/components/BmwShowroom.tsx`. Follows the same pattern as DynoRoom, DetailTech, and SmokeShow.

## Action Menu

Add a new button to the action menu:

- **TAKE A DRIVE TO ANDERSON BMW** — enters showroom phase
- Icon: `icon-anderson-bmw` (8-bit pixel art of Anderson BMW logo/building)

## Component Interface

```typescript
interface BmwShowroomProps {
  playerCar: RaceCar;
  onBack: () => void;
}
```

## BMW Models & Data

### Cars to Feature

6 BMW models spanning classic to current:

1. **1974 BMW 2002** — Classic, the car that put BMW on the map in America
2. **1987 BMW M6 (E24)** — First-generation M6, shark-nose coupe
3. **2003 BMW M3 (E46)** — The iconic naturally aspirated M3
4. **2025 BMW M2 CS (G87)** — Latest compact M car, track-focused
5. **2025 BMW XM Label Red (G09)** — Hybrid performance SUV, 738 HP
6. **2025 BMW M5 Touring (G99)** — Performance wagon, new hybrid powertrain

### Spec Data Source

Hardcoded spec data — most reliable. Create a static array of BMW models with verified specs. Simpler, no API dependency, guaranteed accuracy. Use AI API calls to research and verify accurate specs for each model.

### Spec fields per car:

```typescript
type BmwModel = {
  name: string;           // "M2 CS"
  fullName: string;       // "2025 BMW M2 CS"
  year: number;           // 2025
  hp: number;             // 523
  torque: number;         // 479 lb-ft
  msrp: number;           // 74,900
  topSpeed: number;       // 180 mph
  engine: string;         // "3.0L Twin-Turbo I6"
  drivetrain: string;     // "RWD" or "AWD"
  weight: number;         // 3,840 lbs
  pixelArt: string;       // URL to 8-bit pixel art (3/4 showroom angle)
  pixelInterior: string;  // URL to 8-bit interior/dashboard view
};
```

## Asset Generation

### BMW Model Pixel Art (6 exterior + 6 interior = 12 images)

**Exterior:** All car pixel art should be rendered at a **3/4 front showroom angle** (not side profile) — as if the car is on display in a dealership, angled toward the viewer.

**Interior:** Dashboard/cockpit view from the driver's seat perspective — steering wheel, gauges, center console, windshield view. Same 8-bit pixel art style.

For each BMW model:

1. **Source a reference photo** — Use a clean press/stock photo of each model at a 3/4 angle, plus an interior photo
2. **Generate 8-bit pixel art** — Use the existing `generateImage()` pipeline (Google Imagen) with prompts like:
   - Exterior: "8-bit pixel art of a [year] BMW [model] at a 3/4 front angle, as if displayed in a car dealership showroom, [color], retro video game sprite style, clean transparent background, 16-bit era aesthetic"
   - Interior: "8-bit pixel art interior view from driver's seat of a [year] BMW [model], dashboard, steering wheel, gauges, center console, retro video game style, 16-bit era aesthetic"
3. **Remove background** (exterior only) — Run through the existing `removeBackground()` function (Modal rembg)
4. **Store in Supabase** — Upload to `pixel-art/8bit/bmw-{model-slug}.png` and `pixel-art/8bit/bmw-{model-slug}-interior.png`

Model slugs: `bmw-2002`, `bmw-e24-m6`, `bmw-e46-m3`, `bmw-m2-cs`, `bmw-xm`, `bmw-m5-touring`

### Anderson BMW Assets

**Reference photos needed from user:** Interior and exterior photos of the real Anderson BMW dealership. These will be used as visual reference when generating the 8-bit versions to ensure accuracy (building shape, signage, showroom layout).

1. **Anderson BMW Exterior** — 8-bit pixel art of the Anderson BMW building
   - Generated from reference photo of the real dealership
   - Used as background during the arrival/driving phase (same role as `ivy-hall.png` in SmokeShow)
   - Store as `pixel-art/8bit/anderson-bmw-exterior.png`

2. **Anderson BMW Showroom Interior** — 8-bit background for the quiz rounds
   - Generated from reference photo of the real showroom interior
   - Showroom floor, glass windows, BMW branding, modern luxury feel
   - Store as `pixel-art/8bit/anderson-bmw-showroom.png`

3. **Anderson BMW Logo** — 8-bit pixel art version of the Anderson BMW logo
   - Generated from the actual logo
   - Store as `pixel-art/8bit/sponsor-anderson-bmw.png`

4. **Game Menu Icon** — Smaller icon for the action menu button
   - Store as `pixel-art/8bit/icon-anderson-bmw.png`

## Game Flow

### Phase 1: Arrival (auto, ~5s)

- Anderson BMW building/showroom as background (same approach as Ivy Hall)
- Player's car enters from the left, drives to center, stops in front of the dealership
- Engine idle sound on arrival
- Driver sprite exits car, walks toward the dealership entrance, enters building
- Reuse the same driver animation system from SmokeShow (exitCar → walkToFront → walkToDoor → inside)
- Text: "VISITING ANDERSON BMW..."

### Phase 2: Welcome (auto, ~2s)

- Scene transitions to interior showroom view
- Anderson BMW logo displayed at top
- Text: "WELCOME TO ANDERSON BMW — HOW WELL DO YOU KNOW YOUR BMWS?"
- Auto-advance to first car

### Phase 3: Showroom (6 cars × 2 questions = 12 rounds)

For each car, the flow is:

#### 3a. Car Reveal

1. **Show the car** — Display 8-bit pixel art of the BMW at the 3/4 showroom angle on the showroom floor
2. **Show the name** — e.g. "2003 BMW M3 (E46)" in gold text
3. **"SIT INSIDE" button** — Player can tap to view the interior

#### 3b. Interior View (optional, player-initiated)

- Tapping "SIT INSIDE" transitions the canvas to the 8-bit interior/dashboard view of that BMW
- Shows the cockpit: steering wheel, gauges, center console
- Player can look around and appreciate the interior
- "GET OUT" button returns to the exterior showroom view and the questions
- This is optional — player can skip straight to answering if they want

#### 3c. Questions (2 per car)

1. **Ask HP** — "GUESS THE HORSEPOWER" (slider: 80–800, step 10)
2. **Player input** — Draggable slider or tap left/right buttons to adjust guess. Confirm with a "LOCK IT IN" button.
3. **Reveal** — Show correct answer with visual feedback:
   - Within 5%: "DEAD ON!" (gold flash, +100 pts)
   - Within 15%: "CLOSE!" (+75 pts)
   - Within 25%: "NOT BAD" (+50 pts)
   - Within 40%: "EHHHH" (+25 pts)
   - Beyond 40%: "WAY OFF" (+0 pts)
   - Show the delta: "You guessed 450 HP — actual: 523 HP"
4. **Brief pause** (~1.5s)
5. **Ask MSRP** — "GUESS THE ORIGINAL MSRP" (slider: $3,000–$200,000, step $1,000)
6. **Same input → reveal → pause flow**
7. **Advance to next car**

### Phase 4: Score Screen

- Total score out of 1200 (6 cars × 2 questions × 100 max)
- Rating label:
  - 1000+: "BMW MASTER TECHNICIAN"
  - 750+: "M POWER ENTHUSIAST"
  - 500+: "SUNDAY DRIVER"
  - 250+: "MAYBE STICK TO TOYOTAS"
  - Below 250: "DO YOU EVEN DRIVE?"
- Anderson BMW logo + "VISIT ANDERSON BMW" link
- "BACK TO GARAGE" button

## UI Design

### Layout

- **Top**: Anderson BMW sponsor logo (small, like Ivy Hall in SmokeShow)
- **Center**: Canvas showing showroom + current BMW model (or interior view when sitting inside)
- **Below canvas**: "SIT INSIDE" / "GET OUT" toggle, question text, slider input, score feedback
- **Bottom**: Running score during game, full results at end

### Interior View

- Full canvas takeover showing the 8-bit dashboard/cockpit
- Car name overlay at top so player knows which car they're in
- "GET OUT" button prominently placed below canvas
- Could add subtle ambient engine idle sound while sitting inside

### Slider Input

Since this needs to work well on mobile:

- Large touch-friendly slider bar (full width, chunky 8-bit style)
- Current value displayed above slider in large pixel font
- Optional: left/right arrow buttons flanking the slider for fine-tuning
- "LOCK IT IN" button below (styled like the ENTER GARAGE gold button)

### Visual Style

- Match existing arcade aesthetic (Press Start 2P font, dark backgrounds, gold accents)
- Showroom background should feel premium but still 8-bit
- Car pixel art displayed on a "showroom floor" (reflective surface effect — simple mirrored opacity below car)
- Correct answer reveals could have a brief particle/confetti effect for high scores

## Audio

- Use existing `startEngine`/`updateEngine` from race-audio for engine rev on each car reveal
- Subtle engine idle when sitting inside a car
- Quick beep/buzz for answer lock-in
- Score-dependent sound on reveal (triumphant for close, sad trombone for way off — or just re-use existing audio patterns)

## Sponsor Integration

- Anderson BMW logo at top of game screen throughout
- "VISIT ANDERSON BMW" link on score screen (links to Anderson BMW website)
- Anderson BMW mentioned in action menu label
- Showroom background branded as Anderson BMW

## Implementation Notes

### Asset Generation Script/API

Create an API route or script to generate BMW assets:

```
POST /api/arcade/generate-bmw-assets
```

This would:
1. Loop through BMW model list
2. For each: generate exterior pixel art → remove background → upload to Supabase
3. For each: generate interior pixel art → upload to Supabase
4. Generate showroom background → upload
5. Generate Anderson BMW logo → upload

### Mobile Considerations

- Slider must be touch-friendly (min 44px touch target)
- Canvas should be responsive (same pattern as other games: `width: "100%", maxWidth: "800px"`)
- Question text needs to be readable at small sizes
- "SIT INSIDE" / "GET OUT" buttons need to be large enough for mobile taps
- Consider tap-to-increment as alternative to slider on very small screens

### Data Structure

```typescript
const BMW_MODELS: BmwModel[] = [
  {
    name: "2002",
    fullName: "1974 BMW 2002",
    year: 1974,
    hp: 100,
    torque: 106,
    msrp: 4500,       // original MSRP
    topSpeed: 107,
    engine: "2.0L Inline-4",
    drivetrain: "RWD",
    weight: 2360,
    pixelArt: "",
    pixelInterior: "",
  },
  {
    name: "M6",
    fullName: "1987 BMW M6 (E24)",
    year: 1987,
    hp: 256,
    torque: 243,
    msrp: 56000,       // original MSRP
    topSpeed: 156,
    engine: "3.5L Inline-6",
    drivetrain: "RWD",
    weight: 3440,
    pixelArt: "",
    pixelInterior: "",
  },
  {
    name: "M3",
    fullName: "2003 BMW M3 (E46)",
    year: 2003,
    hp: 333,
    torque: 262,
    msrp: 47000,
    topSpeed: 155,
    engine: "3.2L Inline-6",
    drivetrain: "RWD",
    weight: 3415,
    pixelArt: "",
    pixelInterior: "",
  },
  {
    name: "M2 CS",
    fullName: "2025 BMW M2 CS",
    year: 2025,
    hp: 523,
    torque: 479,
    msrp: 99900,
    topSpeed: 180,
    engine: "3.0L Twin-Turbo I6",
    drivetrain: "RWD",
    weight: 3615,
    pixelArt: "",
    pixelInterior: "",
  },
  {
    name: "XM Label Red",
    fullName: "2025 BMW XM Label Red",
    year: 2025,
    hp: 738,
    torque: 590,
    msrp: 185000,
    topSpeed: 168,
    engine: "4.4L Twin-Turbo V8 Hybrid",
    drivetrain: "AWD",
    weight: 6062,
    pixelArt: "",
    pixelInterior: "",
  },
  {
    name: "M5 Touring",
    fullName: "2025 BMW M5 Touring",
    year: 2025,
    hp: 717,
    torque: 738,
    msrp: 120675,
    topSpeed: 190,
    engine: "4.4L Twin-Turbo V8 Hybrid",
    drivetrain: "AWD",
    weight: 5390,
    pixelArt: "",
    pixelInterior: "",
  },
];

const QUESTION_TYPES = [
  { key: "hp", label: "GUESS THE HORSEPOWER", unit: "HP", min: 80, max: 800, step: 10 },
  { key: "msrp", label: "GUESS THE ORIGINAL MSRP", unit: "$", min: 3000, max: 200000, step: 1000, format: "currency" },
];
```

## Build Sequence

1. **Verify BMW specs** — Research and verify accurate specs for each model via AI API calls
2. **Generate assets** — BMW exterior pixel art (6), interior pixel art (6), showroom background, Anderson BMW logo/exterior
3. **Upload to Supabase** — All assets to `pixel-art/8bit/` bucket
4. **Build component** — `BmwShowroom.tsx` with game logic including interior view toggle
5. **Wire into arcade** — Add to `ActiveGame` type, action menu, and switch statement in `page.tsx`
6. **Add to 8bit page** — Add Anderson BMW as sponsor reference in Arcade8Bit.tsx sponsor line
7. **Test on mobile** — Slider usability and interior view toggle are critical
