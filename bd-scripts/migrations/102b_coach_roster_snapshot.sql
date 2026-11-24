-- 102b_coach_roster_snapshot.sql
-- Sprint 4: coach roster list, client snapshot, archive/restore, dashboard summary
-- Decisions D1–D4 locked in docs/SPRINT_ROADMAP.md Sprint 4.

-- ── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists coach_client_relationships_client_status_idx
  on public.coach_client_relationships (client_id, status);

create index if not exists sessions_coach_status_starts_at_idx
  on public.sessions (coach_id, status, starts_at);

-- ── D1: activity streak (class-A logs) ────────────────────────────────────────

create or replace function public.client_activity_streak(
  p_client_id uuid,
  p_tz text default 'UTC'
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := (timezone(coalesce(nullif(trim(p_tz), ''), 'UTC'), now()))::date;
  v_day date := v_today;
  v_streak integer := 0;
  v_has boolean;
begin
  if p_client_id is null then
    return 0;
  end if;

  loop
    select exists (
      select 1
      from public.meals m
      where m.client_id = p_client_id
        and (timezone(coalesce(nullif(trim(p_tz), ''), 'UTC'), m.logged_at))::date = v_day
    ) or exists (
      select 1
      from public.workouts w
      where w.client_id = p_client_id
        and (timezone(coalesce(nullif(trim(p_tz), ''), 'UTC'), w.logged_at))::date = v_day
    ) or exists (
      select 1
      from public.body_metrics b
      where b.client_id = p_client_id
        and (timezone(coalesce(nullif(trim(p_tz), ''), 'UTC'), b.logged_at))::date = v_day
    )
    into v_has;

    exit when not v_has;

    v_streak := v_streak + 1;
    v_day := v_day - 1;

    -- ponytail: hard ceiling 365 days; upgrade if lifetime streaks matter
    exit when v_streak >= 365;
  end loop;

  return v_streak;
end;
$$;

revoke all on function public.client_activity_streak(uuid, text) from public;
-- Internal helper only — called from list/snapshot/dashboard SECURITY DEFINER RPCs
revoke all on function public.client_activity_streak(uuid, text) from authenticated;

-- ── D3: status bucket classifier ──────────────────────────────────────────────

create or replace function public.client_status_bucket(
  p_paired_at timestamptz,
  p_last_log_on date,
  p_last_checkin_on date,
  p_tz text default 'UTC'
)
returns text
language plpgsql
stable
as $$
declare
  v_today date := (timezone(coalesce(nullif(trim(p_tz), ''), 'UTC'), now()))::date;
  v_paired_on date := (timezone(coalesce(nullif(trim(p_tz), ''), 'UTC'), p_paired_at))::date;
  v_days_since_pair integer := v_today - v_paired_on;
  v_days_since_log integer;
  v_days_since_checkin integer;
begin
  -- new: pairing ≤7d and no weekly check-in yet
  if v_days_since_pair <= 7 and p_last_checkin_on is null then
    return 'new';
  end if;

  v_days_since_log := case
    when p_last_log_on is null then 9999
    else v_today - p_last_log_on
  end;

  v_days_since_checkin := case
    when p_last_checkin_on is null then 9999
    else v_today - p_last_checkin_on
  end;

  -- at_risk: no class-A log ≥4d OR no weekly check-in ≥14d
  if v_days_since_log >= 4 or v_days_since_checkin >= 14 then
    return 'at_risk';
  end if;

  return 'on_track';
end;
$$;

revoke all on function public.client_status_bucket(timestamptz, date, date, text) from public;
revoke all on function public.client_status_bucket(timestamptz, date, date, text) from authenticated;

-- ── list_coach_clients ────────────────────────────────────────────────────────

create or replace function public.list_coach_clients(
  p_status text default 'active',
  p_search text default null,
  p_tz text default 'UTC'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_tz text := coalesce(nullif(trim(p_tz), ''), 'UTC');
  v_status text := lower(coalesce(nullif(trim(p_status), ''), 'active'));
  v_search text := nullif(trim(p_search), '');
  v_today date := (timezone(v_tz, now()))::date;
  v_clients jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select p.role into v_role from public.profiles p where p.id = v_uid;
  if v_role is distinct from 'coach' then
    return jsonb_build_object('success', false, 'error', 'coach_role_required');
  end if;

  if v_status not in ('active', 'archived', 'all') then
    return jsonb_build_object('success', false, 'error', 'invalid_status');
  end if;

  select coalesce(
    jsonb_agg(row_to_json(x)::jsonb order by x.display_name),
    '[]'::jsonb
  )
  into v_clients
  from (
    select
      r.id as relationship_id,
      r.client_id,
      coalesce(nullif(trim(p.display_name), ''), split_part(p.email, '@', 1)) as display_name,
      p.avatar_url,
      p.email,
      r.status::text as status,
      r.created_at as since,
      case
        when r.status = 'archived' then null
        else coalesce((
          select sum(mi.quantity_servings * coalesce(fp.calories_kcal, 0))
          from public.meals m
          join public.meal_items mi on mi.meal_id = m.id
          join public.food_products fp on fp.id = mi.product_id
          where m.client_id = r.client_id
            and (timezone(v_tz, m.logged_at))::date = v_today
        ), 0)
      end as calories_today,
      case
        when r.status = 'archived' then null
        else (
          select count(*)::int
          from public.workouts w
          where w.client_id = r.client_id
            and (timezone(v_tz, w.logged_at))::date = v_today
        )
      end as workouts_today,
      case
        when r.status = 'archived' then null
        else (
          select max(wc.week_start)
          from public.weekly_checkins wc
          where wc.client_id = r.client_id
        )
      end as last_checkin_on,
      case
        when r.status = 'archived' then null
        else (
          select max(d)
          from (
            select (timezone(v_tz, m.logged_at))::date as d
            from public.meals m where m.client_id = r.client_id
            union all
            select (timezone(v_tz, w.logged_at))::date
            from public.workouts w where w.client_id = r.client_id
            union all
            select (timezone(v_tz, b.logged_at))::date
            from public.body_metrics b where b.client_id = r.client_id
          ) logs
        )
      end as last_log_on,
      case
        when r.status = 'archived' then null
        else public.client_activity_streak(r.client_id, v_tz)
      end as streak_days,
      case
        when r.status = 'archived' then null
        else public.client_status_bucket(
          r.created_at,
          (
            select max(d)
            from (
              select (timezone(v_tz, m.logged_at))::date as d
              from public.meals m where m.client_id = r.client_id
              union all
              select (timezone(v_tz, w.logged_at))::date
              from public.workouts w where w.client_id = r.client_id
              union all
              select (timezone(v_tz, b.logged_at))::date
              from public.body_metrics b where b.client_id = r.client_id
            ) logs
          ),
          (select max(wc.week_start) from public.weekly_checkins wc where wc.client_id = r.client_id),
          v_tz
        )
      end as status_bucket
    from public.coach_client_relationships r
    join public.profiles p on p.id = r.client_id
    where r.coach_id = v_uid
      and (
        v_status = 'all'
        or r.status::text = v_status
      )
      and (
        v_search is null
        or p.email ilike '%' || v_search || '%'
        or coalesce(p.display_name, '') ilike '%' || v_search || '%'
      )
  ) x;

  return jsonb_build_object('success', true, 'clients', v_clients);
end;
$$;

revoke all on function public.list_coach_clients(text, text, text) from public;
grant execute on function public.list_coach_clients(text, text, text) to authenticated;

-- ── get_coach_client_snapshot ─────────────────────────────────────────────────

create or replace function public.get_coach_client_snapshot(
  p_client_id uuid,
  p_tz text default 'UTC'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_tz text := coalesce(nullif(trim(p_tz), ''), 'UTC');
  v_today date := (timezone(v_tz, now()))::date;
  v_rel public.coach_client_relationships%rowtype;
  v_display text;
  v_avatar text;
  v_email text;
  v_goal text;
  v_last_log date;
  v_last_checkin date;
  v_streak int;
  v_adherence numeric;
  v_weight_change numeric;
  v_sessions_completed int;
  v_sessions_total int;
  v_calories_consumed numeric;
  v_calories_target numeric;
  v_habits jsonb;
  v_weight_trend jsonb;
  v_checkins jsonb;
  v_activity jsonb;
  v_upcoming jsonb;
  v_note jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select p.role into v_role from public.profiles p where p.id = v_uid;
  if v_role is distinct from 'coach' then
    return jsonb_build_object('success', false, 'error', 'coach_role_required');
  end if;

  if p_client_id is null then
    return jsonb_build_object('success', false, 'error', 'missing_client_id');
  end if;

  if not public.coach_has_active_client(v_uid, p_client_id) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  select * into v_rel
  from public.coach_client_relationships r
  where r.coach_id = v_uid
    and r.client_id = p_client_id
    and r.status = 'active'
  limit 1;

  select
    coalesce(nullif(trim(p.display_name), ''), split_part(p.email, '@', 1)),
    p.avatar_url,
    p.email,
    cp.goal
  into v_display, v_avatar, v_email, v_goal
  from public.profiles p
  left join public.client_profiles cp on cp.user_id = p.id
  where p.id = p_client_id;

  select max(d) into v_last_log
  from (
    select (timezone(v_tz, m.logged_at))::date as d from public.meals m where m.client_id = p_client_id
    union all
    select (timezone(v_tz, w.logged_at))::date from public.workouts w where w.client_id = p_client_id
    union all
    select (timezone(v_tz, b.logged_at))::date from public.body_metrics b where b.client_id = p_client_id
  ) logs;

  select max(wc.week_start) into v_last_checkin
  from public.weekly_checkins wc
  where wc.client_id = p_client_id;

  v_streak := public.client_activity_streak(p_client_id, v_tz);

  -- D2 adherence: days with ≥1 class-A log in last 7 ÷ 7
  select round(
    (
      select count(distinct d)::numeric
      from (
        select (timezone(v_tz, m.logged_at))::date as d
        from public.meals m
        where m.client_id = p_client_id
          and (timezone(v_tz, m.logged_at))::date between v_today - 6 and v_today
        union
        select (timezone(v_tz, w.logged_at))::date
        from public.workouts w
        where w.client_id = p_client_id
          and (timezone(v_tz, w.logged_at))::date between v_today - 6 and v_today
        union
        select (timezone(v_tz, b.logged_at))::date
        from public.body_metrics b
        where b.client_id = p_client_id
          and (timezone(v_tz, b.logged_at))::date between v_today - 6 and v_today
      ) days
    ) / 7.0 * 100
  , 0) into v_adherence;

  select
    (select weight_kg from public.body_metrics
     where client_id = p_client_id and weight_kg is not null
     order by logged_at desc limit 1)
    -
    (select weight_kg from public.body_metrics
     where client_id = p_client_id and weight_kg is not null
       and logged_at <= now() - interval '56 days'
     order by logged_at desc limit 1)
  into v_weight_change;

  select
    count(*) filter (where s.status = 'completed')::int,
    count(*)::int
  into v_sessions_completed, v_sessions_total
  from public.sessions s
  where s.coach_id = v_uid
    and s.client_id = p_client_id
    and s.starts_at >= now() - interval '30 days';

  select coalesce(sum(mi.quantity_servings * coalesce(fp.calories_kcal, 0)), 0)
  into v_calories_consumed
  from public.meals m
  join public.meal_items mi on mi.meal_id = m.id
  join public.food_products fp on fp.id = mi.product_id
  where m.client_id = p_client_id
    and (timezone(v_tz, m.logged_at))::date = v_today;

  -- CLASS B: this coach's nutrition target only
  select cnt.calories_kcal into v_calories_target
  from public.client_nutrition_targets cnt
  where cnt.client_id = p_client_id
    and cnt.coach_id = v_uid;

  -- CLASS B: this coach's habits only
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'habit_id', h.id,
        'title', h.title,
        'target_value', h.target_value,
        'unit', h.unit::text,
        'current_value', coalesce(hc.current_value, 0),
        'done', coalesce(hc.current_value, 0) >= h.target_value
      )
      order by h.sort_order, h.title
    ),
    '[]'::jsonb
  )
  into v_habits
  from public.daily_habits h
  left join public.habit_completions hc
    on hc.habit_id = h.id
   and hc.completed_on = v_today
  where h.client_id = p_client_id
    and h.coach_id = v_uid
    and h.active = true;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'on', (timezone(v_tz, bm.logged_at))::date,
        'weight_kg', bm.weight_kg
      )
      order by bm.logged_at
    ),
    '[]'::jsonb
  )
  into v_weight_trend
  from (
    select logged_at, weight_kg
    from public.body_metrics
    where client_id = p_client_id
      and weight_kg is not null
      and logged_at >= now() - interval '56 days'
    order by logged_at
  ) bm;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'week_start', wc.week_start,
        'score', round((
          coalesce(wc.sleep::numeric, 0)
          + coalesce(wc.soreness::numeric, 0)
          + coalesce(wc.stress::numeric, 0)
          + coalesce(wc.energy::numeric, 0)
          + coalesce(wc.motivation::numeric, 0)
        ) / nullif((
          (wc.sleep is not null)::int
          + (wc.soreness is not null)::int
          + (wc.stress is not null)::int
          + (wc.energy is not null)::int
          + (wc.motivation is not null)::int
        ), 0), 1),
        'present', true
      )
      order by wc.week_start
    ),
    '[]'::jsonb
  )
  into v_checkins
  from (
    select *
    from public.weekly_checkins
    where client_id = p_client_id
      and week_start >= (v_today - 42)
    order by week_start desc
    limit 6
  ) wc;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'kind', a.kind,
        'label', a.label,
        'at', a.at,
        'attributed_to', a.attributed_to
      )
      order by a.at desc
    ),
    '[]'::jsonb
  )
  into v_activity
  from (
    select
      'meal'::text as kind,
      ('Meal · ' || m.meal_type::text) as label,
      m.logged_at as at,
      'Self'::text as attributed_to
    from public.meals m
    where m.client_id = p_client_id
    union all
    select
      'workout',
      ('Workout · ' || w.sport_type::text),
      w.logged_at,
      case
        when w.logged_by_id = p_client_id then 'Self'
        else coalesce(nullif(trim(lp.display_name), ''), split_part(lp.email, '@', 1), 'Coach')
      end
    from public.workouts w
    left join public.profiles lp on lp.id = w.logged_by_id
    where w.client_id = p_client_id
    union all
    select
      'metrics',
      'Body metrics',
      b.logged_at,
      'Self'
    from public.body_metrics b
    where b.client_id = p_client_id
    order by at desc
    limit 10
  ) a;

  select jsonb_build_object(
    'id', s.id,
    'title', s.title,
    'starts_at', s.starts_at,
    'duration_minutes', s.duration_minutes
  )
  into v_upcoming
  from public.sessions s
  where s.coach_id = v_uid
    and s.client_id = p_client_id
    and s.starts_at >= now()
    and s.status in ('upcoming', 'confirmed')
  order by s.starts_at
  limit 1;

  -- CLASS B: this coach's notes only
  select jsonb_build_object(
    'body', n.body,
    'updated_at', n.updated_at
  )
  into v_note
  from public.coach_notes n
  where n.coach_id = v_uid
    and n.client_id = p_client_id
  order by n.updated_at desc
  limit 1;

  return jsonb_build_object(
    'success', true,
    'client', jsonb_build_object(
      'client_id', p_client_id,
      'display_name', v_display,
      'avatar_url', v_avatar,
      'email', v_email,
      'goal', v_goal,
      'since', v_rel.created_at,
      'status_bucket', public.client_status_bucket(v_rel.created_at, v_last_log, v_last_checkin, v_tz)
    ),
    'stats', jsonb_build_object(
      'streak_days', v_streak,
      'weight_change_kg', v_weight_change,
      'adherence_pct', coalesce(v_adherence, 0),
      'sessions_completed', coalesce(v_sessions_completed, 0),
      'sessions_total', coalesce(v_sessions_total, 0)
    ),
    'calories', jsonb_build_object(
      'consumed_kcal', coalesce(v_calories_consumed, 0),
      'target_kcal', v_calories_target
    ),
    'habits', coalesce(v_habits, '[]'::jsonb),
    'weight_trend', coalesce(v_weight_trend, '[]'::jsonb),
    'checkins', coalesce(v_checkins, '[]'::jsonb),
    'recent_activity', coalesce(v_activity, '[]'::jsonb),
    'upcoming_session', v_upcoming,
    'coach_note', v_note
  );
