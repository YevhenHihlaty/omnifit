-- 059_organization_team_invite_rpc.sql — team staff invite via registration link (no auth.users insert)
-- Depends on: 056b_org_role_permissions.sql, 032_team_invite_accept_rpc.sql

create or replace function public.create_organization_team_invite(
  p_organization_id uuid,
  p_email text,
  p_role public.organization_member_role,
  p_token_hash text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_email text := lower(trim(p_email));
  v_existing_uid uuid;
  v_existing_role text;
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

  if coalesce(trim(p_token_hash), '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_token_hash');
  end if;

  if p_expires_at is null or p_expires_at <= timezone('utc', now()) then
    return jsonb_build_object('success', false, 'error', 'invalid_expires_at');
  end if;

  if exists (
    select 1
    from public.organization_invites i
    where i.organization_id = p_organization_id
      and lower(i.email) = v_email
      and i.status = 'pending'
  ) then
    return jsonb_build_object('success', false, 'error', 'invite_already_pending');
  end if;

  v_existing_uid := public.resolve_profile_id_by_email(v_email);

  if v_existing_uid is not null then
    if exists (
      select 1
      from public.organization_members m
      where m.organization_id = p_organization_id
        and m.user_id = v_existing_uid
        and m.status = 'active'
    ) then
      return jsonb_build_object('success', false, 'error', 'already_member');
    end if;

    select p.role
    into v_existing_role
    from public.profiles p
    where p.id = v_existing_uid;

    if v_existing_role is distinct from 'coach' and v_existing_role is not null then
      return jsonb_build_object('success', false, 'error', 'existing_non_coach_user');
    end if;
  end if;

  insert into public.organization_invites (
    organization_id,
    email,
    role,
    token_hash,
    status,
    invited_by,
    expires_at
  )
  values (
    p_organization_id,
    v_email,
    p_role,
    p_token_hash,
    'pending',
    v_caller,
    p_expires_at
  );

  return jsonb_build_object('success', true, 'email', v_email);
end;
$$;

revoke all on function public.create_organization_team_invite(
  uuid, text, public.organization_member_role, text, timestamptz
) from public;
grant execute on function public.create_organization_team_invite(
  uuid, text, public.organization_member_role, text, timestamptz
) to authenticated;
