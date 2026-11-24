-- 030_team_studio_members_invites_places.sql — team org members, invites, org places (PRD team-studio M1)

do $$ begin
  create type public.organization_member_role as enum ('owner', 'admin', 'coach', 'staff');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.organization_invite_status as enum (
    'pending',
    'accepted',
    'expired',
    'revoked'
  );
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.organization_member_role not null,
  status text not null default 'active'
    check (status in ('invited', 'active', 'removed')),
  invited_at timestamptz,
  joined_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint organization_members_org_user_unique unique (organization_id, user_id)
);

create index if not exists organization_members_org_id_idx
  on public.organization_members (organization_id);

create index if not exists organization_members_user_id_idx
  on public.organization_members (user_id);

create index if not exists organization_members_org_status_idx
  on public.organization_members (organization_id, status);

drop trigger if exists organization_members_set_updated_at on public.organization_members;
create trigger organization_members_set_updated_at
  before update on public.organization_members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_invites (email + token; members row created on accept)
-- ---------------------------------------------------------------------------

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role public.organization_member_role not null default 'coach',
  token_hash text not null,
  status public.organization_invite_status not null default 'pending',
  invited_by uuid not null references public.profiles (id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_user_id uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint organization_invites_token_hash_unique unique (token_hash)
);

create index if not exists organization_invites_org_id_idx
  on public.organization_invites (organization_id);

create index if not exists organization_invites_email_lower_idx
  on public.organization_invites (lower(email));

create unique index if not exists organization_invites_org_email_pending_unique
  on public.organization_invites (organization_id, lower(email))
  where status = 'pending';

drop trigger if exists organization_invites_set_updated_at on public.organization_invites;
create trigger organization_invites_set_updated_at
  before update on public.organization_invites
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_places (club venues — coaches inherit on invite accept)
-- ---------------------------------------------------------------------------

create table if not exists public.organization_places (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  is_primary boolean not null default false,
  custom_label text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint organization_places_org_place_unique unique (organization_id, place_id)
);

create index if not exists organization_places_org_id_idx
  on public.organization_places (organization_id);

create index if not exists organization_places_place_id_idx
  on public.organization_places (place_id);

drop trigger if exists organization_places_set_updated_at on public.organization_places;
create trigger organization_places_set_updated_at
  before update on public.organization_places
  for each row execute function public.set_updated_at();

-- Link inherited coach venues back to org row ("From club" in UI)
alter table public.coach_places
  add column if not exists organization_place_id uuid
  references public.organization_places (id) on delete set null;

create index if not exists coach_places_organization_place_id_idx
  on public.coach_places (organization_place_id)
  where organization_place_id is not null;

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_active_org_member(p_organization_id uuid)
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
  );
$$;

create or replace function public.is_org_owner_or_admin(p_organization_id uuid)
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
      and m.role in ('owner', 'admin')
  )
  or exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.owner_id = auth.uid()
  );
$$;

revoke all on function public.is_active_org_member(uuid) from public;
grant execute on function public.is_active_org_member(uuid) to authenticated;

revoke all on function public.is_org_owner_or_admin(uuid) from public;
grant execute on function public.is_org_owner_or_admin(uuid) to authenticated;

-- Copy org venues to coach profile (invite accept — M3 server action calls this)
create or replace function public.copy_organization_places_to_coach(
  p_organization_id uuid,
  p_coach_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  copied_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_coach_id <> auth.uid()
     and not public.is_org_owner_or_admin(p_organization_id) then
    raise exception 'Forbidden';
  end if;

  insert into public.coach_places (
    coach_id,
    place_id,
    is_primary,
    custom_label,
    sort_order,
    organization_place_id
  )
  select
    p_coach_id,
    op.place_id,
    op.is_primary,
    op.custom_label,
    op.sort_order,
    op.id
  from public.organization_places op
  where op.organization_id = p_organization_id
  on conflict (coach_id, place_id) do update
    set organization_place_id = excluded.organization_place_id,
        updated_at = timezone('utc', now());

  get diagnostics copied_count = row_count;
  return copied_count;
end;
$$;

revoke all on function public.copy_organization_places_to_coach(uuid, uuid) from public;
grant execute on function public.copy_organization_places_to_coach(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;
alter table public.organization_places enable row level security;

-- organizations: active team members may read studio org (owner policies unchanged)
drop policy if exists organizations_select_active_member on public.organizations;
create policy organizations_select_active_member
  on public.organizations for select
  to authenticated
  using (public.is_active_org_member(id));

-- organization_members
drop policy if exists organization_members_select_self on public.organization_members;
create policy organization_members_select_self
  on public.organization_members for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists organization_members_select_org_admin on public.organization_members;
create policy organization_members_select_org_admin
  on public.organization_members for select
  to authenticated
  using (public.is_org_owner_or_admin(organization_id));

drop policy if exists organization_members_insert_admin on public.organization_members;
create policy organization_members_insert_admin
  on public.organization_members for insert
  to authenticated
  with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists organization_members_update_admin on public.organization_members;
create policy organization_members_update_admin
  on public.organization_members for update
  to authenticated
  using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- organization_invites
drop policy if exists organization_invites_select_admin on public.organization_invites;
create policy organization_invites_select_admin
  on public.organization_invites for select
  to authenticated
  using (public.is_org_owner_or_admin(organization_id));

drop policy if exists organization_invites_insert_admin on public.organization_invites;
create policy organization_invites_insert_admin
  on public.organization_invites for insert
  to authenticated
  with check (
    public.is_org_owner_or_admin(organization_id)
    and invited_by = auth.uid()
  );

drop policy if exists organization_invites_update_admin on public.organization_invites;
create policy organization_invites_update_admin
  on public.organization_invites for update
  to authenticated
  using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- organization_places
drop policy if exists organization_places_select_member on public.organization_places;
create policy organization_places_select_member
  on public.organization_places for select
  to authenticated
  using (public.is_active_org_member(organization_id));

drop policy if exists organization_places_insert_admin on public.organization_places;
create policy organization_places_insert_admin
  on public.organization_places for insert
  to authenticated
  with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists organization_places_update_admin on public.organization_places;
create policy organization_places_update_admin
  on public.organization_places for update
  to authenticated
  using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists organization_places_delete_admin on public.organization_places;
create policy organization_places_delete_admin
  on public.organization_places for delete
  to authenticated
  using (public.is_org_owner_or_admin(organization_id));
