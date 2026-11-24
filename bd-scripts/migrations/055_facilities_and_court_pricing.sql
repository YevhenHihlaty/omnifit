-- 055_facilities_and_court_pricing.sql — training rooms + default hourly court price
-- Depends on: 038_rocketplay_court_booking.sql, 030_team_studio_members_invites_places.sql

alter table public.courts
  add column if not exists default_hourly_price_cents integer
  check (default_hourly_price_cents is null or default_hourly_price_cents >= 0);

create table if not exists public.training_rooms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete restrict,
  name text not null,
  capacity integer,
  sport_slug text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint training_rooms_name_not_blank check (char_length(trim(name)) > 0),
  constraint training_rooms_capacity_positive check (capacity is null or capacity > 0)
);

create index if not exists training_rooms_organization_id_idx
  on public.training_rooms (organization_id);

create index if not exists training_rooms_place_id_idx
  on public.training_rooms (place_id);

drop trigger if exists training_rooms_set_updated_at on public.training_rooms;
create trigger training_rooms_set_updated_at
  before update on public.training_rooms
  for each row execute function public.set_updated_at();

alter table public.training_rooms enable row level security;

drop policy if exists training_rooms_select_org_staff on public.training_rooms;
create policy training_rooms_select_org_staff
  on public.training_rooms for select
  to authenticated
  using (public.is_org_booking_staff(organization_id));

drop policy if exists training_rooms_insert_org_admin on public.training_rooms;
create policy training_rooms_insert_org_admin
  on public.training_rooms for insert
  to authenticated
  with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists training_rooms_update_org_admin on public.training_rooms;
create policy training_rooms_update_org_admin
  on public.training_rooms for update
  to authenticated
  using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));
