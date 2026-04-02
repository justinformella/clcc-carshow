# 8-Bit Homepage (/80s)

**Date:** 2026-04-01
**Status:** Approved

## Overview

An alternate version of the homepage at `/80s` styled as an NES/arcade 8-bit video game. Same content and functionality as the main homepage, reskinned with pixel fonts, dark backgrounds, NES color palette, and pixel art versions of all image assets. Links to `/register` and `/contact` go to the normal (non-8-bit) pages.

## Visual Design

### Color Palette
- Background primary: `#0d0d1a`
- Background alternate: `#1a1a2e`
- Hero gradient: `#1a1a2e` → `#2a1a3e` → `#1a1a2e`
- Primary accent (gold): `#ffd700`, shadow `#b8860b`
- Green (times/status): `#00ff00`
- Red (emphasis): `#ff0000`
- Text primary: `#ffffff`
- Text secondary: `#aaaaaa`, `#cccccc`
- Text muted: `#555555`
- Borders: `#333333`, accent borders use `#ffd700`

### Typography
- `Press Start 2P` (Google Fonts) for ALL text — headings, body, nav, buttons
- Headings: `0.7rem`, body: `0.45rem`, small: `0.35rem`
- Line height: `2.0+` for body text readability
- All text uppercase

### Decorative Elements
- CRT scanline overlay via CSS `repeating-linear-gradient` on `body::after`
- Pixel block dividers (rows of small colored squares)
- Game-style section labels: `★ ABOUT ★`, `► SCHEDULE ◄`
- Arrow indicators on buttons and menu items: `►`, `★`
- Borders are `2px solid` or `3px solid` — no subtle opacity borders
- Dashed borders (`1px dashed #333`) for schedule row separators

## Page Sections

All sections mirror the main homepage in content. The order:

1. **Nav** — `★ CLCC 2026 ★` logo, links (ABOUT, SCHEDULE, SPONSORS), `► REGISTER` button with gold border
2. **Hero** — Large gold title with text shadow, subtitle, date in green, `★ REGISTER NOW ★` CTA button, pixel color strip
3. **HeroSponsors** — Sponsor tier labels and 8-bit logo cards with pixel borders
4. **About & Charity** — Section with `★ ABOUT THE EVENT ★` heading, pixel dividers
5. **Schedule & Awards** — Time/event rows with green timestamps, dashed separators
6. **Spectator Banner** — Styled as game UI panel
7. **Weather Policy** — Game-style info box
8. **FAQ** — Bordered cards with `►` question indicators, muted answer text
9. **Sponsors** — Full sponsor grid with pixel art logos in bordered cards
10. **Gallery** — 3-column grid of 8-bit processed photos with pixel borders
11. **Footer** — Dark with gold border-top, centered pixel text
12. **Sticky Register Bar** — Fixed bottom bar with gold border-top, `★ REGISTER ★` button

## 8-Bit Image Asset Generation

### Approach
All images are generated once via batch scripts/endpoints and cached in Supabase storage under the `8bit/` prefix in the `pixel-art` bucket. No on-the-fly generation.

### Hero Image
- Source: `public/images/PXL_20250831_172232318.jpg`
- Prompt: `8-bit retro pixel art version of this car show scene. Maintain the same composition and vehicles. Style like a 1990s DOS or NES game screenshot. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic.`
- Storage: `8bit/hero.png`
- Generation: One-time batch via API endpoint

### Gallery Images (6-8 curated picks)
- Source: Hardcoded list of the best `public/images/PXL_*.jpg` files
- Same pixel art prompt style as hero
- Storage: `8bit/gallery-0.png` through `8bit/gallery-7.png`
- Generation: One-time batch via API endpoint

### Sponsor Logos
- Source: Each paid sponsor's `logo_url` from the sponsors table
- Prompt: `8-bit retro pixel art version of this company logo. Sharp pixels, no anti-aliasing, authentic retro video game aesthetic. Black background.`
- Storage: `8bit/sponsor-{sponsor_id}.png`
- Database: Add `pixel_logo_url` column to sponsors table
- API: `POST /api/sponsors/pixel-art` with `batch: true` mode
- The `/80s` page sponsor components read `pixel_logo_url` instead of `logo_url`

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `app/80s/page.tsx` | Create | 8-bit homepage — imports all section components |
| `app/80s/layout.tsx` | Create | Metadata, Press Start 2P font, 8-bit global styles |
| `components/8bit/Hero8Bit.tsx` | Create | 8-bit hero with pixel art background |
| `components/8bit/Nav8Bit.tsx` | Create | 8-bit navigation bar |
| `components/8bit/About8Bit.tsx` | Create | 8-bit about section |
| `components/8bit/Schedule8Bit.tsx` | Create | 8-bit schedule with green times |
| `components/8bit/Sponsors8Bit.tsx` | Create | 8-bit sponsors with pixel logos |
| `components/8bit/Gallery8Bit.tsx` | Create | 8-bit gallery with processed photos |
| `components/8bit/FAQ8Bit.tsx` | Create | 8-bit FAQ with bordered cards |
| `components/8bit/Footer8Bit.tsx` | Create | 8-bit footer |
| `components/8bit/StickyBar8Bit.tsx` | Create | 8-bit sticky register bar |
| `components/8bit/SpectatorBanner8Bit.tsx` | Create | 8-bit spectator info |
| `components/8bit/WeatherPolicy8Bit.tsx` | Create | 8-bit weather policy |
| `app/api/8bit/generate/route.ts` | Create | Batch endpoint to generate all 8-bit assets (hero, gallery, sponsor logos) |
| `types/database.ts` | Modify | Add `pixel_logo_url` to Sponsor type |

### SQL Migration

```sql
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS pixel_logo_url TEXT;
```

## Data Flow

- All sections read from the same Supabase tables as the main homepage
- Sponsor components use `pixel_logo_url` (falling back to `logo_url` if not generated)
- Gallery component reads from a hardcoded list of `8bit/gallery-*.png` URLs in Supabase storage
- Hero reads from `8bit/hero.png` in Supabase storage
- The generation endpoint uploads all processed images to Supabase storage and updates DB records

## What Does NOT Change
- Registration flow (`/register`) — normal styling
- Contact page (`/contact`) — normal styling
- Admin dashboard — normal styling
- API routes — no changes except adding the generation endpoint and sponsor pixel_logo_url field
