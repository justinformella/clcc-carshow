# Race Page Refactor — Design Spec

## Overview

Extract each mini-game from the monolithic `app/race/page.tsx` (~2200+ lines) into focused component files. Pure extraction — no behavior changes. Also update the Cruise Route 14 button to link to the external racer-classic game.

## File Structure

```
app/race/
  page.tsx                    — Shell: car fetch, phase routing, action menu, car select, title
  components/
    DragRace.tsx              — countdown, racing canvas, finished screen
    DynoRoom.tsx              — dyno idle, pull animation, DynoResults (internal)
    DetailTech.tsx            — detail idle, exterior/interior passes, DetailReveal (internal)
    CarSelect.tsx             — car selection grid
lib/
  race-physics.ts             — quarterMileET, trapSpeedMPH, saeNetHP, physics constants
  race-types.ts               — RaceCar type, TrackSkin type, shared constants (C palette, FONT)
```

## Shared Types and Constants

Export from `lib/race-types.ts`:

```typescript
export type RaceCar = {
  id: string;
  carNumber: number;
  year: number;
  name: string;
  color: string;
  owner: string;
  hp: number;
  weight: number;
  pwr: number;
  displacement: number;
  cylinders: number;
  engineType: string;
  category: string;
  driveType: string;
  bodyStyle: string;
  origin: string;
  era: string;
  production: number;
  redline: number;
  topSpeed: number;
  gears: number;
  trans: string;
  pixelArt: string | null;
  pixelDash: string | null;
  pixelRear: string | null;
  aiImage: string | null;
  flipped: boolean;
};

export const C = {
  bgDark: "#0d0d1a",
  bgMid: "#1a1a2e",
  bgLight: "#2a1a3e",
  gold: "#ffd700",
  goldDark: "#b8860b",
  green: "#00ff00",
  red: "#ff0000",
  white: "#ffffff",
  gray: "#cccccc",
  midGray: "#aaaaaa",
  border: "#333333",
};

export const FONT = "'Press Start 2P', monospace";
```

## Component Interfaces

### DragRace

```typescript
interface DragRaceProps {
  playerCar: RaceCar;
  cars: RaceCar[];
  onBack: () => void;
}
```

Contains: opponent selection (`setupDragRace` logic), matchup screen, countdown, racing canvas with road/scenery rendering, finished screen. All drag race state (opponent, speed, distance, lap, etc.), refs, animation loops, and track skins.

### DynoRoom

```typescript
interface DynoRoomProps {
  playerCar: RaceCar;
  onBack: () => void;
}
```

Contains: dyno idle canvas, pull animation with gear shifts, RPM display, DynoResults component (internal), spec reveal, dyno room background loading. All dyno state (dynoState, rpm, gear, revealCount), refs, and animation loops.

### DetailTech

```typescript
interface DetailTechProps {
  playerCar: RaceCar;
  onBack: () => void;
}
```

Contains: detail idle canvas, grime overlay, scratch-off interaction, exterior/interior passes, shine sweep, DetailReveal component (internal), before/after canvas reveal. All detail state, refs, particle system, and event handlers.

### CarSelect

```typescript
interface CarSelectProps {
  cars: RaceCar[];
  onSelect: (car: RaceCar) => void;
}
```

Contains: car grid, search/filter if any, car card rendering with pixel art.

## Physics Functions

Move to `lib/race-physics.ts`:

```typescript
export function saeNetHP(advertisedHP: number, year: number): number;
export function quarterMileET(hp: number, weight: number, year: number, trans: string, gears: number): number;
export function trapSpeedMPH(hp: number, weight: number, year: number): number;
```

These are pure functions with no React dependencies.

## Page Shell (page.tsx)

What remains:

- Imports all components
- `RacePageWrapper` with Suspense
- `RacePage` component with:
  - Phase state: `"loading" | "title" | "select" | "action-menu"`
  - Car fetching from `/api/race`
  - `playerCar` state
  - `activeGame` state: `null | "drag" | "dyno" | "detail"` — replaces mini-game phases
  - Title screen JSX
  - Car select: renders `<CarSelect>`
  - Action menu JSX with 4 buttons
  - Game routing: renders the active game component when `activeGame` is set

### Phase Flow

```
loading → title → select → action-menu
                                ↓
                    activeGame="drag"   → <DragRace onBack={backToMenu} />
                    activeGame="dyno"   → <DynoRoom onBack={backToMenu} />
                    activeGame="detail" → <DetailTech onBack={backToMenu} />
                    CRUISE ROUTE 14     → window.location (external link)
```

## Cruise Route 14 Button

The action menu CRUISE ROUTE 14 button navigates to the external racer-classic game:

```tsx
<button onClick={() => {
  window.location.href = `/games/racer-classic/v5.carshow.html?car=${playerCar.id}`;
}} style={...}>
  CRUISE ROUTE 14
</button>
```

No phase, no component — just a link to the existing game with the car's registration UUID.

## Migration Rules

1. **Pure extraction** — no behavior changes. Cut and paste, fix imports.
2. **Each component is self-contained** — owns its state, refs, effects, and JSX.
3. **Audio** — each component imports directly from `@/lib/race-audio`.
4. **Asset URLs** — each component defines its own asset URL constants (DYNO_ROOM_URL in DynoRoom, DETAIL_BAY_URL in DetailTech, etc.).
5. **Styles** — `pageStyle`, `goldBtnStyle`, `pixelBtnStyle` move to `race-types.ts` as shared exports.
6. **No new features** — this is purely structural.

## File Change Summary

| File | Change |
|------|--------|
| `app/race/page.tsx` | Gut to shell: phase routing, car fetch, action menu, title, select delegation |
| `app/race/components/DragRace.tsx` | New: extract all drag race logic |
| `app/race/components/DynoRoom.tsx` | New: extract all dyno logic + DynoResults |
| `app/race/components/DetailTech.tsx` | New: extract all detail logic + DetailReveal |
| `app/race/components/CarSelect.tsx` | New: extract car select grid |
| `lib/race-types.ts` | New: RaceCar type, C palette, FONT, shared styles |
| `lib/race-physics.ts` | New: physics functions (saeNetHP, quarterMileET, trapSpeedMPH) |
