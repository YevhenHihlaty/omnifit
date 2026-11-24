-- 090_health_metrics.sql — Add Apple Health / Google Fit data to body_metrics

alter table public.body_metrics
  add column if not exists steps integer check (steps is null or steps >= 0),
  add column if not exists active_energy_kcal numeric(8, 2) check (active_energy_kcal is null or active_energy_kcal >= 0),
  add column if not exists sleep_minutes integer check (sleep_minutes is null or sleep_minutes >= 0);
