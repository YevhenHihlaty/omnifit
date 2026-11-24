-- 104_payment_collection_usp.sql — Sprint 9 booking payment + free-first + phone gate
-- Extends sessions.payment_status for approve-flow USP; coach_profiles settings;
-- harden create/accept booking RPCs (phone required, busy-only conflict).

-- ---------------------------------------------------------------------------
-- coach_profiles: payment collection USP + free first session
-- ---------------------------------------------------------------------------

alter table public.coach_profiles
  add column if not exists payment_collection text
    not null default 'direct'
    constraint coach_profiles_payment_collection_chk
      check (payment_collection in ('in_app', 'direct'));

alter table public.coach_profiles
  add column if not exists free_first_session boolean
    not null default false;

comment on column public.coach_profiles.payment_collection is
  'How the coach collects session fees after approve: in_app (Stripe later) or direct (outside app).';
comment on column public.coach_profiles.free_first_session is
  'When true, first accepted session with a client has payment_status=not_required.';

-- ---------------------------------------------------------------------------
-- sessions.payment_status — expand beyond 086 paid/pending/overdue
-- ---------------------------------------------------------------------------

alter table public.sessions
  drop constraint if exists sessions_payment_status_check;

alter table public.sessions
  add constraint sessions_payment_status_check
  check (
    payment_status is null
    or payment_status in (
      'paid',
      'pending',
      'overdue',
      'not_required',
      'awaiting_payment',
      'direct',
      'paid_offline'
    )
  );

-- ---------------------------------------------------------------------------
-- Helper: overlap for a client (busy only — never name the other coach)
-- ---------------------------------------------------------------------------

create or replace function public.client_has_session_conflict(
  p_client_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_exclude_session_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sessions s
    where s.client_id = p_client_id
      and s.status in ('upcoming', 'in_progress', 'completed')
      and (p_exclude_session_id is null or s.id <> p_exclude_session_id)
      and s.starts_at < p_ends_at
      and s.ends_at > p_starts_at
  );
$$;

revoke all on function public.client_has_session_conflict(uuid, timestamptz, timestamptz, uuid) from public;
grant execute on function public.client_has_session_conflict(uuid, timestamptz, timestamptz, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Resolve payment_status on accept
-- ---------------------------------------------------------------------------

create or replace function public.resolve_session_payment_status(
  p_coach_id uuid,
  p_client_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_free_first boolean := false;
  v_collection text := 'direct';
  v_prior int := 0;
begin
  select cp.free_first_session, cp.payment_collection
  into v_free_first, v_collection
  from public.coach_profiles cp
  where cp.user_id = p_coach_id;

  if not found then
    return 'direct';
  end if;

  if v_free_first then
    select count(*)::int
    into v_prior
    from public.sessions s
    where s.coach_id = p_coach_id
      and s.client_id = p_client_id
      and s.status in ('upcoming', 'in_progress', 'completed');

    if v_prior = 0 then
      return 'not_required';
    end if;
  end if;

  if v_collection = 'in_app' then
    return 'awaiting_payment';
  end if;

  return 'direct';
end;
$$;

revoke all on function public.resolve_session_payment_status(uuid, uuid) from public;
grant execute on function public.resolve_session_payment_status(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- create_coaching_booking_request — phone required + busy conflict
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
  v_phone text;
begin
  if v_client is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select p.phone_e164 into v_phone
  from public.profiles p
  where p.id = v_client;

  if v_phone is null or length(trim(v_phone)) = 0 then
    return jsonb_build_object('success', false, 'error', 'phone_required');
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

  v_ends_at := p_starts_at + (p_duration_minutes || ' minutes')::interval;

  if public.client_has_session_conflict(v_client, p_starts_at, v_ends_at, null) then
    return jsonb_build_object('success', false, 'error', 'slot_busy');
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
-- accept_booking_request — payment_status + busy conflict
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
  v_payment text;
begin
  if v_coach is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  begin
    v_row := public._coach_booking_request_for_update(p_request_id);
  exception
    when others then
      return jsonb_build_object('success', false, 'error', 'not_found');
  end;

  if v_row.status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'not_pending');
  end if;

  if public.client_has_session_conflict(
    v_row.client_id,
    v_row.starts_at,
    v_row.ends_at,
    null
  ) then
    return jsonb_build_object('success', false, 'error', 'slot_busy');
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

  v_payment := public.resolve_session_payment_status(v_row.coach_id, v_row.client_id);

  insert into public.sessions (
    coach_id,
    client_id,
    organization_id,
    title,
    sport_type,
    starts_at,
    ends_at,
    duration_minutes,
    status,
    payment_status
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
    'upcoming',
    v_payment
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
    'payment_status', v_payment,
    'email_kind', 'booking_accepted'
  );
end;
$$;

revoke all on function public.create_coaching_booking_request(uuid, timestamptz, integer, text, text, uuid) from public;
grant execute on function public.create_coaching_booking_request(uuid, timestamptz, integer, text, text, uuid) to authenticated;

revoke all on function public.accept_booking_request(uuid) from public;
grant execute on function public.accept_booking_request(uuid) to authenticated;
