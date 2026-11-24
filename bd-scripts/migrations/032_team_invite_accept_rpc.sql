-- 032_team_invite_accept_rpc.sql — preview + accept team coach invites (PRD team-studio M3)

create or replace function public.hash_invite_token(p_token text)
returns text
language sql
immutable
as $$
  select encode(digest(p_token, 'sha256'), 'hex');
$$;

revoke all on function public.hash_invite_token(text) from public;
grant execute on function public.hash_invite_token(text) to anon, authenticated;

create or replace function public.get_team_coach_invite_preview(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_invite public.organization_invites%rowtype;
  v_org_name text;
  v_sport_slugs text[];
begin
  if coalesce(trim(p_token), '') = '' then
    return jsonb_build_object('valid', false, 'error', 'missing_token');
  end if;

  v_hash := public.hash_invite_token(p_token);

  select *
  into v_invite
  from public.organization_invites i
  where i.token_hash = v_hash
  limit 1;

  if not found then
    return jsonb_build_object('valid', false, 'error', 'not_found');
  end if;

  if v_invite.status = 'revoked' then
    return jsonb_build_object('valid', false, 'error', 'revoked', 'status', v_invite.status);
  end if;

  if v_invite.status = 'accepted' then
    select o.name
    into v_org_name
    from public.organizations o
    where o.id = v_invite.organization_id;

    return jsonb_build_object(
      'valid', false,
      'error', 'already_accepted',
      'status', v_invite.status,
      'organization_id', v_invite.organization_id,
      'organization_name', coalesce(v_org_name, 'Team')
    );
  end if;

  if v_invite.status = 'expired'
     or (v_invite.status = 'pending' and v_invite.expires_at <= timezone('utc', now())) then
    return jsonb_build_object('valid', false, 'error', 'expired', 'status', 'expired');
  end if;

  select o.name
  into v_org_name
  from public.organizations o
  where o.id = v_invite.organization_id;

  select coalesce(array_agg(st.slug order by st.slug), '{}')
  into v_sport_slugs
  from public.organization_sport_tags ost
  join public.sport_tags st on st.id = ost.sport_tag_id
  where ost.organization_id = v_invite.organization_id;

  return jsonb_build_object(
    'valid', true,
    'invite_id', v_invite.id,
    'organization_id', v_invite.organization_id,
    'organization_name', coalesce(v_org_name, 'Team'),
    'invite_email', v_invite.email,
    'status', v_invite.status,
    'expires_at', v_invite.expires_at,
    'sport_slugs', v_sport_slugs
  );
end;
$$;

revoke all on function public.get_team_coach_invite_preview(text) from public;
grant execute on function public.get_team_coach_invite_preview(text) to anon, authenticated;

create or replace function public.org_slug_from_name(p_name text)
returns text
language plpgsql
immutable
as $$
declare
  v_base text;
begin
  v_base := lower(trim(p_name));
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := regexp_replace(v_base, '(^-+|-+$)', '', 'g');
  v_base := left(v_base, 60);

  if length(v_base) >= 2 then
    return v_base;
  end if;

  return 'my-coaching';
end;
$$;

create or replace function public.accept_team_coach_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hash text;
  v_invite public.organization_invites%rowtype;
  v_profile public.profiles%rowtype;
  v_coach public.coach_profiles%rowtype;
  v_personal_org_id uuid;
  v_personal_name text;
  v_copied integer;
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
  from public.organization_invites i
  where i.token_hash = v_hash
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_invite.status = 'accepted' and v_invite.accepted_user_id = v_uid then
    return jsonb_build_object(
      'success', true,
      'already_accepted', true,
      'organization_id', v_invite.organization_id
    );
  end if;

  if v_invite.status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_invite.status);
  end if;

  if v_invite.expires_at <= v_now then
    update public.organization_invites
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

  if v_profile.role is distinct from 'coach' then
    return jsonb_build_object('success', false, 'error', 'coach_role_required');
  end if;

  if lower(coalesce(v_profile.email, '')) <> lower(v_invite.email) then
    return jsonb_build_object('success', false, 'error', 'email_mismatch');
  end if;

  select *
  into v_coach
  from public.coach_profiles cp
  where cp.user_id = v_uid;

  if not found then
    v_personal_name := coalesce(
      nullif(trim(v_profile.display_name), ''),
      nullif(split_part(v_profile.email, '@', 1), ''),
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
    values (v_uid, v_personal_org_id, v_invite.organization_id, 'free');
  else
    update public.coach_profiles
    set current_organization_id = v_invite.organization_id,
        updated_at = v_now
    where user_id = v_uid;
  end if;

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    invited_at,
    joined_at
  )
  values (
    v_invite.organization_id,
    v_uid,
    coalesce(v_invite.role, 'coach'::public.organization_member_role),
    'active',
    v_invite.created_at,
    v_now
  )
  on conflict (organization_id, user_id) do update
    set role = excluded.role,
        status = 'active',
        joined_at = coalesce(public.organization_members.joined_at, excluded.joined_at),
        updated_at = v_now;

  v_copied := public.copy_organization_places_to_coach(v_invite.organization_id, v_uid);

  update public.organization_invites
  set status = 'accepted',
      accepted_at = v_now,
      accepted_user_id = v_uid,
      updated_at = v_now
  where id = v_invite.id;

  return jsonb_build_object(
    'success', true,
    'organization_id', v_invite.organization_id,
    'copied_places_count', v_copied
  );
end;
$$;

revoke all on function public.accept_team_coach_invite(text) from public;
grant execute on function public.accept_team_coach_invite(text) to authenticated;
