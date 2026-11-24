-- 062_sync_coach_places_marketplace_visible.sql — discover venues need coach_places.marketplace_visible

create or replace function public.copy_organization_places_to_coach(
  p_organization_id uuid,
  p_coach_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public 
as $$
declare
  copied_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_coach_id <> auth.uid()
     and not public.is_org_owner_or_admin(p_organization_id) then
    raise exception 'Forbidden';
  end if;

  insert into public.coach_places (
    coach_id,
    place_id,
    is_primary,
    custom_label,
    sort_order,
    organization_place_id,
    marketplace_visible
  )
  select
    p_coach_id,
    op.place_id,
    op.is_primary,
    op.custom_label,
    op.sort_order,
    op.id,
    op.is_published
  from public.organization_places op
  where op.organization_id = p_organization_id
  on conflict (coach_id, place_id) do update
    set organization_place_id = excluded.organization_place_id,
        is_primary = excluded.is_primary,
        custom_label = excluded.custom_label,
        sort_order = excluded.sort_order,
        marketplace_visible = excluded.marketplace_visible,
        updated_at = timezone('utc', now());

  get diagnostics copied_count = row_count;
  return copied_count;
end;
$$;

-- ponytail: one-time backfill for rows saved before marketplace_visible sync existed
update public.coach_places cp
set
  marketplace_visible = true,
  updated_at = timezone('utc', now())
from public.organization_places op
join public.organizations o on o.id = op.organization_id
where cp.place_id = op.place_id
  and cp.coach_id = o.owner_id
  and op.is_published = true
  and cp.marketplace_visible is distinct from true;
