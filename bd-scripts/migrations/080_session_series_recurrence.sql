-- 080_session_series_recurrence.sql — recurring coach training sessions

-- ---------------------------------------------------------------------------
-- Series metadata + session link
-- ---------------------------------------------------------------------------

create table if not exists public.session_series (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  sport_type text,
  duration_minutes integer not null check (duration_minutes > 0),
  rule jsonb not null,
  timezone text not null default 'UTC',
  client_id uuid references public.profiles (id) on delete set null,
  guest_client_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint session_series_client_or_guest_check
    check (
      (
        client_id is not null
        and guest_client_name is null
      )
      or (
        client_id is null
        and guest_client_name is not null
        and length(trim(guest_client_name)) > 0
      )
    )
);

create index if not exists session_series_coach_id_idx
  on public.session_series (coach_id);

drop trigger if exists session_series_set_updated_at on public.session_series;
create trigger session_series_set_updated_at
  before update on public.session_series
  for each row execute function public.set_updated_at();

alter table public.sessions
  add column if not exists series_id uuid references public.session_series (id) on delete set null;

create index if not exists sessions_series_starts_at_idx
  on public.sessions (series_id, starts_at)
  where series_id is not null;

alter table public.client_invites
  add column if not exists origin_series_id uuid references public.session_series (id) on delete set null;

create index if not exists client_invites_origin_series_id_idx
  on public.client_invites (origin_series_id)
  where origin_series_id is not null;

-- ---------------------------------------------------------------------------
-- RLS — session_series mirrors coach session management
-- ---------------------------------------------------------------------------

alter table public.session_series enable row level security;

drop policy if exists session_series_select_manageable on public.session_series;
create policy session_series_select_manageable
  on public.session_series for select
  to authenticated
  using (public.can_manage_coach_sessions(coach_id));

drop policy if exists session_series_insert_manageable on public.session_series;
create policy session_series_insert_manageable
  on public.session_series for insert
  to authenticated
  with check (public.can_manage_coach_sessions(coach_id));

drop policy if exists session_series_update_manageable on public.session_series;
create policy session_series_update_manageable
  on public.session_series for update
  to authenticated
  using (public.can_manage_coach_sessions(coach_id))
  with check (public.can_manage_coach_sessions(coach_id));

drop policy if exists session_series_delete_manageable on public.session_series;
create policy session_series_delete_manageable
  on public.session_series for delete
  to authenticated
  using (public.can_manage_coach_sessions(coach_id));

-- ---------------------------------------------------------------------------
-- Occurrence expansion (rolling horizon, max 26 weeks)
-- ---------------------------------------------------------------------------

create or replace function public.expand_session_series_occurrences(
  p_starts_at timestamptz,
  p_rule jsonb
)
returns timestamptz[]
language plpgsql
immutable
as $$
declare
  v_freq text := lower(coalesce(p_rule ->> 'freq', ''));
  v_interval int := greatest(coalesce((p_rule ->> 'interval')::int, 1), 1);
  v_count int := coalesce((p_rule ->> 'count')::int, 0);
  v_until timestamptz := (p_rule ->> 'until')::timestamptz;
  v_horizon timestamptz := p_starts_at + interval '26 weeks';
  v_occurrences timestamptz[] := array[]::timestamptz[];
  v_cursor timestamptz := p_starts_at;
  v_time time := (p_starts_at at time zone 'UTC')::time;
  v_week_anchor date := date_trunc('week', p_starts_at)::date;
  v_week_offset int;
  v_day date;
  v_dow int;
  v_candidate timestamptz;
  v_weekday int;
  v_i int;
  v_max int := 200;
