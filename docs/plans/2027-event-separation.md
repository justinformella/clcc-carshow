# Plan: Separate 2026 and 2027 data in the admin

_Drafted 2026-11-21 from the live database and the current code._

## The problem

The database has no idea which show a row belongs to. Every table holds 2026
data only because 2026 is the only show so far. As soon as 2027 registrations
arrive they will land in the same tables, and every admin page — dashboard,
registrations, check-in, placards, finances, audit, awards, sponsors — will mix
the two years. Car numbers would also keep counting from 245.

What's in production today:

| Table | Rows | Belongs to a show? |
|---|---|---|
| registrations | 242 (190 paid, 17 comped, 29 archived, 6 pending) | **Yes** |
| sponsors | 34 | **Yes** |
| show_expenses | 1 | **Yes** |
| award_recommendations | 27 | **Yes** |
| promo_codes | 0 | **Yes** |
| ad_campaigns | 0 | **Yes** |
| sponsorship_tiers | 3 | **Yes** (prices can change per year) |
| help_requests | 42 | Mostly (nullable — some questions aren't about a show) |
| vehicle_specs, registration_photos, registration_audit_log | 209 / 116 / 956 | Inherits from its registration |
| sponsor_audit_log | 171 | Inherits from its sponsor |
| email_log, help_request_messages | 2005 / 74 | Inherits from its parent |
| award_categories | 9 | **Yes** — categories change each year |
| admins, app_settings | 6 / 3 | No — shared across years |
| marketing_prospects / marketing_sends | 177 / 287 | No — the mailing list spans years |
| page_views*, arcade_scores | — | No — already dated, filter by date range |

## Recommendation: tag rows with an event, don't archive

Add an `events` table and an `event_id` column to the eight "Yes" tables.
Everything else either inherits through its parent or is shared.

**Why not archive 2026 into separate tables (what I suggested earlier):**
- Five other tables hang off `registrations` (specs, photos, audit log, award
  picks, email log). Archiving means moving all of them in lockstep, and
  re-pointing their links.
- The admin already has features that *want* both years in one place: the
  attendee page groups people by email (repeat entrants), and marketing's
  "free car offer" targets past registrants — the #1 marketing list for 2027 is
  2026's entrants.
- The public site shows 2026 winners; analytics compares trends. Both are
  simple filters with an event column, and awkward cross-table queries without.
- Next year this is just "add a 2028 row," not another migration.

## Design

### 1. `events` table (also replaces hardcoded dates and price)

```sql
create table events (
  id                       uuid primary key default gen_random_uuid(),
  year                     int  not null unique,
  name                     text not null,          -- "2027 Charity Car Show"
  event_date               date not null,          -- 2027-05-16
  rain_date                date,                   -- 2027-05-23
  registration_opens_at    timestamptz,
  registration_closes_at   timestamptz,
  registration_price_cents int  not null default 3000,
  charity_goal_cents       int,
  is_current               boolean not null default false
);
create unique index one_current_event on events (is_current) where is_current;
```

`is_current` drives the public site and is the admin's default. Later, the
~25 files with "May 17, 2026" hardcoded can read from this row instead
(separate phase).

### 2. `event_id` on the seven tables, with a safe default

```sql
create function current_event_id() returns uuid
  language sql stable as $$ select id from events where is_current $$;

alter table registrations add column event_id uuid references events(id);
-- backfill: update registrations set event_id = <2026 id>;
alter table registrations alter column event_id set default current_event_id();
alter table registrations alter column event_id set not null;
-- same for sponsors, show_expenses, award_recommendations, promo_codes,
-- ad_campaigns, sponsorship_tiers, award_categories; help_requests stays nullable.
create index on registrations (event_id);
```

The **default is the safety net**: any code path we miss still writes new rows
to 2027, never to 2026.

### 3. Car numbers restart at 1 each year

`car_number` is a single global counter today (2026 ended at 244). Replace with
per-event numbering:

- unique `(event_id, car_number)` instead of global uniqueness
- a `before insert` trigger that assigns `max(car_number) + 1` within the
  event (with a row lock to prevent two checkouts getting the same number)
- 2026 keeps its existing 1–244

### 4. Admin event switcher

- `lib/events.ts`: `getCurrentEvent()` and a `useAdminEvent()` hook.
- A year selector in the admin header (2027 default, 2026 selectable),
  remembered per admin in a cookie.
- **Past years are read-only** in the UI: viewing 2026 hides check-in,
  edit, delete, and send buttons, with a banner "Viewing 2026 — read only".
- Every event-scoped query adds `.eq("event_id", eventId)`. That's ~35 files:
  - Admin pages (14): dashboard, registrations (list/detail/new/quick-add),
    check-in, placards, awards, finances, analytics, attendees, sponsors
    (list/detail/new/tiers), expenses, marketing.
  - Public/API routes (use the current event): checkout, Stripe webhook,
    registration count, charity progress, sponsors public/tiers/checkout,
    promo validate, race/arcade featured, awards recommend.
  - `api/audit` and finances take the selected event.
  - `components/Winners.tsx` shows a *specific* past event (2026).
- Child tables need no change — they're always fetched through their parent.

### 5. Award categories per year

Categories change each year, so `award_categories` gets `event_id` too. The
nine 2026 categories stay attached to 2026 (the public Winners list and 2026
award picks keep working). 2027 starts with an editable copy of the 2026 list
so you can rename, add or retire categories in **Admin → Award Categories**
without touching 2026. Uniqueness becomes `(event_id, name)`.
`registrations.award_category` stores the category name, so it stays
correct per year.

### 6. Sponsors carry over as prospects

After the migration, copy the 34 sponsors from 2026 into 2027 as new rows
with status "prospect": name, company, contact info, website and logos carry
over; amounts, payment, Stripe IDs and tokens do not. The 2026 rows stay as
the record of what was paid.

### 7. Attendees and marketing stay cross-year (on purpose)

Attendee history gets a "Years attended" column. Marketing gets a
"2026 entrants not yet registered for 2027" audience — the renewal list.

## Rollout (nothing touches production until step 4)

1. **Snapshot today's numbers** — script that records 2026 totals per admin
   page (counts, gross, fees, net to pantry, sponsor totals). These must match
   exactly after the change.
2. **Write the migration** (`migrations/2026-11-xx-events.sql`) plus a rollback
   script. Bring `supabase-schema.sql` up to date — it's missing ~15 tables.
3. **Rehearse on a copy**: Supabase branch (or a restored backup) → run
   migration → point local dev at it → run the snapshot script (2026 must
   match) → create test 2027 registrations via Stripe test mode → confirm car
   #1, correct admin filtering, 2026 untouched.
4. **Production**: take a backup, you run the SQL in the Supabase SQL editor,
   then push the code. Order matters — the column must exist before the code
   that filters on it ships. The default makes the window between the two safe.
5. **Verify live**: snapshot script against prod, open each admin page on
   both years.

Phases after this (separate work): replace hardcoded 2026 dates with the
`events` row; reopen registration; 2027 sponsor tiers.

## Decisions (answered 2026-11-22)

1. **2026 read-only in the admin** — yes.
2. **Car numbers restart at #1 for 2027** — yes.
3. **Sponsors** — copy the 2026 sponsors into 2027 as prospects.
4. **Award categories** — change each year; made per-event (section 5).
5. **Rehearsal** — on a Supabase branch.

## Size

Roughly: migration + trigger (small), event plumbing + switcher (medium),
~35 query updates (mostly mechanical but needs care on finances/audit math),
read-only mode, verification scripts. Two to three focused sessions, with the
production SQL as a single step you run.
