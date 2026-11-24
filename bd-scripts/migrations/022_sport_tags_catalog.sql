-- 022_sport_tags_catalog.sql — canonical sport tags + coach junction + search RPC
-- Coaches pick tags (e.g. jiujitsu, boxing); clients filter discover by tag.
-- Typeahead: search_sport_tags('jiu') → jiujitsu, jiu-jitsu aliases.

create table if not exists public.sport_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  label text not null,
  aliases text[] not null default '{}',
  category text not null default 'other',
  usage_count integer not null default 0 check (usage_count >= 0),
  source text not null default 'seed' check (source in ('seed', 'coach')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint sport_tags_slug_unique unique (slug)
);

create index if not exists sport_tags_slug_idx on public.sport_tags (slug);
create index if not exists sport_tags_category_idx on public.sport_tags (category);

drop trigger if exists sport_tags_set_updated_at on public.sport_tags;
create trigger sport_tags_set_updated_at
  before update on public.sport_tags
  for each row execute function public.set_updated_at();

create table if not exists public.coach_sport_tags (
  coach_profile_id uuid not null references public.coach_profiles (id) on delete cascade,
  sport_tag_id uuid not null references public.sport_tags (id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (coach_profile_id, sport_tag_id)
);

create index if not exists coach_sport_tags_tag_id_idx on public.coach_sport_tags (sport_tag_id);
create unique index if not exists coach_sport_tags_one_primary_idx
  on public.coach_sport_tags (coach_profile_id)
  where is_primary;

-- Bump usage_count when a coach links a tag
create or replace function public.bump_sport_tag_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sport_tags
  set usage_count = usage_count + 1
  where id = new.sport_tag_id;
  return new;
end;
$$;

drop trigger if exists coach_sport_tags_bump_usage on public.coach_sport_tags;
create trigger coach_sport_tags_bump_usage
  after insert on public.coach_sport_tags
  for each row execute function public.bump_sport_tag_usage();

-- Rank: slug prefix → label similarity → alias prefix (case-insensitive)
create or replace function public.search_sport_tags(
  q text,
  result_limit integer default 8
)
returns table (
  id uuid,
  slug text,
  label text,
  category text,
  usage_count integer,
  match_kind text
)
language sql
stable
security invoker
set search_path = public
as $$
  with normalized as (
    select lower(trim(coalesce(q, ''))) as needle
  ),
  ranked as (
    select
      t.id,
      t.slug,
      t.label,
      t.category,
      t.usage_count,
      case
        when n.needle = '' then 'browse'
        when t.slug like n.needle || '%' then 'slug_prefix'
        when t.label ilike n.needle || '%' then 'label_prefix'
        when exists (
          select 1
          from unnest(t.aliases) as a(alias)
          where lower(alias) like n.needle || '%'
        ) then 'alias_prefix'
        when t.label ilike '%' || n.needle || '%' then 'label_contains'
        when exists (
          select 1
          from unnest(t.aliases) as a(alias)
          where lower(alias) ilike '%' || n.needle || '%'
        ) then 'alias_contains'
        else null
      end as match_kind
    from public.sport_tags t
    cross join normalized n
  )
  select id, slug, label, category, usage_count, match_kind
  from ranked
  where match_kind is not null
  order by
    case match_kind
      when 'slug_prefix' then 1
      when 'label_prefix' then 2
      when 'alias_prefix' then 3
      when 'label_contains' then 4
      when 'alias_contains' then 5
      else 6
    end,
    usage_count desc,
    label asc
  limit greatest(1, least(coalesce(result_limit, 8), 25));
$$;

-- Coaches discoverable by tag (marketplace RLS ships Sprint 15)
create or replace function public.search_coaches_by_sport_tags(
  tag_slugs text[],
  result_limit integer default 24
)
returns table (
  coach_profile_id uuid,
  user_id uuid,
  display_name text,
  tag_slugs text[]
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    cp.id as coach_profile_id,
    cp.user_id,
    coalesce(nullif(trim(p.display_name), ''), split_part(p.email, '@', 1), 'Coach') as display_name,
    array_agg(distinct st.slug order by st.slug) as tag_slugs
  from public.coach_profiles cp
  join public.profiles p on p.id = cp.user_id
  join public.coach_sport_tags cst on cst.coach_profile_id = cp.id
  join public.sport_tags st on st.id = cst.sport_tag_id
  where cardinality(coalesce(tag_slugs, '{}')) = 0
     or st.slug = any (tag_slugs)
  group by cp.id, cp.user_id, p.display_name, p.email
  order by max(st.usage_count) desc, display_name asc
  limit greatest(1, least(coalesce(result_limit, 24), 100));
$$;

alter table public.sport_tags enable row level security;
alter table public.coach_sport_tags enable row level security;

drop policy if exists sport_tags_select_authenticated on public.sport_tags;
create policy sport_tags_select_authenticated
  on public.sport_tags for select
  to authenticated
  using (true);

drop policy if exists sport_tags_insert_coach on public.sport_tags;
create policy sport_tags_insert_coach
  on public.sport_tags for insert
  to authenticated
  with check (
    source = 'coach'
    and exists (
      select 1 from public.coach_profiles cp
      where cp.user_id = auth.uid()
    )
  );

drop policy if exists coach_sport_tags_select_authenticated on public.coach_sport_tags;
create policy coach_sport_tags_select_authenticated
  on public.coach_sport_tags for select
  to authenticated
  using (true);

drop policy if exists coach_sport_tags_insert_own on public.coach_sport_tags;
create policy coach_sport_tags_insert_own
  on public.coach_sport_tags for insert
  to authenticated
  with check (
    exists (
      select 1 from public.coach_profiles cp
      where cp.id = coach_profile_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists coach_sport_tags_delete_own on public.coach_sport_tags;
create policy coach_sport_tags_delete_own
  on public.coach_sport_tags for delete
  to authenticated
  using (
    exists (
      select 1 from public.coach_profiles cp
      where cp.id = coach_profile_id and cp.user_id = auth.uid()
    )
  );

comment on table public.sport_tags is
  'Canonical sport/discipline tags for coach profiles and discover search.';
comment on function public.search_sport_tags is
  'Typeahead for coach tag picker; prefix + alias matching (e.g. jiu → jiujitsu).';
