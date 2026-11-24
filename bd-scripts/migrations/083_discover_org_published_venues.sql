-- 083_discover_org_published_venues.sql
-- Studio venues publish via organization_places.is_published; do not require coach_places rows.

drop function if exists public.search_marketplace_venues(text[], text, integer);

create or replace function public.search_marketplace_venues(
  p_tag_slugs text[],
  p_search_query text default null,
  p_result_limit integer default 24
)
returns table (
  place_id uuid,
  name text,
  address_line1 text,
  city text,
  region text,
  place_type public.place_type,
  sport_slugs text[],
  coach_count integer,
  from_price_cents integer,
  cover_image_url text
)
language sql
stable
security definer
set search_path = public
as $$
  with needle as (
    select lower(trim(coalesce(p_search_query, ''))) as value
  ),
  place_coaches as (
    select
      p.id as place_id,
      p.name,
      p.address_line1,
      p.city,
      p.region,
      p.place_type,
      p.cover_image_url,
      count(distinct cp.coach_id)::integer as coach_count
    from public.places p
    join public.coach_places cp on cp.place_id = p.id
    join public.profiles prof on prof.id = cp.coach_id
      and prof.anonymized_at is null
    cross join needle n
    where cp.marketplace_visible = true
      and p.place_type <> 'online'
      and (
        n.value = ''
        or p.name ilike '%' || n.value || '%'
        or coalesce(p.address_line1, '') ilike '%' || n.value || '%'
        or coalesce(p.city, '') ilike '%' || n.value || '%'
        or coalesce(p.region, '') ilike '%' || n.value || '%'
      )
    group by p.id, p.name, p.address_line1, p.city, p.region, p.place_type, p.cover_image_url
    having count(distinct cp.coach_id) >= 1
  ),
  org_published_places as (
    select
      p.id as place_id,
      p.name,
      p.address_line1,
      p.city,
      p.region,
      p.place_type,
      p.cover_image_url,
      0::integer as coach_count
    from public.places p
    join public.organization_places op on op.place_id = p.id
    join public.organizations o on o.id = op.organization_id
    cross join needle n
    where op.is_published = true
      and o.kind = 'team'
      and p.place_type <> 'online'
      and (
        n.value = ''
        or p.name ilike '%' || n.value || '%'
        or coalesce(p.address_line1, '') ilike '%' || n.value || '%'
        or coalesce(p.city, '') ilike '%' || n.value || '%'
        or coalesce(p.region, '') ilike '%' || n.value || '%'
      )
  ),
  venue_candidates as (
    select * from place_coaches
    union all
    select opp.*
    from org_published_places opp
    where not exists (
      select 1
      from place_coaches pc
      where pc.place_id = opp.place_id
    )
  ),
  place_tags as (
    select
      vc.place_id,
      array_agg(distinct slug order by slug) as sport_slugs
    from venue_candidates vc
    cross join lateral (
      select st.slug
      from public.coach_places cp
      join public.profiles prof on prof.id = cp.coach_id
        and prof.anonymized_at is null
      join public.coach_profiles cprof on cprof.user_id = cp.coach_id
      join public.coach_sport_tags cst on cst.coach_profile_id = cprof.id
      join public.sport_tags st on st.id = cst.sport_tag_id
      where cp.place_id = vc.place_id
        and cp.marketplace_visible = true
      union
      select distinct c.sport_slug
      from public.courts c
      join public.organization_places op on op.place_id = vc.place_id
        and op.is_published = true
      join public.organizations o on o.id = op.organization_id
        and o.kind = 'team'
      where c.place_id = vc.place_id
        and c.organization_id = o.id
        and c.is_active = true
    ) tags(slug)
    group by vc.place_id
  ),
  place_prices as (
    select
      csp.place_id,
      min(csp.price_cents) filter (where csp.is_published = true) as from_price_cents
    from public.coach_service_plans csp
    join public.profiles prof on prof.id = csp.coach_id
      and prof.anonymized_at is null
    where csp.place_id is not null
    group by csp.place_id
  )
  select
    vc.place_id,
    vc.name,
    vc.address_line1,
    vc.city,
    vc.region,
    vc.place_type,
    coalesce(pt.sport_slugs, '{}'::text[]) as sport_slugs,
    vc.coach_count,
    pp.from_price_cents,
    vc.cover_image_url
  from venue_candidates vc
  left join place_tags pt on pt.place_id = vc.place_id
  left join place_prices pp on pp.place_id = vc.place_id
  where cardinality(coalesce(p_tag_slugs, '{}')) = 0
     or (
       select count(*)
       from unnest(p_tag_slugs) as required(slug)
       where exists (
         select 1
         from public.coach_places cp2
         join public.profiles prof2 on prof2.id = cp2.coach_id
           and prof2.anonymized_at is null
         join public.coach_profiles cprof2 on cprof2.user_id = cp2.coach_id
         join public.coach_sport_tags cst2 on cst2.coach_profile_id = cprof2.id
         join public.sport_tags st on st.id = cst2.sport_tag_id
         where cp2.place_id = vc.place_id
           and cp2.marketplace_visible = true
           and st.slug = required.slug
       )
       or exists (
         select 1
         from public.courts c2
         join public.organization_places op2 on op2.place_id = vc.place_id
           and op2.is_published = true
         join public.organizations o2 on o2.id = op2.organization_id
           and o2.kind = 'team'
         where c2.place_id = vc.place_id
           and c2.organization_id = o2.id
           and c2.is_active = true
           and c2.sport_slug = required.slug
       )
     ) = cardinality(p_tag_slugs)
  order by vc.coach_count desc, vc.name asc
  limit greatest(1, least(coalesce(p_result_limit, 24), 100));
