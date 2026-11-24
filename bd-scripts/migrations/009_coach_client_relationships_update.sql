-- 009_coach_client_relationships_update.sql — coach can archive roster relationships

drop policy if exists relationships_update_coach on public.coach_client_relationships;

create policy relationships_update_coach
  on public.coach_client_relationships for update
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
