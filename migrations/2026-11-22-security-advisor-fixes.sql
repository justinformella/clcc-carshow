-- Fixes from the Supabase security advisor (2026-11-22).
-- 1. Site-traffic tables had RLS off: anyone with the public anon key could
--    read or write them. Writes come from /api/analytics/drain (service role,
--    bypasses RLS); reads come from the signed-in admin.
-- 2. SECURITY DEFINER functions were callable by anon/authenticated via
--    /rest/v1/rpc. The upsert_* functions are only called by the drain route
--    (service role); log_*_changes are trigger functions (triggers still fire:
--    EXECUTE is only checked when a trigger is created, not when it runs).

begin;

alter table public.page_views          enable row level security;
alter table public.page_view_paths     enable row level security;
alter table public.page_view_referrers enable row level security;

create policy "Authenticated users can read page_views" on public.page_views
  for select to authenticated using (true);
create policy "Authenticated users can read page_view_paths" on public.page_view_paths
  for select to authenticated using (true);
create policy "Authenticated users can read page_view_referrers" on public.page_view_referrers
  for select to authenticated using (true);

revoke execute on function public.upsert_page_views(date, integer, text[])        from public, anon, authenticated;
revoke execute on function public.upsert_page_view_paths(date, text, integer)      from public, anon, authenticated;
revoke execute on function public.upsert_page_view_referrers(date, text, integer)  from public, anon, authenticated;
grant  execute on function public.upsert_page_views(date, integer, text[])        to service_role;
grant  execute on function public.upsert_page_view_paths(date, text, integer)      to service_role;
grant  execute on function public.upsert_page_view_referrers(date, text, integer)  to service_role;

revoke execute on function public.log_registration_changes() from public, anon, authenticated;
revoke execute on function public.log_sponsor_changes()      from public, anon, authenticated;

commit;
