-- 004_relationships_sessions_tasks.sql — CH01 coach home data

create table if not exists public.coach_client_relationships (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  status public.relationship_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (coach_id, client_id, organization_id)
);

create index if not exists coach_client_relationships_coach_idx
  on public.coach_client_relationships (coach_id, status);

drop trigger if exists coach_client_relationships_set_updated_at on public.coach_client_relationships;
create trigger coach_client_relationships_set_updated_at
  before update on public.coach_client_relationships
  for each row execute function public.set_updated_at();

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  sport_type text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  status public.session_status not null default 'upcoming',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists sessions_coach_starts_at_idx
  on public.sessions (coach_id, starts_at);

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid references public.profiles (id) on delete set null,
  title text not null,
  due_at timestamptz,
  status public.task_status not null default 'todo',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tasks_coach_status_due_idx
  on public.tasks (coach_id, status, due_at);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.coach_client_relationships enable row level security;
alter table public.sessions enable row level security;
alter table public.tasks enable row level security;

-- Helper: active coach–client link
create or replace function public.coach_has_active_client(p_coach_id uuid, p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.coach_client_relationships r
    where r.coach_id = p_coach_id
      and r.client_id = p_client_id
      and r.status = 'active'
  );
$$;

-- Relationships: coach sees own roster
drop policy if exists relationships_select_coach on public.coach_client_relationships;
create policy relationships_select_coach
  on public.coach_client_relationships for select
  to authenticated
  using (coach_id = auth.uid());

drop policy if exists relationships_select_client on public.coach_client_relationships;
create policy relationships_select_client
  on public.coach_client_relationships for select
  to authenticated
  using (client_id = auth.uid());

drop policy if exists relationships_insert_coach on public.coach_client_relationships;
create policy relationships_insert_coach
  on public.coach_client_relationships for insert
  to authenticated
  with check (coach_id = auth.uid());

-- Sessions: coach full access on own sessions; client read own
drop policy if exists sessions_select_coach on public.sessions;
create policy sessions_select_coach
  on public.sessions for select
  to authenticated
  using (coach_id = auth.uid());

drop policy if exists sessions_select_client on public.sessions;
create policy sessions_select_client
  on public.sessions for select
  to authenticated
  using (client_id = auth.uid());

drop policy if exists sessions_insert_coach on public.sessions;
create policy sessions_insert_coach
  on public.sessions for insert
  to authenticated
  with check (
    coach_id = auth.uid()
    and public.coach_has_active_client(coach_id, client_id)
  );

drop policy if exists sessions_update_coach on public.sessions;
create policy sessions_update_coach
  on public.sessions for update
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Tasks: coach owns tasks
drop policy if exists tasks_select_coach on public.tasks;
create policy tasks_select_coach
  on public.tasks for select
  to authenticated
  using (coach_id = auth.uid());

drop policy if exists tasks_insert_coach on public.tasks;
create policy tasks_insert_coach
  on public.tasks for insert
  to authenticated
  with check (coach_id = auth.uid());

drop policy if exists tasks_update_coach on public.tasks;
create policy tasks_update_coach
  on public.tasks for update
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists tasks_delete_coach on public.tasks;
create policy tasks_delete_coach
  on public.tasks for delete
  to authenticated
  using (coach_id = auth.uid());
