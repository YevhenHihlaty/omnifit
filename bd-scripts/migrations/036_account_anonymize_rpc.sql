-- 036_account_anonymize_rpc.sql — remove own account without service role (PII scrub + auth delete)

alter table public.profiles
  add column if not exists anonymized_at timestamptz;

create index if not exists profiles_anonymized_at_idx
  on public.profiles (anonymized_at)
  where anonymized_at is not null;

-- Keep profile rows (historical FKs) after auth.users deletion.
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

create or replace function public.profile_is_anonymized(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.anonymized_at is not null
  );
$$;

revoke all on function public.profile_is_anonymized(uuid) from public;
grant execute on function public.profile_is_anonymized(uuid) to authenticated;

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid() and anonymized_at is null)
  with check (id = auth.uid() and anonymized_at is null);

create or replace function public.anonymized_profile_email(p_user_id uuid)
returns text
language sql
immutable
as $$
  select
    'deleted+'
    || left(encode(digest(p_user_id::text || 'coachr-anonymize', 'sha256'), 'hex'), 32)
    || '@deleted.local';
$$;

revoke all on function public.anonymized_profile_email(uuid) from public;

create or replace function public.anonymize_own_account()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_placeholder_email text;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select p.email
  into v_email
  from public.profiles p
  where p.id = v_uid;

  if not found then
    return jsonb_build_object('success', false, 'error', 'profile_not_found');
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id = v_uid
      and p.anonymized_at is not null
  ) then
    return jsonb_build_object('success', false, 'error', 'already_anonymized');
  end if;

  v_placeholder_email := public.anonymized_profile_email(v_uid);

  update public.coach_client_relationships r
  set status = 'archived'
  where (r.coach_id = v_uid or r.client_id = v_uid)
    and r.status = 'active';

  update public.organization_members m
  set
    status = 'removed',
    removed_at = timezone('utc', now())
  where m.user_id = v_uid
    and m.status = 'active';

  update public.client_invites i
  set
    status = 'revoked',
    revoked_at = timezone('utc', now())
  where i.coach_id = v_uid
    and i.status = 'pending';

  update public.organization_invites i
  set
    status = 'revoked',
    revoked_at = timezone('utc', now())
  where i.status = 'pending'
    and (
      i.invited_by = v_uid
      or lower(i.email) = lower(v_email)
    );

  update public.coach_profiles cp
  set
    bio = null,
    specialties = null
  where cp.user_id = v_uid;

  update public.client_profiles cp
  set
    goal = null,
    height_cm = null,
    weight_kg = null,
    date_of_birth = null,
    rocketplay_interests = '{}',
    rocketplay_level = null,
    rocketplay_onboarding_completed_at = null
  where cp.user_id = v_uid;

  update public.organizations o
  set
    name = 'Removed account',
    slug = null,
    logo_url = null
  where o.owner_id = v_uid
    and o.kind = 'personal';

  update public.profiles p
  set
    email = v_placeholder_email,
    display_name = 'Removed user',
    avatar_url = null,
    gender = null,
    anonymized_at = timezone('utc', now())
  where p.id = v_uid;

  delete from auth.users u
  where u.id = v_uid;

  return jsonb_build_object('success', true);
exception
  when others then
    return jsonb_build_object('success', false, 'error', 'anonymize_failed');
end;
$$;

revoke all on function public.anonymize_own_account() from public;
grant execute on function public.anonymize_own_account() to authenticated;
