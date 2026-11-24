-- 037_client_invite_no_service_role.sql — coach invite + accept without admin API

create or replace function public.create_client_invite(
  p_email text,
  p_token_hash text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_org_id uuid;
  v_existing_profile public.profiles%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  v_email := lower(trim(p_email));

  if v_email = '' or position('@' in v_email) <= 1 then
    return jsonb_build_object('success', false, 'error', 'invalid_email');
  end if;

  if coalesce(trim(p_token_hash), '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_token_hash');
  end if;

  if p_expires_at is null or p_expires_at <= timezone('utc', now()) then
    return jsonb_build_object('success', false, 'error', 'invalid_expires_at');
  end if;

  select cp.current_organization_id
  into v_org_id
  from public.coach_profiles cp
  where cp.user_id = v_uid;

  if v_org_id is null then
    return jsonb_build_object('success', false, 'error', 'coach_profile_incomplete');
  end if;

  if exists (
    select 1
    from public.client_invites i
    where i.coach_id = v_uid
      and lower(i.email) = v_email
      and i.status = 'pending'
  ) then
    return jsonb_build_object('success', false, 'error', 'invite_already_pending');
  end if;

  select *
  into v_existing_profile
  from public.profiles p
  where lower(p.email) = v_email
  limit 1;

  if found and v_existing_profile.role = 'coach' then
    return jsonb_build_object('success', false, 'error', 'email_is_coach');
  end if;

  if found and v_existing_profile.role = 'client' then
    if exists (
      select 1
      from public.coach_client_relationships r
      where r.coach_id = v_uid
        and r.client_id = v_existing_profile.id
        and r.status = 'active'
    ) then
      return jsonb_build_object('success', false, 'error', 'client_already_on_roster');
    end if;
  end if;

  insert into public.client_invites (
    coach_id,
    organization_id,
    email,
    token_hash,
    expires_at,
    status,
    invited_user_id
  )
  values (
    v_uid,
    v_org_id,
    v_email,
    p_token_hash,
    p_expires_at,
    'pending',
    case when found then v_existing_profile.id else null end
  );

  return jsonb_build_object('success', true, 'email', v_email);
end;
$$;

revoke all on function public.create_client_invite(text, text, timestamptz) from public;
grant execute on function public.create_client_invite(text, text, timestamptz) to authenticated;

create or replace function public.accept_client_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hash text;
  v_invite public.client_invites%rowtype;
  v_profile public.profiles%rowtype;
  v_relationship_id uuid;
  v_now timestamptz := timezone('utc', now());
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if coalesce(trim(p_token), '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_token');
  end if;

  v_hash := public.hash_invite_token(p_token);

  select *
  into v_invite
  from public.client_invites i
  where i.token_hash = v_hash
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_invite.status = 'accepted' and v_invite.accepted_user_id = v_uid then
    return jsonb_build_object(
      'success', true,
      'already_accepted', true,
      'relationship_id', v_invite.relationship_id
    );
  end if;

  if v_invite.status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_invite.status);
  end if;

  if v_invite.expires_at <= v_now then
    update public.client_invites
    set status = 'expired', updated_at = v_now
    where id = v_invite.id;

    return jsonb_build_object('success', false, 'error', 'expired');
  end if;

  select *
  into v_profile
  from public.profiles p
  where p.id = v_uid;

  if not found then
    return jsonb_build_object('success', false, 'error', 'profile_not_found');
  end if;

  if lower(coalesce(v_profile.email, '')) <> lower(v_invite.email) then
    return jsonb_build_object('success', false, 'error', 'email_mismatch');
  end if;

  if v_invite.invited_user_id is not null and v_invite.invited_user_id <> v_uid then
    return jsonb_build_object('success', false, 'error', 'user_mismatch');
  end if;

  if v_profile.role is not null and v_profile.role <> 'client' then
    return jsonb_build_object('success', false, 'error', 'client_role_required');
  end if;

  update public.profiles
  set role = 'client',
      updated_at = v_now
  where id = v_uid
    and (role is null or role = 'client');

  insert into public.client_profiles (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  insert into public.coach_client_relationships (
    coach_id,
    client_id,
    organization_id,
    status
  )
  values (
    v_invite.coach_id,
    v_uid,
    v_invite.organization_id,
    'active'
  )
  on conflict (coach_id, client_id, organization_id) do update
    set status = 'active',
        updated_at = v_now
  returning id into v_relationship_id;

  update public.client_invites
  set status = 'accepted',
      accepted_at = v_now,
      accepted_user_id = v_uid,
      invited_user_id = coalesce(v_invite.invited_user_id, v_uid),
      relationship_id = v_relationship_id,
      updated_at = v_now
  where id = v_invite.id;

  return jsonb_build_object(
    'success', true,
    'relationship_id', v_relationship_id
  );
end;
$$;

revoke all on function public.accept_client_invite(text) from public;
grant execute on function public.accept_client_invite(text) to authenticated;
