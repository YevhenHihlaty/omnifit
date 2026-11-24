-- 099_invite_only_lockdown.sql
-- Sprint 3: revoke self-serve join; cap invites at create; revoke/resend/roster usage;
-- enrich invite preview for multi-coach disclosure.

-- ─── 1. Lock down marketplace-style self-join (invite-only MVP) ───────────────

create or replace function public.client_join_coach_roster(p_handle text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ponytail: invite-only MVP — self-join disabled; Phase 2 marketplace may restore
  return jsonb_build_object('success', false, 'error', 'invite_only');
end;
$$;

revoke all on function public.client_join_coach_roster(text) from public;
revoke all on function public.client_join_coach_roster(text) from anon;
revoke all on function public.client_join_coach_roster(text) from authenticated;
-- Keep callable by service_role only (no grant to authenticated)

-- ─── 2. create_client_invite — add free-tier roster cap before pending row ────

create or replace function public.create_client_invite(
  p_email text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_origin_session_id uuid default null,
  p_origin_series_id uuid default null
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

  if p_origin_session_id is not null then
    if not exists (
      select 1
      from public.sessions s
      where s.id = p_origin_session_id
        and s.coach_id = v_uid
        and s.client_id is null
    ) then
      return jsonb_build_object('success', false, 'error', 'invalid_origin_session');
    end if;
  end if;

  if p_origin_series_id is not null then
    if not exists (
      select 1
      from public.session_series ss
      where ss.id = p_origin_series_id
        and ss.coach_id = v_uid
        and ss.client_id is null
    ) then
      return jsonb_build_object('success', false, 'error', 'invalid_origin_series');
    end if;
  end if;

  select cp.current_organization_id
  into v_org_id
  from public.coach_profiles cp
  where cp.user_id = v_uid;

  if v_org_id is null then
    return jsonb_build_object('success', false, 'error', 'coach_profile_incomplete');
  end if;

  if not public.coach_can_add_client(v_uid) then
    return jsonb_build_object('success', false, 'error', 'roster_limit_reached');
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
    invited_user_id,
    origin_session_id,
    origin_series_id
  )
  values (
    v_uid,
    v_org_id,
    v_email,
    p_token_hash,
    p_expires_at,
    'pending',
    case when found then v_existing_profile.id else null end,
    p_origin_session_id,
    p_origin_series_id
  );

  return jsonb_build_object('success', true, 'email', v_email);
end;
$$;

revoke all on function public.create_client_invite(text, text, timestamptz, uuid, uuid) from public;
grant execute on function public.create_client_invite(text, text, timestamptz, uuid, uuid) to authenticated;

-- ─── 3. revoke_client_invite ─────────────────────────────────────────────────

create or replace function public.revoke_client_invite(p_invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.client_invites%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select *
  into v_invite
  from public.client_invites i
  where i.id = p_invite_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_invite.coach_id <> v_uid then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if v_invite.status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_invite.status);
  end if;

  update public.client_invites
  set status = 'revoked',
      revoked_at = v_now,
      updated_at = v_now
  where id = v_invite.id;

  return jsonb_build_object('success', true, 'invite_id', v_invite.id);
end;
$$;

revoke all on function public.revoke_client_invite(uuid) from public;
grant execute on function public.revoke_client_invite(uuid) to authenticated;

-- ─── 4. resend_client_invite — rotate token hash (app holds plaintext once) ───

create or replace function public.resend_client_invite(
  p_invite_id uuid,
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
  v_invite public.client_invites%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if coalesce(trim(p_token_hash), '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_token_hash');
  end if;

  if p_expires_at is null or p_expires_at <= v_now then
    return jsonb_build_object('success', false, 'error', 'invalid_expires_at');
  end if;

  select *
  into v_invite
  from public.client_invites i
  where i.id = p_invite_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_invite.coach_id <> v_uid then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if v_invite.status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_invite.status);
  end if;

  -- Resend only rotates token — does not consume a roster slot
  update public.client_invites
  set token_hash = p_token_hash,
      expires_at = p_expires_at,
      updated_at = v_now
  where id = v_invite.id;

  return jsonb_build_object(
    'success', true,
    'invite_id', v_invite.id,
    'email', v_invite.email,
    'expires_at', p_expires_at
  );
end;
$$;

revoke all on function public.resend_client_invite(uuid, text, timestamptz) from public;
grant execute on function public.resend_client_invite(uuid, text, timestamptz) to authenticated;

-- ─── 5. get_coach_roster_usage ────────────────────────────────────────────────

create or replace function public.get_coach_roster_usage()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tier public.subscription_tier;
  v_active int;
  v_limit int;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select coalesce(cp.personal_subscription_tier, 'free')
  into v_tier
  from public.coach_profiles cp
  where cp.user_id = v_uid;

  if not found then
    return jsonb_build_object('success', false, 'error', 'coach_profile_incomplete');
  end if;

  select count(*)::int into v_active
  from public.coach_client_relationships r
  where r.coach_id = v_uid and r.status = 'active';

  if v_tier = 'pro' then
    v_limit := null;
  elsif v_tier = 'starter' then
    v_limit := 7;
  else
    v_limit := 3;
  end if;

  return jsonb_build_object(
    'success', true,
    'tier', v_tier,
    'active_count', v_active,
    'limit', v_limit,
    'can_invite', public.coach_can_add_client(v_uid)
  );
end;
$$;

revoke all on function public.get_coach_roster_usage() from public;
grant execute on function public.get_coach_roster_usage() to authenticated;

-- ─── 6. get_client_invite_preview — multi-coach disclosure fields ─────────────

create or replace function public.get_client_invite_preview(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_invite public.client_invites%rowtype;
  v_coach_name text;
  v_existing public.profiles%rowtype;
  v_accept_mode text := 'new_user';
  v_active_coach_count int := 0;
  v_other_coaches jsonb := '[]'::jsonb;
begin
  if coalesce(trim(p_token), '') = '' then
    return jsonb_build_object('valid', false, 'error', 'missing_token');
  end if;

  v_hash := public.hash_invite_token(p_token);

  select *
  into v_invite
  from public.client_invites i
  where i.token_hash = v_hash
  limit 1;

  if not found then
    return jsonb_build_object('valid', false, 'error', 'not_found');
  end if;

  if v_invite.status = 'revoked' then
    return jsonb_build_object('valid', false, 'error', 'revoked', 'status', v_invite.status);
  end if;

  if v_invite.status = 'accepted' then
    select coalesce(nullif(trim(p.display_name), ''), split_part(p.email, '@', 1))
    into v_coach_name
    from public.profiles p
    where p.id = v_invite.coach_id;

    return jsonb_build_object(
      'valid', false,
      'error', 'already_accepted',
      'status', v_invite.status,
      'coach_name', coalesce(v_coach_name, 'Your coach')
    );
  end if;

  if v_invite.status = 'expired'
     or (v_invite.status = 'pending' and v_invite.expires_at <= timezone('utc', now())) then
    return jsonb_build_object('valid', false, 'error', 'expired', 'status', 'expired');
  end if;

  select coalesce(nullif(trim(p.display_name), ''), split_part(p.email, '@', 1))
  into v_coach_name
  from public.profiles p
  where p.id = v_invite.coach_id;

  select *
  into v_existing
  from public.profiles p
  where lower(p.email) = lower(v_invite.email)
  limit 1;

  if found and v_existing.role = 'client' then
    v_accept_mode := 'existing_client';

    select count(*)::int into v_active_coach_count
    from public.coach_client_relationships r
    where r.client_id = v_existing.id
      and r.status = 'active'
      and r.coach_id <> v_invite.coach_id;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'coach_id', p.id,
          'display_name', coalesce(nullif(trim(p.display_name), ''), split_part(p.email, '@', 1))
        )
        order by coalesce(nullif(trim(p.display_name), ''), p.email)
      ),
      '[]'::jsonb
    )
    into v_other_coaches
    from public.coach_client_relationships r
    join public.profiles p on p.id = r.coach_id
    where r.client_id = v_existing.id
      and r.status = 'active'
      and r.coach_id <> v_invite.coach_id;
  end if;

  return jsonb_build_object(
    'valid', true,
    'invite_id', v_invite.id,
    'coach_id', v_invite.coach_id,
    'coach_name', coalesce(v_coach_name, 'Your coach'),
    'invite_email', v_invite.email,
    'status', v_invite.status,
    'expires_at', v_invite.expires_at,
    'accept_mode', v_accept_mode,
    'shared_log_disclosure', v_accept_mode = 'existing_client' and v_active_coach_count > 0,
    'active_coach_count', v_active_coach_count,
    'other_coaches', v_other_coaches
  );