$$;

revoke all on function public.search_marketplace_venues(text[], text, integer) from public;
grant execute on function public.search_marketplace_venues(text[], text, integer) to anon, authenticated;

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
  v_org_published boolean := false;
  v_booking_org_id uuid;
  v_opening_hours jsonb;
  v_public_description text;
  v_amenity_slugs text[];
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
    p.longitude,
    p.cover_image_url
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

  select exists (
    select 1
    from public.organization_places op
    join public.organizations o on o.id = op.organization_id
    where op.place_id = p_place_id
      and op.is_published = true
      and o.kind = 'team'
  )
  into v_org_published;

  if coalesce(v_coach_count, 0) < 1 and not v_org_published then
    return null;
  end if;

  select
    op.organization_id,
    op.opening_hours,
    op.public_description,
    coalesce(op.amenity_slugs, '{}'::text[])
  into v_booking_org_id, v_opening_hours, v_public_description, v_amenity_slugs
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

  if v_booking_org_id is null then
    select op.public_description, coalesce(op.amenity_slugs, '{}'::text[])
    into v_public_description, v_amenity_slugs
    from public.organization_places op
    join public.organizations o on o.id = op.organization_id
    where op.place_id = p_place_id
      and op.is_published = true
      and o.kind = 'team'
    order by op.is_primary desc, op.sort_order asc, op.created_at asc
    limit 1;
  end if;

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
    'cover_image_url', v_place.cover_image_url,
    'public_description', v_public_description,
    'amenity_slugs', to_jsonb(coalesce(v_amenity_slugs, '{}'::text[])),
    'coach_count', coalesce(v_coach_count, 0),
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
      coalesce(v_court_sport_slugs, '[]'::jsonb)
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
              'coach_user_id', csp.coach_id,
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
          left join public.coach_places cpl
            on cpl.coach_id = csp.coach_id
           and cpl.place_id = p_place_id
           and cpl.marketplace_visible = true
          left join public.sport_tags st on st.id = csp.sport_tag_id
          where csp.place_id = p_place_id
            and csp.is_published = true
            and (
              cpl.coach_id is not null
              or v_org_published
            )
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
  'Public venue storefront; visible when org-published or marketplace coaches are linked.';

comment on function public.search_marketplace_venues(text[], text, integer) is
  'Marketplace venue browse: org-published team venues and coach-linked places.';