begin
  if v_freq not in ('daily', 'weekly') then
    raise exception 'invalid recurrence freq';
  end if;

  if v_count <= 0 and v_until is null then
    v_count := case when v_freq = 'daily' then 30 else 52 end;
  end if;

  if v_until is not null and v_until > v_horizon then
    v_until := v_horizon;
  end if;

  if v_until is null then
    v_until := v_horizon;
  end if;

  if v_freq = 'daily' then
    while v_cursor <= v_until
      and (v_count <= 0 or coalesce(array_length(v_occurrences, 1), 0) < v_count)
      and coalesce(array_length(v_occurrences, 1), 0) < v_max
    loop
      v_occurrences := array_append(v_occurrences, v_cursor);
      v_cursor := v_cursor + make_interval(days => v_interval);
    end loop;
  else
    if jsonb_typeof(p_rule -> 'byweekday') <> 'array'
      or jsonb_array_length(p_rule -> 'byweekday') = 0
    then
      raise exception 'weekly recurrence requires byweekday';
    end if;

    v_cursor := date_trunc('day', p_starts_at);
    while v_cursor <= v_until
      and (v_count <= 0 or coalesce(array_length(v_occurrences, 1), 0) < v_count)
      and coalesce(array_length(v_occurrences, 1), 0) < v_max
    loop
      v_dow := extract(isodow from v_cursor)::int;
      if exists (
        select 1
        from jsonb_array_elements_text(p_rule -> 'byweekday') elem(value)
        where elem.value::int = v_dow
      ) then
        v_week_offset := floor(
          extract(epoch from (date_trunc('week', v_cursor) - v_week_anchor)) / 604800
        )::int;
        if v_week_offset % v_interval = 0 then
          v_candidate := (v_cursor::date + v_time) at time zone 'UTC';
          if v_candidate >= p_starts_at then
            v_occurrences := array_append(v_occurrences, v_candidate);
          end if;
        end if;
      end if;
      v_cursor := v_cursor + interval '1 day';
    end loop;
  end if;

  if coalesce(array_length(v_occurrences, 1), 0) < 2 then
    raise exception 'recurrence must produce at least two sessions';
  end if;

  return v_occurrences;
end;
$$;

