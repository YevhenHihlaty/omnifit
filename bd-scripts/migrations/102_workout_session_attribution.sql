-- 102_workout_session_attribution.sql
-- Sprint 3: peer active coaches can SELECT sessions for a shared client (attribution).
-- Workouts already expose logged_by_id to active coaches via workouts_select_own_or_coach (012).

-- Peer coaches need to read sessions owned by another coach of the same client
-- so History can show "With {coach display name}". Own-session CRUD stays via
-- sessions_select_manageable / can_manage_coach_sessions.

drop policy if exists sessions_select_peer_active_coach on public.sessions;
create policy sessions_select_peer_active_coach
  on public.sessions for select
  to authenticated
  using (
    client_id is not null
    and public.coach_has_active_client((select auth.uid()), client_id)
  );

-- Helper for tests / attribution samples (optional UI later)
create or replace function public.get_client_workout_attribution(p_client_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_client_id is null then
    return jsonb_build_object('success', false, 'error', 'missing_client_id');
  end if;

  if not public.coach_has_active_client(v_uid, p_client_id)
     and v_uid is distinct from p_client_id then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'workout_id', s.id,
        'logged_by_id', s.logged_by_id,
        'logged_by_name', s.logged_by_name,
        'source', s.source,
        'logged_at', s.logged_at
      )
      order by s.logged_at desc
    ),
    '[]'::jsonb
  )
  into v_rows
  from (
    select
      w.id,
      w.logged_by_id,
      coalesce(nullif(trim(p.display_name), ''), split_part(p.email, '@', 1)) as logged_by_name,
      w.source,
      w.logged_at
    from public.workouts w
    join public.profiles p on p.id = w.logged_by_id
    where w.client_id = p_client_id
    order by w.logged_at desc
    limit 20
  ) s;

  return jsonb_build_object('success', true, 'workouts', coalesce(v_rows, '[]'::jsonb));
end;
$$;

revoke all on function public.get_client_workout_attribution(uuid) from public;
grant execute on function public.get_client_workout_attribution(uuid) to authenticated;
