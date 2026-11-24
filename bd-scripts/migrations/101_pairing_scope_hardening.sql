-- 101_pairing_scope_hardening.sql
-- Sprint 3: class-A shared logs only for *active* coaches; class-B writes stay pairing-scoped.

-- ─── Class A: meals readable by active coaches only (not archived roster) ────

drop policy if exists meals_select_own_or_coach on public.meals;
create policy meals_select_own_or_coach
  on public.meals
  for select
  to authenticated
  using (
    client_id = (select auth.uid())
    or public.coach_has_active_client((select auth.uid()), client_id)
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
          m.client_id = (select auth.uid())
          or public.coach_has_active_client((select auth.uid()), m.client_id)
        )
    )
  );

-- ─── Class B: tasks — coach may only target own active clients ───────────────

drop policy if exists tasks_insert_coach on public.tasks;
create policy tasks_insert_coach
  on public.tasks for insert
  to authenticated
  with check (
    coach_id = (select auth.uid())
    and (
      client_id is null
      or public.coach_has_active_client((select auth.uid()), client_id)
    )
  );

drop policy if exists tasks_update_coach on public.tasks;
create policy tasks_update_coach
  on public.tasks for update
  to authenticated
  using (coach_id = (select auth.uid()))
  with check (
    coach_id = (select auth.uid())
    and (
      client_id is null
      or public.coach_has_active_client((select auth.uid()), client_id)
    )
  );

-- coach_notes already SELECT/WRITE scoped to coach_id = auth.uid() (049) — unchanged.
-- conversations/messages already use coach_has_active_client (053) — unchanged.
