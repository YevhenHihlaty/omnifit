-- Return all FTS matches unsorted; client ranks and limits display.
-- Drops result_limit overload from migrations 025/026.

drop function if exists public.search_food_products(text, integer);

create or replace function public.search_food_products(q text)
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
  created_by uuid,
  usage_count integer
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
    p.created_by,
    p.usage_count
  from public.food_products p
  cross join normalized n
  where auth.uid() is not null
    and n.query is not null
    and length(n.needle) >= 2
    and p.search_vector @@ n.query
    and (
      p.source in ('seed', 'off')
      or p.created_by = auth.uid()
    );
$$;

revoke all on function public.search_food_products(text) from public;
grant execute on function public.search_food_products(text) to authenticated;

comment on function public.search_food_products is
  'FTS catalog search returning all matches unsorted; client ranks by usage_count.';
