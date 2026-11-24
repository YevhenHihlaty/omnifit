-- 020_body_measurement_circumferences.sql — per-limb bicep/thigh, neck, hip

alter table public.body_metrics
  add column if not exists neck_cm numeric(6, 2)
    check (neck_cm is null or neck_cm > 0),
  add column if not exists hip_cm numeric(6, 2)
    check (hip_cm is null or hip_cm > 0),
  add column if not exists bicep_left_cm numeric(6, 2)
    check (bicep_left_cm is null or bicep_left_cm > 0),
  add column if not exists bicep_right_cm numeric(6, 2)
    check (bicep_right_cm is null or bicep_right_cm > 0),
  add column if not exists thigh_left_cm numeric(6, 2)
    check (thigh_left_cm is null or thigh_left_cm > 0),
  add column if not exists thigh_right_cm numeric(6, 2)
    check (thigh_right_cm is null or thigh_right_cm > 0);
