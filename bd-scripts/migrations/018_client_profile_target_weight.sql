-- 018_client_profile_target_weight.sql — client onboarding target weight (WEB-C02)

alter table public.client_profiles
  add column if not exists target_weight_kg numeric(6, 2)
  check (
    target_weight_kg is null
    or (target_weight_kg >= 20 and target_weight_kg <= 500)
  );
