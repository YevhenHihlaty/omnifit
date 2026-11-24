-- 070a_marketplace_rls_helpers_only.sql — run BEFORE marketplace browse policies (068/070)
--
-- Safe to run alone when policies fail with:
--   function public.org_place_has_active_courts(uuid, uuid) does not exist

create or replace function public.org_place_has_active_courts(p_org_id uuid, p_place_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.courts c
    where c.organization_id = p_org_id
      and c.place_id = p_place_id
      and c.is_active = true
  );
$$;

create or replace function public.place_has_marketplace_visible_coaches(p_place_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.coach_places cp
    join public.profiles prof
      on prof.id = cp.coach_id
     and prof.anonymized_at is null
    where cp.place_id = p_place_id
      and cp.marketplace_visible = true
  );
$$;

revoke all on function public.org_place_has_active_courts(uuid, uuid) from public;
grant execute on function public.org_place_has_active_courts(uuid, uuid) to anon, authenticated;

revoke all on function public.place_has_marketplace_visible_coaches(uuid) from public;
grant execute on function public.place_has_marketplace_visible_coaches(uuid) to anon, authenticated;

comment on function public.org_place_has_active_courts(uuid, uuid) is
  'RLS-safe: true when org has active courts at place. SECURITY DEFINER to avoid courts↔org_places policy recursion.';

comment on function public.place_has_marketplace_visible_coaches(uuid) is
  'RLS-safe: true when place has marketplace-visible non-anonymized coaches. SECURITY DEFINER for anon browse policies.';
