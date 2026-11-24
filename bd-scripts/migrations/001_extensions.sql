-- 001_extensions.sql — shared enums and helpers

create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('coach', 'client');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.organization_kind as enum ('personal', 'team');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.subscription_tier as enum ('free', 'pro', 'team');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.relationship_status as enum ('active', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.session_status as enum ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_status as enum ('todo', 'done', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;
