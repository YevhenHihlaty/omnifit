-- 021_client_check_in_interval.sql — coach sets measurement check-in cadence per client

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'client_check_in_interval'
  ) then
    create type public.client_check_in_interval as enum (
      'weekly',
      'biweekly',
      'monthly'
    );
  end if;
end
$$;

alter table public.coach_client_relationships
  add column if not exists check_in_interval public.client_check_in_interval
    not null default 'weekly';
