-- 067_company_admin_signup_rpc.sql — company admin self-provision without coach_profiles row

create or replace function public.provision_company_admin_signup()
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

  if v_profile.role = 'client' then
    return jsonb_build_object('success', false, 'error', 'client_role_exists');
  end if;

  if exists (
    select 1
    from public.coach_profiles cp
    where cp.user_id = v_uid
  ) then
    return jsonb_build_object('success', false, 'error', 'coach_profile_exists');
  end if;

  select u.raw_app_meta_data
  into v_app_meta
  from auth.users u
  where u.id = v_uid;

  if not found then
    return jsonb_build_object('success', false, 'error', 'auth_user_not_found');
  end if;

  v_persona := coalesce(v_app_meta ->> 'persona', '');

  if v_persona = 'company_admin'
     and v_profile.role = 'coach' then
    return jsonb_build_object(
      'success', true,
      'already_complete', true,
      'persona', 'company_admin'
    );
  end if;

  update public.profiles
  set role = 'coach',
      updated_at = v_now
  where id = v_uid
    and (role is null or role = 'coach');

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('persona', 'company_admin')
  where id = v_uid;

  return jsonb_build_object(
    'success', true,
    'already_complete', false,
    'persona', 'company_admin'
  );
end;
$$;

revoke all on function public.provision_company_admin_signup() from public;
grant execute on function public.provision_company_admin_signup() to authenticated;
