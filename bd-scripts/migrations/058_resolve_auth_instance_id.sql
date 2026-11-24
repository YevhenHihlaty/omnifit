-- 058_resolve_auth_instance_id.sql — hosted Supabase often has empty auth.instances
-- Depends on: 057_org_member_lifecycle_rpc.sql

-- ponytail: borrow instance_id from the caller or any existing auth.users row
create or replace function public.resolve_auth_instance_id()
returns uuid
language plpgsql
stable
security definer
set search_path = auth, public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is not null then
    select u.instance_id into v_id
    from auth.users u
    where u.id = auth.uid()
      and u.instance_id is not null;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  select i.id into v_id
  from auth.instances i
  limit 1;
  if v_id is not null then
    return v_id;
  end if;

  select u.instance_id into v_id
  from auth.users u
  where u.instance_id is not null
  limit 1;

  return v_id;
end;
$$;

revoke all on function public.resolve_auth_instance_id() from public;

-- Patch staff provision RPC to use resolver (fixes auth_instances_missing on hosted projects)
create or replace function public.create_organization_member_with_credentials(
  p_organization_id uuid,
  p_email text,
  p_password text,
  p_display_name text,
  p_role public.organization_member_role
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caller uuid := auth.uid();
  v_email text := lower(trim(p_email));
  v_name text := nullif(trim(p_display_name), '');
  v_uid uuid;
  v_profile public.profiles%rowtype;
  v_personal_org_id uuid;
  v_personal_name text;
  v_now timestamptz := timezone('utc', now());
  v_instance_id uuid;
  v_copied integer := 0;
begin
  if v_caller is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_role = 'owner' then
    return jsonb_build_object('success', false, 'error', 'invalid_role');
  end if;

  if public.can_edit_member_roles(p_organization_id) then
    null;
  elsif public.is_org_ops_manager(p_organization_id)
    and p_role in ('staff', 'coach') then
    null;
  else
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if v_email is null or v_email = '' or position('@' in v_email) = 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_email');
  end if;

  if p_password is null or length(p_password) < 8 then
    return jsonb_build_object('success', false, 'error', 'weak_password');
  end if;

  if exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.status = 'active'
      and m.user_id = public.resolve_profile_id_by_email(v_email)
  ) then
    return jsonb_build_object('success', false, 'error', 'already_member');
  end if;

  v_uid := public.resolve_profile_id_by_email(v_email);

  if v_uid is not null then
    select * into v_profile from public.profiles p where p.id = v_uid;

    if v_profile.role is distinct from 'coach' then
      return jsonb_build_object('success', false, 'error', 'existing_non_coach_user');
    end if;
  else
    v_instance_id := public.resolve_auth_instance_id();
    if v_instance_id is null then
      return jsonb_build_object('success', false, 'error', 'auth_instances_missing');
    end if;

    v_uid := gen_random_uuid();
    v_name := coalesce(v_name, split_part(v_email, '@', 1));

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
      crypt(p_password, gen_salt('bf')),
      v_now,
      jsonb_build_object('persona', 'coach'),
      jsonb_build_object('display_name', v_name),
      v_now,
      v_now,
      '',
      '',
      '',
      ''
    );

    update public.profiles
    set role = 'coach',
        display_name = coalesce(v_name, display_name),
        email = v_email,
        updated_at = v_now
    where id = v_uid;
  end if;

  if v_name is not null then
    update public.profiles
    set display_name = v_name,
        updated_at = v_now
    where id = v_uid;
  end if;

  if not exists (select 1 from public.coach_profiles cp where cp.user_id = v_uid) then
    v_personal_name := coalesce(
      v_name,
      nullif(split_part(v_email, '@', 1), ''),
      'My Coaching'
    );

    insert into public.organizations (name, slug, kind, owner_id, subscription_tier)
    values (
      v_personal_name,
      public.org_slug_from_name(v_personal_name),
      'personal',
      v_uid,
      'free'
    )
    returning id into v_personal_org_id;

    insert into public.coach_profiles (
      user_id,
      source_organization_id,
      current_organization_id,
      personal_subscription_tier
    )
    values (v_uid, v_personal_org_id, p_organization_id, 'free');
  else
    update public.coach_profiles
    set current_organization_id = p_organization_id,
        updated_at = v_now
    where user_id = v_uid;
  end if;

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    joined_at
  )
  values (
    p_organization_id,
    v_uid,
    p_role,
    'active',
    v_now
  )
  on conflict (organization_id, user_id) do update
    set role = excluded.role,
        status = 'active',
        joined_at = coalesce(public.organization_members.joined_at, excluded.joined_at),
        removed_at = null,
        updated_at = v_now;

  if p_role = 'coach' then
    v_copied := public.copy_organization_places_to_coach(p_organization_id, v_uid);
  end if;

  return jsonb_build_object(
    'success', true,
    'user_id', v_uid,
    'copied_places_count', v_copied
  );
end;
$$;

revoke all on function public.create_organization_member_with_credentials(
  uuid, text, text, text, public.organization_member_role
) from public;
grant execute on function public.create_organization_member_with_credentials(
  uuid, text, text, text, public.organization_member_role
) to authenticated;
