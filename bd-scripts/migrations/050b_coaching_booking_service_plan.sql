-- 050b_coaching_booking_service_plan.sql — Sprint 16 plan picker on booking requests
-- Depends on: 050_booking_requests.sql, 028_place_types_and_service_plans.sql

-- ---------------------------------------------------------------------------
-- get_booking_service_plan_context — client reads published plan for active coach
-- ---------------------------------------------------------------------------

create or replace function public.get_booking_service_plan_context(
  p_coach_id uuid,
  p_plan_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid := auth.uid();
  v_plan public.coach_service_plans%rowtype;
  v_sport_slug text;
begin
  if v_client is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_coach_id is null or p_plan_id is null then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if not public.coach_has_active_client(p_coach_id, v_client) then
    return jsonb_build_object('success', false, 'error', 'no_active_relationship');
  end if;

  select csp.*
  into v_plan
  from public.coach_service_plans csp
  where csp.id = p_plan_id
    and csp.coach_id = p_coach_id
    and csp.is_published = true;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  select st.slug
  into v_sport_slug
  from public.sport_tags st
  where st.id = v_plan.sport_tag_id;

  return jsonb_build_object(
    'success', true,
    'plan', jsonb_build_object(
      'id', v_plan.id,
      'title', v_plan.title,
      'duration_minutes', v_plan.duration_minutes,
      'sport_tag_slug', v_sport_slug,
      'court_included', v_plan.court_included,
      'membership_policy', v_plan.membership_policy,
      'equipment_policy', v_plan.equipment_policy
    )
  );
end;
$$;

revoke all on function public.get_booking_service_plan_context(uuid, uuid) from public;
grant execute on function public.get_booking_service_plan_context(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- create_coaching_booking_request — optional service plan
-- ---------------------------------------------------------------------------

create or replace function public.create_coaching_booking_request(
  p_coach_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_sport_type text,
  p_client_note text default null,
  p_service_plan_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid := auth.uid();
  v_sport text := trim(coalesce(p_sport_type, ''));
  v_org_id uuid;
  v_ends_at timestamptz;
  v_request_id uuid;
  v_note text := nullif(trim(coalesce(p_client_note, '')), '');
  v_plan public.coach_service_plans%rowtype;
begin
  if v_client is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_coach_id is null then
    return jsonb_build_object('success', false, 'error', 'missing_coach');
  end if;

  if p_starts_at is null then
    return jsonb_build_object('success', false, 'error', 'missing_starts_at');
  end if;

  if p_duration_minutes is null or p_duration_minutes <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_duration');
  end if;

  if v_sport = '' then
    return jsonb_build_object('success', false, 'error', 'missing_sport_type');
  end if;

  if not public.coach_has_active_client(p_coach_id, v_client) then
    return jsonb_build_object('success', false, 'error', 'no_active_relationship');
  end if;

  if p_service_plan_id is not null then
    select csp.*
    into v_plan
    from public.coach_service_plans csp
    where csp.id = p_service_plan_id
      and csp.coach_id = p_coach_id
      and csp.is_published = true;

    if not found then
      return jsonb_build_object('success', false, 'error', 'invalid_service_plan');
    end if;
  end if;

  select r.organization_id
  into v_org_id
  from public.coach_client_relationships r
  where r.coach_id = p_coach_id
    and r.client_id = v_client
    and r.status = 'active'
  limit 1;

  if v_org_id is null then
    return jsonb_build_object('success', false, 'error', 'organization_not_found');
  end if;

  v_ends_at := p_starts_at + (p_duration_minutes || ' minutes')::interval;

  insert into public.booking_requests (
    kind,
    coach_id,
    client_id,
    organization_id,
    sport_type,
    starts_at,
    ends_at,
    duration_minutes,
    status,
    client_note,
    service_plan_id
  )
  values (
    'coaching',
    p_coach_id,
    v_client,
    v_org_id,
    v_sport,
    p_starts_at,
    v_ends_at,
    p_duration_minutes,
    'pending',
    v_note,
    p_service_plan_id
  )
  returning id into v_request_id;

  return jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'status', 'pending'
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'duplicate_pending_request');
end;
$$;

revoke all on function public.create_coaching_booking_request(uuid, timestamptz, integer, text, text, uuid) from public;
grant execute on function public.create_coaching_booking_request(uuid, timestamptz, integer, text, text, uuid) to authenticated;

-- Drop legacy 5-arg overload so clients cannot bypass plan validation path ambiguity.
drop function if exists public.create_coaching_booking_request(uuid, timestamptz, integer, text, text);
