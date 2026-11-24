-- 042_rocketplay_org_coaches_discover.sql — RocketPlay org coach discovery RPCs + RLS

-- ---------------------------------------------------------------------------
-- Discovery read policies (security invoker RPCs rely on these)
-- ---------------------------------------------------------------------------

drop policy if exists organization_members_select_rocketplay_discovery on public.organization_members;
create policy organization_members_select_rocketplay_discovery
  on public.organization_members for select
  to authenticated
  using (
    status = 'active'
    and role = 'coach'
    and exists (
      select 1
      from public.organizations o
      where o.id = organization_members.organization_id
        and o.kind = 'team'
        and o.rocketplay_enabled = true
    )
  );

drop policy if exists profiles_select_rocketplay_org_coach on public.profiles;
create policy profiles_select_rocketplay_org_coach
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members om
      join public.organizations o on o.id = om.organization_id
      where om.user_id = profiles.id
        and om.status = 'active'
        and om.role = 'coach'
        and o.kind = 'team'
        and o.rocketplay_enabled = true
    )
  );

drop policy if exists coach_profiles_select_rocketplay_org_coach on public.coach_profiles;
create policy coach_profiles_select_rocketplay_org_coach
  on public.coach_profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members om
      join public.organizations o on o.id = om.organization_id
      where om.user_id = coach_profiles.user_id
        and om.status = 'active'
        and om.role = 'coach'
        and o.kind = 'team'
        and o.rocketplay_enabled = true
    )
  );

-- ---------------------------------------------------------------------------
-- list_rocketplay_org_coaches — security invoker
-- ---------------------------------------------------------------------------

create or replace function public.list_rocketplay_org_coaches(p_org_id uuid)
returns table (
  coach_user_id uuid,
  display_name text,
  avatar_url text,
  sport_slugs text[],
  sort_order integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    om.user_id as coach_user_id,
    coalesce(nullif(trim(p.display_name), ''), 'Coach') as display_name,
    p.avatar_url,
    coalesce(
      (
        select array_agg(st.slug order by cst.is_primary desc, st.slug asc)
        from public.coach_profiles cp
        join public.coach_sport_tags cst on cst.coach_profile_id = cp.id
        join public.sport_tags st on st.id = cst.sport_tag_id
        where cp.user_id = om.user_id
      ),
      '{}'::text[]
    ) as sport_slugs,
    row_number() over (
      order by om.joined_at nulls last, om.created_at asc
    )::integer as sort_order
  from public.organization_members om
  join public.profiles p on p.id = om.user_id
  join public.organizations o on o.id = om.organization_id
  where om.organization_id = p_org_id
    and om.status = 'active'
    and om.role = 'coach'
    and o.kind = 'team'
    and o.rocketplay_enabled = true
  order by sort_order;
$$;

revoke all on function public.list_rocketplay_org_coaches(uuid) from public;
grant execute on function public.list_rocketplay_org_coaches(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_rocketplay_org_coach_profile — security invoker
-- ---------------------------------------------------------------------------

create or replace function public.get_rocketplay_org_coach_profile(
  p_org_id uuid,
  p_coach_user_id uuid
)
returns table (
  coach_user_id uuid,
  display_name text,
  avatar_url text,
  sport_slugs text[],
  bio text,
  organization_id uuid,
  organization_name text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    om.user_id as coach_user_id,
    coalesce(nullif(trim(p.display_name), ''), 'Coach') as display_name,
    p.avatar_url,
    coalesce(
      (
        select array_agg(st.slug order by cst.is_primary desc, st.slug asc)
        from public.coach_profiles cp2
        join public.coach_sport_tags cst on cst.coach_profile_id = cp2.id
        join public.sport_tags st on st.id = cst.sport_tag_id
        where cp2.user_id = om.user_id
      ),
      '{}'::text[]
    ) as sport_slugs,
    nullif(trim(cp.bio), '') as bio,
    o.id as organization_id,
    o.name as organization_name
  from public.organization_members om
  join public.profiles p on p.id = om.user_id
  join public.organizations o on o.id = om.organization_id
  left join public.coach_profiles cp on cp.user_id = om.user_id
  where om.organization_id = p_org_id
    and om.user_id = p_coach_user_id
    and om.status = 'active'
    and om.role = 'coach'
    and o.kind = 'team'
    and o.rocketplay_enabled = true
  limit 1;
$$;

revoke all on function public.get_rocketplay_org_coach_profile(uuid, uuid) from public;
grant execute on function public.get_rocketplay_org_coach_profile(uuid, uuid) to authenticated;
