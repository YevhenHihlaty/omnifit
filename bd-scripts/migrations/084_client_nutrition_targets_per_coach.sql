-- 084_client_nutrition_targets_per_coach.sql
-- Phase 3: one nutrition target row per (client_id, coach_id) instead of one per client.

alter table public.client_nutrition_targets
  drop constraint if exists client_nutrition_targets_pkey;

alter table public.client_nutrition_targets
  add constraint client_nutrition_targets_pkey
  primary key (client_id, coach_id);

create index if not exists client_nutrition_targets_client_idx
  on public.client_nutrition_targets (client_id);
