-- 078_coach_org_crm_rbac_booking_readiness.sql
-- Org-scoped service plan + session management, guest sessions, booking readiness fields.

-- ---------------------------------------------------------------------------
-- Booking readiness (Stripe Connect prep — no onboarding in this migration)
-- ---------------------------------------------------------------------------

alter table public.organizations
  add column if not exists booking_contact_email text,
  add column if not exists booking_default_currency text;

comment on column public.organizations.booking_contact_email is
  'Public contact email for booking receipts and support before Stripe Connect.';
comment on column public.organizations.booking_default_currency is
  'ISO 4217 currency code for published service plans (e.g. USD, EUR).';

-- ---------------------------------------------------------------------------
-- Guest / unregistered clients on coach-created sessions
-- ---------------------------------------------------------------------------

alter table public.sessions
  add column if not exists guest_client_name text;

alter table public.sessions
  alter column client_id drop not null;

alter table public.sessions
  drop constraint if exists sessions_client_or_guest_check;

alter table public.sessions
  add constraint sessions_client_or_guest_check
  check (
    (
      client_id is not null
      and guest_client_name is null
    )
    or (
      client_id is null
      and guest_client_name is not null
      and length(trim(guest_client_name)) > 0
    )
  );

-- ---------------------------------------------------------------------------
-- Permission helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_coach_service_plans(p_coach_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_coach_id = auth.uid()
    or exists (
      select 1
      from public.coach_profiles cp
      where cp.user_id = p_coach_id
        and cp.current_organization_id is not null
        and public.is_org_ops_manager(cp.current_organization_id)
        and public.is_org_coach_member(cp.current_organization_id, p_coach_id)
    );
$$;

create or replace function public.can_manage_coach_sessions(p_coach_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_coach_id = auth.uid()
    or exists (
      select 1
      from public.coach_profiles cp
      where cp.user_id = p_coach_id
        and cp.current_organization_id is not null
        and public.is_org_reservations_staff(cp.current_organization_id)
        and public.is_org_coach_member(cp.current_organization_id, p_coach_id)
    );
$$;

revoke all on function public.can_manage_coach_service_plans(uuid) from public;
grant execute on function public.can_manage_coach_service_plans(uuid) to authenticated;

revoke all on function public.can_manage_coach_sessions(uuid) from public;
grant execute on function public.can_manage_coach_sessions(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- coach_service_plans — org admin/manager may manage plans for org coaches
-- ---------------------------------------------------------------------------

drop policy if exists coach_service_plans_select_own on public.coach_service_plans;
create policy coach_service_plans_select_manageable
  on public.coach_service_plans for select
  to authenticated
  using (public.can_manage_coach_service_plans(coach_id));

drop policy if exists coach_service_plans_insert_own on public.coach_service_plans;
create policy coach_service_plans_insert_manageable
  on public.coach_service_plans for insert
  to authenticated
  with check (public.can_manage_coach_service_plans(coach_id));

drop policy if exists coach_service_plans_update_own on public.coach_service_plans;
create policy coach_service_plans_update_manageable
  on public.coach_service_plans for update
  to authenticated
  using (public.can_manage_coach_service_plans(coach_id))
  with check (public.can_manage_coach_service_plans(coach_id));

drop policy if exists coach_service_plans_delete_own on public.coach_service_plans;
create policy coach_service_plans_delete_manageable
  on public.coach_service_plans for delete
  to authenticated
  using (public.can_manage_coach_service_plans(coach_id));

-- ---------------------------------------------------------------------------
-- sessions — org staff may CRUD sessions for org coaches; guest clients allowed
-- ---------------------------------------------------------------------------

drop policy if exists sessions_select_coach on public.sessions;
create policy sessions_select_manageable
  on public.sessions for select
  to authenticated
  using (public.can_manage_coach_sessions(coach_id));

drop policy if exists sessions_insert_coach on public.sessions;
create policy sessions_insert_manageable
  on public.sessions for insert
  to authenticated
  with check (
    public.can_manage_coach_sessions(coach_id)
    and (
      (
        client_id is not null
        and public.coach_has_active_client(coach_id, client_id)
      )
      or (
        client_id is null
        and guest_client_name is not null
        and length(trim(guest_client_name)) > 0
      )
    )
  );

drop policy if exists sessions_update_coach on public.sessions;
create policy sessions_update_manageable
  on public.sessions for update
  to authenticated
  using (public.can_manage_coach_sessions(coach_id))
  with check (
    public.can_manage_coach_sessions(coach_id)
    and (
      (
        client_id is not null
        and public.coach_has_active_client(coach_id, client_id)
      )
      or (
        client_id is null
        and guest_client_name is not null
        and length(trim(guest_client_name)) > 0
      )
    )
  );

drop policy if exists sessions_delete_coach on public.sessions;
create policy sessions_delete_manageable
  on public.sessions for delete
  to authenticated
  using (public.can_manage_coach_sessions(coach_id));
