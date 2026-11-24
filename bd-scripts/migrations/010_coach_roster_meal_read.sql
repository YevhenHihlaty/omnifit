-- 010_coach_roster_meal_read.sql — coaches read meals for any roster client (incl. archived)

create or replace function public.coach_has_roster_client(p_coach_id uuid, p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.coach_client_relationships r
    where r.coach_id = p_coach_id
      and r.client_id = p_client_id
  );
$$;

drop policy if exists meals_select_own_or_coach on public.meals;
create policy meals_select_own_or_coach
  on public.meals
  for select
  to authenticated
  using (
    client_id = auth.uid()
    or public.coach_has_roster_client(auth.uid(), client_id)
  );

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
          or public.coach_has_roster_client(auth.uid(), m.client_id)
        )
    )
  );
