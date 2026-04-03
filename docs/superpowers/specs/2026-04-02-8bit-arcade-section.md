# 8-Bit Arcade Section — Design Spec

**Date:** 2026-04-02
**Status:** Approved

## Summary

Add an "Arcade" section to the 8-bit public site (`/8bit`) that links visitors to the `/race` drag racing game. The section displays pixel art thumbnails of 3 randomly selected registered show cars and invites visitors to play. A corresponding "ARCADE" link is added to the 8-bit nav bar.

## New Component: `components/8bit/Arcade8Bit.tsx`

### Placement

- After `Gallery8Bit`, before `Footer8Bit` in `app/8bit/page.tsx`
- Section anchor: `id="arcade"`

### Layout

1. **Section label:** "ARCADE" — uses `sectionTitleStyle()` from `components/8bit/styles.ts`
2. **Car thumbnails:** 3 pixel art images displayed in a horizontal row, each inside a dark frame (`#111` background) with a pixel border (`2px solid #333`). Images use `imageRendering: pixelated` and `objectFit: cover` at a `16:9` aspect ratio.
3. **Tagline:** "Try out the show car lineup" — white text, centered below the car images
4. **CTA button:** "PLAY" — uses `goldButtonStyle()`, links to `/race`

### Responsive Behavior

- Desktop: 3 thumbnails in a row
- Mobile (<640px): 3 thumbnails stay but shrink proportionally (no stacking — the row of 3 is the visual identity of the section)

### Data

- Fetches car list from `/api/race` on mount (client component)
- Filters to cars that have a `pixelArt` URL
- Randomly selects 3 cars on each page load
- If fewer than 3 cars have pixel art, shows however many are available
- If no cars have pixel art, the section does not render

### Styling

- Background: `#0d0d1a` (COLORS.bgDark)
- Standard section padding via `sectionStyle()`
- Font: Press Start 2P (inherited from 8-bit layout)
- Pixel border on car frames with `boxShadow: "3px 3px 0 #b8860b"` matching other 8-bit components

## Nav Update: `components/8bit/Nav8Bit.tsx`

- Add "ARCADE" to the nav links array
- Links to `#arcade` (anchor scroll)
- Placed after the last current nav item (before any external links)
- Also add to the mobile hamburger menu

## Files Changed

| File | Change |
|------|--------|
| `components/8bit/Arcade8Bit.tsx` | New component |
| `app/8bit/page.tsx` | Import and render `Arcade8Bit` after `Gallery8Bit` |
| `components/8bit/Nav8Bit.tsx` | Add "ARCADE" nav link pointing to `#arcade` |

## No Changes To

- `/race` page (already 8-bit styled)
- `/api/race` endpoint (already returns pixel art URLs)
- Any other 8-bit components
