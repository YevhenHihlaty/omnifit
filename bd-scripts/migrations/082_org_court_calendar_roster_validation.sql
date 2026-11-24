-- Phase 1: org court calendar — roster validation, client IDs in search, client_id index

create index if not exists coach_client_relationships_client_status_idx
  on public.coach_client_relationships (client_id, status);

drop function if exists public.search_org_court_calendar(uuid, date, text, uuid);

create or replace function public.search_org_court_calendar(
  p_org_id uuid,
  p_date date,
  p_sport_slug text default null,
  p_place_id uuid default null
)
returns table (
  slot_id uuid,
  court_id uuid,
  court_name text,
  place_id uuid,
  sport_slug text,
  starts_at timestamptz,
  ends_at timestamptz,
  price_cents integer,
  slot_status text,
  reservation_id uuid,
  reservation_status public.court_reservation_status,
  booked_for_user_id uuid,
  coach_user_id uuid,
  coach_display_name text,
  notes text,
  client_count integer,
  client_profile_ids uuid[],
  can_view_detail boolean,
  can_edit boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_org_team_member(p_org_id) then
    raise exception 'Forbidden';
  end if;

  return query
  with bounds as (
    select
      p_date as day_local,
      public._weekday_key_for_date(p_date, 'Europe/Kyiv') as day_key,
      (p_date::timestamp at time zone 'Europe/Kyiv') at time zone 'UTC' as day_start_utc,
      ((p_date + 1)::timestamp at time zone 'Europe/Kyiv') at time zone 'UTC' as day_end_utc,
      timezone('utc', now()) as now_utc
  ),
  eligible_courts as (
    select
      c.id,
      c.name,
      c.place_id,
      c.sport_slug,
      c.default_hourly_price_cents,
      op.opening_hours
    from public.courts c
    join public.organization_places op
      on op.organization_id = c.organization_id
     and op.place_id = c.place_id
    where c.organization_id = p_org_id
      and c.is_active = true
      and (p_sport_slug is null or c.sport_slug = p_sport_slug)
      and (p_place_id is null or c.place_id = p_place_id)
  ),
  court_hours as (
    select
      ec.id as court_id,
      ec.name as court_name,
      ec.place_id,
      ec.sport_slug,
      ec.default_hourly_price_cents,
      make_timestamptz(
        extract(year from b.day_local)::integer,
        extract(month from b.day_local)::integer,
        extract(day from b.day_local)::integer,
        h.hour,
        0,
        0,
        'Europe/Kyiv'
      ) as starts_at
    from bounds b
    cross join eligible_courts ec
    cross join lateral (
      select
        coalesce((ec.opening_hours -> b.day_key ->> 'enabled')::boolean, true) as day_enabled,
        coalesce(
          nullif(split_part(coalesce(ec.opening_hours -> b.day_key ->> 'start', '08:00'), ':', 1), '')::integer,
          8
        ) as start_hour,
        coalesce(
          nullif(split_part(coalesce(ec.opening_hours -> b.day_key ->> 'end', '20:00'), ':', 1), '')::integer,
          20
        ) as end_hour
    ) cfg
    cross join lateral generate_series(cfg.start_hour, cfg.end_hour - 1) as h(hour)
    where cfg.day_enabled
      and cfg.end_hour > cfg.start_hour
  ),
  hour_slots as (
    select
      coalesce(
        s.id,
        public._synthetic_court_slot_id(ch.court_id, ch.starts_at)
      ) as slot_id,
      ch.court_id,
      ch.court_name,
      ch.place_id,
      ch.sport_slug,
      ch.starts_at,
      ch.starts_at + interval '1 hour' as ends_at,
      coalesce(s.price_cents, ch.default_hourly_price_cents) as price_cents,
      coalesce(s.status, 'available') as materialized_status,
      b.now_utc
    from court_hours ch
    cross join bounds b
    left join public.court_slots s
      on s.court_id = ch.court_id
     and s.starts_at = ch.starts_at
    where ch.starts_at >= b.day_start_utc
      and ch.starts_at < b.day_end_utc
  ),
  active_reservations as (
    select
      r.id as reservation_id,
      r.slot_id,
      r.user_id as booked_for_user_id,
      r.coach_user_id,
      r.status as reservation_status,
      r.notes,
      p.display_name as coach_display_name,
      (
        select count(*)::integer
        from public.court_reservation_clients crc
        where crc.reservation_id = r.id
      ) as client_count,
      (
        select coalesce(
          array_agg(crc.client_profile_id order by crc.sort_order, crc.client_profile_id),
          '{}'::uuid[]
        )
        from public.court_reservation_clients crc
        where crc.reservation_id = r.id
      ) as client_profile_ids
    from public.court_reservations r
    left join public.profiles p on p.id = r.coach_user_id
    where r.organization_id = p_org_id
      and r.status in ('confirmed', 'pending_approval')
  )
  select
    hs.slot_id,
    hs.court_id,
    hs.court_name,
    hs.place_id,
    hs.sport_slug,
    hs.starts_at,
    hs.ends_at,
    hs.price_cents,
    case
      when hs.starts_at <= hs.now_utc then 'past'
      when ar.reservation_id is not null and ar.reservation_status = 'pending_approval' then 'pending'
      when ar.reservation_id is not null then 'booked'
      when hs.materialized_status = 'blocked' then 'blocked'
      else 'available'
    end as slot_status,
    ar.reservation_id,
    ar.reservation_status,
    ar.booked_for_user_id,
    ar.coach_user_id,
    case
      when public._can_view_org_calendar_reservation(
        p_org_id,
        ar.booked_for_user_id,
        ar.coach_user_id
      ) then ar.coach_display_name
      else null
    end as coach_display_name,
    case
      when public._can_view_org_calendar_reservation(
        p_org_id,
        ar.booked_for_user_id,
        ar.coach_user_id
      ) then ar.notes
      else null
    end as notes,
    case
      when public._can_view_org_calendar_reservation(
        p_org_id,
        ar.booked_for_user_id,
        ar.coach_user_id
      ) then coalesce(ar.client_count, 0)
      else 0
    end as client_count,
    case
      when public._can_view_org_calendar_reservation(
        p_org_id,
        ar.booked_for_user_id,
        ar.coach_user_id
      ) then coalesce(ar.client_profile_ids, '{}'::uuid[])
      else null
    end as client_profile_ids,
    public._can_view_org_calendar_reservation(
      p_org_id,
      ar.booked_for_user_id,
      ar.coach_user_id
    ) as can_view_detail,
    public._can_edit_org_calendar_reservation(
      p_org_id,
      ar.booked_for_user_id,
      ar.coach_user_id
    ) as can_edit
  from hour_slots hs
  left join active_reservations ar on ar.slot_id = hs.slot_id
  order by hs.starts_at, hs.court_name;
end;
$$;

revoke all on function public.search_org_court_calendar(uuid, date, text, uuid) from public;
grant execute on function public.search_org_court_calendar(uuid, date, text, uuid) to authenticated;

create or replace function public.org_member_book_court_hour(
  p_court_id uuid,
  p_starts_at timestamptz,
  p_booked_for_user_id uuid default null,
  p_coach_user_id uuid default null,
  p_notes text default null,
  p_client_profile_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_court public.courts%rowtype;
  v_slot_id uuid;
  v_end timestamptz := p_starts_at + interval '1 hour';
  v_now timestamptz := timezone('utc', now());
  v_booked_for uuid;
  v_coach uuid;
  v_reservation_id uuid;
  v_client_id uuid;
  v_sort integer := 0;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_court_id is null or p_starts_at is null then
    return jsonb_build_object('success', false, 'error', 'missing_slot_id');
  end if;

  if p_starts_at <= v_now then
    return jsonb_build_object('success', false, 'error', 'slot_in_past');
  end if;

  select *
  into v_court
  from public.courts c
  where c.id = p_court_id;

  if not found or not v_court.is_active then
    return jsonb_build_object('success', false, 'error', 'court_inactive');
  end if;

  if not public.is_org_team_member(v_court.organization_id) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  v_booked_for := coalesce(p_booked_for_user_id, v_uid);
  v_coach := coalesce(p_coach_user_id, v_booked_for);

  if public.is_org_active_coach_member(v_court.organization_id)
     and not public.is_org_reservations_staff(v_court.organization_id) then
    if v_booked_for <> v_uid or v_coach <> v_uid then
      return jsonb_build_object('success', false, 'error', 'forbidden');
    end if;
  end if;

  foreach v_client_id in array coalesce(p_client_profile_ids, '{}')
  loop
    if v_client_id is not null
       and not public.coach_has_active_client(v_coach, v_client_id) then
      return jsonb_build_object('success', false, 'error', 'client_not_on_roster');
    end if;
  end loop;

  insert into public.court_slots (
    court_id,
    starts_at,
    ends_at,
    status,
    price_cents
  )
  values (
    p_court_id,
    p_starts_at,
    v_end,
    'available',
    v_court.default_hourly_price_cents
  )
  on conflict (court_id, starts_at) do nothing;

  select s.id
  into v_slot_id
  from public.court_slots s
  where s.court_id = p_court_id
    and s.starts_at = p_starts_at
  for update;

  if v_slot_id is null then
    return jsonb_build_object('success', false, 'error', 'slot_not_found');
  end if;

  if exists (
    select 1
    from public.court_reservations r
    where r.slot_id = v_slot_id
      and r.status in ('confirmed', 'pending_approval')
  ) then
    return jsonb_build_object('success', false, 'error', 'slot_already_booked');
  end if;

  if (
    select coalesce(s.status, 'available')
    from public.court_slots s
    where s.id = v_slot_id
  ) <> 'available' then
    return jsonb_build_object('success', false, 'error', 'slot_not_available');
  end if;

  insert into public.court_reservations (
    slot_id,
    user_id,
    organization_id,
    place_id,
    status,
    booked_by_user_id,
    coach_user_id,
    notes
  )
  values (
    v_slot_id,
    v_booked_for,
    v_court.organization_id,
    v_court.place_id,
    'confirmed',
    v_uid,
    v_coach,
    nullif(trim(p_notes), '')
  )
  returning id into v_reservation_id;

  update public.court_slots
  set status = 'booked'
  where id = v_slot_id;

  foreach v_client_id in array coalesce(p_client_profile_ids, '{}')
  loop
    if v_client_id is not null then
      insert into public.court_reservation_clients (
        reservation_id,
        client_profile_id,
        sort_order
      )
      values (
        v_reservation_id,
        v_client_id,
        v_sort
      )
      on conflict (reservation_id, client_profile_id) do nothing;
      v_sort := v_sort + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'status', 'confirmed'
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'slot_already_booked');
end;
$$;

revoke all on function public.org_member_book_court_hour(uuid, timestamptz, uuid, uuid, text, uuid[]) from public;
grant execute on function public.org_member_book_court_hour(uuid, timestamptz, uuid, uuid, text, uuid[]) to authenticated;

create or replace function public.org_update_court_reservation_metadata(
  p_reservation_id uuid,
  p_notes text default null,
  p_client_profile_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.court_reservations%rowtype;
  v_coach uuid;
  v_client_id uuid;
  v_sort integer := 0;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select *
  into v_reservation
  from public.court_reservations r
  where r.id = p_reservation_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if not public._can_edit_org_calendar_reservation(
    v_reservation.organization_id,
    v_reservation.user_id,
    v_reservation.coach_user_id
  ) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if v_reservation.status not in ('confirmed', 'pending_approval') then
    return jsonb_build_object('success', false, 'error', 'not_editable');
  end if;

  v_coach := coalesce(v_reservation.coach_user_id, v_reservation.user_id);

  if p_client_profile_ids is not null then
    foreach v_client_id in array p_client_profile_ids
    loop
      if v_client_id is not null
         and not public.coach_has_active_client(v_coach, v_client_id) then
        return jsonb_build_object('success', false, 'error', 'client_not_on_roster');
      end if;
    end loop;
  end if;

  update public.court_reservations
  set
    notes = case
      when p_notes is not null then nullif(trim(p_notes), '')
      else notes
    end,
    updated_at = timezone('utc', now())
  where id = p_reservation_id;

  if p_client_profile_ids is not null then
    delete from public.court_reservation_clients
    where reservation_id = p_reservation_id;

    foreach v_client_id in array p_client_profile_ids
    loop
      if v_client_id is not null then
        insert into public.court_reservation_clients (
          reservation_id,
          client_profile_id,
          sort_order
        )
        values (
          p_reservation_id,
          v_client_id,
          v_sort
        );
        v_sort := v_sort + 1;
      end if;
    end loop;
  end if;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.org_update_court_reservation_metadata(uuid, text, uuid[]) from public;
grant execute on function public.org_update_court_reservation_metadata(uuid, text, uuid[]) to authenticated;
