-- 068_marketplace_anon_slot_browse.sql — anon slot browse for marketplace venues (not only rocketplay_enabled)

-- ponytail: permissive policies OR with 041 rocketplay policies; book_court_slot stays auth-only.

-- ---------------------------------------------------------------------------
-- Eligibility helpers (bypass RLS; avoid courts ↔ organization_places recursion with 041)
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
-- Marketplace court browse RLS (team org + published place + marketplace coaches + courts)
-- ---------------------------------------------------------------------------

-- ponytail: org policy stays flat (no org_places subquery) to avoid 42P17 RLS recursion with 041 policies.
create policy organizations_select_marketplace_court_browse
  on public.organizations for select
  to authenticated, anon
  using (kind = 'team');

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

-- ponytail: never subquery courts from org_places policy — courts_select_rocketplay joins org_places (041).
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

-- ---------------------------------------------------------------------------
-- Public facility profile: booking_context for marketplace orgs with court inventory
-- ---------------------------------------------------------------------------

create or replace function public.get_public_facility_profile(p_place_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_place record;
  v_coach_count integer;
  v_booking_org_id uuid;
  v_opening_hours jsonb;
  v_has_inventory boolean := false;
  v_court_sport_slugs jsonb;
begin
  if p_place_id is null then
    return null;
  end if;

  select
    p.id,
    p.name,
    p.place_type,
    p.address_line1,
    p.city,
    p.region,
    p.postal_code,
    p.country,
    p.latitude,
    p.longitude
  into v_place
  from public.places p
  where p.id = p_place_id
    and p.place_type <> 'online';

  if not found then
    return null;
  end if;

  select count(distinct cp.coach_id)::integer
  into v_coach_count
  from public.coach_places cp
  join public.profiles prof on prof.id = cp.coach_id
    and prof.anonymized_at is null
  where cp.place_id = p_place_id
    and cp.marketplace_visible = true;

  if coalesce(v_coach_count, 0) < 1 then
    return null;
  end if;

  select op.organization_id, op.opening_hours
  into v_booking_org_id, v_opening_hours
  from public.organization_places op
  join public.organizations o on o.id = op.organization_id
  where op.place_id = p_place_id
    and op.is_published = true
    and o.kind = 'team'
    and (
      o.rocketplay_enabled = true
      or exists (
        select 1
        from public.courts c
        where c.organization_id = o.id
          and c.place_id = p_place_id
          and c.is_active = true
      )
    )
  order by
    case when o.rocketplay_enabled then 0 else 1 end,
    op.is_primary desc,
    op.sort_order asc,
    op.created_at asc
  limit 1;

  if v_booking_org_id is not null then
    select exists (
      select 1
      from public.courts c
      where c.organization_id = v_booking_org_id
        and c.place_id = p_place_id
        and c.is_active = true
    )
    into v_has_inventory;

    select coalesce(
      (
        select jsonb_agg(distinct_slug order by distinct_slug asc)
        from (
          select distinct c.sport_slug as distinct_slug
          from public.courts c
          where c.organization_id = v_booking_org_id
            and c.place_id = p_place_id
            and c.is_active = true
        ) court_tags
      ),
      '[]'::jsonb
    )
    into v_court_sport_slugs;
  end if;

  return jsonb_build_object(
    'place_id', v_place.id,
    'name', v_place.name,
    'place_type', v_place.place_type,
    'address_line1', v_place.address_line1,
    'city', v_place.city,
    'region', v_place.region,
    'postal_code', v_place.postal_code,
    'country', v_place.country,
    'latitude', v_place.latitude,
    'longitude', v_place.longitude,
    'coach_count', v_coach_count,
    'sport_slugs', coalesce(
      (
        select jsonb_agg(distinct_slug order by distinct_slug asc)
        from (
          select distinct st.slug as distinct_slug
          from public.coach_places cpl
          join public.profiles prof on prof.id = cpl.coach_id
            and prof.anonymized_at is null
          join public.coach_profiles cprof on cprof.user_id = cpl.coach_id
          join public.coach_sport_tags cst on cst.coach_profile_id = cprof.id
          join public.sport_tags st on st.id = cst.sport_tag_id
          where cpl.place_id = p_place_id
            and cpl.marketplace_visible = true
        ) venue_tags
      ),
      '[]'::jsonb
    ),
    'from_price_cents', (
      select min(csp.price_cents)
      from public.coach_service_plans csp
      join public.profiles prof on prof.id = csp.coach_id
        and prof.anonymized_at is null
      where csp.place_id = p_place_id
        and csp.is_published = true
    ),
    'coaches', coalesce(
      (
        select jsonb_agg(coach_row order by coach_name asc)
        from (
          select
            jsonb_build_object(
              'coach_profile_id', cprof.id,
              'display_name', coalesce(nullif(trim(p.display_name), ''), 'Coach'),
              'avatar_url', p.avatar_url,
              'rating_avg', cprof.rating_avg,
              'tag_slugs', coalesce(
                (
                  select jsonb_agg(st2.slug order by cst2.is_primary desc, st2.slug asc)
                  from public.coach_sport_tags cst2
                  join public.sport_tags st2 on st2.id = cst2.sport_tag_id
                  where cst2.coach_profile_id = cprof.id
                ),
                '[]'::jsonb
              )
            ) as coach_row,
            coalesce(nullif(trim(p.display_name), ''), 'Coach') as coach_name
          from public.coach_places cpl
          join public.profiles p on p.id = cpl.coach_id
            and p.anonymized_at is null
          join public.coach_profiles cprof on cprof.user_id = cpl.coach_id
          where cpl.place_id = p_place_id
            and cpl.marketplace_visible = true
        ) roster
      ),
      '[]'::jsonb
    ),
    'plans', coalesce(
      (
        select jsonb_agg(plan_row order by plan_sort asc, plan_created asc)
        from (
          select
            jsonb_build_object(
              'id', csp.id,
              'coach_profile_id', cprof.id,
              'coach_display_name', coalesce(nullif(trim(p.display_name), ''), 'Coach'),
              'title', csp.title,
              'description', csp.description,
              'duration_minutes', csp.duration_minutes,
              'price_cents', csp.price_cents,
              'currency', csp.currency,
              'sport_tag_slug', st.slug,
              'court_included', csp.court_included,
              'membership_policy', csp.membership_policy,
              'equipment_policy', csp.equipment_policy,
              'sort_order', csp.sort_order
            ) as plan_row,
            csp.sort_order as plan_sort,
            csp.created_at as plan_created
          from public.coach_service_plans csp
          join public.coach_profiles cprof on cprof.user_id = csp.coach_id
          join public.profiles p on p.id = csp.coach_id
            and p.anonymized_at is null
          join public.coach_places cpl
            on cpl.coach_id = csp.coach_id
           and cpl.place_id = p_place_id
           and cpl.marketplace_visible = true
          left join public.sport_tags st on st.id = csp.sport_tag_id
          where csp.place_id = p_place_id
            and csp.is_published = true
          order by csp.sort_order asc, csp.created_at asc
        ) venue_plans
      ),
      '[]'::jsonb
    ),
    'booking_context', jsonb_build_object(
      'has_bookable_inventory', coalesce(v_has_inventory, false),
      'organization_id', v_booking_org_id,
      'sport_slugs', coalesce(v_court_sport_slugs, '[]'::jsonb),
      'opening_hours', v_opening_hours
    )
  );
end;
$$;

revoke all on function public.get_public_facility_profile(uuid) from public;
grant execute on function public.get_public_facility_profile(uuid) to anon, authenticated;

comment on function public.get_public_facility_profile(uuid) is
  'Public venue storefront. booking_context includes team org with court inventory at marketplace-visible venues.';
