# Crystal Lake Track Themes — Design Spec

## Overview

Replace the 4 generic color-palette track skins (Night, Dusk, Dawn, Midnight) with 3 themed tracks based on real Crystal Lake, IL locations. Each track has unique colors, horizon art, and roadside scenery objects — all rendered in the existing pseudo-3D NES/SNES-style engine.

## Tracks

### 1. Lakeside Drive

- **Route:** Lakeshore Drive past Main Beach, along the eastern shore of Crystal Lake
- **Time of day:** Golden hour / dusk
- **Sky:** Warm amber top (`#4a3520`) fading to deep peach (`#d4956b`), no stars
- **Grass:** Rich summer green — grassA `#1a6a1a`, grassB `#2a7a2a`
- **Road:** Warm gray — roadA `#3a3530`, roadB `#4a4540`
- **Shoulders:** White (`#ffffff`) + gold (`#c9a84c`)
- **Lane markers / center line:** Gold (`#ffd700`)
- **Horizon features:** Lake shimmer band (horizontal band of blue/amber on left side of background), tree canopy, distant shore silhouette
- **Scenery objects:** Willow trees, park benches, lamp posts, beach umbrellas, picnic tables, boat dock posts, fishing pier railing, band shell silhouette (large/rare)

### 2. Downtown Williams Street

- **Route:** Williams Street through historic downtown, past the Raue Center and Metra station
- **Time of day:** Night
- **Sky:** Deep navy (`#060820`) to dark charcoal (`#1a1a2a`), stars visible
- **Grass:** Replaced with sidewalk — grassA `#2a2a2a`, grassB `#333333`
- **Road:** Dark asphalt, wet look — roadA `#181820`, roadB `#1e1e28`
- **Shoulders:** Concrete gray (`#666666`) + yellow curb (`#ccaa00`)
- **Lane markers / center line:** White (`#ffffff`)
- **Horizon features:** Warm storefront glow rectangles (amber light windows), building roofline silhouettes of varying heights, Raue Center marquee glow
- **Scenery objects:** Brick building facades (tall, wide), street lamps with warm glow, shop awnings (colored rectangles), parked cars, train crossing gate (appears once near start), Raue Center marquee (large/rare, lit rectangle with "RAUE" text)

### 3. Route 14 Strip

- **Route:** Northwest Highway (Route 14) through the commercial corridor
- **Time of day:** Midnight
- **Sky:** Near-black (`#020208`) to dark purple (`#0a0820`), stars visible
- **Grass:** Dark patchy ground — grassA `#0a1a0a`, grassB `#151a10`
- **Road:** Wide dark blacktop — roadA `#111118`, roadB `#181822`
- **Shoulders:** White (`#cccccc`) + red (`#cc2222`)
- **Lane markers / center line:** Yellow (`#ffcc00`)
- **Horizon features:** Tall pole lights (harsh white dots), sign glow rectangles (red, blue, green commercial signage), flat commercial roofline
- **Scenery objects:** Tall parking lot light poles, gas station canopy (wide flat rectangle), traffic lights on poles, power line poles, store sign rectangles (varied colors — red, blue, yellow), shopping plaza entrance sign (large/rare)

## Data Structure

```typescript
type SceneryItemDef = {
  type: string;         // e.g. "willow-tree", "brick-building", "gas-station"
  color: string;        // primary fill color
  width: number;        // base width in px
  height: number;       // base height in px
  rare?: boolean;       // if true, appears less frequently
};

type HorizonFeature = {
  type: "glow-rect" | "silhouette" | "shimmer-band";
  x: number;            // 0-1 normalized position across width
  width: number;        // 0-1 normalized width
  height: number;       // px above horizon
  color: string;
};

type TrackTheme = RoadColors & {
  id: string;
  name: string;
  subtitle: string;
  scenerySet: SceneryItemDef[];
  mountainProfile: "flat" | "gentle" | "urban";
  horizonFeatures: HorizonFeature[];
};
```

`TRACK_SKINS` array replaced by `TRACK_THEMES: TrackTheme[]`. `pickRandomSkin()` becomes `pickRandomTrack()`.

## Track Selection

- Random selection — each race gets a random track from the 3
- Track is picked in `SelectScene` when the player selects a car
- Stored in Phaser registry alongside car data
- Passed through to `MatchupScene` and `RaceScene`

## Matchup Screen Display

Track name and subtitle shown on the matchup screen between the VS header and car cards:

- Track name: gold color, "Press Start 2P" font, ~16px
- Subtitle: gray color, ~10px, below the name
- Positioned center-aligned above the car comparison cards

## Scenery Rendering

The existing scenery system in `RaceScene.ts` currently creates 36 hardcoded objects (trees, poles, signs) with random z-depth. This changes to:

1. Pull from `theme.scenerySet` instead of hardcoded types
2. Rare items (`rare: true`) get a 15% spawn chance vs 100% for normal items
3. Each item is still drawn as simple geometric shapes (rectangles, triangles, lines) — pixel art aesthetic
4. Same z-depth range (0.08 to 1.0), same parallax scrolling logic
5. Item drawing function uses a switch on `type` to render the appropriate shape

## Background Rendering

`drawBackground()` in `road.ts` changes:

1. Mountain silhouettes adapt based on `mountainProfile`:
   - `"gentle"` — low rolling hills (Lakeside)
   - `"urban"` — blocky building roofline silhouettes (Downtown, Route 14)
   - `"flat"` — minimal elevation (unused for now, available for future tracks)
2. After mountains, draw `horizonFeatures` array — glow rectangles, shimmer bands, silhouettes positioned at the horizon line
3. Tree line rendering adapts: Lakeside gets lush trees, Downtown gets building tops, Route 14 gets sparse with light poles

## File Changes

| File | Change |
|------|--------|
| `components/arcade/road.ts` | Replace `TRACK_SKINS` with `TRACK_THEMES`. Add types. Update `drawBackground()` for horizon features and mountain profiles. Update exports. |
| `components/arcade/RaceScene.ts` | Accept `TrackTheme` instead of `RoadColors`. Swap scenery generation to use `theme.scenerySet`. Update scenery drawing function for new item types. |
| `components/arcade/scenes/MatchupScene.ts` | Display track name/subtitle. Pick random track, store in registry. |
| `components/arcade/scenes/SelectScene.ts` | Pick random track when car selected, store in registry for MatchupScene. |

No new files. No changes to physics, audio, or game flow.
