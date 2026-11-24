-- 097_weekly_checkins_motivation.sql
-- Adds the fifth wellness slider (Motivation 1–5) to weekly_checkins.
-- The design shows 5 sliders (Sleep, Soreness, Stress, Energy, Motivation).
-- Migration 093 only created four — this fills the gap.

alter table public.weekly_checkins
  add column if not exists motivation smallint
    check (motivation is null or motivation between 1 and 5);

comment on column public.weekly_checkins.motivation is
  'Optional subjective motivation score 1 (low) – 5 (high).';
