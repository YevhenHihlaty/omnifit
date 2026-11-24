-- 039_rocketplay_player_signup_rpc.sql — RocketPlay player self-provision without service role

create or replace function public.complete_rocketplay_player_signup()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_app_meta jsonb;
  v_persona text;
  v_now timestamptz := timezone('utc', now());
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select *
  into v_profile
  from public.profiles p
  where p.id = v_uid;

  if not found then
    return jsonb_build_object('success', false, 'error', 'profile_not_found');
  end if;

  if v_profile.role = 'coach' then
    return jsonb_build_object('success', false, 'error', 'coach_role_required');
  end if;

  select u.raw_app_meta_data
  into v_app_meta
  from auth.users u
  where u.id = v_uid;

  if not found then
    return jsonb_build_object('success', false, 'error', 'auth_user_not_found');
  end if;

  v_persona := coalesce(v_app_meta ->> 'persona', '');

  if v_persona = 'rocketplay_player' then
    return jsonb_build_object(
      'success', true,
      'already_complete', true,
      'persona', 'rocketplay_player'
    );
  end if;

  if v_profile.role = 'client' then
    if exists (
      select 1
      from public.coach_client_relationships r
      where r.client_id = v_uid
        and r.status = 'active'
    ) then
      return jsonb_build_object('success', false, 'error', 'fitness_client_active');
    end if;

    return jsonb_build_object('success', false, 'error', 'fitness_client_exists');
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

  return jsonb_build_object(
    'success', true,
    'persona', 'rocketplay_player'
  );
end;
$$;

revoke all on function public.complete_rocketplay_player_signup() from public;
grant execute on function public.complete_rocketplay_player_signup() to authenticated;
