-- 028_place_types_and_service_plans.sql — Sprint 15 marketplace discover foundation
-- ponytail: coach_service_plans table only; CRUD UI ships Sprint 16.

-- ---------------------------------------------------------------------------
-- place_type extensions
-- ---------------------------------------------------------------------------

alter type public.place_type add value if not exists 'court';
alter type public.place_type add value if not exists 'racket_club';
alter type public.place_type add value if not exists 'dojo';

-- ---------------------------------------------------------------------------
-- Marketplace visibility on coach ↔ place links
-- ---------------------------------------------------------------------------

alter table public.coach_places
  add column if not exists marketplace_visible boolean not null default false;

create index if not exists coach_places_marketplace_visible_idx
  on public.coach_places (place_id)
  where marketplace_visible = true;

-- ---------------------------------------------------------------------------
-- Service plan enums + table (S16 CRUD; S15 browse reads published rows via RPC)
-- ---------------------------------------------------------------------------

do $do$
begin
  create type public.plan_court_inclusion as enum ('not_included', 'included', 'addon');
exception
  when duplicate_object then null;
end $do$;

do $do$
begin
  create type public.plan_membership_policy as enum (
    'not_required',
    'required_client',
    'included_in_price'
  );
exception
  when duplicate_object then null;
end $do$;

do $do$
begin
  create type public.plan_equipment_policy as enum (
    'provided',
    'bring_own',
    'rent_available',
    'rent_required'
  );
exception
  when duplicate_object then null;
end $do$;

create table if not exists public.coach_service_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'USD' check (char_length(trim(currency)) = 3),
  sport_tag_id uuid references public.sport_tags (id) on delete set null,
  place_id uuid references public.places (id) on delete set null,
  court_included public.plan_court_inclusion not null default 'not_included',
  membership_policy public.plan_membership_policy not null default 'not_required',
  equipment_policy public.plan_equipment_policy not null default 'bring_own',
  is_published boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists coach_service_plans_coach_id_idx
  on public.coach_service_plans (coach_id);

create index if not exists coach_service_plans_place_published_idx
  on public.coach_service_plans (place_id)
  where is_published = true;

drop trigger if exists coach_service_plans_set_updated_at on public.coach_service_plans;
create trigger coach_service_plans_set_updated_at
  before update on public.coach_service_plans
  for each row execute function public.set_updated_at();

do $fk$
begin
  alter table public.booking_requests
    add constraint booking_requests_service_plan_id_fkey
    foreign key (service_plan_id) references public.coach_service_plans (id)
    on delete set null;
exception
  when duplicate_object then null;
end $fk$;

alter table public.coach_service_plans enable row level security;

drop policy if exists coach_service_plans_select_own on public.coach_service_plans;
create policy coach_service_plans_select_own
  on public.coach_service_plans for select
  to authenticated
  using (coach_id = auth.uid());

drop policy if exists coach_service_plans_insert_own on public.coach_service_plans;
create policy coach_service_plans_insert_own
  on public.coach_service_plans for insert
  to authenticated
  with check (coach_id = auth.uid());

