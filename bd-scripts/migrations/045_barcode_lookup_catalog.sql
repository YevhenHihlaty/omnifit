-- Barcode catalog lookup: shared user+barcode visibility, lookup/upsert RPCs.

drop policy if exists food_products_select_catalog on public.food_products;
create policy food_products_select_catalog
  on public.food_products
  for select
  to authenticated
  using (
    source in ('seed', 'off')
    or created_by = auth.uid()
    or (source = 'user' and barcode is not null)
  );

-- Keep migration 027 signature (unsorted pool + usage_count); extend visibility only.
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
      or (p.source = 'user' and p.barcode is not null)
    );
$$;

revoke all on function public.search_food_products(text) from public;
grant execute on function public.search_food_products(text) to authenticated;

create or replace function public.lookup_food_product_by_barcode(p_barcode text)
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
  barcode text,
  barcode_type public.barcode_type
)
language sql
stable
security definer
set search_path = public
as $$
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
    p.barcode,
    p.barcode_type
  from public.food_products p
  where auth.uid() is not null
    and length(trim(coalesce(p_barcode, ''))) > 0
    and p.barcode = trim(p_barcode)
    and (
      p.source in ('seed', 'off')
      or p.created_by = auth.uid()
      or (p.source = 'user' and p.barcode is not null)
    )
  limit 1;
$$;

revoke all on function public.lookup_food_product_by_barcode(text) from public;
grant execute on function public.lookup_food_product_by_barcode(text) to authenticated;

comment on function public.lookup_food_product_by_barcode is
  'Barcode catalog lookup with RLS-equivalent visibility filter.';

create or replace function public.upsert_off_food_product(
  p_barcode text,
  p_barcode_type public.barcode_type,
  p_name text,
  p_brand text,
  p_serving_size_g numeric,
  p_calories_kcal numeric,
  p_protein_g numeric,
  p_carbs_g numeric,
  p_fat_g numeric
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
  created_by uuid,
  barcode text,
  barcode_type public.barcode_type
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  if length(trim(coalesce(p_barcode, ''))) = 0
    or p_name is null
    or length(trim(p_name)) = 0
    or p_serving_size_g is null
    or p_serving_size_g <= 0
    or p_calories_kcal is null then
    return;
  end if;

  return query
  insert into public.food_products (
    barcode,
    barcode_type,
    name,
    brand,
    serving_size_g,
    calories_kcal,
    protein_g,
    carbs_g,
    fat_g,
    source,
    created_by
  )
  values (
    trim(p_barcode),
    p_barcode_type,
    trim(p_name),
    nullif(trim(coalesce(p_brand, '')), ''),
    p_serving_size_g,
    p_calories_kcal,
    p_protein_g,
    p_carbs_g,
    p_fat_g,
    'off',
    null
  )
  on conflict (barcode) do update set
    name = excluded.name,
    brand = excluded.brand,
    serving_size_g = excluded.serving_size_g,
    calories_kcal = excluded.calories_kcal,
    protein_g = excluded.protein_g,
    carbs_g = excluded.carbs_g,
    fat_g = excluded.fat_g,
    barcode_type = excluded.barcode_type,
    source = 'off',
    updated_at = now()
  where food_products.source in ('off', 'seed')
  returning
    food_products.id,
    food_products.name,
    food_products.brand,
    food_products.serving_size_g,
    food_products.calories_kcal,
    food_products.protein_g,
    food_products.carbs_g,
    food_products.fat_g,
    food_products.source,
    food_products.created_by,
    food_products.barcode,
    food_products.barcode_type;

  if not found then
    return query
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
      p.barcode,
      p.barcode_type
    from public.food_products p
    where p.barcode = trim(p_barcode)
    limit 1;
  end if;
end;
$$;

revoke all on function public.upsert_off_food_product(
  text,
  public.barcode_type,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric
) from public;
grant execute on function public.upsert_off_food_product(
  text,
  public.barcode_type,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric
) to authenticated;

comment on function public.upsert_off_food_product is
  'Insert or refresh OFF catalog rows; never overwrites user-sourced products.';
