-- 047_court_reservation_approval.sql — pending approval + staff reservation management

-- ---------------------------------------------------------------------------
-- Enum extension
-- ---------------------------------------------------------------------------

do $do$
begin
  alter type public.court_reservation_status add value if not exists 'pending_approval';
exception
  when duplicate_object then null;
end $do$;

-- ponytail: enum labels must commit before use in same migration (Postgres rule)
commit;

do $do$
begin
  alter type public.court_reservation_status add value if not exists 'declined';
exception
  when duplicate_object then null;
end $do$;

commit;

-- ---------------------------------------------------------------------------
-- Review metadata
-- ---------------------------------------------------------------------------

alter table public.court_reservations
  add column if not exists staff_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null;

create unique index if not exists court_reservations_one_pending_per_slot_idx
  on public.court_reservations (slot_id)
  where status = 'pending_approval';

-- ---------------------------------------------------------------------------
-- Internal: resolve profile by normalized email
-- ---------------------------------------------------------------------------

create or replace function public.resolve_profile_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where lower(trim(p.email)) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.resolve_profile_id_by_email(text) from public;

-- ---------------------------------------------------------------------------
-- Internal: provision RocketPlay player by email (staff flows only; not API-granted)
-- ponytail: inserts auth.users when missing; upgrade path = complete_rocketplay_player_signup rules
-- ---------------------------------------------------------------------------

create or replace function public.provision_rocketplay_player_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(p_email));
  v_uid uuid;
  v_profile public.profiles%rowtype;
  v_app_meta jsonb;
  v_persona text;
  v_now timestamptz := timezone('utc', now());
  v_instance_id uuid;
begin
  if v_email is null or v_email = '' or position('@' in v_email) = 0 then
    raise exception 'invalid_email';
  end if;

  v_uid := public.resolve_profile_id_by_email(v_email);

  if v_uid is not null then
    select *
    into v_profile
    from public.profiles p
    where p.id = v_uid;

    if v_profile.role = 'coach' then
      raise exception 'coach_role_required';
    end if;

    if v_profile.role = 'client' then
      if exists (
        select 1
        from public.coach_client_relationships r
        where r.client_id = v_uid
          and r.status = 'active'
      ) then
        raise exception 'fitness_client_active';
      end if;

      raise exception 'fitness_client_exists';
    end if;

    select u.raw_app_meta_data
    into v_app_meta
    from auth.users u
    where u.id = v_uid;

    v_persona := coalesce(v_app_meta ->> 'persona', '');

    if v_persona = 'rocketplay_player' then
      return v_uid;
    end if;

    update public.profiles
    set role = 'client',
        updated_at = v_now
    where id = v_uid
      and (role is null or role = 'client');

    insert into public.client_profiles (user_id)
    values (v_uid)
    on conflict (user_id) do nothing;

    update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('persona', 'rocketplay_player')
    where id = v_uid;

    return v_uid;
  end if;

  select id into v_instance_id from auth.instances limit 1;
  if v_instance_id is null then
    raise exception 'auth_instances_missing';
  end if;

  v_uid := gen_random_uuid();

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    v_uid,
    v_instance_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    v_now,
    jsonb_build_object('persona', 'rocketplay_player'),
    jsonb_build_object('display_name', split_part(v_email, '@', 1)),
    v_now,
    v_now,
    '',
    '',
    '',
    ''
  );

  update public.profiles
  set role = 'client',
      updated_at = v_now
  where id = v_uid;

  insert into public.client_profiles (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  return v_uid;
end;
$$;

revoke all on function public.provision_rocketplay_player_by_email(text) from public;

-- ---------------------------------------------------------------------------
-- book_court_slot — pending approval (holds slot as booked)
-- ---------------------------------------------------------------------------

create or replace function public.book_court_slot(p_slot_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_slot public.court_slots%rowtype;
  v_court public.courts%rowtype;
  v_reservation_id uuid;
  v_now timestamptz := timezone('utc', now());
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_slot_id is null then
    return jsonb_build_object('success', false, 'error', 'missing_slot_id');
  end if;

  select *
  into v_slot
  from public.court_slots s
  where s.id = p_slot_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'slot_not_found');
  end if;

  if v_slot.status <> 'available' then
    return jsonb_build_object('success', false, 'error', 'slot_not_available');
  end if;

  if v_slot.starts_at <= v_now then
    return jsonb_build_object('success', false, 'error', 'slot_in_past');
  end if;

  select *
  into v_court
  from public.courts c
  where c.id = v_slot.court_id;

  if not v_court.is_active then
    return jsonb_build_object('success', false, 'error', 'court_inactive');
  end if;

  if not exists (
    select 1
    from public.organizations o
    join public.organization_places op
      on op.organization_id = o.id
     and op.place_id = v_court.place_id
    where o.id = v_court.organization_id
      and o.kind = 'team'
      and o.rocketplay_enabled = true
      and op.is_published = true
  ) then
    return jsonb_build_object('success', false, 'error', 'org_not_bookable');
  end if;

  insert into public.court_reservations (
    slot_id,
    user_id,
    organization_id,
    place_id,
    status
  )
  values (
    v_slot.id,
    v_uid,
    v_court.organization_id,
    v_court.place_id,
    'pending_approval'
  )
  returning id into v_reservation_id;

  update public.court_slots
  set status = 'booked'
  where id = v_slot.id;

  return jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'status', 'pending_approval'
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'slot_already_booked');
end;
$$;

