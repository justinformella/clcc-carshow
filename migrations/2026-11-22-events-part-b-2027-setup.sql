-- =============================================================================
-- Events migration, PART B: seed 2027 from 2026
-- Run AFTER the event-aware code is deployed (the old code doesn't filter by
-- event, so these copies would show up as duplicates there).
-- =============================================================================

begin;

-- Award categories: editable copy for 2027 (2026 keeps its own)
insert into public.award_categories (name, display_order, is_active, event_id)
select name, display_order, is_active, '20270516-0000-4000-8000-000000000000'
from public.award_categories
where event_id = '20260517-0000-4000-8000-000000000000';

-- Sponsorship tiers: same tiers and prices to start; edit in Admin > Sponsors > Tiers
insert into public.sponsorship_tiers (name, price_cents, benefits, display_order, is_active, event_id)
select name, price_cents, benefits, display_order, is_active, '20270516-0000-4000-8000-000000000000'
from public.sponsorship_tiers
where event_id = '20260517-0000-4000-8000-000000000000';

-- Sponsors: 2026 sponsors (except archived) become 2027 renewal prospects.
-- Contact info and logos carry over; amounts, payments, Stripe IDs and
-- payment tokens do not. The 2026 rows remain the record of what was paid.
insert into public.sponsors
  (name, company, email, phone, website, logo_url, pixel_logo_url,
   sponsorship_level, original_level, status, notes, assigned_to, event_id)
select name, company, email, phone, website, logo_url, pixel_logo_url,
       sponsorship_level, sponsorship_level, 'prospect',
       'Renewal prospect from 2026 (' || sponsorship_level ||
         coalesce(', $' || (sponsorship_amount / 100)::text, '') || ', ' || status || ')',
       assigned_to, '20270516-0000-4000-8000-000000000000'
from public.sponsors
where event_id = '20260517-0000-4000-8000-000000000000'
  and status <> 'archived';

commit;
