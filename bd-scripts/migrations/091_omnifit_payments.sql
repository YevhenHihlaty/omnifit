-- 091_omnifit_payments.sql
-- OmniFit payment layer: Stripe Connect, acquisition fee, session pricing, payments table
-- Applied to: coachr-app Supabase project (nykqchswsgmgceyjfown)
-- Depends on: existing coachr-app migrations 001–090

-- ─── 1. Stripe identifiers on coach_profiles ─────────────────────────────────

alter table public.coach_profiles
  add column if not exists stripe_account_id text,
  add column if not exists stripe_customer_id text;

comment on column public.coach_profiles.stripe_account_id is
  'Stripe Connected Account ID (acct_…). Set after coach completes Connect onboarding.';
comment on column public.coach_profiles.stripe_customer_id is
  'Stripe Customer ID (cus_…). Used to charge the $10 acquisition fee off-session.';

-- ─── 2. Acquisition tracking on coach_client_relationships ───────────────────

alter table public.coach_client_relationships
  add column if not exists acquisition_source text
    not null default 'coach_invited'
    check (acquisition_source in ('coach_invited', 'platform_sourced')),
  add column if not exists acquisition_fee_paid_at timestamptz;

comment on column public.coach_client_relationships.acquisition_source is
  'coach_invited: coach brought the client (no $10 fee). platform_sourced: platform matched the client ($10 on first paid session).';
comment on column public.coach_client_relationships.acquisition_fee_paid_at is
  'Set once the $10 platform acquisition fee has been charged to the coach. Null = not yet charged.';

-- ─── 3. Session pricing + Stripe checkout tracking ───────────────────────────

alter table public.sessions
  add column if not exists price_amount integer,
  add column if not exists stripe_checkout_session_id text;

comment on column public.sessions.price_amount is
  'Session price in cents set by the coach, excluding the $1 platform service fee charged to client.';
comment on column public.sessions.stripe_checkout_session_id is
  'Stripe Checkout Session ID (cs_…). Set when checkout is created; used to reconcile webhook events.';

create unique index if not exists sessions_stripe_checkout_session_id_idx
  on public.sessions (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

-- ─── 4. Payments table ───────────────────────────────────────────────────────

create table if not exists public.payments (
  id                                uuid primary key default gen_random_uuid(),
  session_id                        uuid not null references public.sessions (id) on delete cascade,
  coach_id                          uuid not null references public.profiles (id) on delete cascade,
  client_id                         uuid not null references public.profiles (id) on delete cascade,
  -- amounts in cents
  amount_total                      integer not null,  -- what client paid (session_price + service_fee)
  session_price                     integer not null,  -- session price portion only
  service_fee                       integer not null default 100,  -- $1.00 platform fee
  stripe_fee                        integer not null,  -- Stripe processing fee (approx 2.9% + $0.30)
  net_payout                        integer not null,  -- coach net: session_price - stripe_fee
  stripe_payment_intent_id          text unique,
  stripe_checkout_session_id        text unique,
  status                            text not null default 'pending'
                                    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  -- acquisition fee
  acquisition_fee_charged           boolean not null default false,
  acquisition_fee_payment_intent_id text,
  created_at                        timestamptz not null default timezone('utc', now()),
  updated_at                        timestamptz not null default timezone('utc', now())
);

create index if not exists payments_session_id_idx on public.payments (session_id);
create index if not exists payments_coach_id_idx   on public.payments (coach_id);
create index if not exists payments_status_idx     on public.payments (status);

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

drop policy if exists payments_select_coach on public.payments;
create policy payments_select_coach
  on public.payments for select
  to authenticated
  using (coach_id = auth.uid());

drop policy if exists payments_select_client on public.payments;
create policy payments_select_client
  on public.payments for select
  to authenticated
  using (client_id = auth.uid());

-- ─── 5. Helper: is $10 acquisition fee still owed? ───────────────────────────

create or replace function public.acquisition_fee_owed(p_relationship_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.coach_client_relationships r
    where r.id = p_relationship_id
      and r.acquisition_source = 'platform_sourced'
      and r.acquisition_fee_paid_at is null
  );
$$;

revoke execute on function public.acquisition_fee_owed(uuid) from anon, authenticated, public;
grant execute on function public.acquisition_fee_owed(uuid) to service_role;
