-- 003_organizations_and_role_profiles.sql — personal company + role profiles

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind public.organization_kind not null default 'personal',
  slug text,
  logo_url text,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  subscription_tier public.subscription_tier not null default 'free',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists organizations_owner_id_idx on public.organizations (owner_id);

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create table if not exists public.coach_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  bio text,
  specialties text[],
  source_organization_id uuid not null references public.organizations (id) on delete restrict,
  current_organization_id uuid not null references public.organizations (id) on delete restrict,
  preferred_workspace_id uuid references public.organizations (id) on delete set null,
  personal_subscription_tier public.subscription_tier not null default 'free',
  rating_avg numeric(3, 2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists coach_profiles_user_id_idx on public.coach_profiles (user_id);

drop trigger if exists coach_profiles_set_updated_at on public.coach_profiles;
create trigger coach_profiles_set_updated_at
  before update on public.coach_profiles
  for each row execute function public.set_updated_at();

create table if not exists public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  goal text,
  height_cm numeric(5, 2),
  weight_kg numeric(5, 2),
  date_of_birth date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists client_profiles_user_id_idx on public.client_profiles (user_id);

drop trigger if exists client_profiles_set_updated_at on public.client_profiles;
create trigger client_profiles_set_updated_at
  before update on public.client_profiles
  for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.coach_profiles enable row level security;
alter table public.client_profiles enable row level security;

-- Organizations: owner can read/update their orgs
drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member
  on public.organizations for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists organizations_insert_owner on public.organizations;
create policy organizations_insert_owner
  on public.organizations for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists organizations_update_owner on public.organizations;
create policy organizations_update_owner
  on public.organizations for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Coach profile: own row only
drop policy if exists coach_profiles_select_own on public.coach_profiles;
create policy coach_profiles_select_own
  on public.coach_profiles for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists coach_profiles_insert_own on public.coach_profiles;
create policy coach_profiles_insert_own
  on public.coach_profiles for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists coach_profiles_update_own on public.coach_profiles;
create policy coach_profiles_update_own
  on public.coach_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Client profile: own row only
drop policy if exists client_profiles_select_own on public.client_profiles;
create policy client_profiles_select_own
  on public.client_profiles for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists client_profiles_insert_own on public.client_profiles;
create policy client_profiles_insert_own
  on public.client_profiles for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists client_profiles_update_own on public.client_profiles;
create policy client_profiles_update_own
  on public.client_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