drop policy if exists coach_service_plans_update_own on public.coach_service_plans;
create policy coach_service_plans_update_own
  on public.coach_service_plans for update
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists coach_service_plans_delete_own on public.coach_service_plans;
create policy coach_service_plans_delete_own
  on public.coach_service_plans for delete
  to authenticated
  using (coach_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Public sport tag catalog (filter chips for discover)
-- ---------------------------------------------------------------------------

drop policy if exists sport_tags_select_authenticated on public.sport_tags;
create policy sport_tags_select_authenticated
  on public.sport_tags for select
  to authenticated, anon
  using (true);

-- ---------------------------------------------------------------------------
-- Discover RPCs — security definer so anon browse never reads profiles.email
-- ---------------------------------------------------------------------------

drop function if exists public.search_coaches_by_sport_tags(text[], integer);

create or replace function public.search_coaches_by_sport_tags(
  p_tag_slugs text[],
  p_search_query text default null,
  p_result_limit integer default 24
)
returns table (
  coach_profile_id uuid,
  display_name text,
  avatar_url text,
  city text,
  tag_slugs text[],
  rating_avg numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with needle as (
    select lower(trim(coalesce(p_search_query, ''))) as value
  ),
  marketplace_coaches as (
    select distinct cp.id as coach_profile_id, cp.user_id, cp.rating_avg
    from public.coach_profiles cp
    where exists (
      select 1
      from public.coach_places cpl
      where cpl.coach_id = cp.user_id
        and cpl.marketplace_visible = true
    )
  ),
  coach_tags as (
    select
      mc.coach_profile_id,
      mc.user_id,
      mc.rating_avg,
      array_agg(distinct st.slug order by st.slug) as tag_slugs
    from marketplace_coaches mc
    join public.coach_sport_tags cst on cst.coach_profile_id = mc.coach_profile_id
    join public.sport_tags st on st.id = cst.sport_tag_id
    group by mc.coach_profile_id, mc.user_id, mc.rating_avg
  )
  select
    ct.coach_profile_id,
    coalesce(nullif(trim(p.display_name), ''), 'Coach') as display_name,
    p.avatar_url,
    (
      select pl.city
      from public.coach_places cpl
      join public.places pl on pl.id = cpl.place_id
      where cpl.coach_id = ct.user_id
        and cpl.marketplace_visible = true
      order by cpl.is_primary desc, cpl.sort_order asc
      limit 1
    ) as city,
    ct.tag_slugs,
    ct.rating_avg
  from coach_tags ct
  join public.profiles p on p.id = ct.user_id
  cross join needle n
  where (
      n.value = ''
      or coalesce(nullif(trim(p.display_name), ''), 'Coach') ilike '%' || n.value || '%'
      or exists (
        select 1
        from public.coach_places cpl2
        join public.places pl2 on pl2.id = cpl2.place_id
        where cpl2.coach_id = ct.user_id
          and cpl2.marketplace_visible = true
          and (
            coalesce(pl2.city, '') ilike '%' || n.value || '%'
            or coalesce(pl2.name, '') ilike '%' || n.value || '%'
          )
      )
    )
    and (
      cardinality(coalesce(p_tag_slugs, '{}')) = 0
      or (
        select count(*)
        from unnest(p_tag_slugs) as required(slug)
        where required.slug = any (ct.tag_slugs)
      ) = cardinality(p_tag_slugs)
    )
  order by ct.rating_avg desc nulls last, display_name asc
  limit greatest(1, least(coalesce(p_result_limit, 24), 100));
$$;

create or replace function public.search_marketplace_venues(
  p_tag_slugs text[],
  p_search_query text default null,
  p_result_limit integer default 24
)
returns table (
  place_id uuid,
  name text,
  city text,
  region text,
  place_type public.place_type,
  sport_slugs text[],
  coach_count integer,
  from_price_cents integer
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
      p.city,
      p.region,
      p.place_type,
      count(distinct cp.coach_id)::integer as coach_count
    from public.places p
    join public.coach_places cp on cp.place_id = p.id
    cross join needle n
    where cp.marketplace_visible = true
      and p.place_type <> 'online'
      and (
        n.value = ''
        or p.name ilike '%' || n.value || '%'
        or coalesce(p.city, '') ilike '%' || n.value || '%'
        or coalesce(p.region, '') ilike '%' || n.value || '%'
      )
    group by p.id, p.name, p.city, p.region, p.place_type
    having count(distinct cp.coach_id) >= 1
  ),
  place_tags as (
    select
      pc.place_id,
      array_agg(distinct st.slug order by st.slug) as sport_slugs
    from place_coaches pc
    join public.coach_places cp on cp.place_id = pc.place_id and cp.marketplace_visible = true
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
    where csp.place_id is not null
    group by csp.place_id
  )
  select
    pc.place_id,
    pc.name,
    pc.city,
    pc.region,
    pc.place_type,
    coalesce(pt.sport_slugs, '{}'::text[]) as sport_slugs,
    pc.coach_count,
    pp.from_price_cents
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

revoke all on function public.search_coaches_by_sport_tags(text[], text, integer) from public;
grant execute on function public.search_coaches_by_sport_tags(text[], text, integer) to anon, authenticated;

revoke all on function public.search_marketplace_venues(text[], text, integer) from public;
grant execute on function public.search_marketplace_venues(text[], text, integer) to anon, authenticated;

comment on function public.search_coaches_by_sport_tags is
  'Marketplace coach browse: marketplace_visible coach_places required; AND tag filter; no email.';

comment on function public.search_marketplace_venues is
  'Marketplace venue browse: non-online places with marketplace_visible coaches; optional tag/text filters.';

comment on table public.coach_service_plans is
  'Coach offerings with inclusion metadata; CRUD UI Sprint 16, discover from-price reads published rows.';
