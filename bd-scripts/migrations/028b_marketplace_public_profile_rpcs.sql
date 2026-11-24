-- 028b_marketplace_public_profile_rpcs.sql — Sprint 16 public coach/facility profiles
-- Depends on: 028_place_types_and_service_plans.sql

-- ---------------------------------------------------------------------------
-- Max 12 published service plans per coach
-- ---------------------------------------------------------------------------

create or replace function public.enforce_coach_service_plan_publish_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_published_count integer;
begin
  if not coalesce(NEW.is_published, false) then
    return NEW;
  end if;

  select count(*)::integer
  into v_published_count
  from public.coach_service_plans csp
  where csp.coach_id = NEW.coach_id
    and csp.is_published = true
    and csp.id is distinct from NEW.id;

  if v_published_count >= 12 then
    raise exception 'max_published_service_plans'
      using hint = 'A coach may publish at most 12 service plans.';
  end if;

  return NEW;
end;
$$;

drop trigger if exists coach_service_plans_publish_limit on public.coach_service_plans;
create trigger coach_service_plans_publish_limit
  before insert or update of is_published on public.coach_service_plans
  for each row execute function public.enforce_coach_service_plan_publish_limit();

-- ---------------------------------------------------------------------------
-- get_public_coach_profile — marketplace storefront (no email)
-- ---------------------------------------------------------------------------

create or replace function public.get_public_coach_profile(p_coach_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row record;
  v_visible boolean;
begin
  if p_coach_profile_id is null then
    return null;
  end if;

  select
    cp.id as coach_profile_id,
    cp.user_id as coach_user_id,
    cp.bio,
    cp.rating_avg,
    coalesce(nullif(trim(p.display_name), ''), 'Coach') as display_name,
    p.avatar_url
  into v_row
  from public.coach_profiles cp
  join public.profiles p on p.id = cp.user_id
  where cp.id = p_coach_profile_id;

  if not found then
    return null;
  end if;

  select exists (
    select 1
    from public.coach_places cpl
    where cpl.coach_id = v_row.coach_user_id
      and cpl.marketplace_visible = true
  )
  into v_visible;

  if not v_visible then
    return null;
  end if;

  return jsonb_build_object(
    'coach_profile_id', v_row.coach_profile_id,
    'coach_user_id', v_row.coach_user_id,
    'display_name', v_row.display_name,
    'avatar_url', v_row.avatar_url,
    'bio', v_row.bio,
    'rating_avg', v_row.rating_avg,
    'tag_slugs', coalesce(
      (
        select jsonb_agg(st.slug order by cst.is_primary desc, st.slug asc)
        from public.coach_sport_tags cst
        join public.sport_tags st on st.id = cst.sport_tag_id
        where cst.coach_profile_id = v_row.coach_profile_id
      ),
      '[]'::jsonb
    ),
    'facilities', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'place_id', pl.id,
            'name', pl.name,
            'city', pl.city,
            'region', pl.region,
            'place_type', pl.place_type,
            'is_primary', cpl.is_primary
          )
          order by cpl.is_primary desc, cpl.sort_order asc, pl.name asc
        )
        from public.coach_places cpl
        join public.places pl on pl.id = cpl.place_id
        where cpl.coach_id = v_row.coach_user_id
          and cpl.marketplace_visible = true
          and pl.place_type <> 'online'
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
              'title', csp.title,
              'description', csp.description,
              'duration_minutes', csp.duration_minutes,
              'price_cents', csp.price_cents,
              'currency', csp.currency,
              'sport_tag_slug', st.slug,
              'place_id', csp.place_id,
              'place_name', pl.name,
              'court_included', csp.court_included,
              'membership_policy', csp.membership_policy,
              'equipment_policy', csp.equipment_policy,
              'sort_order', csp.sort_order
            ) as plan_row,
            csp.sort_order as plan_sort,
            csp.created_at as plan_created
          from public.coach_service_plans csp
          left join public.sport_tags st on st.id = csp.sport_tag_id
          left join public.places pl on pl.id = csp.place_id
          where csp.coach_id = v_row.coach_user_id
            and csp.is_published = true
          order by csp.sort_order asc, csp.created_at asc
          limit 12
        ) published_plans
      ),
      '[]'::jsonb
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- get_public_facility_profile — venue storefront (no private coach data)
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
  where cp.place_id = p_place_id
    and cp.marketplace_visible = true;

  if coalesce(v_coach_count, 0) < 1 then
    return null;
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
          join public.coach_profiles cprof on cprof.user_id = cpl.coach_id
          join public.profiles p on p.id = cpl.coach_id
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
    )
  );
end;
$$;

revoke all on function public.get_public_coach_profile(uuid) from public;
grant execute on function public.get_public_coach_profile(uuid) to anon, authenticated;

revoke all on function public.get_public_facility_profile(uuid) from public;
grant execute on function public.get_public_facility_profile(uuid) to anon, authenticated;

comment on function public.get_public_coach_profile is
  'Marketplace coach storefront: published plans (max 12), facilities, sport tags; requires marketplace_visible coach_place.';

comment on function public.get_public_facility_profile is
  'Marketplace venue storefront: coach roster + published plans at place; requires marketplace_visible coaches.';
