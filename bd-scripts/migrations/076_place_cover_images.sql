-- 076_place_cover_images.sql
-- Venue cover photos for marketplace discover + company settings upload.

alter table public.places
  add column if not exists cover_image_url text;

comment on column public.places.cover_image_url is
  'Public cover image URL for marketplace venue cards (set by org location managers).';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'venue-covers',
  'venue-covers',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists venue_covers_storage_insert_own on storage.objects;
drop policy if exists venue_covers_storage_select_own on storage.objects;
drop policy if exists venue_covers_storage_update_own on storage.objects;
drop policy if exists venue_covers_storage_delete_own on storage.objects;
drop policy if exists venue_covers_storage_select_public on storage.objects;

-- Path: {auth.uid()}/venues/{place_id}.{ext}
create policy venue_covers_storage_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'venue-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'venues'
  );

create policy venue_covers_storage_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'venue-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'venues'
  );

create policy venue_covers_storage_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'venue-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'venues'
  )
  with check (
    bucket_id = 'venue-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'venues'
  );

create policy venue_covers_storage_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'venue-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'venues'
  );

create policy venue_covers_storage_select_public
  on storage.objects
  for select
  to public
  using (bucket_id = 'venue-covers');

create or replace function public.user_can_set_place_cover_image(p_place_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_places op
    where op.place_id = p_place_id
      and public.is_org_ops_manager(op.organization_id)
  );
$$;

revoke all on function public.user_can_set_place_cover_image(uuid) from public;
grant execute on function public.user_can_set_place_cover_image(uuid) to authenticated;

create or replace function public.set_place_cover_image_url(
  p_place_id uuid,
  p_cover_image_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.user_can_set_place_cover_image(p_place_id) then
    raise exception 'Forbidden';
  end if;

  update public.places
  set cover_image_url = nullif(trim(p_cover_image_url), '')
  where id = p_place_id;

  if not found then
    raise exception 'Place not found';
  end if;
end;
$$;

revoke all on function public.set_place_cover_image_url(uuid, text) from public;
grant execute on function public.set_place_cover_image_url(uuid, text) to authenticated;

drop function if exists public.search_marketplace_venues(text[], text, integer);

create or replace function public.search_marketplace_venues(
  p_tag_slugs text[],
  p_search_query text default null,
  p_result_limit integer default 24
)
returns table (
  place_id uuid,
  name text,
  address_line1 text,
  city text,
  region text,
  place_type public.place_type,
  sport_slugs text[],
  coach_count integer,
  from_price_cents integer,
  cover_image_url text
)
language sql
stable
security definer
set search_path = public
as $$
  with needle as (
    select lower(trim(coalesce(p_search_query, ''))) as value
  ),
  place_coaches as (
    select
      p.id as place_id,
      p.name,
      p.address_line1,
      p.city,
      p.region,
      p.place_type,
      p.cover_image_url,
      count(distinct cp.coach_id)::integer as coach_count
    from public.places p
    join public.coach_places cp on cp.place_id = p.id
    join public.profiles prof on prof.id = cp.coach_id
      and prof.anonymized_at is null
    cross join needle n
    where cp.marketplace_visible = true
      and p.place_type <> 'online'
      and (
        n.value = ''
        or p.name ilike '%' || n.value || '%'
        or coalesce(p.address_line1, '') ilike '%' || n.value || '%'
        or coalesce(p.city, '') ilike '%' || n.value || '%'
        or coalesce(p.region, '') ilike '%' || n.value || '%'
      )
    group by p.id, p.name, p.address_line1, p.city, p.region, p.place_type, p.cover_image_url
    having count(distinct cp.coach_id) >= 1
  ),
  place_tags as (
    select
      pc.place_id,
      array_agg(distinct st.slug order by st.slug) as sport_slugs
    from place_coaches pc
    join public.coach_places cp on cp.place_id = pc.place_id and cp.marketplace_visible = true
    join public.profiles prof on prof.id = cp.coach_id
      and prof.anonymized_at is null
    join public.coach_profiles cprof on cprof.user_id = cp.coach_id
    join public.coach_sport_tags cst on cst.coach_profile_id = cprof.id
    join public.sport_tags st on st.id = cst.sport_tag_id
    group by pc.place_id
  ),
  place_prices as (
    select
      csp.place_id,
      min(csp.price_cents) filter (where csp.is_published = true) as from_price_cents
    from public.coach_service_plans csp
    join public.profiles prof on prof.id = csp.coach_id
      and prof.anonymized_at is null
    where csp.place_id is not null
    group by csp.place_id
  )
  select
    pc.place_id,
    pc.name,
    pc.address_line1,
    pc.city,
    pc.region,
    pc.place_type,
    coalesce(pt.sport_slugs, '{}'::text[]) as sport_slugs,
    pc.coach_count,
    pp.from_price_cents,
    pc.cover_image_url
  from place_coaches pc
  left join place_tags pt on pt.place_id = pc.place_id
  left join place_prices pp on pp.place_id = pc.place_id
  where cardinality(coalesce(p_tag_slugs, '{}')) = 0
     or (
       select count(*)
       from unnest(p_tag_slugs) as required(slug)
       where exists (
         select 1
         from public.coach_places cp2
         join public.profiles prof2 on prof2.id = cp2.coach_id
           and prof2.anonymized_at is null
         join public.coach_profiles cprof2 on cprof2.user_id = cp2.coach_id
         join public.coach_sport_tags cst2 on cst2.coach_profile_id = cprof2.id
         join public.sport_tags st on st.id = cst2.sport_tag_id
         where cp2.place_id = pc.place_id
           and cp2.marketplace_visible = true
           and st.slug = required.slug
       )
     ) = cardinality(p_tag_slugs)
  order by pc.coach_count desc, pc.name asc
  limit greatest(1, least(coalesce(p_result_limit, 24), 100));
$$;

revoke all on function public.search_marketplace_venues(text[], text, integer) from public;
grant execute on function public.search_marketplace_venues(text[], text, integer) to anon, authenticated;

comment on function public.search_marketplace_venues is
  'Marketplace venue browse: non-online places with marketplace_visible coaches; optional tag/text filters; includes cover_image_url for discover cards.';
