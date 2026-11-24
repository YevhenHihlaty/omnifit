-- 093_weekly_checkins.sql — client Sunday subjective check-ins (MVP)

create table if not exists public.weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  sleep smallint check (sleep is null or sleep between 1 and 5),
  soreness smallint check (soreness is null or soreness between 1 and 5),
  stress smallint check (stress is null or stress between 1 and 5),
  energy smallint check (energy is null or energy between 1 and 5),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (client_id, week_start)
);

create index if not exists weekly_checkins_client_week_idx
  on public.weekly_checkins (client_id, week_start desc);

drop trigger if exists weekly_checkins_set_updated_at on public.weekly_checkins;
create trigger weekly_checkins_set_updated_at
  before update on public.weekly_checkins
  for each row execute function public.set_updated_at();

alter table public.weekly_checkins enable row level security;

drop policy if exists weekly_checkins_select_own on public.weekly_checkins;
create policy weekly_checkins_select_own
  on public.weekly_checkins for select
  to authenticated
  using (
    client_id = (select auth.uid())
    or public.coach_has_active_client((select auth.uid()), client_id)
  );

drop policy if exists weekly_checkins_insert_own on public.weekly_checkins;
create policy weekly_checkins_insert_own
  on public.weekly_checkins for insert
  to authenticated
  with check (client_id = (select auth.uid()));

drop policy if exists weekly_checkins_update_own on public.weekly_checkins;
create policy weekly_checkins_update_own
  on public.weekly_checkins for update
  to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

drop policy if exists weekly_checkins_delete_own on public.weekly_checkins;
create policy weekly_checkins_delete_own
  on public.weekly_checkins for delete
  to authenticated
  using (client_id = (select auth.uid()));

comment on table public.weekly_checkins is
  'Client weekly subjective form (sleep/soreness/stress/energy 1–5). Coaches read via active relationship.';
