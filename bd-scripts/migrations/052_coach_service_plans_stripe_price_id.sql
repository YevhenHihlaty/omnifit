-- 052_coach_service_plans_stripe_price_id.sql — Sprint 17 Stripe prep (no checkout in this sprint)
-- Depends on: 028_place_types_and_service_plans.sql
-- ponytail: nullable column only; checkout gated by NEXT_PUBLIC_STRIPE_SERVICE_PLAN_CHECKOUT_ENABLED later.

alter table public.coach_service_plans
  add column if not exists stripe_price_id text null;

comment on column public.coach_service_plans.stripe_price_id is
  'Stripe Price id (price_…) for future plan checkout. Unset until Phase 2 sync; no client charge in Sprint 17.';

create index if not exists coach_service_plans_stripe_price_id_idx
  on public.coach_service_plans (stripe_price_id)
  where stripe_price_id is not null;
