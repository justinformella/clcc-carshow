# Analytics Page Redesign

**Date:** 2026-04-02
**Status:** Approved

## Overview

Redesign the admin analytics page from a single dark-themed scrolling page into a 4-tab light-themed page matching the rest of the admin UI. Add a new "Site Analytics" tab with traffic/conversion data, daily trend charts, and AI-powered insights.

## Tab Structure

1. **Site Analytics** — traffic, conversion rates, trends, AI insights (NEW)
2. **Registration Data** — makes treemap, decades bar chart, colors pie chart (EXISTING, restyled)
3. **Vehicle Intelligence** — country, category, era, HP distribution, radar chart (EXISTING, restyled)
4. **Leaderboard** — power/rarest/value ranking table (EXISTING, restyled)

No persistent data above the tabs. Just the page title "Analytics" and the tab bar.

## Theme

Light admin theme matching the rest of the site:
- Background: `var(--cream)` / `#f5f0e8`
- Cards: `var(--white)` with `1px solid rgba(0,0,0,0.08)` border and `0 1px 3px rgba(0,0,0,0.06)` shadow
- Headings: `Playfair Display`, serif
- Body: `Inter`, sans-serif
- Tab bar: same style as admin settings page tabs (gold underline on active)

**Chart color palette (Ocean):**
- Visitors / primary: indigo `#4f46e5` (darker) / `#6366f1` (lighter)
- Registrations / secondary: teal `#0d9488` (darker) / `#14b8a6` (lighter)
- Conversion rate / accent: gold `#c9a84c`
- Positive trend: `#16a34a`
- Negative trend: `#dc2626`
- Supporting colors for pie/treemap charts: cycle through `["#4f46e5", "#0d9488", "#c9a84c", "#e11d48", "#7c3aed", "#f59e0b", "#06b6d4", "#84cc16", "#ec4899", "#8b5cf6"]`

## Site Analytics Tab (New)

### Data Sources
- `page_views` table: `date`, `views`, `visitors`
- `registrations` table: `created_at`, `paid_at`, `payment_status`

### Layout (top to bottom)

#### 1. Stat Cards (4 across)
| Card | Value | Color |
|------|-------|-------|
| Visitors (7d) | sum of `visitors` last 7 days | indigo `#4f46e5` |
| Registrations (7d) | count of paid/comped registrations with `paid_at` in last 7 days | teal `#0d9488` |
| Conversion Rate | visitors-to-registrations percentage | gold `#c9a84c` |
| Avg Daily Visitors | visitors / days | indigo `#6366f1` |

Each card shows the value large, label small below, and a small trend indicator (up/down arrow + percentage vs prior 7 days) in green or red.

#### 2. Conversion Rate Trend (hero chart)
- **Primary**: Line chart showing daily conversion rate (%) over time
- **Secondary**: Light indigo area/bars showing visitor volume for context behind the line
- X-axis: dates
- Left Y-axis: conversion rate %
- Right Y-axis: visitor count
- Use nivo `ResponsiveLine` or `ResponsiveBar` with line overlay
- Show all available days from `page_views` table

#### 3. Visitors & Registrations by Day
- Dual bar chart: indigo bars for visitors, teal bars for registrations per day
- Side-by-side bars per day
- Use nivo `ResponsiveBar` with grouped mode
- Legend below

#### 4. AI Insights Panel
- Card with a sparkle/lightbulb icon and "AI Insights" heading
- On page load, calls `/api/analytics/insights` which:
  - Fetches last 30 days of `page_views` data
  - Fetches last 30 days of registration data (counts per day)
  - Sends both datasets to Gemini (primary) or OpenAI (fallback) with a prompt asking for:
    - 3-5 bullet-point insights about trends
    - 1-2 actionable recommendations
    - Overall trend assessment (improving/declining/stable)
  - Response cached in `app_settings` table with key `analytics_insights_cache` and a timestamp, refreshed if older than 1 hour
- Display: trend badge (green "Improving" / red "Declining" / gold "Stable"), then bullet points, then recommendations in a highlighted box
- Loading state: pulsing skeleton
- Error state: "Unable to generate insights" with retry button

#### 5. Two-column row: Funnel | Referrers

**Conversion Funnel:**
- Horizontal bar funnel showing:
  - Homepage visitors (from `page_views` where we can infer from total)
  - /register page visitors (if tracked by path — may need to enhance drain to track per-path)
  - Checkout starts (registrations with `stripe_session_id` set)
  - Paid (registrations with `payment_status` = paid/comped)
