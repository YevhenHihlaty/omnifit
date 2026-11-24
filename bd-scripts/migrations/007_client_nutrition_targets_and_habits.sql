-- 007_client_nutrition_targets_and_habits.sql — W-CL01 coach targets, habits, completions

do $$ begin
  create type public.habit_unit as enum ('count', 'minutes', 'liters', 'boolean');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.client_nutrition_targets (
  client_id uuid primary key references public.profiles (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  calories_kcal numeric(10, 2) not null check (calories_kcal > 0),
  protein_g numeric(10, 2) check (protein_g is null or protein_g >= 0),
  carbs_g numeric(10, 2) check (carbs_g is null or carbs_g >= 0),
  fat_g numeric(10, 2) check (fat_g is null or fat_g >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists client_nutrition_targets_coach_idx
  on public.client_nutrition_targets (coach_id);

drop trigger if exists client_nutrition_targets_set_updated_at on public.client_nutrition_targets;
create trigger client_nutrition_targets_set_updated_at
  before update on public.client_nutrition_targets
  for each row execute function public.set_updated_at();

create table if not exists public.daily_habits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  habit_key text not null default 'custom',
  target_value numeric(10, 2) not null check (target_value > 0),
  unit public.habit_unit not null default 'count',
  unit_label text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists daily_habits_client_active_idx
  on public.daily_habits (client_id, active, sort_order);

drop trigger if exists daily_habits_set_updated_at on public.daily_habits;
create trigger daily_habits_set_updated_at
  before update on public.daily_habits
  for each row execute function public.set_updated_at();

create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.daily_habits (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  completed_on date not null default (timezone('utc', now())::date),
  current_value numeric(10, 2) not null default 0 check (current_value >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (habit_id, completed_on)
);

create index if not exists habit_completions_client_date_idx
  on public.habit_completions (client_id, completed_on);

drop trigger if exists habit_completions_set_updated_at on public.habit_completions;
create trigger habit_completions_set_updated_at
  before update on public.habit_completions
  for each row execute function public.set_updated_at();

alter table public.client_nutrition_targets enable row level security;
alter table public.daily_habits enable row level security;
alter table public.habit_completions enable row level security;

-- Nutrition targets: client reads own; coach manages active clients
drop policy if exists nutrition_targets_select_client on public.client_nutrition_targets;
create policy nutrition_targets_select_client
  on public.client_nutrition_targets for select
  to authenticated
  using (client_id = auth.uid());

drop policy if exists nutrition_targets_select_coach on public.client_nutrition_targets;
create policy nutrition_targets_select_coach
  on public.client_nutrition_targets for select
  to authenticated
  using (coach_id = auth.uid());

drop policy if exists nutrition_targets_insert_coach on public.client_nutrition_targets;
create policy nutrition_targets_insert_coach
  on public.client_nutrition_targets for insert
  to authenticated
  with check (
    coach_id = auth.uid()
    and public.coach_has_active_client(coach_id, client_id)
  );

drop policy if exists nutrition_targets_update_coach on public.client_nutrition_targets;
create policy nutrition_targets_update_coach
  on public.client_nutrition_targets for update
  to authenticated
  using (
    coach_id = auth.uid()
    and public.coach_has_active_client(coach_id, client_id)
  )
  with check (
    coach_id = auth.uid()
    and public.coach_has_active_client(coach_id, client_id)
  );

-- Daily habits: client read-only; coach CRUD for assigned habits
drop policy if exists daily_habits_select_client on public.daily_habits;
create policy daily_habits_select_client
  on public.daily_habits for select
  to authenticated
  using (client_id = auth.uid());

drop policy if exists daily_habits_select_coach on public.daily_habits;
create policy daily_habits_select_coach
  on public.daily_habits for select
  to authenticated
  using (coach_id = auth.uid());

drop policy if exists daily_habits_insert_coach on public.daily_habits;
create policy daily_habits_insert_coach
  on public.daily_habits for insert
  to authenticated
  with check (
    coach_id = auth.uid()
    and public.coach_has_active_client(coach_id, client_id)
  );

drop policy if exists daily_habits_update_coach on public.daily_habits;
create policy daily_habits_update_coach
  on public.daily_habits for update
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists daily_habits_delete_coach on public.daily_habits;
create policy daily_habits_delete_coach
  on public.daily_habits for delete
  to authenticated
  using (coach_id = auth.uid());

-- Habit completions: client reads own; coach reads for their habits
drop policy if exists habit_completions_select_client on public.habit_completions;
create policy habit_completions_select_client
  on public.habit_completions for select
  to authenticated
  using (client_id = auth.uid());

drop policy if exists habit_completions_select_coach on public.habit_completions;
create policy habit_completions_select_coach
  on public.habit_completions for select
  to authenticated
  using (
    exists (
      select 1
      from public.daily_habits h
      where h.id = habit_id
        and h.coach_id = auth.uid()
    )
  );

-- Clients log progress on assigned active habits
drop policy if exists habit_completions_insert_client on public.habit_completions;
create policy habit_completions_insert_client
  on public.habit_completions for insert
  to authenticated
  with check (
    client_id = auth.uid()
    and exists (
      select 1
      from public.daily_habits h
      where h.id = habit_id
        and h.client_id = auth.uid()
        and h.active = true
    )
  );

drop policy if exists habit_completions_update_client on public.habit_completions;
create policy habit_completions_update_client
  on public.habit_completions for update
  to authenticated
  using (client_id = auth.uid())
  with check (
    client_id = auth.uid()
    and exists (
      select 1
      from public.daily_habits h
      where h.id = habit_id
        and h.client_id = auth.uid()
    )
  );