revoke all on function public.book_court_slot(uuid) from public;
grant execute on function public.book_court_slot(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Staff helper: load reservation + assert org booking staff
-- ---------------------------------------------------------------------------

create or replace function public._staff_reservation_for_update(p_reservation_id uuid)
returns public.court_reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.court_reservations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select *
  into v_reservation
  from public.court_reservations r
  where r.id = p_reservation_id
  for update;

  if not found then
    raise exception 'reservation_not_found';
  end if;

  if not public.is_org_booking_staff(v_reservation.organization_id) then
    raise exception 'forbidden';
  end if;

  return v_reservation;
end;
$$;

revoke all on function public._staff_reservation_for_update(uuid) from public;

-- ---------------------------------------------------------------------------
-- approve_court_reservation
-- ---------------------------------------------------------------------------

create or replace function public.approve_court_reservation(p_reservation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff uuid := auth.uid();
  v_reservation public.court_reservations%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  begin
    v_reservation := public._staff_reservation_for_update(p_reservation_id);
  exception
    when others then
      return jsonb_build_object(
        'success', false,
        'error', sqlerrm
      );
  end;

  if v_reservation.status <> 'pending_approval' then
    return jsonb_build_object('success', false, 'error', 'not_pending');
  end if;

  update public.court_reservations
  set status = 'confirmed',
      reviewed_at = v_now,
      reviewed_by = v_staff,
      staff_note = null,
      updated_at = v_now
  where id = v_reservation.id;

  return jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation.id,
    'status', 'confirmed',
    'email_kind', 'reservation_approved'
  );
end;
$$;

revoke all on function public.approve_court_reservation(uuid) from public;
grant execute on function public.approve_court_reservation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- decline_court_reservation — reason required
-- ---------------------------------------------------------------------------

create or replace function public.decline_court_reservation(
  p_reservation_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff uuid := auth.uid();
  v_reservation public.court_reservations%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if v_reason = '' then
    return jsonb_build_object('success', false, 'error', 'reason_required');
  end if;

  begin
    v_reservation := public._staff_reservation_for_update(p_reservation_id);
  exception
    when others then
      return jsonb_build_object(
        'success', false,
        'error', sqlerrm
      );
  end;

  if v_reservation.status <> 'pending_approval' then
    return jsonb_build_object('success', false, 'error', 'not_pending');
  end if;

  update public.court_reservations
  set status = 'declined',
      staff_note = v_reason,
      reviewed_at = v_now,
      reviewed_by = v_staff,
      updated_at = v_now
  where id = v_reservation.id;

  update public.court_slots
  set status = 'available'
  where id = v_reservation.slot_id;

  return jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation.id,
    'status', 'declined',
    'staff_note', v_reason,
    'email_kind', 'reservation_declined'
  );
end;
$$;

revoke all on function public.decline_court_reservation(uuid, text) from public;
grant execute on function public.decline_court_reservation(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- staff_cancel_court_reservation
-- ---------------------------------------------------------------------------

create or replace function public.staff_cancel_court_reservation(
  p_reservation_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff uuid := auth.uid();
  v_reservation public.court_reservations%rowtype;
  v_slot public.court_slots%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  begin
    v_reservation := public._staff_reservation_for_update(p_reservation_id);
  exception
    when others then
      return jsonb_build_object(
        'success', false,
        'error', sqlerrm
      );
  end;

  if v_reservation.status not in ('pending_approval', 'confirmed') then
    return jsonb_build_object('success', false, 'error', 'not_cancellable');
  end if;

  select *
  into v_slot
  from public.court_slots s
  where s.id = v_reservation.slot_id
  for update;

  if v_slot.starts_at <= v_now then
    return jsonb_build_object('success', false, 'error', 'slot_already_started');
  end if;

  update public.court_reservations
  set status = 'cancelled',
      cancelled_at = v_now,
      staff_note = nullif(trim(coalesce(p_note, '')), ''),
      reviewed_at = v_now,
      reviewed_by = v_staff,
      updated_at = v_now
  where id = v_reservation.id;

  update public.court_slots
  set status = 'available'
  where id = v_slot.id;

  return jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation.id,
    'status', 'cancelled',
    'email_kind', 'reservation_cancelled_by_club'
  );
end;
$$;

revoke all on function public.staff_cancel_court_reservation(uuid, text) from public;
grant execute on function public.staff_cancel_court_reservation(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- staff_reschedule_court_reservation
-- ---------------------------------------------------------------------------

create or replace function public.staff_reschedule_court_reservation(
  p_reservation_id uuid,
  p_new_slot_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.court_reservations%rowtype;
  v_old_slot public.court_slots%rowtype;
  v_new_slot public.court_slots%rowtype;
  v_court public.courts%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if p_new_slot_id is null then
    return jsonb_build_object('success', false, 'error', 'missing_slot_id');
  end if;

  begin
    v_reservation := public._staff_reservation_for_update(p_reservation_id);
  exception
    when others then
      return jsonb_build_object(
        'success', false,
        'error', sqlerrm
      );
  end;

  if v_reservation.status not in ('pending_approval', 'confirmed') then
    return jsonb_build_object('success', false, 'error', 'not_editable');
  end if;

  select *
  into v_old_slot
  from public.court_slots s
  where s.id = v_reservation.slot_id
  for update;

  if v_old_slot.starts_at <= v_now then
    return jsonb_build_object('success', false, 'error', 'slot_already_started');
  end if;

  if p_new_slot_id = v_old_slot.id then
    return jsonb_build_object(
      'success', true,
      'reservation_id', v_reservation.id,
      'email_kind', 'reservation_rescheduled'
    );
  end if;

  select *
  into v_new_slot
  from public.court_slots s
  where s.id = p_new_slot_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'slot_not_found');
  end if;

  if v_new_slot.status <> 'available' then
    return jsonb_build_object('success', false, 'error', 'slot_not_available');
  end if;

  if v_new_slot.starts_at <= v_now then
    return jsonb_build_object('success', false, 'error', 'slot_in_past');
  end if;

  select *
  into v_court
  from public.courts c
  where c.id = v_new_slot.court_id;

  if not v_court.is_active then
    return jsonb_build_object('success', false, 'error', 'court_inactive');
  end if;

  if v_court.organization_id <> v_reservation.organization_id then
    return jsonb_build_object('success', false, 'error', 'org_mismatch');
  end if;

  if not exists (
    select 1
    from public.organizations o
    join public.organization_places op
      on op.organization_id = o.id
     and op.place_id = v_court.place_id
    where o.id = v_court.organization_id
      and o.kind = 'team'
      and o.rocketplay_enabled = true
      and op.is_published = true
  ) then
    return jsonb_build_object('success', false, 'error', 'org_not_bookable');
  end if;

  update public.court_reservations
  set slot_id = v_new_slot.id,
      place_id = v_court.place_id,
      updated_at = v_now
  where id = v_reservation.id;

  update public.court_slots
  set status = 'available'
  where id = v_old_slot.id;

  update public.court_slots
  set status = 'booked'
  where id = v_new_slot.id;

  return jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation.id,
    'email_kind', 'reservation_rescheduled'
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'slot_already_booked');
end;
$$;

revoke all on function public.staff_reschedule_court_reservation(uuid, uuid) from public;
grant execute on function public.staff_reschedule_court_reservation(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- staff_reassign_court_reservation
-- ---------------------------------------------------------------------------

create or replace function public.staff_reassign_court_reservation(
  p_reservation_id uuid,
  p_player_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.court_reservations%rowtype;
  v_new_user_id uuid;
  v_email text := lower(trim(coalesce(p_player_email, '')));
begin
  if v_email = '' or position('@' in v_email) = 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_email');
  end if;

  begin
    v_reservation := public._staff_reservation_for_update(p_reservation_id);
  exception
    when others then
      return jsonb_build_object(
        'success', false,
        'error', sqlerrm
      );
  end;

  if v_reservation.status not in ('pending_approval', 'confirmed') then
    return jsonb_build_object('success', false, 'error', 'not_reassignable');
  end if;

  begin
    v_new_user_id := public.provision_rocketplay_player_by_email(v_email);
  exception
    when others then
      return jsonb_build_object(
        'success', false,
        'error', sqlerrm
      );
  end;

  if v_new_user_id = v_reservation.user_id then
    return jsonb_build_object(
      'success', true,
      'reservation_id', v_reservation.id,
      'user_id', v_new_user_id,
      'already_assigned', true
    );
  end if;

  update public.court_reservations
  set user_id = v_new_user_id,
      updated_at = timezone('utc', now())
  where id = v_reservation.id;

  return jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation.id,
    'user_id', v_new_user_id
  );
end;
$$;

revoke all on function public.staff_reassign_court_reservation(uuid, text) from public;
grant execute on function public.staff_reassign_court_reservation(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- list_my_court_reservations — include review fields
-- ---------------------------------------------------------------------------

drop function if exists public.list_my_court_reservations(boolean);

create or replace function public.list_my_court_reservations(p_upcoming boolean default true)
returns table (
  reservation_id uuid,
  slot_id uuid,
  court_id uuid,
  court_name text,
  organization_id uuid,
  place_id uuid,
  sport_slug text,
  status public.court_reservation_status,
  starts_at timestamptz,
  ends_at timestamptz,
  price_cents integer,
  cancelled_at timestamptz,
  staff_note text,
  reviewed_at timestamptz,
  reviewed_by uuid
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    r.id as reservation_id,
    s.id as slot_id,
    c.id as court_id,
    c.name as court_name,
    r.organization_id,
    r.place_id,
    c.sport_slug,
    r.status,
    s.starts_at,
    s.ends_at,
    s.price_cents,
    r.cancelled_at,
    r.staff_note,
    r.reviewed_at,
    r.reviewed_by
  from public.court_reservations r
  join public.court_slots s on s.id = r.slot_id
  join public.courts c on c.id = s.court_id
  where r.user_id = auth.uid()
    and (
      (p_upcoming and s.starts_at >= timezone('utc', now()))
      or (not p_upcoming and s.starts_at < timezone('utc', now()))
    )
  order by s.starts_at desc;
$$;

revoke all on function public.list_my_court_reservations(boolean) from public;
grant execute on function public.list_my_court_reservations(boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- list_org_court_reservations — include review fields
-- ---------------------------------------------------------------------------

drop function if exists public.list_org_court_reservations(uuid);

create or replace function public.list_org_court_reservations(p_org_id uuid)
returns table (
  reservation_id uuid,
  slot_id uuid,
  court_id uuid,
  court_name text,
  user_id uuid,
  place_id uuid,
  sport_slug text,
  status public.court_reservation_status,
  starts_at timestamptz,
  ends_at timestamptz,
  price_cents integer,
  cancelled_at timestamptz,
  staff_note text,
  reviewed_at timestamptz,
  reviewed_by uuid
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_org_booking_staff(p_org_id) then
    raise exception 'Forbidden';
  end if;

  return query
  select
    r.id as reservation_id,
    s.id as slot_id,
    c.id as court_id,
    c.name as court_name,
    r.user_id,
    r.place_id,
    c.sport_slug,
    r.status,
    s.starts_at,
    s.ends_at,
    s.price_cents,
    r.cancelled_at,
    r.staff_note,
    r.reviewed_at,
    r.reviewed_by
  from public.court_reservations r
  join public.court_slots s on s.id = r.slot_id
  join public.courts c on c.id = s.court_id
  where r.organization_id = p_org_id
  order by s.starts_at desc;
end;
$$;

revoke all on function public.list_org_court_reservations(uuid) from public;
grant execute on function public.list_org_court_reservations(uuid) to authenticated;
