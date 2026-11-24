-- 098b_coach_personal_org_rpc.sql
-- 1. Partial unique index: exactly one personal org per owner
-- 2. Role guard trigger on profiles (write-once + no client self-serve via PostgREST)
-- 3. ensure_coach_personal_organization() — idempotent coach onboarding RPC

-- ── 1. Exactly-once personal org per owner ────────────────────────────────────
create unique index if not exists organizations_personal_owner_uniq
  on public.organizations (owner_id)
  where kind = 'personal';

-- ── 2. Role guard trigger ─────────────────────────────────────────────────────
-- When Supabase routes an authenticated API request, PostgreSQL sets the session
-- role to 'authenticated'.  SECURITY DEFINER functions run as their owner
-- (typically 'postgres'), so they bypass this guard and can write any role.
--
-- Guard rules (applied only when current_user = 'authenticated'):
--   a) role = 'client' is never self-assignable via the API.
--   b) Once profiles.role is set, it is immutable from the API layer (write-once).
--      SECURITY DEFINER invite/provision RPCs still work because current_user = 'postgres'.
-- INVOKER on purpose: SECURITY DEFINER would make current_user = postgres and
-- the guard would never fire for PostgREST. Definer RPCs still bypass because
-- they run as postgres (current_user ≠ 'authenticated').
create or replace function public.guard_profiles_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated' then
    if new.role = 'client' then
      raise exception 'role_client_forbidden'
        using errcode = 'check_violation',
              detail   = 'Direct assignment of role=client is not allowed via the API.';
    end if;
    if tg_op = 'UPDATE'
       and old.role is not null
       and new.role is distinct from old.role then
      raise exception 'role_immutable'
        using errcode = 'check_violation',
              detail   = 'profiles.role is write-once once set.';
    end if;
  end if;
  return new;
end;
$$;

-- Trigger functions are invoked by the trigger mechanism; direct EXECUTE not needed
revoke execute on function public.guard_profiles_role() from anon, authenticated, public;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
  before insert or update on public.profiles
  for each row execute function public.guard_profiles_role();

-- ── 3. ensure_coach_personal_organization ────────────────────────────────────
-- Idempotent: first call creates org + coach_profile; subsequent calls update
-- optional fields and return the existing source_organization_id.
--
-- Requires: caller is authenticated AND profiles.role = 'coach'
-- (role must already be 'coach' — set via coach signup flow before this RPC)
create or replace function public.ensure_coach_personal_organization(
  p_display_name text   default null,
  p_bio          text   default null,
  p_specialties  text[] default null,
  p_snapshot     jsonb  default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid        := auth.uid();
  v_profile public.profiles%rowtype;
  v_org_id  uuid;
  v_name    text;
  v_now     timestamptz := timezone('utc', now());
begin
  if v_uid is null then
    raise exception 'not_authenticated'
      using errcode = 'check_violation';
  end if;

  select * into v_profile from public.profiles p where p.id = v_uid;

  if not found then
    raise exception 'profile_not_found'
      using errcode = 'check_violation';
  end if;

  if v_profile.role is distinct from 'coach' then
    raise exception 'coach_role_required'
      using errcode = 'check_violation';
  end if;

  -- ── Idempotent path: coach_profile already exists ─────────────────────────
  if exists (select 1 from public.coach_profiles cp where cp.user_id = v_uid) then

    if p_bio is not null or p_specialties is not null or p_snapshot is not null then
      update public.coach_profiles
      set bio                 = coalesce(p_bio,         bio),
          specialties         = coalesce(p_specialties, specialties),
          onboarding_snapshot = coalesce(p_snapshot,    onboarding_snapshot),
          updated_at          = v_now
      where user_id = v_uid;
    end if;

    if v_profile.onboarding_completed_at is null then
      update public.profiles
      set onboarding_completed_at = v_now,
          updated_at = v_now
      where id = v_uid;
    end if;

    select cp.source_organization_id into v_org_id
    from public.coach_profiles cp
    where cp.user_id = v_uid;

    return v_org_id;
  end if;

  -- ── Create path: first call ───────────────────────────────────────────────
  v_name := coalesce(
    nullif(trim(p_display_name), ''),
    nullif(trim(v_profile.display_name), ''),
    'Personal'
  );

  insert into public.organizations (name, slug, kind, owner_id, subscription_tier)
  values (
    v_name,
    public.org_slug_from_name(v_name),
    'personal',
    v_uid,
    'free'
  )
  returning id into v_org_id;

  insert into public.coach_profiles (
    user_id,
    source_organization_id,
    current_organization_id,
    bio,
    specialties,
    onboarding_snapshot,
    personal_subscription_tier
  )
  values (v_uid, v_org_id, v_org_id, p_bio, p_specialties, p_snapshot, 'free');

  update public.profiles
  set onboarding_completed_at = v_now,
      updated_at = v_now
  where id = v_uid;

  -- Mirror app_metadata.role for middleware claims (persona kept for legacy 057/067)
  update auth.users
  set raw_app_meta_data =
        coalesce(raw_app_meta_data, '{}'::jsonb)
        || '{"role":"coach","persona":"coach"}'::jsonb
  where id = v_uid;

  return v_org_id;
end;
$$;

revoke all on function public.ensure_coach_personal_organization(text, text, text[], jsonb) from public;
grant execute on function public.ensure_coach_personal_organization(text, text, text[], jsonb) to authenticated;
