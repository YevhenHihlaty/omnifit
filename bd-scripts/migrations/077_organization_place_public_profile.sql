-- 077_organization_place_public_profile.sql
-- Public venue profile fields (about, amenities) + place metadata update RPC.

alter table public.organization_places
  add column if not exists public_description text,
  add column if not exists amenity_slugs text[] not null default '{}'::text[];

comment on column public.organization_places.public_description is
  'Marketing copy for public venue profile (Playtomic-style about section).';

comment on column public.organization_places.amenity_slugs is
  'Amenity slugs shown on public venue profile; validated in application layer.';

create or replace function public.user_can_manage_org_place_public_profile(p_place_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_places op
    where op.place_id = p_place_id
      and public.is_org_ops_manager(op.organization_id)
  );
$$;

revoke all on function public.user_can_manage_org_place_public_profile(uuid) from public;
grant execute on function public.user_can_manage_org_place_public_profile(uuid) to authenticated;

create or replace function public.update_place_public_metadata(
  p_place_id uuid,
  p_address_line1 text,
  p_city text,
  p_region text,
  p_postal_code text,
  p_country text,
  p_latitude double precision,
  p_longitude double precision
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.user_can_manage_org_place_public_profile(p_place_id) then
    raise exception 'Forbidden';
  end if;

  update public.places
  set
    address_line1 = nullif(trim(p_address_line1), ''),
    city = nullif(trim(p_city), ''),
    region = nullif(trim(p_region), ''),
    postal_code = nullif(trim(p_postal_code), ''),
    country = nullif(trim(p_country), ''),
    latitude = p_latitude,
    longitude = p_longitude
  where id = p_place_id;

  if not found then
    raise exception 'Place not found';
  end if;
end;
$$;

revoke all on function public.update_place_public_metadata(
  uuid, text, text, text, text, text, double precision, double precision
) from public;
grant execute on function public.update_place_public_metadata(
  uuid, text, text, text, text, text, double precision, double precision
) to authenticated;

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

  if coalesce(v_coach_count, 0) < 1 then
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
  'Public venue storefront with cover, about, amenities, and booking_context.';
