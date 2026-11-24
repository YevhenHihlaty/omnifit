-- 095_exercises_catalog.sql — shared exercise catalog for logging / templates

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  sport_type public.sport_type,
  default_field_mask jsonb not null default '{}'::jsonb,
  aliases text[] not null default '{}',
  usage_count integer not null default 0 check (usage_count >= 0),
  source text not null default 'user' check (source in ('seed', 'user')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists exercises_name_lower_idx
  on public.exercises (lower(name));

create index if not exists exercises_sport_usage_idx
  on public.exercises (sport_type, usage_count desc);

create unique index if not exists exercises_seed_name_unique_idx
  on public.exercises (lower(name))
  where source = 'seed';

drop trigger if exists exercises_set_updated_at on public.exercises;
create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

alter table public.exercises enable row level security;

-- Shared seed + own user exercises readable by any authenticated user
drop policy if exists exercises_select_visible on public.exercises;
create policy exercises_select_visible
  on public.exercises for select
  to authenticated
  using (
    source = 'seed'
    or created_by = (select auth.uid())
  );

drop policy if exists exercises_insert_own on public.exercises;
create policy exercises_insert_own
  on public.exercises for insert
  to authenticated
  with check (
    source = 'user'
    and created_by = (select auth.uid())
  );

drop policy if exists exercises_update_own on public.exercises;
create policy exercises_update_own
  on public.exercises for update
  to authenticated
  using (source = 'user' and created_by = (select auth.uid()))
  with check (source = 'user' and created_by = (select auth.uid()));

drop policy if exists exercises_delete_own on public.exercises;
create policy exercises_delete_own
  on public.exercises for delete
  to authenticated
  using (source = 'user' and created_by = (select auth.uid()));

comment on table public.exercises is
  'Exercise catalog: seed rows global; source=user rows private to creator until usage promotes discoverability.';