revoke all on function public.expand_session_series_occurrences(timestamptz, jsonb) from public;
grant execute on function public.expand_session_series_occurrences(timestamptz, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- create_session_series
-- ---------------------------------------------------------------------------

create or replace function public.create_session_series(
  p_coach_id uuid,
  p_organization_id uuid,
  p_title text,
  p_sport_type text,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_client_id uuid,
  p_guest_client_name text,
  p_rule jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_series_id uuid;
  v_occurrences timestamptz[];
  v_occurrence timestamptz;
  v_ends_at timestamptz;
  v_session_ids uuid[] := array[]::uuid[];
  v_session_id uuid;
  v_now timestamptz := timezone('utc', now());
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if not public.can_manage_coach_sessions(p_coach_id) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if coalesce(trim(p_title), '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_title');
  end if;

  if p_duration_minutes is null or p_duration_minutes <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_duration');
  end if;

  if p_client_id is not null then
    if not public.coach_has_active_client(p_coach_id, p_client_id) then
      return jsonb_build_object('success', false, 'error', 'client_not_on_roster');
    end if;
  elsif coalesce(trim(p_guest_client_name), '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_participant');
  end if;

  begin
    v_occurrences := public.expand_session_series_occurrences(p_starts_at, p_rule);
  exception
    when others then
      return jsonb_build_object('success', false, 'error', 'invalid_recurrence_rule');
  end;

  insert into public.session_series (
    coach_id,
    organization_id,
    title,
    sport_type,
    duration_minutes,
    rule,
    client_id,
    guest_client_name
  )
  values (
    p_coach_id,
    p_organization_id,
    trim(p_title),
    nullif(trim(coalesce(p_sport_type, '')), ''),
    p_duration_minutes,
    p_rule,
    p_client_id,
    case
      when p_client_id is not null then null
      else trim(p_guest_client_name)
    end
  )
  returning id into v_series_id;

  foreach v_occurrence in array v_occurrences loop
    v_ends_at := v_occurrence + make_interval(mins => p_duration_minutes);

    insert into public.sessions (
      coach_id,
      organization_id,
      series_id,
      title,
      sport_type,
      starts_at,
      ends_at,
      duration_minutes,
      client_id,
      guest_client_name,
      status
    )
    values (
      p_coach_id,
      p_organization_id,
      v_series_id,
      trim(p_title),
      nullif(trim(coalesce(p_sport_type, '')), ''),
      v_occurrence,
      v_ends_at,
      p_duration_minutes,
      p_client_id,
      case
        when p_client_id is not null then null
        else trim(p_guest_client_name)
      end,
      'upcoming'
    )
    returning id into v_session_id;

    v_session_ids := array_append(v_session_ids, v_session_id);
  end loop;

  return jsonb_build_object(
    'success', true,
    'series_id', v_series_id,
    'session_ids', to_jsonb(v_session_ids),
    'count', coalesce(array_length(v_session_ids, 1), 0)
  );
end;
$$;

revoke all on function public.create_session_series(
  uuid, uuid, text, text, timestamptz, integer, uuid, text, jsonb
) from public;
grant execute on function public.create_session_series(
  uuid, uuid, text, text, timestamptz, integer, uuid, text, jsonb
) to authenticated;

-- ---------------------------------------------------------------------------
-- cancel_session_series_scope
-- ---------------------------------------------------------------------------

create or replace function public.cancel_session_series_scope(
  p_session_id uuid,
  p_scope text default 'this'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.sessions%rowtype;
  v_deleted int := 0;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select *
  into v_session
  from public.sessions s
  where s.id = p_session_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if not public.can_manage_coach_sessions(v_session.coach_id) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if v_session.series_id is null or p_scope = 'this' then
    delete from public.sessions s
    where s.id = p_session_id;
    get diagnostics v_deleted = row_count;
    return jsonb_build_object('success', true, 'deleted', v_deleted);
  end if;

  if p_scope = 'all' then
    delete from public.sessions s
    where s.series_id = v_session.series_id;
    get diagnostics v_deleted = row_count;

    delete from public.session_series ss
    where ss.id = v_session.series_id;

    return jsonb_build_object('success', true, 'deleted', v_deleted);
  end if;

  if p_scope = 'this_and_future' then
    delete from public.sessions s
    where s.series_id = v_session.series_id
      and s.starts_at >= v_session.starts_at;
    get diagnostics v_deleted = row_count;
    return jsonb_build_object('success', true, 'deleted', v_deleted);
  end if;

  return jsonb_build_object('success', false, 'error', 'invalid_scope');
end;
$$;

revoke all on function public.cancel_session_series_scope(uuid, text) from public;
grant execute on function public.cancel_session_series_scope(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- update_session_series_scope
-- ---------------------------------------------------------------------------

create or replace function public.update_session_series_scope(
  p_session_id uuid,
  p_scope text,
  p_title text,
  p_sport_type text,
  p_starts_at timestamptz,
  p_duration_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.sessions%rowtype;
  v_delta interval;
  v_updated int := 0;
  v_ends_at timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select *
  into v_session
  from public.sessions s
  where s.id = p_session_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if not public.can_manage_coach_sessions(v_session.coach_id) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if coalesce(trim(p_title), '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_title');
  end if;

  if p_duration_minutes is null or p_duration_minutes <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_duration');
  end if;

  v_ends_at := p_starts_at + make_interval(mins => p_duration_minutes);

  if v_session.series_id is null or p_scope = 'this' then
    update public.sessions s
    set title = trim(p_title),
        sport_type = nullif(trim(coalesce(p_sport_type, '')), ''),
        starts_at = p_starts_at,
        ends_at = v_ends_at,
        duration_minutes = p_duration_minutes,
        updated_at = timezone('utc', now())
    where s.id = p_session_id;
    get diagnostics v_updated = row_count;
    return jsonb_build_object('success', true, 'updated', v_updated);
  end if;

  v_delta := p_starts_at - v_session.starts_at;

  if p_scope = 'all' then
    update public.sessions s
    set title = trim(p_title),
        sport_type = nullif(trim(coalesce(p_sport_type, '')), ''),
        starts_at = s.starts_at + v_delta,
        ends_at = s.starts_at + v_delta + make_interval(mins => p_duration_minutes),
        duration_minutes = p_duration_minutes,
        updated_at = timezone('utc', now())
    where s.series_id = v_session.series_id;

    update public.session_series ss
    set title = trim(p_title),
        sport_type = nullif(trim(coalesce(p_sport_type, '')), ''),
        duration_minutes = p_duration_minutes,
        updated_at = timezone('utc', now())
    where ss.id = v_session.series_id;

    get diagnostics v_updated = row_count;
    return jsonb_build_object('success', true, 'updated', v_updated);
  end if;

  if p_scope = 'this_and_future' then
    update public.sessions s
    set title = trim(p_title),
        sport_type = nullif(trim(coalesce(p_sport_type, '')), ''),
        starts_at = case
          when s.id = p_session_id then p_starts_at
          else s.starts_at + v_delta
        end,
        ends_at = case
          when s.id = p_session_id then v_ends_at
          else s.starts_at + v_delta + make_interval(mins => p_duration_minutes)
        end,
        duration_minutes = p_duration_minutes,
        updated_at = timezone('utc', now())
    where s.series_id = v_session.series_id
      and s.starts_at >= v_session.starts_at;

    get diagnostics v_updated = row_count;
    return jsonb_build_object('success', true, 'updated', v_updated);
  end if;

  return jsonb_build_object('success', false, 'error', 'invalid_scope');
end;
$$;

revoke all on function public.update_session_series_scope(
  uuid, text, text, text, timestamptz, integer
) from public;
grant execute on function public.update_session_series_scope(
  uuid, text, text, text, timestamptz, integer
) to authenticated;

-- ---------------------------------------------------------------------------
-- Invite linkage for series (extends 079)
-- ---------------------------------------------------------------------------

drop function if exists public.create_client_invite(text, text, timestamptz, uuid);

create or replace function public.create_client_invite(
  p_email text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_origin_session_id uuid default null,
  p_origin_series_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_org_id uuid;
  v_existing_profile public.profiles%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  v_email := lower(trim(p_email));

  if v_email = '' or position('@' in v_email) <= 1 then
    return jsonb_build_object('success', false, 'error', 'invalid_email');
  end if;

  if coalesce(trim(p_token_hash), '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_token_hash');
  end if;

  if p_expires_at is null or p_expires_at <= timezone('utc', now()) then
    return jsonb_build_object('success', false, 'error', 'invalid_expires_at');
  end if;

  if p_origin_session_id is not null then
    if not exists (
      select 1
      from public.sessions s
      where s.id = p_origin_session_id
        and s.coach_id = v_uid
        and s.client_id is null
    ) then
      return jsonb_build_object('success', false, 'error', 'invalid_origin_session');
    end if;
  end if;

  if p_origin_series_id is not null then
    if not exists (
      select 1
      from public.session_series ss
      where ss.id = p_origin_series_id
        and ss.coach_id = v_uid
        and ss.client_id is null
    ) then
      return jsonb_build_object('success', false, 'error', 'invalid_origin_series');
    end if;
  end if;

  select cp.current_organization_id
  into v_org_id
  from public.coach_profiles cp
  where cp.user_id = v_uid;

  if v_org_id is null then
    return jsonb_build_object('success', false, 'error', 'coach_profile_incomplete');
  end if;

  if exists (
    select 1
    from public.client_invites i
    where i.coach_id = v_uid
      and lower(i.email) = v_email
      and i.status = 'pending'
  ) then
    return jsonb_build_object('success', false, 'error', 'invite_already_pending');
  end if;

  select *
  into v_existing_profile
  from public.profiles p
  where lower(p.email) = v_email
  limit 1;

  if found and v_existing_profile.role = 'coach' then
    return jsonb_build_object('success', false, 'error', 'email_is_coach');
  end if;

  if found and v_existing_profile.role = 'client' then
    if exists (
      select 1
      from public.coach_client_relationships r
      where r.coach_id = v_uid
        and r.client_id = v_existing_profile.id
        and r.status = 'active'
    ) then
      return jsonb_build_object('success', false, 'error', 'client_already_on_roster');
    end if;
  end if;

  insert into public.client_invites (
    coach_id,
    organization_id,
    email,
    token_hash,
    expires_at,
    status,
    invited_user_id,
    origin_session_id,
    origin_series_id
  )
  values (
    v_uid,
    v_org_id,
    v_email,
    p_token_hash,
    p_expires_at,
    'pending',
    case when found then v_existing_profile.id else null end,
    p_origin_session_id,
    p_origin_series_id
  );

  return jsonb_build_object('success', true, 'email', v_email);
end;
$$;

revoke all on function public.create_client_invite(text, text, timestamptz, uuid, uuid) from public;
grant execute on function public.create_client_invite(text, text, timestamptz, uuid, uuid) to authenticated;

create or replace function public.accept_client_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hash text;
  v_invite public.client_invites%rowtype;
  v_profile public.profiles%rowtype;
  v_relationship_id uuid;
  v_now timestamptz := timezone('utc', now());
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if coalesce(trim(p_token), '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_token');
  end if;

  v_hash := public.hash_invite_token(p_token);

  select *
  into v_invite
  from public.client_invites i
  where i.token_hash = v_hash
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_invite.status = 'accepted' and v_invite.accepted_user_id = v_uid then
    return jsonb_build_object(
      'success', true,
      'already_accepted', true,
      'relationship_id', v_invite.relationship_id
    );
  end if;

  if v_invite.status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_invite.status);
  end if;

  if v_invite.expires_at <= v_now then
    update public.client_invites
    set status = 'expired', updated_at = v_now
    where id = v_invite.id;

    return jsonb_build_object('success', false, 'error', 'expired');
  end if;

  select *
  into v_profile
  from public.profiles p
  where p.id = v_uid;

  if not found then
    return jsonb_build_object('success', false, 'error', 'profile_not_found');
  end if;

  if lower(coalesce(v_profile.email, '')) <> lower(v_invite.email) then
    return jsonb_build_object('success', false, 'error', 'email_mismatch');
  end if;

  if v_invite.invited_user_id is not null and v_invite.invited_user_id <> v_uid then
    return jsonb_build_object('success', false, 'error', 'user_mismatch');
  end if;

  if v_profile.role is not null and v_profile.role <> 'client' then
    return jsonb_build_object('success', false, 'error', 'client_role_required');
  end if;

  update public.profiles
  set role = 'client',
      updated_at = v_now
  where id = v_uid
    and (role is null or role = 'client');

  insert into public.client_profiles (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  insert into public.coach_client_relationships (
    coach_id,
    client_id,
    organization_id,
    status
  )
  values (
    v_invite.coach_id,
    v_uid,
    v_invite.organization_id,
    'active'
  )
  on conflict (coach_id, client_id, organization_id) do update
    set status = 'active',
        updated_at = v_now
  returning id into v_relationship_id;

  update public.client_invites
  set status = 'accepted',
      accepted_at = v_now,
      accepted_user_id = v_uid,
      invited_user_id = coalesce(v_invite.invited_user_id, v_uid),
      relationship_id = v_relationship_id,
      updated_at = v_now
  where id = v_invite.id;

  if v_invite.origin_session_id is not null then
    update public.sessions s
    set client_id = v_uid,
        guest_client_name = null,
        updated_at = v_now
    where s.id = v_invite.origin_session_id
      and s.coach_id = v_invite.coach_id
      and s.client_id is null;
  end if;

  if v_invite.origin_series_id is not null then
    update public.session_series ss
    set client_id = v_uid,
        guest_client_name = null,
        updated_at = v_now
    where ss.id = v_invite.origin_series_id
      and ss.coach_id = v_invite.coach_id
      and ss.client_id is null;

    update public.sessions s
    set client_id = v_uid,
        guest_client_name = null,
        updated_at = v_now
    where s.series_id = v_invite.origin_series_id
      and s.coach_id = v_invite.coach_id
      and s.client_id is null;
  end if;

  return jsonb_build_object(
    'success', true,
    'relationship_id', v_relationship_id
  );
end;
$$;

revoke all on function public.accept_client_invite(text) from public;
grant execute on function public.accept_client_invite(text) to authenticated;
