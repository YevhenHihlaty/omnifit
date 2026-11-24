-- 006_video_calls_and_signaling.sql — Phase 2 live 1:1 video (signaling only; no media storage)

do $$ begin
  create type public.video_call_status as enum (
    'ringing',
    'active',
    'ended',
    'declined',
    'missed'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.webrtc_signal_type as enum (
    'offer',
    'answer',
    'ice',
    'hangup'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.video_calls (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  status public.video_call_status not null default 'ringing',
  initiated_by uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz,
  ended_at timestamptz,
  duration_sec integer check (duration_sec is null or duration_sec >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (coach_id <> client_id),
  check (initiated_by in (coach_id, client_id))
);

create index if not exists video_calls_coach_status_idx
  on public.video_calls (coach_id, status, created_at desc);

create index if not exists video_calls_client_status_idx
  on public.video_calls (client_id, status, created_at desc);

drop trigger if exists video_calls_set_updated_at on public.video_calls;
create trigger video_calls_set_updated_at
  before update on public.video_calls
  for each row execute function public.set_updated_at();

create table if not exists public.webrtc_signals (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.video_calls (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  signal_type public.webrtc_signal_type not null,
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists webrtc_signals_call_created_idx
  on public.webrtc_signals (call_id, created_at);

alter table public.video_calls enable row level security;
alter table public.webrtc_signals enable row level security;

-- Participants read call rows
drop policy if exists video_calls_select_participant on public.video_calls;
create policy video_calls_select_participant
  on public.video_calls
  for select
  to authenticated
  using (auth.uid() in (coach_id, client_id));

-- Active coach–client link required to start a call
drop policy if exists video_calls_insert_participant on public.video_calls;
create policy video_calls_insert_participant
  on public.video_calls
  for insert
  to authenticated
  with check (
    auth.uid() in (coach_id, client_id)
    and initiated_by = auth.uid()
    and public.coach_has_active_client(coach_id, client_id)
  );

drop policy if exists video_calls_update_participant on public.video_calls;
create policy video_calls_update_participant
  on public.video_calls
  for update
  to authenticated
  using (auth.uid() in (coach_id, client_id));

-- Signaling: participants only; inserts while call is live
drop policy if exists webrtc_signals_select_participant on public.webrtc_signals;
create policy webrtc_signals_select_participant
  on public.webrtc_signals
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.video_calls v
      where v.id = call_id
        and auth.uid() in (v.coach_id, v.client_id)
    )
  );

drop policy if exists webrtc_signals_insert_participant on public.webrtc_signals;
create policy webrtc_signals_insert_participant
  on public.webrtc_signals
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.video_calls v
      where v.id = call_id
        and auth.uid() in (v.coach_id, v.client_id)
        and v.status in ('ringing', 'active')
    )
  );

-- Realtime: postgres changes drive web + native signaling subscribers
do $$ begin
  alter publication supabase_realtime add table public.video_calls;
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.webrtc_signals;
exception
  when duplicate_object then null;
end $$;