end;
$$;

revoke all on function public.get_client_invite_preview(text) from public;
grant execute on function public.get_client_invite_preview(text) to anon, authenticated;

-- ─── 7. accept_client_invite — roster pre-check + shared-log disclosure ───────

drop function if exists public.accept_client_invite(text);

create or replace function public.accept_client_invite(
  p_token text,
  p_disclosure_confirmed boolean default false
)
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
  v_other_active int := 0;
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

  -- Shared class-A logs disclosure when client already has other active coaches
  select count(*)::int into v_other_active
  from public.coach_client_relationships r
  where r.client_id = v_uid
    and r.status = 'active'
    and r.coach_id <> v_invite.coach_id;

  if v_other_active > 0 and coalesce(p_disclosure_confirmed, false) is not true then
    return jsonb_build_object('success', false, 'error', 'disclosure_required');
  end if;

  if not public.coach_can_add_client(v_invite.coach_id) then
    return jsonb_build_object('success', false, 'error', 'roster_limit_reached');
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

  if v_invite.origin_session_id is not null then
    update public.sessions s
    set client_id = v_uid,
        guest_client_name = null,
        updated_at = v_now
    where s.id = v_invite.origin_session_id
      and s.coach_id = v_invite.coach_id
      and s.client_id is null;
  end if;

  if v_invite.origin_series_id is not null then
    update public.session_series ss
    set client_id = v_uid,
        guest_client_name = null,
        updated_at = v_now
    where ss.id = v_invite.origin_series_id
      and ss.coach_id = v_invite.coach_id
      and ss.client_id is null;

    update public.sessions s
    set client_id = v_uid,
        guest_client_name = null,
        updated_at = v_now
    where s.series_id = v_invite.origin_series_id
      and s.coach_id = v_invite.coach_id
      and s.client_id is null;
  end if;

  return jsonb_build_object(
    'success', true,
    'relationship_id', v_relationship_id
  );
end;
$$;

revoke all on function public.accept_client_invite(text, boolean) from public;
grant execute on function public.accept_client_invite(text, boolean) to authenticated;
