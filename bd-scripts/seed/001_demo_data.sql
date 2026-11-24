-- Demo seed (development / local E2E only — NEVER run against production)
--
-- Prerequisites:
--   1. Apply migrations 001–096
--   2. Create two Auth users (email/password) in Supabase Auth, then set their
--      UUIDs below OR pass via psql variables:
--
--   psql "$DATABASE_URL" \
--     -v coach_id="'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'" \
--     -v client_id="'ffffffff-1111-2222-3333-444444444444'" \
--     -f bd-scripts/seed/001_demo_data.sql
--
-- Profiles rows are normally created by handle_new_user() on auth.users insert.
-- This seed assumes profiles already exist for :coach_id and :client_id.

\if :{?coach_id}
\else
\echo 'Set -v coach_id=UUID and -v client_id=UUID (quoted) before running this seed.'
\quit
\endif

\if :{?client_id}
\else
\echo 'Set -v client_id=UUID (quoted) before running this seed.'
\quit
\endif

begin;

-- Ensure roles
update public.profiles
set role = 'coach',
    display_name = coalesce(nullif(display_name, ''), 'Demo Coach')
where id = :coach_id::uuid;

update public.profiles
set role = 'client',
    display_name = coalesce(nullif(display_name, ''), 'Demo Client')
where id = :client_id::uuid;

-- Personal org + coach profile (idempotent-ish)
with org as (
  insert into public.organizations (name, kind, owner_id, subscription_tier)
  select 'Demo Coach Practice', 'personal', :coach_id::uuid, 'free'
  where not exists (
    select 1 from public.organizations o where o.owner_id = :coach_id::uuid and o.kind = 'personal'
  )
  returning id
),
existing_org as (
  select id from public.organizations
  where owner_id = :coach_id::uuid and kind = 'personal'
  limit 1
),
org_id as (
  select id from org
  union all
  select id from existing_org
  limit 1
)
insert into public.coach_profiles (
  user_id,
  bio,
  specialties,
  source_organization_id,
  current_organization_id,
  personal_subscription_tier
)
select
  :coach_id::uuid,
  'Demo coach for local E2E',
  array['strength', 'nutrition'],
  (select id from org_id),
  (select id from org_id),
  'free'
where not exists (
  select 1 from public.coach_profiles cp where cp.user_id = :coach_id::uuid
);

insert into public.organization_members (organization_id, user_id, role, status)
select cp.source_organization_id, :coach_id::uuid, 'owner', 'active'
from public.coach_profiles cp
where cp.user_id = :coach_id::uuid
on conflict (organization_id, user_id) do update
  set role = 'owner',
      status = 'active';

insert into public.client_profiles (user_id, goal)
select :client_id::uuid, 'Build consistency'
where not exists (
  select 1 from public.client_profiles cl where cl.user_id = :client_id::uuid
);

insert into public.coach_client_relationships (
  coach_id,
  client_id,
  organization_id,
  status,
  acquisition_source
)
select
  :coach_id::uuid,
  :client_id::uuid,
  cp.source_organization_id,
  'active',
  'coach_invited'
from public.coach_profiles cp
where cp.user_id = :coach_id::uuid
on conflict (coach_id, client_id, organization_id) do update
  set status = 'active',
      acquisition_source = excluded.acquisition_source;

-- Sample meal
insert into public.meals (client_id, meal_type, logged_at, notes)
select :client_id::uuid, 'breakfast', timezone('utc', now()), 'Seed breakfast'
where not exists (
  select 1 from public.meals m
  where m.client_id = :client_id::uuid and m.notes = 'Seed breakfast'
);

commit;

\echo 'Seed complete for coach=' :coach_id ' client=' :client_id
