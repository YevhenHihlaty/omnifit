-- 063_coach_profile_marketplace_visible.sql — coach-level discover opt-in (default hidden)
-- Depends on: 054_discover_exclude_anonymized_coaches.sql, 051b_booking_court_request.sql

alter table public.coach_profiles
  add column if not exists marketplace_visible boolean not null default false;

create index if not exists coach_profiles_marketplace_visible_idx
  on public.coach_profiles (marketplace_visible)
  where marketplace_visible = true;

comment on column public.coach_profiles.marketplace_visible is
  'Coach master switch for public discover/profile; also requires marketplace_visible coach_places.';

-- ponytail: single gate for discover RPCs — coach opt-in + visible place + not anonymized
create or replace function public.coach_is_marketplace_discoverable(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    cp.marketplace_visible = true
    and p.anonymized_at is null
    and exists (
      select 1
      from public.coach_places cpl
      where cpl.coach_id = cp.user_id
        and cpl.marketplace_visible = true
    )
  from public.coach_profiles cp
  join public.profiles p on p.id = cp.user_id
  where cp.user_id = p_user_id;
$$;

revoke all on function public.coach_is_marketplace_discoverable(uuid) from public;
grant execute on function public.coach_is_marketplace_discoverable(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- search_coaches_by_sport_tags — require coach_profiles.marketplace_visible
-- ---------------------------------------------------------------------------

create or replace function public.search_coaches_by_sport_tags(
  p_tag_slugs text[],
  p_search_query text default null,
  p_result_limit integer default 24
)
returns table (
  coach_profile_id uuid,
  display_name text,
  avatar_url text,
  city text,
  tag_slugs text[],
  rating_avg numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with needle as (
    select lower(trim(coalesce(p_search_query, ''))) as value
  ),
  marketplace_coaches as (
    select distinct cp.id as coach_profile_id, cp.user_id, cp.rating_avg
    from public.coach_profiles cp
    where public.coach_is_marketplace_discoverable(cp.user_id)
  ),
  coach_tags as (
    select
      mc.coach_profile_id,
      mc.user_id,
      mc.rating_avg,
      array_agg(distinct st.slug order by st.slug) as tag_slugs
    from marketplace_coaches mc
    join public.coach_sport_tags cst on cst.coach_profile_id = mc.coach_profile_id
    join public.sport_tags st on st.id = cst.sport_tag_id
    group by mc.coach_profile_id, mc.user_id, mc.rating_avg
  )
  select
    ct.coach_profile_id,
    coalesce(nullif(trim(p.display_name), ''), 'Coach') as display_name,
    p.avatar_url,
    (
      select pl.city
      from public.coach_places cpl
      join public.places pl on pl.id = cpl.place_id
      where cpl.coach_id = ct.user_id
        and cpl.marketplace_visible = true
      order by cpl.is_primary desc, cpl.sort_order asc
      limit 1
    ) as city,
    ct.tag_slugs,
    ct.rating_avg
  from coach_tags ct
  join public.profiles p on p.id = ct.user_id
    and p.anonymized_at is null
  cross join needle n
  where (
      n.value = ''
      or coalesce(nullif(trim(p.display_name), ''), 'Coach') ilike '%' || n.value || '%'
      or exists (
        select 1
        from public.coach_places cpl2
        join public.places pl2 on pl2.id = cpl2.place_id
        where cpl2.coach_id = ct.user_id
          and cpl2.marketplace_visible = true
          and (
            coalesce(pl2.city, '') ilike '%' || n.value || '%'
            or coalesce(pl2.name, '') ilike '%' || n.value || '%'
          )
      )
    )
    and (
      cardinality(coalesce(p_tag_slugs, '{}')) = 0
      or (
        select count(*)
        from unnest(p_tag_slugs) as required(slug)
        where required.slug = any (ct.tag_slugs)
      ) = cardinality(p_tag_slugs)
    )
  order by ct.rating_avg desc nulls last, display_name asc
  limit greatest(1, least(coalesce(p_result_limit, 24), 100));
$$;

-- ---------------------------------------------------------------------------
-- search_marketplace_venues — count only discoverable coaches
-- ---------------------------------------------------------------------------

drop function if exists public.search_marketplace_venues(text[], text, integer);

create or replace function public.search_marketplace_venues(
  p_tag_slugs text[],
  p_search_query text default null,
  p_result_limit integer default 24
)
returns table (
  place_id uuid,
  name text,
  city text,
  region text,
  place_type public.place_type,
  sport_slugs text[],
  coach_count integer,
  from_price_cents integer
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
      p.city,
      p.region,
      p.place_type,
      count(distinct cp.coach_id)::integer as coach_count
    from public.places p
    join public.coach_places cp on cp.place_id = p.id
    cross join needle n
    where public.coach_is_marketplace_discoverable(cp.coach_id)
      and p.place_type <> 'online'
      and (
        n.value = ''
        or p.name ilike '%' || n.value || '%'
        or coalesce(p.city, '') ilike '%' || n.value || '%'
        or coalesce(p.region, '') ilike '%' || n.value || '%'
      )
    group by p.id, p.name, p.city, p.region, p.place_type
    having count(distinct cp.coach_id) >= 1
  ),
  place_tags as (
    select
      pc.place_id,
      array_agg(distinct st.slug order by st.slug) as sport_slugs
    from place_coaches pc
    join public.coach_places cp on cp.place_id = pc.place_id
    join public.coach_profiles cprof on cprof.user_id = cp.coach_id
    join public.coach_sport_tags cst on cst.coach_profile_id = cprof.id
    join public.sport_tags st on st.id = cst.sport_tag_id
    where public.coach_is_marketplace_discoverable(cp.coach_id)
    group by pc.place_id
  ),
  place_prices as (
    select
      csp.place_id,
      min(csp.price_cents) filter (where csp.is_published = true) as from_price_cents
    from public.coach_service_plans csp
    join public.profiles prof on prof.id = csp.coach_id
      and prof.anonymized_at is null
    join public.coach_profiles cprof on cprof.user_id = csp.coach_id
      and cprof.marketplace_visible = true
    where csp.place_id is not null
    group by csp.place_id
  )
  select
    pc.place_id,
    pc.name,
    pc.city,
    pc.region,
    pc.place_type,
    coalesce(pt.sport_slugs, '{}'::text[]) as sport_slugs,
    pc.coach_count,
    pp.from_price_cents
  from place_coaches pc
  left join place_tags pt on pt.place_id = pc.place_id
  left join place_prices pp on pp.place_id = pc.place_id
  where cardinality(coalesce(p_tag_slugs, '{}')) = 0
     or (
       select count(*)
       from unnest(p_tag_slugs) as required(slug)
       where exists (
         select 1
         from public.coach_places cp2
         join public.coach_profiles cprof2 on cprof2.user_id = cp2.coach_id
         join public.coach_sport_tags cst2 on cst2.coach_profile_id = cprof2.id
         join public.sport_tags st on st.id = cst2.sport_tag_id
         where cp2.place_id = pc.place_id
           and public.coach_is_marketplace_discoverable(cp2.coach_id)
           and st.slug = required.slug
       )
     ) = cardinality(p_tag_slugs)
  order by pc.coach_count desc, pc.name asc
  limit greatest(1, least(coalesce(p_result_limit, 24), 100));
$$;

revoke all on function public.search_marketplace_venues(text[], text, integer) from public;
grant execute on function public.search_marketplace_venues(text[], text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- get_public_coach_profile — null when coach opted out
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
    and p.anonymized_at is null
  where cp.id = p_coach_profile_id;

  if not found then
    return null;
  end if;

  select public.coach_is_marketplace_discoverable(v_row.coach_user_id)
  into v_visible;

  if not coalesce(v_visible, false) then
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
-- get_public_facility_profile — roster excludes opted-out coaches
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
    and public.coach_is_marketplace_discoverable(cp.coach_id);

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
            and public.coach_is_marketplace_discoverable(cpl.coach_id)
        ) venue_tags
      ),
      '[]'::jsonb
    ),
    'from_price_cents', (
      select min(csp.price_cents)
      from public.coach_service_plans csp
      join public.coach_profiles cprof on cprof.user_id = csp.coach_id
        and cprof.marketplace_visible = true
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
            and public.coach_is_marketplace_discoverable(cpl.coach_id)
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
           and public.coach_is_marketplace_discoverable(cpl.coach_id)
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

-- ---------------------------------------------------------------------------
-- create_court_booking_request — route only to discoverable coaches
-- ---------------------------------------------------------------------------

create or replace function public.create_court_booking_request(
  p_place_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_client_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid := auth.uid();
  v_coach_id uuid;
  v_org_id uuid;
  v_sport text;
  v_ends_at timestamptz;
  v_request_id uuid;
  v_note text := nullif(trim(coalesce(p_client_note, '')), '');
  v_place_type public.place_type;
begin
  if v_client is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_place_id is null then
    return jsonb_build_object('success', false, 'error', 'missing_place');
  end if;

  if p_starts_at is null then
    return jsonb_build_object('success', false, 'error', 'missing_starts_at');
  end if;

  if p_duration_minutes is null or p_duration_minutes <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_duration');
  end if;

  select p.place_type
  into v_place_type
  from public.places p
  where p.id = p_place_id;

  if not found or v_place_type = 'online' then
    return jsonb_build_object('success', false, 'error', 'place_not_available');
  end if;

  select cp.coach_id, cprof.current_organization_id
  into v_coach_id, v_org_id
  from public.coach_places cp
  join public.coach_profiles cprof on cprof.user_id = cp.coach_id
  where cp.place_id = p_place_id
    and cp.marketplace_visible = true
    and cprof.marketplace_visible = true
  order by cp.is_primary desc, cp.sort_order asc, cp.created_at asc
  limit 1;

  if v_coach_id is null or v_org_id is null then
    return jsonb_build_object('success', false, 'error', 'coach_not_found');
  end if;

  select coalesce(
    (
      select st.slug
      from public.coach_places cpl
      join public.coach_profiles cprof on cprof.user_id = cpl.coach_id
      join public.coach_sport_tags cst on cst.coach_profile_id = cprof.id
      join public.sport_tags st on st.id = cst.sport_tag_id
      where cpl.place_id = p_place_id
        and public.coach_is_marketplace_discoverable(cpl.coach_id)
      order by cst.is_primary desc, st.slug asc
      limit 1
    ),
    'tennis'
  )
  into v_sport;

  v_ends_at := p_starts_at + (p_duration_minutes || ' minutes')::interval;

  insert into public.booking_requests (
    kind,
    coach_id,
    client_id,
    organization_id,
    place_id,
    sport_type,
    starts_at,
    ends_at,
    duration_minutes,
    status,
    client_note
  )
  values (
    'court',
    v_coach_id,
    v_client,
    v_org_id,
    p_place_id,
    v_sport,
    p_starts_at,
    v_ends_at,
    p_duration_minutes,
    'pending',
    v_note
  )
  returning id into v_request_id;

  return jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'status', 'pending',
    'coach_id', v_coach_id
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'duplicate_pending_request');
end;
$$;

-- ---------------------------------------------------------------------------
-- anonymize_own_account — clear coach-level discover opt-in
-- ---------------------------------------------------------------------------

create or replace function public.anonymize_own_account()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_placeholder_email text;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select p.email
  into v_email
  from public.profiles p
  where p.id = v_uid;

  if not found then
    return jsonb_build_object('success', false, 'error', 'profile_not_found');
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id = v_uid
      and p.anonymized_at is not null
  ) then
    return jsonb_build_object('success', false, 'error', 'already_anonymized');
  end if;

  v_placeholder_email := public.anonymized_profile_email(v_uid);

  update public.coach_client_relationships r
  set status = 'archived'
  where (r.coach_id = v_uid or r.client_id = v_uid)
    and r.status = 'active';

  update public.organization_members m
  set
    status = 'removed',
    removed_at = timezone('utc', now())
  where m.user_id = v_uid
    and m.status = 'active';

  update public.client_invites i
  set
    status = 'revoked',
    revoked_at = timezone('utc', now())
  where i.coach_id = v_uid
    and i.status = 'pending';

  update public.organization_invites i
  set
    status = 'revoked',
    revoked_at = timezone('utc', now())
  where i.status = 'pending'
    and (
      i.invited_by = v_uid
      or lower(i.email) = lower(v_email)
    );

  update public.coach_places
  set marketplace_visible = false
  where coach_id = v_uid;

  update public.coach_profiles cp
  set
    bio = null,
    specialties = null,
    marketplace_visible = false
  where cp.user_id = v_uid;

  update public.client_profiles cp
  set
    goal = null,
    height_cm = null,
    weight_kg = null,
    date_of_birth = null,
    rocketplay_interests = '{}',
    rocketplay_level = null,
    rocketplay_onboarding_completed_at = null
  where cp.user_id = v_uid;

  update public.organizations o
  set
    name = 'Removed account',
    slug = null,
    logo_url = null
  where o.owner_id = v_uid
    and o.kind = 'personal';

  update public.profiles p
  set
    email = v_placeholder_email,
    display_name = 'Removed user',
    avatar_url = null,
    gender = null,
    anonymized_at = timezone('utc', now())
  where p.id = v_uid;

  delete from auth.users u
  where u.id = v_uid;

  return jsonb_build_object('success', true);
exception
  when others then
    return jsonb_build_object('success', false, 'error', 'anonymize_failed');
end;
$$;

comment on function public.coach_is_marketplace_discoverable is
  'True when coach opted into discover, is not anonymized, and has a marketplace_visible place.';
comment on function public.search_coaches_by_sport_tags is
  'Marketplace coach discover; requires coach_profiles.marketplace_visible and visible coach_places.';
comment on function public.get_public_coach_profile is
  'Marketplace coach storefront; null when coach opted out or has no visible places.';
