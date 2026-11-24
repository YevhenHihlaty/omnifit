-- 012_workouts_and_body_metrics.sql — CL06 training logs + CL08 body metrics

do $$ begin
  create type public.sport_type as enum (
    'weight_lifting',
    'general_fitness',
    'running',
    'cycling',
    'swimming'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.workout_source as enum (
    'client_self',
    'coach_offline',
    'live_session'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.progress_photo_pose as enum ('front', 'side', 'back');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  logged_by_id uuid not null references public.profiles (id) on delete restrict,
  sport_type public.sport_type not null,
  source public.workout_source not null default 'client_self',
  session_id uuid references public.sessions (id) on delete set null,
  duration_sec integer check (duration_sec is null or duration_sec > 0),
  notes text,
  logged_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists workouts_client_logged_at_idx
  on public.workouts (client_id, logged_at desc);

drop trigger if exists workouts_set_updated_at on public.workouts;
create trigger workouts_set_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_name text not null check (char_length(trim(exercise_name)) > 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  reps numeric(8, 2) check (reps is null or reps >= 0),
  weight_kg numeric(8, 2) check (weight_kg is null or weight_kg >= 0),
  duration_sec integer check (duration_sec is null or duration_sec >= 0),
  distance_m numeric(10, 2) check (distance_m is null or distance_m >= 0),
  elevation_m numeric(8, 2) check (elevation_m is null or elevation_m >= 0),
  power_w numeric(8, 2) check (power_w is null or power_w >= 0),
  cadence_rpm numeric(8, 2) check (cadence_rpm is null or cadence_rpm >= 0),
  laps integer check (laps is null or laps >= 0),
  stroke text,
  rpe numeric(3, 1) check (rpe is null or (rpe >= 1 and rpe <= 10)),
  rest_sec integer check (rest_sec is null or rest_sec >= 0),
  notes text,
  interval_work_sec integer check (interval_work_sec is null or interval_work_sec >= 0),
  interval_rest_sec integer check (interval_rest_sec is null or interval_rest_sec >= 0),
  interval_rounds integer check (interval_rounds is null or interval_rounds >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists workout_sets_workout_id_idx
  on public.workout_sets (workout_id, sort_order);

create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  logged_at timestamptz not null default timezone('utc', now()),
  weight_kg numeric(6, 2) check (weight_kg is null or (weight_kg >= 20 and weight_kg <= 500)),
  body_fat_pct numeric(4, 1) check (body_fat_pct is null or (body_fat_pct >= 1 and body_fat_pct <= 70)),
  chest_cm numeric(6, 2) check (chest_cm is null or chest_cm > 0),
  waist_cm numeric(6, 2) check (waist_cm is null or waist_cm > 0),
  arm_cm numeric(6, 2) check (arm_cm is null or arm_cm > 0),
  thigh_cm numeric(6, 2) check (thigh_cm is null or thigh_cm > 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists body_metrics_client_logged_at_idx
  on public.body_metrics (client_id, logged_at desc);

drop trigger if exists body_metrics_set_updated_at on public.body_metrics;
create trigger body_metrics_set_updated_at
  before update on public.body_metrics
  for each row execute function public.set_updated_at();

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  body_metrics_id uuid not null references public.body_metrics (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  pose public.progress_photo_pose not null,
  storage_path text not null check (char_length(trim(storage_path)) > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (body_metrics_id, pose)
);

create index if not exists progress_photos_client_id_idx
  on public.progress_photos (client_id, created_at desc);

alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.body_metrics enable row level security;
alter table public.progress_photos enable row level security;

drop policy if exists workouts_select_own_or_coach on public.workouts;
create policy workouts_select_own_or_coach
  on public.workouts
  for select
  to authenticated
  using (
    client_id = auth.uid()
    or public.coach_has_active_client(auth.uid(), client_id)
  );

drop policy if exists workouts_insert_client on public.workouts;
create policy workouts_insert_client
  on public.workouts
  for insert
  to authenticated
  with check (
    client_id = auth.uid()
    and logged_by_id = auth.uid()
    and source = 'client_self'
  );

drop policy if exists workouts_insert_coach on public.workouts;
create policy workouts_insert_coach
  on public.workouts
  for insert
  to authenticated
  with check (
    logged_by_id = auth.uid()
    and source in ('coach_offline', 'live_session')
    and public.coach_has_active_client(auth.uid(), client_id)
  );

drop policy if exists workout_sets_select_via_workout on public.workout_sets;
create policy workout_sets_select_via_workout
  on public.workout_sets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_sets.workout_id
        and (
          w.client_id = auth.uid()
          or public.coach_has_active_client(auth.uid(), w.client_id)
        )
    )
  );

drop policy if exists workout_sets_insert_via_workout on public.workout_sets;
create policy workout_sets_insert_via_workout
  on public.workout_sets
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_sets.workout_id
        and (
          (w.client_id = auth.uid() and w.logged_by_id = auth.uid())
          or (
            w.logged_by_id = auth.uid()
            and public.coach_has_active_client(auth.uid(), w.client_id)
          )
        )
    )
  );

drop policy if exists body_metrics_select_own_or_coach on public.body_metrics;
create policy body_metrics_select_own_or_coach
  on public.body_metrics
  for select
  to authenticated
  using (
    client_id = auth.uid()
    or public.coach_has_active_client(auth.uid(), client_id)
  );

drop policy if exists body_metrics_insert_own on public.body_metrics;
create policy body_metrics_insert_own
  on public.body_metrics
  for insert
  to authenticated
  with check (client_id = auth.uid());

drop policy if exists body_metrics_update_own on public.body_metrics;
create policy body_metrics_update_own
  on public.body_metrics
  for update
  to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists progress_photos_select_own_or_coach on public.progress_photos;
create policy progress_photos_select_own_or_coach
  on public.progress_photos
  for select
  to authenticated
  using (
    client_id = auth.uid()
    or public.coach_has_active_client(auth.uid(), client_id)
  );

drop policy if exists progress_photos_insert_own on public.progress_photos;
create policy progress_photos_insert_own
  on public.progress_photos
  for insert
  to authenticated
  with check (
    client_id = auth.uid()
    and exists (
      select 1
      from public.body_metrics bm
      where bm.id = progress_photos.body_metrics_id
        and bm.client_id = auth.uid()
    )
  );