end;
$$;

revoke all on function public.get_coach_client_snapshot(uuid, text) from public;
grant execute on function public.get_coach_client_snapshot(uuid, text) to authenticated;

-- ── archive / restore ─────────────────────────────────────────────────────────

create or replace function public.coach_archive_client(p_client_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_rel public.coach_client_relationships%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select p.role into v_role from public.profiles p where p.id = v_uid;
  if v_role is distinct from 'coach' then
    return jsonb_build_object('success', false, 'error', 'coach_role_required');
  end if;

  if p_client_id is null then
    return jsonb_build_object('success', false, 'error', 'missing_client_id');
  end if;

  select * into v_rel
  from public.coach_client_relationships r
  where r.coach_id = v_uid
    and r.client_id = p_client_id
  order by r.created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_rel.status is distinct from 'active' then
    return jsonb_build_object('success', false, 'error', 'not_active');
  end if;

  update public.coach_client_relationships
  set status = 'archived',
      updated_at = timezone('utc', now())
  where id = v_rel.id;

  return jsonb_build_object('success', true, 'status', 'archived', 'relationship_id', v_rel.id);
end;
$$;

revoke all on function public.coach_archive_client(uuid) from public;
grant execute on function public.coach_archive_client(uuid) to authenticated;

create or replace function public.coach_restore_client(p_client_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_rel public.coach_client_relationships%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select p.role into v_role from public.profiles p where p.id = v_uid;
  if v_role is distinct from 'coach' then
    return jsonb_build_object('success', false, 'error', 'coach_role_required');
  end if;

  if p_client_id is null then
    return jsonb_build_object('success', false, 'error', 'missing_client_id');
  end if;

  select * into v_rel
  from public.coach_client_relationships r
  where r.coach_id = v_uid
    and r.client_id = p_client_id
  order by r.created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_rel.status is distinct from 'archived' then
    return jsonb_build_object('success', false, 'error', 'not_archived');
  end if;

  begin
    update public.coach_client_relationships
    set status = 'active',
        updated_at = timezone('utc', now())
    where id = v_rel.id;
  exception
    when others then
      if SQLERRM like '%roster_limit_reached%' then
        return jsonb_build_object('success', false, 'error', 'roster_limit_reached');
      end if;
      raise;
  end;

  return jsonb_build_object('success', true, 'status', 'active', 'relationship_id', v_rel.id);
end;
$$;

revoke all on function public.coach_restore_client(uuid) from public;
grant execute on function public.coach_restore_client(uuid) to authenticated;

-- ── get_coach_dashboard_summary ───────────────────────────────────────────────

create or replace function public.get_coach_dashboard_summary(
  p_tz text default 'UTC'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_tz text := coalesce(nullif(trim(p_tz), ''), 'UTC');
  v_today date := (timezone(v_tz, now()))::date;
  v_active int;
  v_sessions_30 int;
  v_avg_streak numeric;
  v_this_week int[];
  v_last_week int[];
  v_on_track int := 0;
  v_at_risk int := 0;
  v_new int := 0;
  v_today_sessions jsonb;
  r record;
  v_bucket text;
  v_last_log date;
  v_last_checkin date;
  v_i int;
  v_day date;
  v_count int;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select p.role into v_role from public.profiles p where p.id = v_uid;
  if v_role is distinct from 'coach' then
    return jsonb_build_object('success', false, 'error', 'coach_role_required');
  end if;

  select count(*)::int into v_active
  from public.coach_client_relationships
  where coach_id = v_uid and status = 'active';

  select count(*)::int into v_sessions_30
  from public.sessions s
  where s.coach_id = v_uid
    and s.starts_at >= now() - interval '30 days'
    and s.status in ('completed', 'upcoming', 'confirmed');

  select coalesce(round(avg(public.client_activity_streak(r.client_id, v_tz)), 1), 0)
  into v_avg_streak
  from public.coach_client_relationships r
  where r.coach_id = v_uid and r.status = 'active';

  -- Check-in activity: count of weekly_checkins submitted per weekday (Mon=1..Sun=7)
  -- this_week / last_week arrays indexed 0=Mon … 6=Sun
  v_this_week := array[0, 0, 0, 0, 0, 0, 0];
  v_last_week := array[0, 0, 0, 0, 0, 0, 0];

  for v_i in 0..6 loop
    -- ISO week: Mon=0 … Sun=6 relative to today's week
    v_day := v_today - (extract(isodow from v_today)::int - 1) + v_i;
    select count(*)::int into v_count
    from public.weekly_checkins wc
    join public.coach_client_relationships r
      on r.client_id = wc.client_id and r.coach_id = v_uid and r.status = 'active'
    where (timezone(v_tz, wc.updated_at))::date = v_day;
    v_this_week[v_i + 1] := v_count;

    select count(*)::int into v_count
    from public.weekly_checkins wc
    join public.coach_client_relationships r
      on r.client_id = wc.client_id and r.coach_id = v_uid and r.status = 'active'
    where (timezone(v_tz, wc.updated_at))::date = v_day - 7;
    v_last_week[v_i + 1] := v_count;
  end loop;

  for r in
    select * from public.coach_client_relationships
    where coach_id = v_uid and status = 'active'
  loop
    select max(d) into v_last_log
    from (
      select (timezone(v_tz, m.logged_at))::date as d from public.meals m where m.client_id = r.client_id
      union all
      select (timezone(v_tz, w.logged_at))::date from public.workouts w where w.client_id = r.client_id
      union all
      select (timezone(v_tz, b.logged_at))::date from public.body_metrics b where b.client_id = r.client_id
    ) logs;

    select max(wc.week_start) into v_last_checkin
    from public.weekly_checkins wc where wc.client_id = r.client_id;

    v_bucket := public.client_status_bucket(r.created_at, v_last_log, v_last_checkin, v_tz);
    if v_bucket = 'new' then
      v_new := v_new + 1;
    elsif v_bucket = 'at_risk' then
      v_at_risk := v_at_risk + 1;
    else
      v_on_track := v_on_track + 1;
    end if;
  end loop;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'client_id', s.client_id,
        'client_name', coalesce(nullif(trim(p.display_name), ''), split_part(p.email, '@', 1)),
        'title', s.title,
        'starts_at', s.starts_at,
        'duration_minutes', s.duration_minutes,
        'status', s.status::text
      )
      order by s.starts_at
    ),
    '[]'::jsonb
  )
  into v_today_sessions
  from public.sessions s
  join public.profiles p on p.id = s.client_id
  where s.coach_id = v_uid
    and (timezone(v_tz, s.starts_at))::date = v_today
    and s.status in ('upcoming', 'confirmed', 'completed');

  return jsonb_build_object(
    'success', true,
    'active_clients', v_active,
    'sessions_last_30', coalesce(v_sessions_30, 0),
    'avg_streak_days', coalesce(v_avg_streak, 0),
    'checkin_activity', jsonb_build_object(
      'this_week', to_jsonb(v_this_week),
      'last_week', to_jsonb(v_last_week)
    ),
    'status_counts', jsonb_build_object(
      'on_track', v_on_track,
      'at_risk', v_at_risk,
      'new', v_new
    ),
    'today_sessions', coalesce(v_today_sessions, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_coach_dashboard_summary(text) from public;
grant execute on function public.get_coach_dashboard_summary(text) to authenticated;
