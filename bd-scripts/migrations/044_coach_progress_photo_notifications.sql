-- 044_coach_progress_photo_notifications.sql — coach unseen progress photo flags per relationship

alter table public.coach_client_relationships
  add column if not exists progress_photos_unseen_at timestamptz,
  add column if not exists progress_photos_seen_at timestamptz;

create or replace function public.flag_coach_progress_photos_unseen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.coach_client_relationships
  set progress_photos_unseen_at = greatest(
    coalesce(progress_photos_unseen_at, new.created_at),
    new.created_at
  )
  where client_id = new.client_id
    and status = 'active';

  return new;
end;
$$;

drop trigger if exists progress_photos_flag_coaches_unseen on public.progress_photos;
create trigger progress_photos_flag_coaches_unseen
  after insert on public.progress_photos
  for each row execute function public.flag_coach_progress_photos_unseen();
