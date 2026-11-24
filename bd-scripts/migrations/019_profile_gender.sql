-- 019_profile_gender.sql — optional male/female gender on base profile

do $$ begin
  create type public.profile_gender as enum ('male', 'female');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists gender public.profile_gender;
