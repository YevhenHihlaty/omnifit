-- 005_meals_and_food_products.sql — CL05 meal logging
-- Barcode lives on food_products (no separate barcodes table).

do $$ begin
  create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.food_product_source as enum ('seed', 'off', 'user');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.barcode_type as enum ('ean13', 'upc', 'other');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.food_products (
  id uuid primary key default gen_random_uuid(),
  barcode text,
  barcode_type public.barcode_type,
  name text not null,
  brand text,
  serving_size_g numeric(10, 2) check (serving_size_g is null or serving_size_g > 0),
  calories_kcal numeric(10, 2) check (calories_kcal is null or calories_kcal >= 0),
  protein_g numeric(10, 2) check (protein_g is null or protein_g >= 0),
  carbs_g numeric(10, 2) check (carbs_g is null or carbs_g >= 0),
  fat_g numeric(10, 2) check (fat_g is null or fat_g >= 0),
  source public.food_product_source not null default 'user',
  created_by uuid references public.profiles (id) on delete set null,
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint food_products_barcode_pair check (
    (barcode is null and barcode_type is null)
    or (barcode is not null and barcode_type is not null)
  ),
  constraint food_products_catalog_requires_barcode check (
    source not in ('seed', 'off')
    or (barcode is not null and barcode_type is not null)
  ),
  unique (barcode)
);

create index if not exists food_products_name_idx
  on public.food_products (name);

create index if not exists food_products_barcode_idx
  on public.food_products (barcode)
  where barcode is not null;

drop trigger if exists food_products_set_updated_at on public.food_products;
create trigger food_products_set_updated_at
  before update on public.food_products
  for each row execute function public.set_updated_at();

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  logged_at timestamptz not null default timezone('utc', now()),
  meal_type public.meal_type not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists meals_client_logged_at_idx
  on public.meals (client_id, logged_at desc);

drop trigger if exists meals_set_updated_at on public.meals;
create trigger meals_set_updated_at
  before update on public.meals
  for each row execute function public.set_updated_at();

create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  product_id uuid not null references public.food_products (id) on delete restrict,
  quantity_servings numeric(8, 2) not null check (quantity_servings > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists meal_items_meal_id_idx on public.meal_items (meal_id);
create index if not exists meal_items_product_id_idx on public.meal_items (product_id);

alter table public.food_products enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;

-- Catalog: seed/off global; user products visible to creator only
drop policy if exists food_products_select_catalog on public.food_products;
create policy food_products_select_catalog
  on public.food_products
  for select
  to authenticated
  using (
    source in ('seed', 'off')
    or created_by = auth.uid()
  );

drop policy if exists food_products_insert_own on public.food_products;
create policy food_products_insert_own
  on public.food_products
  for insert
  to authenticated
  with check (
    source = 'user'
    and created_by = auth.uid()
  );

drop policy if exists food_products_update_own on public.food_products;
create policy food_products_update_own
  on public.food_products
  for update
  to authenticated
  using (created_by = auth.uid() and source = 'user')
  with check (created_by = auth.uid() and source = 'user');

drop policy if exists meals_select_own_or_coach on public.meals;
create policy meals_select_own_or_coach
  on public.meals
  for select
  to authenticated
  using (
    client_id = auth.uid()
    or public.coach_has_active_client(auth.uid(), client_id)
  );

drop policy if exists meals_insert_own on public.meals;
create policy meals_insert_own
  on public.meals
  for insert
  to authenticated
  with check (client_id = auth.uid());

drop policy if exists meals_update_own on public.meals;
create policy meals_update_own
  on public.meals
  for update
  to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists meals_delete_own on public.meals;
create policy meals_delete_own
  on public.meals
  for delete
  to authenticated
  using (client_id = auth.uid());

drop policy if exists meal_items_select_via_meal on public.meal_items;
create policy meal_items_select_via_meal
  on public.meal_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.meals m
      where m.id = meal_items.meal_id
        and (
          m.client_id = auth.uid()
          or public.coach_has_active_client(auth.uid(), m.client_id)
        )
    )
  );

drop policy if exists meal_items_insert_own_meal on public.meal_items;
create policy meal_items_insert_own_meal
  on public.meal_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.meals m
      where m.id = meal_items.meal_id
        and m.client_id = auth.uid()
    )
  );

drop policy if exists meal_items_update_own_meal on public.meal_items;
create policy meal_items_update_own_meal
  on public.meal_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.meals m
      where m.id = meal_items.meal_id
        and m.client_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.meals m
      where m.id = meal_items.meal_id
        and m.client_id = auth.uid()
    )
  );

drop policy if exists meal_items_delete_own_meal on public.meal_items;
create policy meal_items_delete_own_meal
  on public.meal_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.meals m
      where m.id = meal_items.meal_id
        and m.client_id = auth.uid()
    )
  );
