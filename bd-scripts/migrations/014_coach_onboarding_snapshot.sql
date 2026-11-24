-- 014_coach_onboarding_snapshot.sql — persist skippable onboarding credentials until dedicated tables land

alter table public.coach_profiles
  add column if not exists onboarding_snapshot jsonb;

comment on column public.coach_profiles.onboarding_snapshot is
  'Temporary JSON store for coach onboarding credentials (experience, education, etc.) until normalized tables ship.';
