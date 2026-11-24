-- 050_booking_requests.sql — coach session booking requests (Sprint 14)
-- ponytail: court bookings stay on court_* tables; coaching uses this table.
-- Mirrors 047 pending → accept/decline semantics; provision on accept = separate RPC (M5).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $do$
begin
  create type public.booking_request_kind as enum ('coaching', 'court');
exception
  when duplicate_object then null;
end $do$;

do $do$
begin
  create type public.booking_request_status as enum (
    'pending',
    'accepted',
    'declined',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $do$;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  kind public.booking_request_kind not null default 'coaching',
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sport_type text not null check (char_length(trim(sport_type)) > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  status public.booking_request_status not null default 'pending',
  client_note text,
  decline_reason text,
  session_id uuid references public.sessions (id) on delete set null,
  service_plan_id uuid,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at)
);

create index if not exists booking_requests_coach_pending_starts_idx
  on public.booking_requests (coach_id, starts_at)
  where status = 'pending';

create index if not exists booking_requests_client_created_idx
  on public.booking_requests (client_id, created_at desc);

create unique index if not exists booking_requests_one_pending_per_slot_idx
  on public.booking_requests (coach_id, client_id, starts_at)
  where status = 'pending';

drop trigger if exists booking_requests_set_updated_at on public.booking_requests;
create trigger booking_requests_set_updated_at
  before update on public.booking_requests
  for each row execute function public.set_updated_at();

alter table public.booking_requests enable row level security;

-- Read-only RLS; mutations via SECURITY DEFINER RPCs (mirror court_reservations).
drop policy if exists booking_requests_select_coach on public.booking_requests;
create policy booking_requests_select_coach
  on public.booking_requests for select
  to authenticated
  using (coach_id = auth.uid());

drop policy if exists booking_requests_select_client on public.booking_requests;
create policy booking_requests_select_client
  on public.booking_requests for select
  to authenticated
  using (client_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Internal: load pending request for coach mutation
-- ---------------------------------------------------------------------------

create or replace function public._coach_booking_request_for_update(p_request_id uuid)
returns public.booking_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach uuid := auth.uid();
  v_row public.booking_requests%rowtype;
begin
  if v_coach is null then
    raise exception 'not_authenticated';
  end if;

  select *
  into v_row
  from public.booking_requests br
  where br.id = p_request_id
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  if v_row.coach_id <> v_coach then
    raise exception 'forbidden';
  end if;

  return v_row;
end;
$$;

revoke all on function public._coach_booking_request_for_update(uuid) from public;

-- ---------------------------------------------------------------------------
-- create_coaching_booking_request
-- ---------------------------------------------------------------------------

create or replace function public.create_coaching_booking_request(
  p_coach_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_sport_type text,
  p_client_note text default null
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
    client_note
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
    v_note
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

revoke all on function public.create_coaching_booking_request(uuid, timestamptz, integer, text, text) from public;
grant execute on function public.create_coaching_booking_request(uuid, timestamptz, integer, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- accept_booking_request — creates session
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

revoke all on function public.accept_booking_request(uuid) from public;
grant execute on function public.accept_booking_request(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- decline_booking_request — reason required
-- ---------------------------------------------------------------------------

create or replace function public.decline_booking_request(
  p_request_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach uuid := auth.uid();
  v_row public.booking_requests%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
  v_now timestamptz := timezone('utc', now());
begin
  if v_reason = '' then
    return jsonb_build_object('success', false, 'error', 'reason_required');
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

  update public.booking_requests
  set status = 'declined',
      decline_reason = v_reason,
      reviewed_at = v_now,
      reviewed_by = v_coach,
      updated_at = v_now
  where id = v_row.id;

  return jsonb_build_object(
    'success', true,
    'request_id', v_row.id,
    'status', 'declined',
    'email_kind', 'booking_declined'
  );
end;
$$;

revoke all on function public.decline_booking_request(uuid, text) from public;
grant execute on function public.decline_booking_request(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- cancel_booking_request — client, pending only
-- ---------------------------------------------------------------------------

create or replace function public.cancel_booking_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid := auth.uid();
  v_row public.booking_requests%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if v_client is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select *
  into v_row
  from public.booking_requests br
  where br.id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_row.client_id <> v_client then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if v_row.status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'not_pending');
  end if;

  update public.booking_requests
  set status = 'cancelled',
      updated_at = v_now
  where id = v_row.id;

  return jsonb_build_object(
    'success', true,
    'request_id', v_row.id,
    'status', 'cancelled'
  );
end;
$$;

revoke all on function public.cancel_booking_request(uuid) from public;
grant execute on function public.cancel_booking_request(uuid) to authenticated;
