-- 094_notifications.sql — in-app notification center (MVP)

do $$ begin
  create type public.notification_kind as enum (
    'message',
    'booking_request',
    'booking_decision',
    'progress_photos',
    'payment',
    'subscription',
    'system'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  title text not null check (char_length(trim(title)) > 0),
  body text,
  href text,
  read_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No authenticated INSERT/DELETE — use security definer helper below

create or replace function public.enqueue_notification(
  p_user_id uuid,
  p_kind public.notification_kind,
  p_title text,
  p_body text default null,
  p_href text default null,
  p_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nid uuid;
begin
  insert into public.notifications (user_id, kind, title, body, href, meta)
  values (p_user_id, p_kind, p_title, p_body, p_href, coalesce(p_meta, '{}'::jsonb))
  returning id into nid;
  return nid;
end;
$$;

revoke all on function public.enqueue_notification(uuid, public.notification_kind, text, text, text, jsonb) from public;
revoke all on function public.enqueue_notification(uuid, public.notification_kind, text, text, text, jsonb) from anon, authenticated;
grant execute on function public.enqueue_notification(uuid, public.notification_kind, text, text, text, jsonb)
  to service_role;

-- Progress photos → notify coach once when full front/side/back set is present
create or replace function public.notify_coach_on_progress_photo_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  coach uuid;
  pose_count int;
begin
  select count(*) into pose_count
  from public.progress_photos pp
  where pp.body_metrics_id = new.body_metrics_id;

  if pose_count = 3 then
    for coach in
      select r.coach_id
      from public.coach_client_relationships r
      where r.client_id = new.client_id
        and r.status = 'active'
    loop
      perform public.enqueue_notification(
        coach,
        'progress_photos'::public.notification_kind,
        'New progress photos',
        'A client completed a front/side/back photo set.',
        '/clients/' || new.client_id::text,
        jsonb_build_object(
          'body_metrics_id', new.body_metrics_id,
          'client_id', new.client_id
        )
      );
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists progress_photos_notify_coach on public.progress_photos;
create trigger progress_photos_notify_coach
  after insert on public.progress_photos
  for each row execute function public.notify_coach_on_progress_photo_insert();

comment on table public.notifications is
  'In-app notifications. Users SELECT/UPDATE own rows; inserts via enqueue_notification().';
