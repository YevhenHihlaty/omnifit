-- Allow authenticated clients to bump global food product usage_count on selection
-- (catalog rows are not directly updatable via RLS).

create or replace function public.increment_food_product_usage_count(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  update public.food_products
  set
    usage_count = usage_count + 1,
    updated_at = timezone('utc', now())
  where id = p_product_id
    and (
      source in ('seed', 'off')
      or (source = 'user' and created_by = auth.uid())
    );
end;
$$;

revoke all on function public.increment_food_product_usage_count(uuid) from public;
grant execute on function public.increment_food_product_usage_count(uuid) to authenticated;

create index if not exists food_products_usage_count_idx
  on public.food_products (usage_count desc);
