-- 072_exclude_company_admin_from_marketplace_discover.sql
-- Company admins are studio operators, not marketplace coaches.

create or replace function public.coach_is_marketplace_discoverable(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    cp.marketplace_visible = true
    and p.anonymized_at is null
    and coalesce(
      (
        select u.raw_app_meta_data ->> 'persona'
        from auth.users u
        where u.id = p_user_id
      ),
      ''
    ) <> 'company_admin'
    and exists (
      select 1
      from public.coach_places cpl
      where cpl.coach_id = cp.user_id
        and cpl.marketplace_visible = true
    )
  from public.coach_profiles cp
  join public.profiles p on p.id = cp.user_id
  where cp.user_id = p_user_id;
$$;

revoke all on function public.coach_is_marketplace_discoverable(uuid) from public;
grant execute on function public.coach_is_marketplace_discoverable(uuid) to anon, authenticated;

comment on function public.coach_is_marketplace_discoverable is
  'Marketplace discover gate: coach opt-in, visible place, not anonymized, not company_admin persona.';
