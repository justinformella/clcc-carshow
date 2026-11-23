-- REHEARSAL: everything below is undone by the RAISE at the end.
begin;
create temp table _r (k text primary key, v jsonb) on commit drop;
insert into _r values ('before', jsonb_build_object(
  'reg_max_updated_at', (select max(updated_at) from public.registrations),
  'reg_audit', (select count(*) from public.registration_audit_log),
  'sponsor_audit', (select count(*) from public.sponsor_audit_log),
  'help_max_updated_at', (select max(updated_at) from public.help_requests)));
-- =============================================================================
-- Events migration, PART A: schema + tag existing rows as 2026
-- Run in the Supabase SQL Editor BEFORE deploying the event-aware code.
-- Safe with the currently deployed code: nothing it reads changes shape, and
-- new rows default to the current event (2027).
--
-- Notes
-- * Existing rows are tagged via a constant column DEFAULT, not an UPDATE,
--   so the audit-log and updated_at triggers do not fire (no 242 bogus audit
--   rows, no reset "last updated" dates).
-- * Car numbers become per-event (2027 starts at #1). 2026 keeps 1-244.
-- Rollback: migrations/2026-11-22-events-rollback.sql
-- =============================================================================

-- 1. events -------------------------------------------------------------------
create table public.events (
  id                       uuid primary key default gen_random_uuid(),
  year                     int  not null unique,
  name                     text not null,
  event_date               date not null,
  rain_date                date,
  registration_opens_at    timestamptz,
  registration_closes_at   timestamptz,
  registration_price_cents int  not null default 3000,
  charity_goal_cents       int,
  is_current               boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create unique index events_one_current on public.events (is_current) where is_current;
create trigger events_updated_at before update on public.events
  for each row execute function public.update_updated_at();

alter table public.events enable row level security;
create policy "Anyone can read events" on public.events
  for select to anon, authenticated using (true);
create policy "Authenticated users can manage events" on public.events
  for all to authenticated using (true) with check (true);
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;

insert into public.events (id, year, name, event_date, rain_date, registration_price_cents, charity_goal_cents, is_current) values
  ('20260517-0000-4000-8000-000000000000', 2026, '2026 Charity Car Show', '2026-05-17', null,         3000, 1500000, false),
  ('20270516-0000-4000-8000-000000000000', 2027, '2027 Charity Car Show', '2027-05-16', '2027-05-23', 3000, null,    true);

-- The event new rows belong to unless code says otherwise.
create function public.current_event_id() returns uuid
  language sql stable set search_path = ''
  as $$ select id from public.events where is_current $$;

-- 2. event_id on event-scoped tables ------------------------------------------
-- Pattern: add NOT NULL column with the 2026 id as a constant default (fills
-- existing rows without an UPDATE), then switch the default to the current event.
alter table public.registrations         add column event_id uuid not null default '20260517-0000-4000-8000-000000000000' references public.events(id);
alter table public.sponsors              add column event_id uuid not null default '20260517-0000-4000-8000-000000000000' references public.events(id);
alter table public.show_expenses         add column event_id uuid not null default '20260517-0000-4000-8000-000000000000' references public.events(id);
alter table public.award_recommendations add column event_id uuid not null default '20260517-0000-4000-8000-000000000000' references public.events(id);
alter table public.promo_codes           add column event_id uuid not null default '20260517-0000-4000-8000-000000000000' references public.events(id);
alter table public.ad_campaigns          add column event_id uuid not null default '20260517-0000-4000-8000-000000000000' references public.events(id);
alter table public.sponsorship_tiers     add column event_id uuid not null default '20260517-0000-4000-8000-000000000000' references public.events(id);
alter table public.award_categories      add column event_id uuid not null default '20260517-0000-4000-8000-000000000000' references public.events(id);
-- help requests: nullable (some questions aren't about a specific show)
alter table public.help_requests         add column event_id uuid          default '20260517-0000-4000-8000-000000000000' references public.events(id);

alter table public.registrations         alter column event_id set default public.current_event_id();
alter table public.sponsors              alter column event_id set default public.current_event_id();
alter table public.show_expenses         alter column event_id set default public.current_event_id();
alter table public.award_recommendations alter column event_id set default public.current_event_id();
alter table public.promo_codes           alter column event_id set default public.current_event_id();
alter table public.ad_campaigns          alter column event_id set default public.current_event_id();
alter table public.sponsorship_tiers     alter column event_id set default public.current_event_id();
alter table public.award_categories      alter column event_id set default public.current_event_id();
alter table public.help_requests         alter column event_id set default public.current_event_id();

create index registrations_event_id_idx         on public.registrations (event_id);
create index sponsors_event_id_idx              on public.sponsors (event_id);
create index show_expenses_event_id_idx         on public.show_expenses (event_id);
create index award_recommendations_event_id_idx on public.award_recommendations (event_id);
create index promo_codes_event_id_idx           on public.promo_codes (event_id);
create index ad_campaigns_event_id_idx          on public.ad_campaigns (event_id);
create index sponsorship_tiers_event_id_idx     on public.sponsorship_tiers (event_id);
create index help_requests_event_id_idx         on public.help_requests (event_id);

-- 3. award categories are per event (names unique within a year) --------------
alter table public.award_categories drop constraint award_categories_name_key;
alter table public.award_categories add constraint award_categories_event_name_key unique (event_id, name);

-- 4. car numbers restart at #1 each event ---------------------------------------
alter table public.registrations add constraint registrations_event_car_number_key unique (event_id, car_number);

create schema if not exists private;
create function private.assign_car_number() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if new.car_number is null then
    -- serialize numbering within one event so two checkouts can't collide
    perform pg_advisory_xact_lock(hashtextextended('car_number:' || new.event_id::text, 0));
    select coalesce(max(r.car_number), 0) + 1 into new.car_number
      from public.registrations r where r.event_id = new.event_id;
  end if;
  return new;
end
$$;
revoke all on function private.assign_car_number() from public;

-- old global sequence stays in place (unused) so rollback can restore it
alter table public.registrations alter column car_number drop default;
create trigger registrations_assign_car_number before insert on public.registrations
  for each row execute function private.assign_car_number();
-- =============================================================================
-- Events migration, PART B: seed 2027 from 2026
-- Run AFTER the event-aware code is deployed (the old code doesn't filter by
-- event, so these copies would show up as duplicates there).
-- =============================================================================

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

-- ===== CHECKS after part A + B =====
insert into _r values ('2026_totals', jsonb_build_object(
  'registrations', (select jsonb_build_object('rows',count(*),'amount',sum(amount_paid),'donations',sum(donation_cents),'max_car',max(car_number)) from public.registrations where event_id='20260517-0000-4000-8000-000000000000'),
  'registrations_paid', (select jsonb_build_object('rows',count(*),'amount',sum(amount_paid),'donations',sum(donation_cents)) from public.registrations where event_id='20260517-0000-4000-8000-000000000000' and payment_status='paid'),
  'sponsors', (select jsonb_build_object('rows',count(*),'amount',sum(sponsorship_amount),'donations',sum(donation_cents)) from public.sponsors where event_id='20260517-0000-4000-8000-000000000000'),
  'sponsors_paid', (select jsonb_build_object('rows',count(*),'amount',sum(sponsorship_amount)) from public.sponsors where event_id='20260517-0000-4000-8000-000000000000' and paid_at is not null),
  'expenses', (select jsonb_build_object('rows',count(*),'amount',sum(amount_cents)) from public.show_expenses where event_id='20260517-0000-4000-8000-000000000000'),
  'award_categories', (select count(*) from public.award_categories where event_id='20260517-0000-4000-8000-000000000000'),
  'award_recommendations', (select count(*) from public.award_recommendations where event_id='20260517-0000-4000-8000-000000000000'),
  'tiers', (select jsonb_build_object('rows',count(*),'price',sum(price_cents)) from public.sponsorship_tiers where event_id='20260517-0000-4000-8000-000000000000'),
  'help_requests', (select count(*) from public.help_requests where event_id='20260517-0000-4000-8000-000000000000')));
insert into _r values ('null_event_ids', to_jsonb(
  (select count(*) from public.registrations where event_id is null)+(select count(*) from public.sponsors where event_id is null)+
  (select count(*) from public.show_expenses where event_id is null)+(select count(*) from public.award_recommendations where event_id is null)+
  (select count(*) from public.sponsorship_tiers where event_id is null)+(select count(*) from public.award_categories where event_id is null)+
  (select count(*) from public.help_requests where event_id is null)));
insert into _r values ('triggers_quiet', jsonb_build_object(
  'reg_max_updated_at', (select max(updated_at) from public.registrations),
  'reg_audit', (select count(*) from public.registration_audit_log),
  'sponsor_audit', (select count(*) from public.sponsor_audit_log),
  'help_max_updated_at', (select max(updated_at) from public.help_requests)));
insert into _r values ('2027_seeded', jsonb_build_object(
  'current_event_is_2027', (select public.current_event_id() = '20270516-0000-4000-8000-000000000000'),
  'award_categories', (select count(*) from public.award_categories where event_id='20270516-0000-4000-8000-000000000000'),
  'tiers', (select count(*) from public.sponsorship_tiers where event_id='20270516-0000-4000-8000-000000000000'),
  'sponsor_prospects', (select count(*) from public.sponsors where event_id='20270516-0000-4000-8000-000000000000' and status='prospect'),
  'prospects_with_payment_data', (select count(*) from public.sponsors where event_id='20270516-0000-4000-8000-000000000000' and (paid_at is not null or payment_token is not null or stripe_session_id is not null or sponsorship_amount is not null)),
  'distinct_prospect_companies', (select count(distinct lower(company)) from public.sponsors where event_id='20270516-0000-4000-8000-000000000000'),
  'sample_note', (select notes from public.sponsors where event_id='20270516-0000-4000-8000-000000000000' limit 1)));

-- test registrations: as the anonymous web role (like public checkout), as service role, and one explicitly for 2026
set local role anon;
insert into public.registrations (first_name,last_name,email,vehicle_year,vehicle_make,vehicle_model) values ('Rehearsal','One','rehearsal1@example.invalid',1970,'Test','Anon');
reset role;
insert into public.registrations (first_name,last_name,email,vehicle_year,vehicle_make,vehicle_model) values ('Rehearsal','Two','rehearsal2@example.invalid',1971,'Test','Service');
insert into public.registrations (first_name,last_name,email,vehicle_year,vehicle_make,vehicle_model,event_id) values ('Rehearsal','Old','rehearsal3@example.invalid',1972,'Test','2026','20260517-0000-4000-8000-000000000000');
insert into _r values ('test_registrations', (select jsonb_agg(jsonb_build_object('who',last_name,'event',(select year from public.events e where e.id=r.event_id),'car',car_number) order by email) from public.registrations r where email like 'rehearsal%@example.invalid'));
insert into _r values ('duplicate_car_blocked', to_jsonb((
  select count(*) from (select event_id, car_number from public.registrations group by 1,2 having count(*)>1) d)));
insert into _r values ('anon_can_read_events', to_jsonb((select count(*) from public.events)));

-- ===== ROLLBACK SCRIPT, then confirm 2026 is back to baseline =====
delete from public.registrations where email like 'rehearsal%@example.invalid';
-- =============================================================================
-- Events migration ROLLBACK: undoes parts A and B.
-- WARNING: deletes any rows created for 2027 (registrations, sponsors, etc.).
-- Deploy the pre-event code first (or at the same time).
-- =============================================================================

-- remove 2027 data (part B copies and anything created since)
delete from public.award_recommendations where event_id <> '20260517-0000-4000-8000-000000000000';
delete from public.registrations         where event_id <> '20260517-0000-4000-8000-000000000000';
delete from public.sponsors              where event_id <> '20260517-0000-4000-8000-000000000000';
delete from public.show_expenses         where event_id <> '20260517-0000-4000-8000-000000000000';
delete from public.promo_codes           where event_id <> '20260517-0000-4000-8000-000000000000';
delete from public.ad_campaigns          where event_id <> '20260517-0000-4000-8000-000000000000';
delete from public.sponsorship_tiers     where event_id <> '20260517-0000-4000-8000-000000000000';
delete from public.award_categories      where event_id <> '20260517-0000-4000-8000-000000000000';

-- car numbers back to the global sequence
drop trigger if exists registrations_assign_car_number on public.registrations;
drop function if exists private.assign_car_number();
alter table public.registrations drop constraint if exists registrations_event_car_number_key;
select setval('public.registrations_car_number_seq', greatest((select max(car_number) from public.registrations), 1));
alter table public.registrations alter column car_number set default nextval('public.registrations_car_number_seq'::regclass);

-- award categories back to globally unique names
alter table public.award_categories drop constraint if exists award_categories_event_name_key;
alter table public.award_categories add constraint award_categories_name_key unique (name);

-- drop event columns (indexes and FKs go with them)
alter table public.registrations         drop column event_id;
alter table public.sponsors              drop column event_id;
alter table public.show_expenses         drop column event_id;
alter table public.award_recommendations drop column event_id;
alter table public.promo_codes           drop column event_id;
alter table public.ad_campaigns          drop column event_id;
alter table public.sponsorship_tiers     drop column event_id;
alter table public.award_categories      drop column event_id;
alter table public.help_requests         drop column event_id;

drop function public.current_event_id();
drop table public.events;

insert into _r values ('after_rollback', jsonb_build_object(
  'events_table_gone', (select to_regclass('public.events') is null),
  'event_id_columns_left', (select count(*) from information_schema.columns where table_schema='public' and column_name='event_id'),
  'registrations', (select jsonb_build_object('rows',count(*),'amount',sum(amount_paid),'donations',sum(donation_cents),'max_car',max(car_number)) from public.registrations),
  'sponsors', (select jsonb_build_object('rows',count(*),'amount',sum(sponsorship_amount)) from public.sponsors),
  'award_categories', (select count(*) from public.award_categories),
  'tiers', (select count(*) from public.sponsorship_tiers),
  'car_default', (select column_default from information_schema.columns where table_schema='public' and table_name='registrations' and column_name='car_number')));

do $$ begin raise exception 'REHEARSAL_RESULT %', (select jsonb_object_agg(k, v) from _r); end $$;
