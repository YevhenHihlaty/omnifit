-- 038_rocketplay_court_booking.sql — RocketPlay court inventory + booking RPCs
-- ponytail: dedicated court_* tables; unify with booking_requests later if Sprint 14 lands.

do $do$
begin
  create type public.court_slot_status as enum ('available', 'booked', 'blocked');
exception
  when duplicate_object then null;
end $do$;

do $do$
begin
  create type public.court_reservation_status as enum ('confirmed', 'cancelled');
exception
  when duplicate_object then null;
end $do$;

-- ---------------------------------------------------------------------------
-- RLS helper — org staff who manage court inventory / reservations
-- ---------------------------------------------------------------------------

create or replace function public.is_org_booking_staff(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'staff')
  )
  or exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.owner_id = auth.uid()
  );
$$;

revoke all on function public.is_org_booking_staff(uuid) from public;
grant execute on function public.is_org_booking_staff(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- courts
-- ---------------------------------------------------------------------------

create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete restrict,
  name text not null,
  sport_slug text not null,
  surface text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint courts_name_not_blank check (char_length(trim(name)) > 0),
  constraint courts_sport_slug_not_blank check (char_length(trim(sport_slug)) > 0)
);

create index if not exists courts_organization_id_idx
  on public.courts (organization_id);

create index if not exists courts_place_id_idx
  on public.courts (place_id);

create index if not exists courts_org_sport_active_idx
  on public.courts (organization_id, sport_slug)
  where is_active = true;

drop trigger if exists courts_set_updated_at on public.courts;
create trigger courts_set_updated_at
  before update on public.courts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- court_slots
-- ---------------------------------------------------------------------------

create table if not exists public.court_slots (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.court_slot_status not null default 'available',
  price_cents integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint court_slots_time_order check (ends_at > starts_at),
  constraint court_slots_court_starts_unique unique (court_id, starts_at)
);

create index if not exists court_slots_court_starts_idx
  on public.court_slots (court_id, starts_at);

create index if not exists court_slots_starts_at_idx
  on public.court_slots (starts_at);

drop trigger if exists court_slots_set_updated_at on public.court_slots;
create trigger court_slots_set_updated_at
  before update on public.court_slots
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- court_reservations
-- ---------------------------------------------------------------------------

create table if not exists public.court_reservations (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.court_slots (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  place_id uuid not null references public.places (id) on delete restrict,
  status public.court_reservation_status not null default 'confirmed',
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists court_reservations_one_confirmed_per_slot_idx
  on public.court_reservations (slot_id)
  where status = 'confirmed';

create index if not exists court_reservations_user_id_idx
  on public.court_reservations (user_id);

create index if not exists court_reservations_org_id_idx
  on public.court_reservations (organization_id);

drop trigger if exists court_reservations_set_updated_at on public.court_reservations;
create trigger court_reservations_set_updated_at
  before update on public.court_reservations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.courts enable row level security;
alter table public.court_slots enable row level security;
alter table public.court_reservations enable row level security;

drop policy if exists courts_select_rocketplay on public.courts;
create policy courts_select_rocketplay
  on public.courts for select
  to authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.organizations o
      join public.organization_places op
        on op.organization_id = o.id
       and op.place_id = courts.place_id
      where o.id = courts.organization_id
        and o.kind = 'team'
        and o.rocketplay_enabled = true
        and op.is_published = true
    )
  );

drop policy if exists courts_select_org_staff on public.courts;
create policy courts_select_org_staff
  on public.courts for select
  to authenticated
  using (public.is_org_booking_staff(organization_id));

drop policy if exists courts_insert_org_staff on public.courts;
create policy courts_insert_org_staff
  on public.courts for insert
  to authenticated
  with check (public.is_org_booking_staff(organization_id));

drop policy if exists courts_update_org_staff on public.courts;
create policy courts_update_org_staff
  on public.courts for update
  to authenticated
  using (public.is_org_booking_staff(organization_id))
  with check (public.is_org_booking_staff(organization_id));

drop policy if exists court_slots_select_rocketplay on public.court_slots;
create policy court_slots_select_rocketplay
  on public.court_slots for select
  to authenticated
  using (
    exists (
      select 1
      from public.courts c
      join public.organizations o on o.id = c.organization_id
      join public.organization_places op
        on op.organization_id = c.organization_id
       and op.place_id = c.place_id
      where c.id = court_slots.court_id
        and c.is_active = true
        and o.kind = 'team'
        and o.rocketplay_enabled = true
        and op.is_published = true
    )
  );

