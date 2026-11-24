-- 008_coach_roster_profile_read.sql — coaches read profiles for roster clients (W-CH02)

drop policy if exists profiles_select_coach_roster on public.profiles;
create policy profiles_select_coach_roster
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.coach_client_relationships r
      where r.coach_id = auth.uid()
        and r.client_id = profiles.id
    )
  );
