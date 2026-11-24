-- 051_booking_court_request.sql — Sprint 17 manual court-time requests from facility profile
-- Depends on: 050_booking_requests.sql, 028_place_types_and_service_plans.sql

-- ---------------------------------------------------------------------------
-- place_id on booking_requests (court requests only in v1)
-- ---------------------------------------------------------------------------

alter table public.booking_requests
  add column if not exists place_id uuid references public.places (id) on delete set null;

create index if not exists booking_requests_place_id_idx
  on public.booking_requests (place_id)
  where place_id is not null;

-- ---------------------------------------------------------------------------
-- create_court_booking_request — marketplace facility profile CTA
-- ponytail: v1 routes to primary marketplace_visible coach at the place.
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
        and cpl.marketplace_visible = true
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

revoke all on function public.create_court_booking_request(uuid, timestamptz, integer, text) from public;
grant execute on function public.create_court_booking_request(uuid, timestamptz, integer, text) to authenticated;
