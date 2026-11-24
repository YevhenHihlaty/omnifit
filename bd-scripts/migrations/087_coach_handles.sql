-- 087_coach_handles.sql
-- Add unique handle to coach_profiles for public links

alter table public.coach_profiles
  add column if not exists handle text unique;

-- Populate existing handles
update public.coach_profiles cp
set handle = lower(regexp_replace(coalesce(p.display_name, 'coach'), '[^a-zA-Z0-9]', '-', 'g')) || '-' || substring(cp.id::text, 1, 6)
from public.profiles p
where p.id = cp.user_id and cp.handle is null;

-- Make it not null after populating
alter table public.coach_profiles
  alter column handle set not null;

-- Ensure handles don't have spaces or invalid chars
alter table public.coach_profiles
  add constraint coach_profiles_handle_format check (handle ~ '^[a-z0-9-]+$');

-- ---------------------------------------------------------------------------
-- get_public_coach_profile_by_handle
-- ---------------------------------------------------------------------------

create or replace function public.get_public_coach_profile_by_handle(p_handle text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  if p_handle is null then
    return null;
  end if;

  select
    cp.id as coach_profile_id,
    cp.user_id as coach_user_id,
    cp.bio,
    cp.rating_avg,
    coalesce(nullif(trim(p.display_name), ''), 'Coach') as display_name,
    p.avatar_url
  into v_row
  from public.coach_profiles cp
  join public.profiles p on p.id = cp.user_id
    and p.anonymized_at is null
  where cp.handle = p_handle;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'coach_profile_id', v_row.coach_profile_id,
    'coach_user_id', v_row.coach_user_id,
    'display_name', v_row.display_name,
    'avatar_url', v_row.avatar_url,
    'bio', v_row.bio,
    'rating_avg', v_row.rating_avg,
    'tag_slugs', coalesce(
      (
        select jsonb_agg(st.slug order by cst.is_primary desc, st.slug asc)
        from public.coach_sport_tags cst
        join public.sport_tags st on st.id = cst.sport_tag_id
        where cst.coach_profile_id = v_row.coach_profile_id
      ),
      '[]'::jsonb
    ),
    'facilities', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'place_id', pl.id,
            'name', pl.name,
            'city', pl.city,
            'region', pl.region,
            'place_type', pl.place_type,
            'is_primary', cpl.is_primary
          )
          order by cpl.is_primary desc, cpl.sort_order asc, pl.name asc
        )
        from public.coach_places cpl
        join public.places pl on pl.id = cpl.place_id
        where cpl.coach_id = v_row.coach_user_id
          and cpl.marketplace_visible = true
          and pl.place_type <> 'online'
      ),
      '[]'::jsonb
    ),
    'plans', coalesce(
      (
        select jsonb_agg(plan_row order by plan_sort asc, plan_created asc)
        from (
          select
            jsonb_build_object(
              'id', csp.id,
              'title', csp.title,
              'description', csp.description,
              'duration_minutes', csp.duration_minutes,
              'price_cents', csp.price_cents,
              'currency', csp.currency,
              'sport_tag_slug', st.slug,
              'place_id', csp.place_id,
              'place_name', pl.name,
              'court_included', csp.court_included,
              'membership_policy', csp.membership_policy,
              'equipment_policy', csp.equipment_policy,
              'sort_order', csp.sort_order
            ) as plan_row,
            csp.sort_order as plan_sort,
            csp.created_at as plan_created
          from public.coach_service_plans csp
          left join public.sport_tags st on st.id = csp.sport_tag_id
          left join public.places pl on pl.id = csp.place_id
          where csp.coach_id = v_row.coach_user_id
            and csp.is_published = true
          order by csp.sort_order asc, csp.created_at asc
          limit 12
        ) published_plans
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.get_public_coach_profile_by_handle(text) from public;
grant execute on function public.get_public_coach_profile_by_handle(text) to anon, authenticated;
