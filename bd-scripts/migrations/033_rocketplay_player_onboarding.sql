-- 033_rocketplay_player_onboarding.sql — RocketPlay player onboarding on client_profiles

alter table public.client_profiles
  add column if not exists rocketplay_interests text[] not null default '{}',
  add column if not exists rocketplay_level numeric(3, 1),
  add column if not exists rocketplay_onboarding_completed_at timestamptz;
