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

begin;

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

commit;
