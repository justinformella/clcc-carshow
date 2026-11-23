# How to make code event-aware (2026 vs 2027)

Context: `docs/plans/2027-event-separation.md`. The database migration (part A)
is LIVE in production: `events` table exists (2026 = past, 2027 = current), and
these tables have `event_id`: registrations, sponsors, show_expenses,
award_recommendations, award_categories, sponsorship_tiers, promo_codes,
ad_campaigns (NOT NULL), help_requests (nullable). New rows default to the
current event in the DB. Car numbers are assigned per event by a DB trigger.

Child tables have NO event_id and inherit from their parent: vehicle_specs,
registration_photos, registration_audit_log (registration_id),
sponsor_audit_log (sponsor_id), email_log, help_request_messages.

## Building blocks (already written, use them)

- `lib/events.ts`: `ShowEvent` type, `fetchEvents`, `getCurrentEvent(supabase)`,
  `getEventByYear(supabase, year)`, `resolveEvent(supabase, requestedId)`
  (validated `?event=` param, falls back to current).
- `components/admin/AdminEventContext.tsx`: inside `/admin` pages,
  `const { event, currentEvent, readOnly } = useAdminEvent();`
  - `event` = the year the admin is viewing (null until loaded)
  - `readOnly` = true when viewing a past year
  - The layout already shows a year switcher and a "read only" banner.

## Rules

1. **Admin list/aggregate queries** on an event-scoped table: add
   `.eq("event_id", event.id)`. Fetch effects must depend on `event?.id`,
   do nothing while `event` is null, and refetch when it changes (reset
   stale state so 2026 rows never flash under 2027).
2. **Lookups by primary key** (`.eq("id", id)`, detail pages) need no filter,
   but detail pages are read-only when the record's `event_id !==
   currentEvent?.id` (select `event_id` if not already selected).
3. **Read-only (past years)**: hide or disable every control that changes
   data or sends something (save/edit/delete/check-in/upload/generate/send
   email/charge/refund/mark paid/create). Also guard the handler itself:
   `if (readOnly) return;`. Viewing, searching, filtering, CSV export and
   printing stay available.
4. **Admin inserts**: set `event_id: event.id` explicitly (only reachable when
   not read-only).
5. **API routes called by admin pages** that list/aggregate event data:
   accept `?event=<id>` and use `resolveEvent(supabase, searchParams.get("event"))`;
   the admin page passes `?event=${event.id}`. Filter with `.eq("event_id", ev.id)`.
6. **Public / server routes** (checkout, public sponsor lists, tier lists,
   counts, charity progress, promo validation): use `getCurrentEvent()` and
   filter by it. Stripe webhooks update rows by session/payment id — no
   filter needed.
7. **Hardcoded show dates/years** ("2026-05-17", "May 17, 2026", "2026") in
   files you touch: derive from the event (`event.event_date`, `event.year`,
   `event.rain_date`, `event.registration_price_cents`,
   `event.charity_goal_cents`) where it refers to the show. Format dates
   with `new Date(event.event_date + "T12:00:00")` to avoid timezone shifts.
   Leave vehicle model years, "In 2026 Dollars" inflation labels, logo
   filenames (`CLCC_Logo2026.png`) and AI image prompts alone.
8. **Intentionally cross-year (do NOT filter)**: arcade/race car pools,
   vehicle_specs catalog, marketing audiences built from past registrants,
   attendee history by email (show which years someone attended).
9. **Do not change money math** in finances/audit — only scope the inputs.
10. Keep the existing code style (inline styles, existing helpers). Minimal,
    surgical diffs. Don't refactor unrelated code.

## Constraints for whoever implements this

- Do NOT write to the database (no inserts/updates/deletes, no SQL). Reading
  via the app's own code paths is fine but not required.
- Do NOT run `next build`, `next dev`, or anything that writes `.next/`;
  other people are editing in parallel. Verify with `npx tsc --noEmit` only.
- Do NOT commit or push. Only edit the files you were assigned.
