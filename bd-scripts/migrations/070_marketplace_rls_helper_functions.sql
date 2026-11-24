-- 070_marketplace_rls_helper_functions.sql — break courts ↔ organization_places RLS recursion
--
-- Prerequisite: 070a_marketplace_rls_helpers_only.sql (helpers must exist before policies).
-- Root cause: org_places marketplace policy subqueries courts, but courts_select_rocketplay (041)
-- joins organization_places. Policy OR evaluation loops: courts → org_places → courts (42P17).
--
-- ponytail: security definer helpers for cross-table eligibility; policies stay flat.

-- ---------------------------------------------------------------------------
-- Eligibility helpers (idempotent; same as 070a — run these before policies)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Marketplace court browse RLS (no inline courts / coach_places subqueries)
-- ---------------------------------------------------------------------------

drop policy if exists organizations_select_marketplace_court_browse on public.organizations;
create policy organizations_select_marketplace_court_browse
  on public.organizations for select
  to authenticated, anon
  using (kind = 'team');

drop policy if exists organization_places_select_marketplace_court_browse on public.organization_places;
create policy organization_places_select_marketplace_court_browse
  on public.organization_places for select
  to authenticated, anon
  using (
    is_published = true
    and exists (
      select 1
      from public.organizations o
      where o.id = organization_places.organization_id
        and o.kind = 'team'
        and (
          o.rocketplay_enabled = true
          or public.org_place_has_active_courts(
            organization_places.organization_id,
            organization_places.place_id
          )
        )
    )
    and public.place_has_marketplace_visible_coaches(organization_places.place_id)
  );

drop policy if exists places_select_marketplace_court_browse on public.places;
create policy places_select_marketplace_court_browse
  on public.places for select
  to authenticated, anon
  using (
    exists (
      select 1
      from public.organization_places op
      join public.organizations o on o.id = op.organization_id
      where op.place_id = places.id
        and op.is_published = true
        and o.kind = 'team'
        and (
          o.rocketplay_enabled = true
          or public.org_place_has_active_courts(o.id, places.id)
        )
    )
    and public.place_has_marketplace_visible_coaches(places.id)
  );

drop policy if exists courts_select_marketplace_court_browse on public.courts;
create policy courts_select_marketplace_court_browse
  on public.courts for select
  to authenticated, anon
  using (
    is_active = true
    and exists (
      select 1
      from public.organizations o
      where o.id = courts.organization_id
        and o.kind = 'team'
    )
    and public.place_has_marketplace_visible_coaches(courts.place_id)
  );

drop policy if exists court_slots_select_marketplace_court_browse on public.court_slots;
create policy court_slots_select_marketplace_court_browse
  on public.court_slots for select
  to authenticated, anon
  using (
    exists (
      select 1
      from public.courts c
      join public.organizations o on o.id = c.organization_id
      where c.id = court_slots.court_id
        and c.is_active = true
        and o.kind = 'team'
        and public.place_has_marketplace_visible_coaches(c.place_id)
    )
  );

comment on function public.org_place_has_active_courts(uuid, uuid) is
  'RLS-safe: true when org has active courts at place. SECURITY DEFINER to avoid courts↔org_places policy recursion.';

comment on function public.place_has_marketplace_visible_coaches(uuid) is
  'RLS-safe: true when place has marketplace-visible non-anonymized coaches. SECURITY DEFINER for anon browse policies.';