- Percentage labels between each step
- Colors: indigo gradient darkening toward teal at "Paid"

**Top Referrers:**
- Table showing referrer sources and visitor counts
- Requires enhancing the `page_views` table or adding a `page_view_referrers` table
- If referrer data isn't available yet from drain, show placeholder "Referrer tracking coming soon"

### Drain Enhancement

The current drain endpoint only aggregates by date. To support the funnel and referrers, enhance it to also store:
- **`page_view_paths`** table: `date`, `path`, `views` — aggregated pageviews per path per day
- **`page_view_referrers`** table: `date`, `referrer`, `visitors` — aggregated referrer counts per day

Update `POST /api/analytics/drain` to also insert into these tables.

## Existing Tabs (Restyled)

### Registration Data Tab
Same content as current "Registration Data" section:
- Makes treemap
- Decades bar chart
- Colors pie chart

Restyled from dark to light theme:
- `GlassCard` → white card with border
- Dark text colors
- Chart themes updated for light background
- Nivo theme: light axis text, light grid lines

### Vehicle Intelligence Tab
Same content as current "Vehicle Intelligence" section:
- Country of origin pie
- Category breakdown with stacked bar + radar
- Era bar chart
- HP distribution bar chart
- Fun stats cards (oldest, newest, most powerful, rarest)

Restyled to light theme.

### Leaderboard Tab
Same content:
- Power / Rarest / Original Price toggle
- Table with rankings

Restyled to light theme. Keep the gold highlight on top 3 positions.

### Enrich Button
The "Enrich All" button currently in the header stays — moves to a subtle position in the Vehicle Intelligence tab or as a small action button in the page header next to the title.

## API: Analytics Insights

### `POST /api/analytics/insights`

Generates AI-powered insights from traffic and registration data.

**Logic:**
1. Check `app_settings` for `analytics_insights_cache` — if exists and less than 1 hour old, return cached response
2. Fetch last 30 days of `page_views` data
3. Fetch last 30 days of registrations (group by `paid_at` date)
4. Build prompt with the data
5. Call Gemini (`gemini-2.0-flash`) primary, OpenAI (`gpt-4o-mini`) fallback
6. Parse response, cache in `app_settings`, return

**Prompt template:**
```
You are an analytics advisor for a charity car show event (Crystal Lake Cars & Caffeine, May 17, 2026).

Here is the daily website traffic and registration data:

[JSON array of { date, visitors, pageViews, registrations, conversionRate }]

Current total registrations: X of Y max capacity.
Event date: May 17, 2026 (Z days away).

Provide:
1. TREND: One word — "improving", "declining", or "stable"
2. INSIGHTS: 3-5 bullet points about what the data shows (trends, patterns, notable days)
3. RECOMMENDATIONS: 1-2 specific actionable recommendations to improve registrations

Respond in JSON format:
{ "trend": "...", "insights": ["...", "..."], "recommendations": ["...", "..."] }
```

**Response format:**
```json
{
  "trend": "improving",
  "insights": [
    "Traffic surged 10x between March 30-31, likely from Facebook sharing",
    "Conversion rate is highest on days with lower traffic (quality over quantity)",
    "You're at 18 of 200 capacity with 45 days to go — pace needs to increase"
  ],
  "recommendations": [
    "Double down on Facebook — it's your top referrer at 100+ visitors. Consider a targeted ad campaign.",
    "Add a reminder email to the 3 abandoned registrations to recover potential revenue."
  ],
  "cached_at": "2026-04-02T..."
}
```

## SQL Migrations

```sql
-- Path-level pageview tracking
CREATE TABLE IF NOT EXISTS page_view_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  path TEXT NOT NULL,
  views INT NOT NULL DEFAULT 0,
  UNIQUE(date, path)
);

-- Referrer tracking
CREATE TABLE IF NOT EXISTS page_view_referrers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  referrer TEXT NOT NULL,
  visitors INT NOT NULL DEFAULT 0,
  UNIQUE(date, referrer)
);
```

## File Changes

| File | Action | Purpose |
|------|--------|---------|
| `app/admin/analytics/page.tsx` | Rewrite | Tab structure, light theme, Site Analytics tab |
| `app/api/analytics/drain/route.ts` | Modify | Add path + referrer tracking |
| `app/api/analytics/insights/route.ts` | Create | AI insights endpoint |
