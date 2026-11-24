-- 035_client_invites.sql — coach-initiated client access (invite-only clients)

create table if not exists public.client_invites (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  token_hash text not null,
  status public.organization_invite_status not null default 'pending',
  invited_user_id uuid references public.profiles (id) on delete set null,
  relationship_id uuid references public.coach_client_relationships (id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_user_id uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint client_invites_token_hash_unique unique (token_hash)
);

create index if not exists client_invites_coach_id_idx
  on public.client_invites (coach_id);

create index if not exists client_invites_email_lower_idx
  on public.client_invites (lower(email));

create unique index if not exists client_invites_coach_email_pending_unique
  on public.client_invites (coach_id, lower(email))
  where status = 'pending';

drop trigger if exists client_invites_set_updated_at on public.client_invites;
create trigger client_invites_set_updated_at
  before update on public.client_invites
  for each row execute function public.set_updated_at();

alter table public.client_invites enable row level security;

drop policy if exists client_invites_select_coach on public.client_invites;
create policy client_invites_select_coach
  on public.client_invites for select
  to authenticated
  using (coach_id = auth.uid());

drop policy if exists client_invites_insert_coach on public.client_invites;
create policy client_invites_insert_coach
  on public.client_invites for insert
  to authenticated
  with check (coach_id = auth.uid());

drop policy if exists client_invites_update_coach on public.client_invites;
create policy client_invites_update_coach
  on public.client_invites for update
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Preview (anon + authenticated)
-- ---------------------------------------------------------------------------

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

  return jsonb_build_object(
    'valid', true,
    'invite_id', v_invite.id,
    'coach_id', v_invite.coach_id,
    'coach_name', coalesce(v_coach_name, 'Your coach'),
    'invite_email', v_invite.email,
    'status', v_invite.status,
    'expires_at', v_invite.expires_at
  );
end;
$$;

revoke all on function public.get_client_invite_preview(text) from public;
grant execute on function public.get_client_invite_preview(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Accept (authenticated — links roster + client profile)
-- ---------------------------------------------------------------------------

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
    return jsonb_build_object('success', false, 'error', 'coach_role_required');
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
