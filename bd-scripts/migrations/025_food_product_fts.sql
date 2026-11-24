-- Full-text search for food_products (tsvector + GIN), per Postgres FTS best practice.
-- Replaces the ILIKE cross-join in search_food_products (migration 024) which timed out on large catalogs.

create or replace function public.food_products_search_vector(name text, brand text)
returns tsvector
language sql
immutable
parallel safe
set search_path = public
as $$
  select
    setweight(to_tsvector('simple', coalesce(name, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(brand, '')), 'B');
$$;

alter table public.food_products
  add column if not exists search_vector tsvector
  generated always as (public.food_products_search_vector(name, brand)) stored;

create index if not exists food_products_search_vector_idx
  on public.food_products using gin (search_vector);

-- Prefix tsquery for typeahead ("greek yo" -> greek:* & yo:*)
create or replace function public.food_search_prefix_tsquery(q text)
returns tsquery
language plpgsql
immutable
parallel safe
set search_path = public
as $$
declare
  cleaned text;
  token text;
  parts text[];
  tokens text[] := '{}';
  built text;
begin
  cleaned := trim(coalesce(q, ''));
  if length(cleaned) < 2 then
    return null;
  end if;

  parts := regexp_split_to_array(cleaned, '\s+');
  foreach token in array parts loop
    token := regexp_replace(token, '([&|!:()<>''\\])', '', 'g');
    if length(token) >= 1 then
      tokens := array_append(tokens, token || ':*');
    end if;
  end loop;

  if coalesce(array_length(tokens, 1), 0) = 0 then
    return null;
  end if;

  built := array_to_string(tokens, ' & ');
  return to_tsquery('simple', built);
exception
  when others then
    return null;
end;
$$;

-- Prefer websearch for multi-word queries; fall back to prefix tsquery.
create or replace function public.food_search_tsquery(q text)
returns tsquery
language plpgsql
immutable
parallel safe
set search_path = public
as $$
declare
  cleaned text;
  parsed tsquery;
begin
  cleaned := trim(coalesce(q, ''));
  if length(cleaned) < 2 then
    return null;
  end if;

  begin
    parsed := websearch_to_tsquery('simple', cleaned);
    if parsed::text <> '' then
      return parsed;
    end if;
  exception
    when others then
      null;
  end;

  return public.food_search_prefix_tsquery(cleaned);
end;
$$;

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
  where n.query is not null
    and length(n.needle) >= 2
    and p.search_vector @@ n.query
  order by
    ts_rank_cd(p.search_vector, n.query, 32) desc,
    p.usage_count desc,
    p.name asc
  limit greatest(1, least(coalesce(result_limit, 6), 25));
$$;

revoke all on function public.food_search_prefix_tsquery(text) from public;
revoke all on function public.food_search_tsquery(text) from public;
revoke all on function public.food_products_search_vector(text, text) from public;

comment on column public.food_products.search_vector is
  'Weighted FTS vector (name=A, brand=B) for GIN-indexed product search.';

comment on function public.search_food_products is
  'Log-meal food search via tsvector GIN (websearch + prefix). See migration 026 for cleanup.';
