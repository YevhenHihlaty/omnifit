-- 016_places_and_coach_places.sql — canonical training venues + coach links (O05 / CH13)

do $$ begin
  create type public.place_type as enum (
    'gym',
    'studio',
    'park',
    'outdoor',
    'online',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.place_source as enum ('seed', 'user');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  place_type public.place_type not null default 'gym',
  address_line1 text,
  city text,
  region text,
  postal_code text,
  country text,
  latitude double precision,
  longitude double precision,
  normalized_key text not null,
  usage_count integer not null default 0 check (usage_count >= 0),
  source public.place_source not null default 'user',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint places_normalized_key_unique unique (normalized_key)
);

create index if not exists places_name_idx on public.places (name);
create index if not exists places_city_idx on public.places (city) where city is not null;
create index if not exists places_usage_count_idx on public.places (usage_count desc);

drop trigger if exists places_set_updated_at on public.places;
create trigger places_set_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();

create table if not exists public.coach_places (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  is_primary boolean not null default false,
  custom_label text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint coach_places_coach_place_unique unique (coach_id, place_id)
);

create index if not exists coach_places_coach_id_idx on public.coach_places (coach_id);
create index if not exists coach_places_place_id_idx on public.coach_places (place_id);

drop trigger if exists coach_places_set_updated_at on public.coach_places;
create trigger coach_places_set_updated_at
  before update on public.coach_places
  for each row execute function public.set_updated_at();

create or replace function public.increment_place_usage_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.places
  set usage_count = usage_count + 1,
      updated_at = timezone('utc', now())
  where id = new.place_id;
  return new;
end;
$$;

drop trigger if exists coach_places_increment_usage on public.coach_places;
create trigger coach_places_increment_usage
  after insert on public.coach_places
  for each row execute function public.increment_place_usage_count();

alter table public.places enable row level security;
alter table public.coach_places enable row level security;

drop policy if exists places_select_authenticated on public.places;
create policy places_select_authenticated
  on public.places for select
  to authenticated
  using (true);

drop policy if exists places_insert_coach on public.places;
create policy places_insert_coach
  on public.places for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'coach'
    )
  );

drop policy if exists coach_places_select_own on public.coach_places;
create policy coach_places_select_own
  on public.coach_places for select
  to authenticated
  using (coach_id = auth.uid());

drop policy if exists coach_places_insert_own on public.coach_places;
create policy coach_places_insert_own
  on public.coach_places for insert
  to authenticated
  with check (coach_id = auth.uid());

drop policy if exists coach_places_update_own on public.coach_places;
create policy coach_places_update_own
  on public.coach_places for update
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists coach_places_delete_own on public.coach_places;
create policy coach_places_delete_own
  on public.coach_places for delete
  to authenticated
  using (coach_id = auth.uid());
