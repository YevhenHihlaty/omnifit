-- 049_coach_notes.sql — coach manual and post-training notes (Sprint 12)

create table if not exists public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid references public.profiles (id) on delete set null,
  session_id uuid references public.sessions (id) on delete set null,
  title text not null check (char_length(trim(title)) > 0),
  body text not null default '' check (char_length(body) <= 10000),
  kind text not null default 'manual' check (kind in ('manual', 'post_training')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists coach_notes_coach_created_idx
  on public.coach_notes (coach_id, created_at desc);

create index if not exists coach_notes_coach_client_idx
  on public.coach_notes (coach_id, client_id)
  where client_id is not null;

drop trigger if exists coach_notes_set_updated_at on public.coach_notes;
create trigger coach_notes_set_updated_at
  before update on public.coach_notes
  for each row execute function public.set_updated_at();

alter table public.coach_notes enable row level security;

drop policy if exists coach_notes_select_own on public.coach_notes;
create policy coach_notes_select_own
  on public.coach_notes for select
  to authenticated
  using (coach_id = auth.uid());

drop policy if exists coach_notes_insert_own on public.coach_notes;
create policy coach_notes_insert_own
  on public.coach_notes for insert
  to authenticated
  with check (
    coach_id = auth.uid()
    and (
      client_id is null
      or public.coach_has_active_client(coach_id, client_id)
    )
  );

drop policy if exists coach_notes_update_own on public.coach_notes;
create policy coach_notes_update_own
  on public.coach_notes for update
  to authenticated
  using (coach_id = auth.uid())
  with check (
    coach_id = auth.uid()
    and (
      client_id is null
      or public.coach_has_active_client(coach_id, client_id)
    )
  );

drop policy if exists coach_notes_delete_own on public.coach_notes;
create policy coach_notes_delete_own
  on public.coach_notes for delete
  to authenticated
  using (coach_id = auth.uid());
