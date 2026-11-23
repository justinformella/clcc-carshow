-- =============================================================================
-- Events migration ROLLBACK: undoes parts A and B.
-- WARNING: deletes any rows created for 2027 (registrations, sponsors, etc.).
-- Deploy the pre-event code first (or at the same time).
-- =============================================================================

begin;

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

commit;
