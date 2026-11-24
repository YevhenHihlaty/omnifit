-- 072_search_court_slots_lazy_generate.sql — generate missing slots on search when courts exist

create or replace function public._generate_court_slots_for_place_core(
  p_org_id uuid,
  p_place_id uuid,
  p_from_date date,
  p_to_date date,
  p_skip_past boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_opening_hours jsonb;
  v_tz constant text := 'Europe/Kyiv';
  v_day date;
  v_day_key text;
  v_day_cfg jsonb;
  v_enabled boolean;
  v_start_hour integer;
  v_end_hour integer;
  v_hour integer;
  v_court record;
  v_start timestamptz;
  v_end timestamptz;
  v_created integer := 0;
  v_skipped integer := 0;
begin
  if p_from_date is null or p_to_date is null or p_to_date < p_from_date then
    return jsonb_build_object('success', false, 'error', 'invalid_date_range');
  end if;

  if p_to_date - p_from_date > 31 then
    return jsonb_build_object('success', false, 'error', 'invalid_date_range');
  end if;

  if not exists (
    select 1
    from public.organization_places op
    where op.organization_id = p_org_id
      and op.place_id = p_place_id
  ) then
    return jsonb_build_object('success', false, 'error', 'missing_place');
  end if;

  if not exists (
    select 1
    from public.courts c
    where c.organization_id = p_org_id
      and c.place_id = p_place_id
      and c.is_active = true
  ) then
    return jsonb_build_object('success', false, 'error', 'no_courts');
  end if;

  select op.opening_hours
  into v_opening_hours
  from public.organization_places op
  where op.organization_id = p_org_id
    and op.place_id = p_place_id
  order by op.is_primary desc nulls last, op.sort_order asc nulls last
  limit 1;

  v_day := p_from_date;

  while v_day <= p_to_date loop
    v_day_key := public._weekday_key_for_date(v_day, v_tz);
    v_day_cfg := coalesce(v_opening_hours -> v_day_key, '{}'::jsonb);
    v_enabled := coalesce((v_day_cfg ->> 'enabled')::boolean, true);

    if v_enabled then
      v_start_hour := coalesce(
        nullif(split_part(coalesce(v_day_cfg ->> 'start', '08:00'), ':', 1), '')::integer,
        8
      );
      v_end_hour := coalesce(
        nullif(split_part(coalesce(v_day_cfg ->> 'end', '20:00'), ':', 1), '')::integer,
        20
      );

      if v_end_hour <= v_start_hour then
        v_end_hour := v_start_hour + 1;
      end if;

      for v_court in
        select c.id, c.default_hourly_price_cents
        from public.courts c
        where c.organization_id = p_org_id
          and c.place_id = p_place_id
          and c.is_active = true
      loop
        for v_hour in v_start_hour..(v_end_hour - 1) loop
          v_start := make_timestamptz(
            extract(year from v_day)::integer,
            extract(month from v_day)::integer,
            extract(day from v_day)::integer,
            v_hour,
            0,
            0,
            v_tz
          );
          v_end := v_start + interval '1 hour';

          if p_skip_past and v_start < timezone('utc', now()) then
            v_skipped := v_skipped + 1;
            continue;
          end if;

          begin
            insert into public.court_slots (
              court_id,
              starts_at,
              ends_at,
              status,
              price_cents
            )
            values (
              v_court.id,
              v_start,
              v_end,
              'available',
              v_court.default_hourly_price_cents
            );
            v_created := v_created + 1;
          exception
            when unique_violation then
              v_skipped := v_skipped + 1;
          end;
        end loop;
      end loop;
    end if;

    v_day := v_day + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'created', v_created,
    'skipped', v_skipped
  );
end;
$$;

revoke all on function public._generate_court_slots_for_place_core(uuid, uuid, date, date, boolean) from public;

create or replace function public.generate_court_slots_for_place(
  p_org_id uuid,
  p_place_id uuid,
  p_from_date date,
  p_to_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff uuid := auth.uid();
begin
  if v_staff is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if not public.is_org_booking_staff(p_org_id) then
    return jsonb_build_object('success', false, 'error', 'generate_forbidden');
  end if;

  return public._generate_court_slots_for_place_core(
    p_org_id,
    p_place_id,
    p_from_date,
    p_to_date,
    true
  );
end;
$$;

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
    and (p_place_id is null or c.place_id = p_place_id)
  order by s.starts_at, c.name;
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
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row_count integer;
begin
  select count(*)::integer
  into v_row_count
  from public._search_court_slots_rows(
    p_org_id,
    p_date,
    p_sport_slug,
    p_place_id
  );

  if v_row_count = 0
    and p_place_id is not null
    and exists (
      select 1
      from public.courts c
      where c.organization_id = p_org_id
        and c.place_id = p_place_id
        and c.is_active = true
        and (p_sport_slug is null or c.sport_slug = p_sport_slug)
    )
  then
    perform public._generate_court_slots_for_place_core(
      p_org_id,
      p_place_id,
      p_date,
      p_date,
      true
    );
  end if;

  return query
  select *
  from public._search_court_slots_rows(
    p_org_id,
    p_date,
    p_sport_slug,
    p_place_id
  );
end;
$$;

revoke all on function public.search_court_slots(uuid, date, text, uuid) from public;
grant execute on function public.search_court_slots(uuid, date, text, uuid) to authenticated;
grant execute on function public.search_court_slots(uuid, date, text, uuid) to anon;

comment on function public.search_court_slots(uuid, date, text, uuid) is
  'RocketPlay slot discovery. Lazy-generates hourly slots for the requested day when courts exist but no rows are present.';