drop policy if exists court_slots_select_org_staff on public.court_slots;
create policy court_slots_select_org_staff
  on public.court_slots for select
  to authenticated
  using (
    exists (
      select 1
      from public.courts c
      where c.id = court_slots.court_id
        and public.is_org_booking_staff(c.organization_id)
    )
  );

drop policy if exists court_slots_insert_org_staff on public.court_slots;
create policy court_slots_insert_org_staff
  on public.court_slots for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.courts c
      where c.id = court_slots.court_id
        and public.is_org_booking_staff(c.organization_id)
    )
  );

drop policy if exists court_slots_update_org_staff on public.court_slots;
create policy court_slots_update_org_staff
  on public.court_slots for update
  to authenticated
  using (
    exists (
      select 1
      from public.courts c
      where c.id = court_slots.court_id
        and public.is_org_booking_staff(c.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.courts c
      where c.id = court_slots.court_id
        and public.is_org_booking_staff(c.organization_id)
    )
  );

drop policy if exists court_reservations_select_own on public.court_reservations;
create policy court_reservations_select_own
  on public.court_reservations for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists court_reservations_select_org_staff on public.court_reservations;
create policy court_reservations_select_org_staff
  on public.court_reservations for select
  to authenticated
  using (public.is_org_booking_staff(organization_id));

-- ponytail: player mutations via RPC only (no insert/update policies for authenticated)

-- ---------------------------------------------------------------------------
-- search_court_slots — security invoker (discovery + slot policies)
-- ---------------------------------------------------------------------------

create or replace function public.search_court_slots(
  p_org_id uuid,
  p_date date,
  p_sport_slug text default null
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
security invoker
set search_path = public
as $$
  with bounds as (
    select
      (p_date::timestamp at time zone 'Europe/Kyiv') at time zone 'UTC' as day_start,
      ((p_date + 1)::timestamp at time zone 'Europe/Kyiv') at time zone 'UTC' as day_end
  )
  select
    s.id as slot_id,
    c.id as court_id,
    c.name as court_name,
    c.place_id,
    c.sport_slug,
    s.starts_at,
    s.ends_at,
    s.price_cents
  from public.court_slots s
  join public.courts c on c.id = s.court_id
  cross join bounds b
  where c.organization_id = p_org_id
    and c.is_active = true
    and s.status = 'available'
    and s.starts_at >= b.day_start
    and s.starts_at < b.day_end
    and (p_sport_slug is null or c.sport_slug = p_sport_slug)
  order by s.starts_at, c.name;
$$;

revoke all on function public.search_court_slots(uuid, date, text) from public;
grant execute on function public.search_court_slots(uuid, date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- book_court_slot — atomic confirm (security definer)
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
    'confirmed'
  )
  returning id into v_reservation_id;

  update public.court_slots
  set status = 'booked'
  where id = v_slot.id;

  return jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'slot_already_booked');
end;
$$;

revoke all on function public.book_court_slot(uuid) from public;
grant execute on function public.book_court_slot(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- cancel_court_reservation
-- ---------------------------------------------------------------------------

create or replace function public.cancel_court_reservation(p_reservation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reservation public.court_reservations%rowtype;
  v_slot public.court_slots%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_reservation_id is null then
    return jsonb_build_object('success', false, 'error', 'missing_reservation_id');
  end if;

  select *
  into v_reservation
  from public.court_reservations r
  where r.id = p_reservation_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'reservation_not_found');
  end if;

  if v_reservation.user_id <> v_uid then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if v_reservation.status <> 'confirmed' then
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
      cancelled_at = v_now
  where id = v_reservation.id;

  update public.court_slots
  set status = 'available'
  where id = v_slot.id;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.cancel_court_reservation(uuid) from public;
grant execute on function public.cancel_court_reservation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- list_my_court_reservations
-- ---------------------------------------------------------------------------

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
  cancelled_at timestamptz
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
    r.cancelled_at
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
-- list_org_court_reservations — org booking staff
-- ---------------------------------------------------------------------------

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
  cancelled_at timestamptz
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
    r.cancelled_at
  from public.court_reservations r
  join public.court_slots s on s.id = r.slot_id
  join public.courts c on c.id = s.court_id
  where r.organization_id = p_org_id
  order by s.starts_at desc;
end;
$$;

revoke all on function public.list_org_court_reservations(uuid) from public;
grant execute on function public.list_org_court_reservations(uuid) to authenticated;
