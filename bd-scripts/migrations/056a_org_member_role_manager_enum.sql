-- 056a_org_member_role_manager_enum.sql — add manager role (must commit before 056b)
-- ponytail: Postgres forbids using a new enum label in the same transaction as ALTER TYPE ADD VALUE.

do $$ begin
  alter type public.organization_member_role add value if not exists 'manager' after 'admin';
exception
  when duplicate_object then null;
end $$;
