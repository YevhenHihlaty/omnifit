-- 056b_org_role_permissions.sql — granular org permission helpers + RLS
-- Depends on: 056a_org_member_role_manager_enum.sql

-- ---------------------------------------------------------------------------
-- Permission helpers
-- ---------------------------------------------------------------------------

create or replace function public.org_member_role(p_organization_id uuid)
returns public.organization_member_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.organization_members m
  where m.organization_id = p_organization_id
    and m.user_id = auth.uid()
    and m.status = 'active'
  limit 1;
$$;

create or replace function public.is_org_company_admin(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_org_owner_or_admin(p_organization_id);
$$;

create or replace function public.is_org_ops_manager(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'manager')
  )
  or exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.owner_id = auth.uid()
  );
$$;

create or replace function public.is_org_reservations_staff(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'manager', 'staff')
  )
  or exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.owner_id = auth.uid()
  );
$$;

create or replace function public.is_org_active_coach_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = 'coach'
  );
$$;

create or replace function public.can_edit_member_roles(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_org_company_admin(p_organization_id);
$$;

create or replace function public.can_edit_organization(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_org_company_admin(p_organization_id);
$$;

create or replace function public.is_org_coach_member(
  p_organization_id uuid,
  p_coach_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = p_coach_id
      and m.status = 'active'
      and m.role in ('coach', 'owner', 'admin', 'manager')
  );
$$;

create or replace function public.is_org_ops_staff_for_coach(
  p_organization_id uuid,
  p_coach_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_org_ops_manager(p_organization_id)
    and public.is_org_coach_member(p_organization_id, p_coach_id);
$$;

-- Backward-compatible wrappers
create or replace function public.is_org_booking_staff(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_org_reservations_staff(p_organization_id);
$$;

revoke all on function public.org_member_role(uuid) from public;
grant execute on function public.org_member_role(uuid) to authenticated;

revoke all on function public.is_org_company_admin(uuid) from public;
grant execute on function public.is_org_company_admin(uuid) to authenticated;

revoke all on function public.is_org_ops_manager(uuid) from public;
grant execute on function public.is_org_ops_manager(uuid) to authenticated;

revoke all on function public.is_org_reservations_staff(uuid) from public;
grant execute on function public.is_org_reservations_staff(uuid) to authenticated;

revoke all on function public.is_org_active_coach_member(uuid) from public;
grant execute on function public.is_org_active_coach_member(uuid) to authenticated;

revoke all on function public.can_edit_member_roles(uuid) from public;
grant execute on function public.can_edit_member_roles(uuid) to authenticated;

revoke all on function public.can_edit_organization(uuid) from public;
grant execute on function public.can_edit_organization(uuid) to authenticated;

revoke all on function public.is_org_coach_member(uuid, uuid) from public;
grant execute on function public.is_org_coach_member(uuid, uuid) to authenticated;

revoke all on function public.is_org_ops_staff_for_coach(uuid, uuid) from public;
grant execute on function public.is_org_ops_staff_for_coach(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- organization_members policies
-- ---------------------------------------------------------------------------

drop policy if exists organization_members_select_org_admin on public.organization_members;
create policy organization_members_select_org_staff
  on public.organization_members for select
  to authenticated
  using (
    public.is_org_ops_manager(organization_id)
    or public.is_org_reservations_staff(organization_id)
  );

drop policy if exists organization_members_insert_admin on public.organization_members;
create policy organization_members_insert_admin
  on public.organization_members for insert
  to authenticated
  with check (public.is_org_company_admin(organization_id));

drop policy if exists organization_members_insert_manager on public.organization_members;
create policy organization_members_insert_manager
  on public.organization_members for insert
  to authenticated
  with check (
    public.is_org_ops_manager(organization_id)
    and role in ('staff', 'coach')
  );

drop policy if exists organization_members_update_admin on public.organization_members;
create policy organization_members_update_admin
  on public.organization_members for update
  to authenticated
  using (public.is_org_company_admin(organization_id))
  with check (public.is_org_company_admin(organization_id));

drop policy if exists organization_members_update_manager on public.organization_members;
create policy organization_members_update_manager
  on public.organization_members for update
  to authenticated
  using (
    public.is_org_ops_manager(organization_id)
    and role in ('staff', 'coach')
  )
  with check (
    public.is_org_ops_manager(organization_id)
    and role in ('staff', 'coach')
  );

-- ---------------------------------------------------------------------------
-- organization_places — manager can insert/update; delete admin only
-- ---------------------------------------------------------------------------

drop policy if exists organization_places_insert_admin on public.organization_places;
create policy organization_places_insert_admin
  on public.organization_places for insert
  to authenticated
  with check (public.is_org_company_admin(organization_id));

drop policy if exists organization_places_insert_manager on public.organization_places;
create policy organization_places_insert_manager
  on public.organization_places for insert
  to authenticated
  with check (public.is_org_ops_manager(organization_id));

drop policy if exists organization_places_update_admin on public.organization_places;
create policy organization_places_update_admin
  on public.organization_places for update
  to authenticated
  using (public.is_org_company_admin(organization_id))
  with check (public.is_org_company_admin(organization_id));

drop policy if exists organization_places_update_manager on public.organization_places;
create policy organization_places_update_manager
  on public.organization_places for update
  to authenticated
  using (public.is_org_ops_manager(organization_id))
  with check (public.is_org_ops_manager(organization_id));

-- ---------------------------------------------------------------------------
-- training_rooms — align with org_places (055 used admin-only)
-- ---------------------------------------------------------------------------

drop policy if exists training_rooms_insert_org_admin on public.training_rooms;
create policy training_rooms_insert_org_admin
  on public.training_rooms for insert
  to authenticated
  with check (public.is_org_company_admin(organization_id));

drop policy if exists training_rooms_insert_manager on public.training_rooms;
create policy training_rooms_insert_manager
  on public.training_rooms for insert
  to authenticated
  with check (public.is_org_ops_manager(organization_id));

drop policy if exists training_rooms_update_org_admin on public.training_rooms;
create policy training_rooms_update_org_admin
  on public.training_rooms for update
  to authenticated
  using (public.is_org_company_admin(organization_id))
  with check (public.is_org_company_admin(organization_id));

drop policy if exists training_rooms_update_manager on public.training_rooms;
create policy training_rooms_update_manager
  on public.training_rooms for update
  to authenticated
  using (public.is_org_ops_manager(organization_id))
  with check (public.is_org_ops_manager(organization_id));

-- courts write — manager can manage inventory
drop policy if exists courts_insert_org_staff on public.courts;
create policy courts_insert_org_staff
  on public.courts for insert
  to authenticated
  with check (public.is_org_ops_manager(organization_id));

drop policy if exists courts_update_org_staff on public.courts;
create policy courts_update_org_staff
  on public.courts for update
  to authenticated
  using (public.is_org_ops_manager(organization_id))
  with check (public.is_org_ops_manager(organization_id));

-- ---------------------------------------------------------------------------
-- coach_client_relationships — org ops staff cross-coach access
-- ---------------------------------------------------------------------------

drop policy if exists relationships_select_org_ops on public.coach_client_relationships;
create policy relationships_select_org_ops
  on public.coach_client_relationships for select
  to authenticated
  using (public.is_org_ops_staff_for_coach(organization_id, coach_id));

drop policy if exists relationships_insert_org_ops on public.coach_client_relationships;
create policy relationships_insert_org_ops
  on public.coach_client_relationships for insert
  to authenticated
  with check (public.is_org_ops_staff_for_coach(organization_id, coach_id));

drop policy if exists relationships_update_org_ops on public.coach_client_relationships;
create policy relationships_update_org_ops
  on public.coach_client_relationships for update
  to authenticated
  using (public.is_org_ops_staff_for_coach(organization_id, coach_id))
  with check (public.is_org_ops_staff_for_coach(organization_id, coach_id));

-- ---------------------------------------------------------------------------
-- booking_requests — reservations staff read org queue
-- ---------------------------------------------------------------------------

drop policy if exists booking_requests_select_org_reservations_staff on public.booking_requests;
create policy booking_requests_select_org_reservations_staff
  on public.booking_requests for select
  to authenticated
  using (public.is_org_reservations_staff(organization_id));

-- ---------------------------------------------------------------------------
-- organizations — delegated admins may update company profile
-- ---------------------------------------------------------------------------

drop policy if exists organizations_update_company_admin on public.organizations;
create policy organizations_update_company_admin
  on public.organizations for update
  to authenticated
  using (public.can_edit_organization(id))
  with check (public.can_edit_organization(id));
