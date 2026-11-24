-- 011_saved_meals.sql — CL05d saved meal templates

create table if not exists public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  meal_type public.meal_type,
  last_used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists saved_meals_owner_last_used_idx
  on public.saved_meals (owner_id, last_used_at desc nulls last);

drop trigger if exists saved_meals_set_updated_at on public.saved_meals;
create trigger saved_meals_set_updated_at
  before update on public.saved_meals
  for each row execute function public.set_updated_at();

create table if not exists public.saved_meal_items (
  id uuid primary key default gen_random_uuid(),
  saved_meal_id uuid not null references public.saved_meals (id) on delete cascade,
  product_id uuid not null references public.food_products (id) on delete restrict,
  quantity_servings numeric(8, 2) not null check (quantity_servings > 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists saved_meal_items_saved_meal_id_idx
  on public.saved_meal_items (saved_meal_id);

create index if not exists saved_meal_items_product_id_idx
  on public.saved_meal_items (product_id);

alter table public.saved_meals enable row level security;
alter table public.saved_meal_items enable row level security;

drop policy if exists saved_meals_select_own on public.saved_meals;
create policy saved_meals_select_own
  on public.saved_meals
  for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists saved_meals_insert_own on public.saved_meals;
create policy saved_meals_insert_own
  on public.saved_meals
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists saved_meals_update_own on public.saved_meals;
create policy saved_meals_update_own
  on public.saved_meals
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists saved_meals_delete_own on public.saved_meals;
create policy saved_meals_delete_own
  on public.saved_meals
  for delete
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists saved_meal_items_select_via_saved_meal on public.saved_meal_items;
create policy saved_meal_items_select_via_saved_meal
  on public.saved_meal_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.saved_meals sm
      where sm.id = saved_meal_id
        and sm.owner_id = auth.uid()
    )
  );

drop policy if exists saved_meal_items_insert_via_saved_meal on public.saved_meal_items;
create policy saved_meal_items_insert_via_saved_meal
  on public.saved_meal_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.saved_meals sm
      where sm.id = saved_meal_id
        and sm.owner_id = auth.uid()
    )
  );

drop policy if exists saved_meal_items_update_via_saved_meal on public.saved_meal_items;
create policy saved_meal_items_update_via_saved_meal
  on public.saved_meal_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.saved_meals sm
      where sm.id = saved_meal_id
        and sm.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.saved_meals sm
      where sm.id = saved_meal_id
        and sm.owner_id = auth.uid()
    )
  );

drop policy if exists saved_meal_items_delete_via_saved_meal on public.saved_meal_items;
create policy saved_meal_items_delete_via_saved_meal
  on public.saved_meal_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.saved_meals sm
      where sm.id = saved_meal_id
        and sm.owner_id = auth.uid()
    )
  );
