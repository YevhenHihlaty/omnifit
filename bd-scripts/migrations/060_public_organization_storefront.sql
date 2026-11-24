-- 060_public_organization_storefront.sql — public org vanity page (/{slug})

create or replace function public.get_public_organization_storefront(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_org record;
  v_description text;
begin
  v_slug := lower(trim(p_slug));
  if v_slug = '' or length(v_slug) < 2 then
    return null;
  end if;

  select o.id, o.name, o.slug, o.logo_url, o.kind, o.owner_id
  into v_org
  from public.organizations o
  where lower(trim(o.slug)) = v_slug
  limit 1;

  if not found then
    return null;
  end if;

  select cp.bio
  into v_description
  from public.coach_profiles cp
  where cp.user_id = v_org.owner_id
  limit 1;

  return jsonb_build_object(
    'organization_id', v_org.id,
    'slug', v_org.slug,
    'display_name', v_org.name,
    'logo_url', v_org.logo_url,
    'description', nullif(trim(v_description), ''),
    'sport_slugs', coalesce(
      (
        select jsonb_agg(tag_slug order by tag_slug asc)
        from (
          select distinct st.slug as tag_slug
          from public.organization_sport_tags ost
          join public.sport_tags st on st.id = ost.sport_tag_id
          where ost.organization_id = v_org.id
          union
          select distinct st.slug as tag_slug
          from public.coach_profiles cp
          join public.coach_sport_tags cst on cst.coach_profile_id = cp.id
          join public.sport_tags st on st.id = cst.sport_tag_id
          where cp.user_id = v_org.owner_id
        ) combined_tags
      ),
      '[]'::jsonb
    ),
    'venues', coalesce(
      (
        select jsonb_agg(venue_row order by venue_sort asc, venue_name asc)
        from (
          select
            jsonb_build_object(
              'org_place_id', op.id,
              'place_id', pl.id,
              'name', coalesce(nullif(trim(op.custom_label), ''), pl.name),
              'custom_label', op.custom_label,
              'is_primary', op.is_primary,
              'city', pl.city,
              'region', pl.region,
              'address_line1', pl.address_line1,
              'postal_code', pl.postal_code,
              'country', pl.country,
              'place_type', pl.place_type
            ) as venue_row,
            op.sort_order as venue_sort,
            coalesce(nullif(trim(op.custom_label), ''), pl.name) as venue_name
          from public.organization_places op
          join public.places pl on pl.id = op.place_id
          join public.organizations venue_org on venue_org.id = op.organization_id
          where op.is_published = true
            and pl.place_type <> 'online'
            and (
              op.organization_id = v_org.id
              or (
                v_org.kind = 'personal'
                and venue_org.kind = 'team'
                and venue_org.owner_id = v_org.owner_id
              )
            )
          order by op.sort_order asc, venue_name asc
        ) published_venues
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.get_public_organization_storefront(text) from public;
grant execute on function public.get_public_organization_storefront(text) to anon, authenticated;
