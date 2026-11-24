-- 015_workout_templates.sql — W-CL21 / W-CH23 saved workout templates

do $$ begin
  create type public.owner_role as enum ('coach', 'client');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  owner_role public.owner_role not null,
  name text not null check (char_length(trim(name)) > 0),
  sport_type public.sport_type not null,
  notes text,
  is_favorite boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists workout_templates_owner_last_used_idx
  on public.workout_templates (owner_id, owner_role, last_used_at desc nulls last);

drop trigger if exists workout_templates_set_updated_at on public.workout_templates;
create trigger workout_templates_set_updated_at
  before update on public.workout_templates
  for each row execute function public.set_updated_at();

create table if not exists public.workout_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates (id) on delete cascade,
  exercise_id uuid,
  exercise_name text not null check (char_length(trim(exercise_name)) > 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  default_sets jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists workout_template_items_template_id_idx
  on public.workout_template_items (template_id, sort_order);

alter table public.workout_templates enable row level security;
alter table public.workout_template_items enable row level security;

drop policy if exists workout_templates_select_own on public.workout_templates;
create policy workout_templates_select_own
  on public.workout_templates
  for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists workout_templates_insert_own on public.workout_templates;
create policy workout_templates_insert_own
  on public.workout_templates
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists workout_templates_update_own on public.workout_templates;
create policy workout_templates_update_own
  on public.workout_templates
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists workout_templates_delete_own on public.workout_templates;
create policy workout_templates_delete_own
  on public.workout_templates
  for delete
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists workout_template_items_select_via_template on public.workout_template_items;
create policy workout_template_items_select_via_template
  on public.workout_template_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workout_templates wt
      where wt.id = template_id
        and wt.owner_id = auth.uid()
    )
  );

drop policy if exists workout_template_items_insert_via_template on public.workout_template_items;
create policy workout_template_items_insert_via_template
  on public.workout_template_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.workout_templates wt
      where wt.id = template_id
        and wt.owner_id = auth.uid()
    )
  );

drop policy if exists workout_template_items_update_via_template on public.workout_template_items;
create policy workout_template_items_update_via_template
  on public.workout_template_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.workout_templates wt
      where wt.id = template_id
        and wt.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workout_templates wt
      where wt.id = template_id
        and wt.owner_id = auth.uid()
    )
  );

drop policy if exists workout_template_items_delete_via_template on public.workout_template_items;
create policy workout_template_items_delete_via_template
  on public.workout_template_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.workout_templates wt
      where wt.id = template_id
        and wt.owner_id = auth.uid()
    )
  );
