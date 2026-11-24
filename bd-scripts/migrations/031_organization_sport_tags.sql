-- 031_organization_sport_tags.sql — team org sport focus (links to sport_tags catalog)

create table if not exists public.organization_sport_tags (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sport_tag_id uuid not null references public.sport_tags (id) on delete cascade,
  is_primary boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (organization_id, sport_tag_id)
);

create index if not exists organization_sport_tags_org_id_idx
  on public.organization_sport_tags (organization_id);

create unique index if not exists organization_sport_tags_one_primary_idx
  on public.organization_sport_tags (organization_id)
  where is_primary;

alter table public.organization_sport_tags enable row level security;

drop policy if exists organization_sport_tags_select_member on public.organization_sport_tags;
create policy organization_sport_tags_select_member
  on public.organization_sport_tags for select
  to authenticated
  using (public.is_active_org_member(organization_id));

drop policy if exists organization_sport_tags_insert_admin on public.organization_sport_tags;
create policy organization_sport_tags_insert_admin
  on public.organization_sport_tags for insert
  to authenticated
  with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists organization_sport_tags_update_admin on public.organization_sport_tags;
create policy organization_sport_tags_update_admin
  on public.organization_sport_tags for update
  to authenticated
  using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists organization_sport_tags_delete_admin on public.organization_sport_tags;
create policy organization_sport_tags_delete_admin
  on public.organization_sport_tags for delete
  to authenticated
  using (public.is_org_owner_or_admin(organization_id));
