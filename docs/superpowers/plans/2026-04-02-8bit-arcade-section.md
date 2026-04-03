# 8-Bit Arcade Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Arcade" section to the 8-bit public site that shows 3 random pixel art car thumbnails and links to `/race`.

**Architecture:** New `Arcade8Bit` client component fetches cars from `/api/race`, picks 3 random ones with pixel art, and renders them in a row with a tagline and PLAY button. Nav gets a new anchor link.

**Tech Stack:** Next.js, React, TypeScript, existing 8-bit style system (`components/8bit/styles.ts`)

---

### Task 1: Create `Arcade8Bit` component

**Files:**
- Create: `components/8bit/Arcade8Bit.tsx`

- [ ] **Step 1: Create the component file**

```tsx
"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { COLORS, FONT, sectionStyle, sectionTitleStyle, goldButtonStyle } from "./styles";

type ArcadeCar = {
  pixelArt: string;
};

export default function Arcade8Bit() {
  const [cars, setCars] = useState<ArcadeCar[]>([]);

  useEffect(() => {
    fetch("/api/race")
      .then((r) => r.json())
      .then((data) => {
        const withArt = (data.cars || []).filter(
          (c: { pixelArt?: string | null }) => c.pixelArt
        );
        // Shuffle and take up to 3
        const shuffled = withArt.sort(() => Math.random() - 0.5).slice(0, 3);
        setCars(shuffled);
      })
      .catch(() => {});
  }, []);

  if (cars.length === 0) return null;

  return (
    <section id="arcade" style={{ ...sectionStyle(COLORS.bgDark), textAlign: "center" }}>
      <h2 style={sectionTitleStyle()}>ARCADE</h2>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          marginBottom: "1.5rem",
          maxWidth: "600px",
          margin: "0 auto 1.5rem",
        }}
      >
        {cars.map((car, i) => (
          <div
            key={i}
            style={{
              flex: "1 1 0",
              maxWidth: "180px",
              aspectRatio: "16/9",
              background: "#111",
              border: `2px solid ${COLORS.border}`,
              boxShadow: `3px 3px 0 ${COLORS.goldDark}`,
              overflow: "hidden",
            }}
          >
            <img
              src={car.pixelArt}
              alt="Show car"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                imageRendering: "pixelated",
              }}
            />
          </div>
        ))}
      </div>

      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.7rem",
          color: COLORS.white,
          marginBottom: "1.5rem",
          lineHeight: 2,
        }}
      >
        Try out the show car lineup
      </p>

      <Link href="/race" style={{ ...goldButtonStyle(), textDecoration: "none" }}>
        PLAY
      </Link>
    </section>
  );
}
```

- [ ] **Step 2: Verify file created**

Run: `cat components/8bit/Arcade8Bit.tsx | head -5`
Expected: `"use client";` and imports visible

- [ ] **Step 3: Commit**

```bash
git add components/8bit/Arcade8Bit.tsx
git commit -m "feat: add Arcade8Bit component for 8-bit site"
```

---

### Task 2: Add Arcade section to 8-bit page

**Files:**
- Modify: `app/8bit/page.tsx`

- [ ] **Step 1: Add import**

Add after the `Gallery8Bit` import (line 10):

```tsx
import Arcade8Bit from "@/components/8bit/Arcade8Bit";
```

- [ ] **Step 2: Add component between Gallery and Footer**

Change:

```tsx
      <Gallery8Bit />
      <Footer8Bit />
```

To:

```tsx
      <Gallery8Bit />
      <Arcade8Bit />
      <Footer8Bit />
```

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | grep -i error`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/8bit/page.tsx
git commit -m "feat: add Arcade section to 8-bit page"
```

---

### Task 3: Add ARCADE to nav

**Files:**
- Modify: `components/8bit/Nav8Bit.tsx`

- [ ] **Step 1: Add ARCADE link to desktop nav**

In the desktop nav `<div>` (around line 99-106), add a new anchor link after the FAQ link and before the CONTACT link:

```tsx
          <a href="#arcade" onClick={(e) => handleAnchorClick(e, "#arcade")} style={linkStyle} className="nav-8bit-link">ARCADE</a>
```

The desktop nav section should now read:

```tsx
        <div className="nav-8bit-desktop" style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <a href="#about" onClick={(e) => handleAnchorClick(e, "#about")} style={linkStyle} className="nav-8bit-link">ABOUT</a>
          <a href="#schedule" onClick={(e) => handleAnchorClick(e, "#schedule")} style={linkStyle} className="nav-8bit-link">SCHEDULE</a>
          <a href="#sponsors" onClick={(e) => handleAnchorClick(e, "#sponsors")} style={linkStyle} className="nav-8bit-link">SPONSORS</a>
          <a href="#faq" onClick={(e) => handleAnchorClick(e, "#faq")} style={linkStyle} className="nav-8bit-link">FAQ</a>
          <a href="#arcade" onClick={(e) => handleAnchorClick(e, "#arcade")} style={linkStyle} className="nav-8bit-link">ARCADE</a>
          <Link href="/contact" style={linkStyle} className="nav-8bit-link">CONTACT</Link>
          <Link href="/register" style={registerBtnStyle}>► REGISTER</Link>
        </div>
```

- [ ] **Step 2: Add ARCADE to mobile menu**

In the mobile menu (around line 141), the anchor links array currently reads:

```tsx
          {["#about", "#schedule", "#sponsors", "#faq"].map((href) => (
```

Change to:

```tsx
          {["#about", "#schedule", "#sponsors", "#faq", "#arcade"].map((href) => (
```

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | grep -i error`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add components/8bit/Nav8Bit.tsx
git commit -m "feat: add ARCADE link to 8-bit nav"
```

---

### Task 4: Manual verification

- [ ] **Step 1: Start dev server and verify**

Run: `npx next dev`

Open `http://localhost:3000/8bit` and verify:
1. "ARCADE" appears in the nav bar (desktop and mobile)
2. Clicking "ARCADE" in nav scrolls to the Arcade section
3. The Arcade section shows 3 pixel art car thumbnails in a row
4. "Try out the show car lineup" text appears below the cars
5. "PLAY" button links to `/race`
6. Refreshing the page shows different random cars

- [ ] **Step 2: Push to remote**

```bash
git push origin main
```
