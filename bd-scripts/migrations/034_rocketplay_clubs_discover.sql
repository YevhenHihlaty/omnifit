-- 034_rocketplay_clubs_discover.sql — RocketPlay club discovery, favorites, discover_clubs RPC

alter table public.organizations
  add column if not exists rocketplay_enabled boolean not null default false;

create index if not exists organizations_rocketplay_enabled_idx
  on public.organizations (rocketplay_enabled)
  where rocketplay_enabled = true and kind = 'team';

alter table public.organization_places
  add column if not exists is_published boolean not null default true;

create index if not exists organization_places_published_org_idx
  on public.organization_places (organization_id)
  where is_published = true;

-- ---------------------------------------------------------------------------
-- user_favorite_places
-- ---------------------------------------------------------------------------

create table if not exists public.user_favorite_places (
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, place_id)
);

create index if not exists user_favorite_places_user_id_idx
  on public.user_favorite_places (user_id);

create index if not exists user_favorite_places_place_id_idx
  on public.user_favorite_places (place_id);

alter table public.user_favorite_places enable row level security;

drop policy if exists user_favorite_places_select_own on public.user_favorite_places;
create policy user_favorite_places_select_own
  on public.user_favorite_places for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists user_favorite_places_insert_own on public.user_favorite_places;
create policy user_favorite_places_insert_own
  on public.user_favorite_places for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.organization_places op
      join public.organizations o on o.id = op.organization_id
      where op.place_id = user_favorite_places.place_id
        and op.is_published = true
        and o.kind = 'team'
        and o.rocketplay_enabled = true
    )
  );

drop policy if exists user_favorite_places_delete_own on public.user_favorite_places;
create policy user_favorite_places_delete_own
  on public.user_favorite_places for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RocketPlay discovery read policies (security invoker RPC + direct selects)
-- ---------------------------------------------------------------------------

drop policy if exists organizations_select_rocketplay_discovery on public.organizations;
create policy organizations_select_rocketplay_discovery
  on public.organizations for select
  to authenticated
  using (kind = 'team' and rocketplay_enabled = true);

drop policy if exists organization_places_select_rocketplay_discovery on public.organization_places;
create policy organization_places_select_rocketplay_discovery
  on public.organization_places for select
  to authenticated
  using (
    is_published = true
    and exists (
      select 1
      from public.organizations o
      where o.id = organization_places.organization_id
        and o.kind = 'team'
        and o.rocketplay_enabled = true
    )
  );

drop policy if exists organization_sport_tags_select_rocketplay_discovery on public.organization_sport_tags;
create policy organization_sport_tags_select_rocketplay_discovery
  on public.organization_sport_tags for select
  to authenticated
  using (
    exists (
      select 1
      from public.organizations o
      where o.id = organization_sport_tags.organization_id
        and o.kind = 'team'
        and o.rocketplay_enabled = true
    )
  );

-- ---------------------------------------------------------------------------
-- discover_clubs — security invoker (relies on discovery policies above)
-- ---------------------------------------------------------------------------

create or replace function public.discover_clubs(
  p_sport_slug text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km numeric default 50,
  p_query text default null,
  p_limit integer default 24
)
returns table (
  organization_id uuid,
  organization_name text,
  logo_url text,
  primary_place_id uuid,
  place_name text,
  city text,
  address_line1 text,
  latitude double precision,
  longitude double precision,
  distance_km numeric,
  sport_slugs text[],
  place_count integer,
  is_favorited boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  with needle as (
    select lower(trim(coalesce(p_query, ''))) as value
  ),
  org_places as (
    select
      o.id as organization_id,
      o.name as organization_name,
      o.logo_url,
      p.id as place_id,
      p.name as place_name,
      p.city,
      p.address_line1,
      p.latitude,
      p.longitude,
      op.is_primary,
      op.sort_order,
      case
        when p_lat is not null
          and p_lng is not null
          and p.latitude is not null
          and p.longitude is not null
        then (
          6371 * acos(
            least(
              1.0,
              greatest(
                -1.0,
                cos(radians(p_lat)) * cos(radians(p.latitude))
                  * cos(radians(p.longitude) - radians(p_lng))
                  + sin(radians(p_lat)) * sin(radians(p.latitude))
              )
            )
          )
        )::numeric
        else null
      end as distance_km
    from public.organizations o
    join public.organization_places op on op.organization_id = o.id
    join public.places p on p.id = op.place_id
    cross join needle n
    where o.kind = 'team'
      and o.rocketplay_enabled = true
      and op.is_published = true
      and (
        n.value = ''
        or o.name ilike '%' || n.value || '%'
        or p.name ilike '%' || n.value || '%'
        or coalesce(p.city, '') ilike '%' || n.value || '%'
      )
      and (
        p_sport_slug is null
        or trim(p_sport_slug) = ''
        or exists (
          select 1
          from public.organization_sport_tags ost
          join public.sport_tags st on st.id = ost.sport_tag_id
          where ost.organization_id = o.id
            and st.slug = lower(trim(p_sport_slug))
        )
      )
  ),
  ranked_primary as (
    select distinct on (organization_id)
      organization_id,
      organization_name,
      logo_url,
      place_id as primary_place_id,
      place_name,
      city,
      address_line1,
      latitude,
      longitude,
      distance_km
    from org_places
    order by
      organization_id,
      is_primary desc,
      sort_order asc,
      place_name asc
  ),
  sport_agg as (
    select
      ost.organization_id,
      array_agg(distinct st.slug order by st.slug) as sport_slugs
    from public.organization_sport_tags ost
    join public.sport_tags st on st.id = ost.sport_tag_id
    group by ost.organization_id
  ),
  place_counts as (
    select organization_id, count(*)::integer as place_count
    from org_places
    group by organization_id
  )
  select
    rp.organization_id,
    rp.organization_name,
    rp.logo_url,
    rp.primary_place_id,
    rp.place_name,
    rp.city,
    rp.address_line1,
    rp.latitude,
    rp.longitude,
    rp.distance_km,
    coalesce(sa.sport_slugs, '{}'::text[]) as sport_slugs,
    coalesce(pc.place_count, 0) as place_count,
    exists (
      select 1
      from public.user_favorite_places ufp
      where ufp.user_id = auth.uid()
        and ufp.place_id = rp.primary_place_id
    ) as is_favorited
  from ranked_primary rp
  left join sport_agg sa on sa.organization_id = rp.organization_id
  left join place_counts pc on pc.organization_id = rp.organization_id
  where (
    p_radius_km is null
    or rp.distance_km is null
    or rp.distance_km <= greatest(p_radius_km, 0)
  )
  order by
    rp.distance_km asc nulls last,
    rp.organization_name asc
  limit greatest(1, least(coalesce(p_limit, 24), 50));
$$;

revoke all on function public.discover_clubs(text, double precision, double precision, numeric, text, integer) from public;
grant execute on function public.discover_clubs(text, double precision, double precision, numeric, text, integer) to authenticated;

comment on function public.discover_clubs is
  'RocketPlay club discovery for authenticated players. Filters team orgs with rocketplay_enabled and published places.';
