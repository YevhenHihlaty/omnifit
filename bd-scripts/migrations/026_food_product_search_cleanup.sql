-- Drop legacy ILIKE/trigram search artifacts; FTS-only RPC with explicit visibility.
-- Fixes authenticated RPC timeouts while SQL editor (superuser) appeared fast.

drop index if exists public.food_products_name_trgm_idx;
drop index if exists public.food_products_brand_trgm_idx;
drop index if exists public.food_products_name_lower_prefix_idx;
drop index if exists public.food_products_name_idx;

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
security definer
set search_path = public
as $$
  with normalized as (
    select
      trim(coalesce(q, '')) as needle,
      public.food_search_tsquery(q) as query
  )
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
    p.created_by
  from public.food_products p
  cross join normalized n
  where auth.uid() is not null
    and n.query is not null
    and length(n.needle) >= 2
    and p.search_vector @@ n.query
    and (
      p.source in ('seed', 'off')
      or p.created_by = auth.uid()
    )
  order by
    ts_rank_cd(p.search_vector, n.query, 32) desc,
    p.usage_count desc,
    p.name asc
  limit greatest(1, least(coalesce(result_limit, 6), 25));
$$;

revoke all on function public.search_food_products(text, integer) from public;
grant execute on function public.search_food_products(text, integer) to authenticated;

comment on function public.search_food_products is
  'FTS catalog search (GIN search_vector). security definer with RLS-equivalent visibility filter.';

drop extension if exists pg_trgm;
