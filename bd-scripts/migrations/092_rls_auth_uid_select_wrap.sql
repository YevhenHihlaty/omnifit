-- 092_rls_auth_uid_select_wrap.sql
-- Wrap bare auth.uid() in RLS policy expressions with (select auth.uid())
-- so Postgres evaluates auth once per query (Supabase performance guidance).
-- Idempotent: collapses nested (select (select auth.uid())) if re-run.

create or replace function public._omnifit_wrap_auth_uid_expr(p_expr text)
returns text
language plpgsql
immutable
as $$
declare
  e text := p_expr;
begin
  if e is null or e = '' then
    return e;
  end if;

  e := replace(e, 'auth.uid()', '(select auth.uid())');

  while position('(select (select auth.uid()))' in e) > 0 loop
    e := replace(e, '(select (select auth.uid()))', '(select auth.uid())');
  end loop;

  return e;
end;
$$;

do $$
declare
  r record;
  new_using text;
  new_check text;
  role_list text;
  cmd_sql text;
  as_clause text;
begin
  for r in
    select
      pol.polname as policyname,
      n.nspname as schemaname,
      c.relname as tablename,
      case pol.polcmd
        when 'r' then 'SELECT'
        when 'a' then 'INSERT'
        when 'w' then 'UPDATE'
        when 'd' then 'DELETE'
        when '*' then 'ALL'
      end as cmd,
      case when pol.polpermissive then 'PERMISSIVE' else 'RESTRICTIVE' end as permissive,
      pg_get_expr(pol.polqual, pol.polrelid) as qual,
      pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check,
      coalesce(
        (
          select string_agg(quote_ident(pr.rolname), ', ' order by pr.rolname)
          from unnest(pol.polroles) as rid
          join pg_roles pr on pr.oid = rid
        ),
        'public'
      ) as roles
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and (
        coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') like '%auth.uid()%'
        or coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') like '%auth.uid()%'
      )
  loop
    new_using := public._omnifit_wrap_auth_uid_expr(r.qual);
    new_check := public._omnifit_wrap_auth_uid_expr(r.with_check);
    role_list := nullif(r.roles, '');
    if role_list is null or role_list = '' then
      role_list := 'public';
    end if;

    -- Skip if already fully wrapped (no bare auth.uid() left after wrap == same as wrap of already-wrapped)
    if new_using is not distinct from r.qual
       and new_check is not distinct from r.with_check then
      continue;
    end if;

    -- Detect still-bare: if original had auth.uid() not already as (select auth.uid())
    -- Always recreate when wrap changes expression.
    execute format(
      'drop policy if exists %I on %I.%I',
      r.policyname,
      r.schemaname,
      r.tablename
    );

    cmd_sql := format(
      'create policy %I on %I.%I as %s for %s to %s',
      r.policyname,
      r.schemaname,
      r.tablename,
      r.permissive,
      r.cmd,
      role_list
    );

    if r.cmd = 'INSERT' then
      cmd_sql := cmd_sql || format(
        ' with check (%s)',
        coalesce(new_check, new_using)
      );
    elsif r.cmd in ('SELECT', 'DELETE') then
      cmd_sql := cmd_sql || format(' using (%s)', new_using);
    elsif r.cmd = 'UPDATE' then
      cmd_sql := cmd_sql || format(' using (%s)', coalesce(new_using, new_check));
      if new_check is not null then
        cmd_sql := cmd_sql || format(' with check (%s)', new_check);
      end if;
    else
      -- ALL
      if new_using is not null then
        cmd_sql := cmd_sql || format(' using (%s)', new_using);
      end if;
      if new_check is not null then
        cmd_sql := cmd_sql || format(' with check (%s)', new_check);
      elsif new_using is not null then
        cmd_sql := cmd_sql || format(' with check (%s)', new_using);
      end if;
    end if;

    execute cmd_sql;
  end loop;
end;
$$;

-- Hoist auth.uid() inside org membership helpers (called from many policies)
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
      and m.user_id = (select auth.uid())
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
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  )
  or exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.owner_id = (select auth.uid())
  );
$$;

-- Ensure owner + active member can both SELECT organizations
drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member
  on public.organizations for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or public.is_active_org_member(id)
  );

drop policy if exists organizations_select_active_member on public.organizations;
-- Merged into organizations_select_member above

drop function if exists public._omnifit_wrap_auth_uid_expr(text);

comment on policy organizations_select_member on public.organizations is
  'Owner or active organization_members row may read the org.';
