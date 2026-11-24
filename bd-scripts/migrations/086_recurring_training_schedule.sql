-- Update existing session_series to support package tracking
alter table public.session_series
  add column if not exists sessions_in_package int,
  add column if not exists price_per_package int;

alter table public.sessions
  add column if not exists package_session_number int,
  add column if not exists payment_status text check (payment_status in ('paid', 'pending', 'overdue'));

-- Redefine create_session_series to handle package_session_number
create or replace function public.create_session_series(
  p_coach_id uuid,
  p_organization_id uuid,
  p_title text,
  p_sport_type text,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_client_id uuid,
  p_guest_client_name text,
  p_rule jsonb,
  p_sessions_in_package integer default null,
  p_price_per_package integer default null
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
  v_session_number int := 1;
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
    guest_client_name,
    sessions_in_package,
    price_per_package
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
    end,
    p_sessions_in_package,
    p_price_per_package
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
      status,
      package_session_number,
      payment_status
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
      'upcoming',
      case when p_sessions_in_package is not null then v_session_number else null end,
      case when p_sessions_in_package is not null then 'pending' else null end
    )
    returning id into v_session_id;

    v_session_ids := array_append(v_session_ids, v_session_id);
    v_session_number := v_session_number + 1;
    
    -- If package limit is reached and we are generating more, reset the counter
    if p_sessions_in_package is not null and v_session_number > p_sessions_in_package then
       v_session_number := 1;
    end if;
  end loop;

  return jsonb_build_object(
    'success', true,
    'series_id', v_series_id,
    'session_ids', to_jsonb(v_session_ids),
    'count', coalesce(array_length(v_session_ids, 1), 0)
  );
end;
$$;
