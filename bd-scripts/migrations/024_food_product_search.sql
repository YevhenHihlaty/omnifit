-- Fast food product typeahead for log-meal search.
-- Replaces PostgREST OR ilike scans with ranked RPC + pg_trgm indexes.

create extension if not exists pg_trgm;

create index if not exists food_products_name_trgm_idx
  on public.food_products using gin (name gin_trgm_ops);

create index if not exists food_products_brand_trgm_idx
  on public.food_products using gin (brand gin_trgm_ops)
  where brand is not null;

create index if not exists food_products_name_lower_prefix_idx
  on public.food_products (lower(name) text_pattern_ops);

create or replace function public.search_food_products(
  q text,
  result_limit integer default 6
)
returns table (
  id uuid,
  name text,
  brand text,
  serving_size_g numeric,
  calories_kcal numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  source public.food_product_source,
  created_by uuid
)
language sql
stable
security invoker
set search_path = public
as $$
  with normalized as (
    select regexp_replace(trim(coalesce(q, '')), '[%_]', '', 'g') as needle
  ),
  ranked as (
    select
      p.id,
      p.name,
      p.brand,
      p.serving_size_g,
      p.calories_kcal,
      p.protein_g,
      p.carbs_g,
      p.fat_g,
      p.source,
      p.created_by,
      p.usage_count,
      case
        when length(n.needle) < 2 then null
        when p.name ilike n.needle || '%' then 'name_prefix'
        when p.brand is not null and p.brand ilike n.needle || '%' then 'brand_prefix'
        when p.name ilike '%' || n.needle || '%' then 'name_contains'
        when p.brand is not null and p.brand ilike '%' || n.needle || '%' then 'brand_contains'
        else null
      end as match_kind
    from public.food_products p
    cross join normalized n
  )
  select
    r.id,
    r.name,
    r.brand,
    r.serving_size_g,
    r.calories_kcal,
    r.protein_g,
    r.carbs_g,
    r.fat_g,
    r.source,
    r.created_by
  from ranked r
  where r.match_kind is not null
  order by
    case r.match_kind
      when 'name_prefix' then 1
      when 'brand_prefix' then 2
      when 'name_contains' then 3
      when 'brand_contains' then 4
      else 5
    end,
    r.usage_count desc,
    r.name asc
  limit greatest(1, least(coalesce(result_limit, 6), 25));
$$;

revoke all on function public.search_food_products(text, integer) from public;
grant execute on function public.search_food_products(text, integer) to authenticated;

comment on function public.search_food_products is
  'Typeahead for log-meal food search; prefix then contains on name/brand, ranked by usage_count.';
