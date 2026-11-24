-- 085_marketplace_coaching_booking.sql
-- Allow clients to read published service plans and request sessions from
-- marketplace-discoverable coaches before an active roster link exists.
-- On coach accept, ensure an active coach_client_relationship is created.

-- ---------------------------------------------------------------------------
-- resolve_coach_crm_organization_id — shared org lookup for CRM writes
-- ---------------------------------------------------------------------------

create or replace function public.resolve_coach_crm_organization_id(p_coach_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(cp.current_organization_id, cp.source_organization_id)
  from public.coach_profiles cp
  where cp.user_id = p_coach_id
  limit 1;
$$;

revoke all on function public.resolve_coach_crm_organization_id(uuid) from public;
grant execute on function public.resolve_coach_crm_organization_id(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_booking_service_plan_context — roster OR marketplace discoverable coach
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
  v_has_relationship boolean;
begin
  if v_client is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_coach_id is null or p_plan_id is null then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  v_has_relationship := public.coach_has_active_client(p_coach_id, v_client);

  if not v_has_relationship
     and not public.coach_is_marketplace_discoverable(p_coach_id) then
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

-- ---------------------------------------------------------------------------
-- create_coaching_booking_request — roster OR marketplace plan request
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
  v_has_relationship boolean;
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

  v_has_relationship := public.coach_has_active_client(p_coach_id, v_client);

  if not v_has_relationship then
    if p_service_plan_id is null then
      return jsonb_build_object('success', false, 'error', 'no_active_relationship');
    end if;

    if not public.coach_is_marketplace_discoverable(p_coach_id) then
      return jsonb_build_object('success', false, 'error', 'invalid_service_plan');
    end if;

    select csp.*
    into v_plan
    from public.coach_service_plans csp
    where csp.id = p_service_plan_id
      and csp.coach_id = p_coach_id
      and csp.is_published = true;

    if not found then
      return jsonb_build_object('success', false, 'error', 'invalid_service_plan');
    end if;

    v_org_id := public.resolve_coach_crm_organization_id(p_coach_id);

    if v_org_id is null then
      return jsonb_build_object('success', false, 'error', 'organization_not_found');
    end if;
  else
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

-- ---------------------------------------------------------------------------
-- accept_booking_request — provision roster link when missing
-- ---------------------------------------------------------------------------

create or replace function public.accept_booking_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach uuid := auth.uid();
  v_row public.booking_requests%rowtype;
  v_session_id uuid;
  v_now timestamptz := timezone('utc', now());
begin
  if v_coach is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  begin
    v_row := public._coach_booking_request_for_update(p_request_id);
  exception
    when others then
      return jsonb_build_object('success', false, 'error', sqlerrm);
  end;

  if v_row.status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'not_pending');
  end if;

  insert into public.coach_client_relationships (
    coach_id,
    client_id,
    organization_id,
    status
  )
  values (
    v_row.coach_id,
    v_row.client_id,
    v_row.organization_id,
    'active'
  )
  on conflict (coach_id, client_id, organization_id) do update
    set status = 'active',
        updated_at = v_now;

  insert into public.sessions (
    coach_id,
    client_id,
    organization_id,
    title,
    sport_type,
    starts_at,
    ends_at,
    duration_minutes,
    status
  )
  values (
    v_row.coach_id,
    v_row.client_id,
    v_row.organization_id,
    v_row.sport_type || ' session',
    v_row.sport_type,
    v_row.starts_at,
    v_row.ends_at,
    v_row.duration_minutes,
    'upcoming'
  )
  returning id into v_session_id;

  update public.booking_requests
  set status = 'accepted',
      session_id = v_session_id,
      reviewed_at = v_now,
      reviewed_by = v_coach,
      decline_reason = null,
      updated_at = v_now
  where id = v_row.id;

  return jsonb_build_object(
    'success', true,
    'request_id', v_row.id,
    'session_id', v_session_id,
    'status', 'accepted',
    'email_kind', 'booking_accepted'
  );
end;
$$;
