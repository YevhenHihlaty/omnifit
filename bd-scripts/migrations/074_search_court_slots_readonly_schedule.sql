-- 074_search_court_slots_readonly_schedule.sql
--
-- Fix "cannot execute INSERT in a read-only transaction" on venue discover:
-- search_court_slots must not INSERT. Availability is computed from opening hours
-- (synthetic rows) UNION materialized court_slots. Slots are materialized on book.

create or replace function public._synthetic_court_slot_id(
  p_court_id uuid,
  p_starts_at timestamptz
)
returns uuid
language sql
immutable
as $$
  select (md5(p_court_id::text || '|' || p_starts_at::text))::uuid;
$$;

revoke all on function public._synthetic_court_slot_id(uuid, timestamptz) from public;

create or replace function public._search_court_slots_rows(
  p_org_id uuid,
  p_date date,
  p_sport_slug text,
  p_place_id uuid
)
returns table (
  slot_id uuid,
  court_id uuid,
  court_name text,
  place_id uuid,
  sport_slug text,
  starts_at timestamptz,
  ends_at timestamptz,
  price_cents integer
)
language sql
stable
security definer
set search_path = public
as $$
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
     and op.is_published = true
    where c.organization_id = p_org_id
      and c.is_active = true
      and (p_sport_slug is null or c.sport_slug = p_sport_slug)
      and (p_place_id is null or c.place_id = p_place_id)
      and public.is_org_place_court_browseable(c.organization_id, c.place_id)
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
  schedule_slots as (
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
      coalesce(s.price_cents, ch.default_hourly_price_cents) as price_cents
    from court_hours ch
    cross join bounds b
    left join public.court_slots s
      on s.court_id = ch.court_id
     and s.starts_at = ch.starts_at
    where ch.starts_at >= b.day_start_utc
      and ch.starts_at < b.day_end_utc
      and ch.starts_at > b.now_utc
      and coalesce(s.status, 'available') = 'available'
  )
  select
    ss.slot_id,
    ss.court_id,
    ss.court_name,
    ss.place_id,
    ss.sport_slug,
    ss.starts_at,
    ss.ends_at,
    ss.price_cents
  from schedule_slots ss
  order by ss.starts_at, ss.court_name;
$$;

revoke all on function public._search_court_slots_rows(uuid, date, text, uuid) from public;

create or replace function public.search_court_slots(
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
  price_cents integer
)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public._search_court_slots_rows(
    p_org_id,
    p_date,
    p_sport_slug,
    p_place_id
  );
$$;

revoke all on function public.search_court_slots(uuid, date, text, uuid) from public;
grant execute on function public.search_court_slots(uuid, date, text, uuid) to authenticated;
grant execute on function public.search_court_slots(uuid, date, text, uuid) to anon;

comment on function public.search_court_slots(uuid, date, text, uuid) is
  'Read-only court availability from opening hours and inventory. No INSERT on search.';

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

  if not public.is_org_place_court_browseable(v_court.organization_id, v_court.place_id) then
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

create or replace function public.book_court_hour(
  p_court_id uuid,
  p_starts_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_court public.courts%rowtype;
  v_slot_id uuid;
  v_end timestamptz := p_starts_at + interval '1 hour';
  v_now timestamptz := timezone('utc', now());
begin
  if auth.uid() is null then
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

  if not public.is_org_place_court_browseable(v_court.organization_id, v_court.place_id) then
    return jsonb_build_object('success', false, 'error', 'org_not_bookable');
  end if;

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
    and s.starts_at = p_starts_at;

  if v_slot_id is null then
    return jsonb_build_object('success', false, 'error', 'slot_not_found');
  end if;

  return public.book_court_slot(v_slot_id);
end;
$$;

revoke all on function public.book_court_hour(uuid, timestamptz) from public;
grant execute on function public.book_court_hour(uuid, timestamptz) to authenticated;

comment on function public.book_court_hour(uuid, timestamptz) is
  'Materializes a court_slots row for the hour (if needed) then books via book_court_slot.';
