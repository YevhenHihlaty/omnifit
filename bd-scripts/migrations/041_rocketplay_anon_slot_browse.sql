-- 041_rocketplay_anon_slot_browse.sql — guest browse: anon execute on read RPCs + discovery RLS

-- ---------------------------------------------------------------------------
-- Extend RocketPlay discovery policies to anon (security invoker RPCs)
-- ---------------------------------------------------------------------------

drop policy if exists organizations_select_rocketplay_discovery on public.organizations;
create policy organizations_select_rocketplay_discovery
  on public.organizations for select
  to authenticated, anon
  using (kind = 'team' and rocketplay_enabled = true);

drop policy if exists organization_places_select_rocketplay_discovery on public.organization_places;
create policy organization_places_select_rocketplay_discovery
  on public.organization_places for select
  to authenticated, anon
  using (
    is_published = true
    and exists (
      select 1
      from public.organizations o
      where o.id = organization_places.organization_id
        and o.kind = 'team'
        and o.rocketplay_enabled = true
    )
  );

drop policy if exists organization_sport_tags_select_rocketplay_discovery on public.organization_sport_tags;
create policy organization_sport_tags_select_rocketplay_discovery
  on public.organization_sport_tags for select
  to authenticated, anon
  using (
    exists (
      select 1
      from public.organizations o
      where o.id = organization_sport_tags.organization_id
        and o.kind = 'team'
        and o.rocketplay_enabled = true
    )
  );

drop policy if exists places_select_rocketplay_discovery on public.places;
create policy places_select_rocketplay_discovery
  on public.places for select
  to anon
  using (
    exists (
      select 1
      from public.organization_places op
      join public.organizations o on o.id = op.organization_id
      where op.place_id = places.id
        and op.is_published = true
        and o.kind = 'team'
        and o.rocketplay_enabled = true
    )
  );

drop policy if exists courts_select_rocketplay on public.courts;
create policy courts_select_rocketplay
  on public.courts for select
  to authenticated, anon
  using (
    is_active = true
    and exists (
      select 1
      from public.organizations o
      join public.organization_places op
        on op.organization_id = o.id
       and op.place_id = courts.place_id
      where o.id = courts.organization_id
        and o.kind = 'team'
        and o.rocketplay_enabled = true
        and op.is_published = true
    )
  );

drop policy if exists court_slots_select_rocketplay on public.court_slots;
create policy court_slots_select_rocketplay
  on public.court_slots for select
  to authenticated, anon
  using (
    exists (
      select 1
      from public.courts c
      join public.organizations o on o.id = c.organization_id
      join public.organization_places op
        on op.organization_id = c.organization_id
       and op.place_id = c.place_id
      where c.id = court_slots.court_id
        and c.is_active = true
        and o.kind = 'team'
        and o.rocketplay_enabled = true
        and op.is_published = true
    )
  );

-- ---------------------------------------------------------------------------
-- Read-only browse RPCs for guests (book_court_slot stays authenticated-only)
-- ---------------------------------------------------------------------------

grant execute on function public.discover_clubs(text, double precision, double precision, numeric, text, integer) to anon;
grant execute on function public.search_court_slots(uuid, date, text) to anon;

comment on function public.discover_clubs is
  'RocketPlay club discovery for players and guests. Filters team orgs with rocketplay_enabled and published places.';
