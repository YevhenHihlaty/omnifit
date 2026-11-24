-- 105_acquisition_invoices.sql — Sprint 12
-- Acquisition fee = Stripe Invoice to coach ($15) for platform_sourced only.
-- coach_invited never invoices. Unpaid invoice blocks pairing activation paths.

-- ─── 1. Update acquisition comments (no longer $10 auto-debit) ───────────────

comment on column public.coach_profiles.stripe_customer_id is
  'Stripe Customer ID (cus_…). Used for coach-side acquisition invoices.';

comment on column public.coach_client_relationships.acquisition_source is
  'coach_invited: no acquisition invoice. platform_sourced: $15 invoice on activation.';

comment on column public.coach_client_relationships.acquisition_fee_paid_at is
  'Set when the platform_sourced acquisition invoice is paid. Null = unpaid/owed.';

comment on column public.sessions.price_amount is
  'Session price in cents (coach), excluding tier-dependent platform service fee.';

-- ─── 2. acquisition_invoices ─────────────────────────────────────────────────

create table if not exists public.acquisition_invoices (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null
    references public.coach_client_relationships (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  status text not null default 'draft'
    check (status in ('draft', 'open', 'paid', 'void', 'uncollectible')),
  stripe_invoice_id text unique,
  stripe_hosted_invoice_url text,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint acquisition_invoices_relationship_uniq unique (relationship_id)
);

create index if not exists acquisition_invoices_coach_status_idx
  on public.acquisition_invoices (coach_id, status);

drop trigger if exists acquisition_invoices_set_updated_at on public.acquisition_invoices;
create trigger acquisition_invoices_set_updated_at
  before update on public.acquisition_invoices
  for each row execute function public.set_updated_at();

alter table public.acquisition_invoices enable row level security;

drop policy if exists acquisition_invoices_select_coach on public.acquisition_invoices;
create policy acquisition_invoices_select_coach
  on public.acquisition_invoices for select
  to authenticated
  using (coach_id = (select auth.uid()));

-- Writes: service_role only (no insert/update/delete policies for authenticated)

-- ─── 3. Block helpers ────────────────────────────────────────────────────────

create or replace function public.coach_has_unpaid_acquisition(p_coach_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.acquisition_invoices i
    where i.coach_id = p_coach_id
      and i.status in ('draft', 'open', 'uncollectible')
  )
  or exists (
    select 1
    from public.coach_client_relationships r
    where r.coach_id = p_coach_id
      and r.status = 'active'
      and r.acquisition_source = 'platform_sourced'
      and r.acquisition_fee_paid_at is null
      and not exists (
        select 1
        from public.acquisition_invoices i2
        where i2.relationship_id = r.id
          and i2.status = 'paid'
      )
  );
$$;

revoke all on function public.coach_has_unpaid_acquisition(uuid) from public;
grant execute on function public.coach_has_unpaid_acquisition(uuid) to authenticated, service_role;

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

revoke all on function public.acquisition_fee_owed(uuid) from public;
grant execute on function public.acquisition_fee_owed(uuid) to service_role, authenticated;

-- ─── 4. mark_session_paid_offline ────────────────────────────────────────────

create or replace function public.mark_session_paid_offline(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.sessions%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select * into v_row
  from public.sessions s
  where s.id = p_session_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_row.coach_id <> v_uid then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if v_row.payment_status is distinct from 'direct'
     and v_row.payment_status is distinct from 'awaiting_payment'
     and v_row.payment_status is distinct from 'pending'
     and v_row.payment_status is distinct from 'overdue' then
    return jsonb_build_object('success', false, 'error', 'not_markable');
  end if;

  -- Direct-collection coaches mark offline; also allow awaiting_payment fallback
  -- when Connect is unavailable (coach switches to offline).
  update public.sessions
  set payment_status = 'paid_offline',
      updated_at = timezone('utc', now())
  where id = p_session_id;

  return jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'payment_status', 'paid_offline'
  );
end;
$$;

revoke all on function public.mark_session_paid_offline(uuid) from public;
grant execute on function public.mark_session_paid_offline(uuid) to authenticated;

-- ─── 5. Stamp price_amount on accept from service plan ───────────────────────

create or replace function public.accept_booking_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach uuid := auth.uid();
  v_row public.booking_requests%rowtype;
  v_session_id uuid;
  v_now timestamptz := timezone('utc', now());
  v_payment text;
  v_price integer := null;
begin
  if v_coach is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if public.coach_has_unpaid_acquisition(v_coach) then
    return jsonb_build_object('success', false, 'error', 'acquisition_unpaid');
  end if;

  begin
    v_row := public._coach_booking_request_for_update(p_request_id);
  exception
    when others then
      return jsonb_build_object('success', false, 'error', 'not_found');
  end;

  if v_row.status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'not_pending');
  end if;

  if public.client_has_session_conflict(
    v_row.client_id,
    v_row.starts_at,
    v_row.ends_at,
    null
  ) then
    return jsonb_build_object('success', false, 'error', 'slot_busy');
  end if;

  insert into public.coach_client_relationships (
    coach_id,
    client_id,
    organization_id,
    status
  )
  values (
    v_row.coach_id,
    v_row.client_id,
    v_row.organization_id,
    'active'
  )
  on conflict (coach_id, client_id, organization_id) do update
    set status = 'active',
        updated_at = v_now;

  v_payment := public.resolve_session_payment_status(v_row.coach_id, v_row.client_id);

  if v_row.service_plan_id is not null then
    select csp.price_cents into v_price
    from public.coach_service_plans csp
    where csp.id = v_row.service_plan_id
      and csp.coach_id = v_row.coach_id;
  end if;

  if v_payment = 'not_required' then
    v_price := 0;
  end if;

  insert into public.sessions (
    coach_id,
    client_id,
    organization_id,
    title,
    sport_type,
    starts_at,
    ends_at,
    duration_minutes,
    status,
    payment_status,
    price_amount
  )
  values (
    v_row.coach_id,
    v_row.client_id,
    v_row.organization_id,
    v_row.sport_type || ' session',
    v_row.sport_type,
    v_row.starts_at,
    v_row.ends_at,
    v_row.duration_minutes,
    'upcoming',
    v_payment,
    v_price
  )
  returning id into v_session_id;

  update public.booking_requests
  set status = 'accepted',
      session_id = v_session_id,
      reviewed_at = v_now,
      reviewed_by = v_coach,
      decline_reason = null,
      updated_at = v_now
  where id = v_row.id;

  return jsonb_build_object(
    'success', true,
    'request_id', v_row.id,
    'session_id', v_session_id,
    'status', 'accepted',
    'payment_status', v_payment,
    'price_amount', v_price,
    'email_kind', 'booking_accepted'
  );
end;
$$;

revoke all on function public.accept_booking_request(uuid) from public;
grant execute on function public.accept_booking_request(uuid) to authenticated;

-- ─── 6. Guard: never create acquisition invoice for coach_invited ────────────

create or replace function public.create_acquisition_invoice_row(
  p_relationship_id uuid,
  p_amount_cents integer default 1500,
  p_stripe_invoice_id text default null,
  p_hosted_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rel public.coach_client_relationships%rowtype;
  v_id uuid;
begin
  select * into v_rel
  from public.coach_client_relationships
  where id = p_relationship_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_rel.acquisition_source is distinct from 'platform_sourced' then
    return jsonb_build_object('success', false, 'error', 'not_platform_sourced');
  end if;

  insert into public.acquisition_invoices (
    relationship_id,
    coach_id,
    client_id,
    amount_cents,
    status,
    stripe_invoice_id,
    stripe_hosted_invoice_url
  )
  values (
    v_rel.id,
    v_rel.coach_id,
    v_rel.client_id,
    greatest(p_amount_cents, 1),
    case when p_stripe_invoice_id is null then 'draft' else 'open' end,
    p_stripe_invoice_id,
    p_hosted_url
  )
  on conflict (relationship_id) do update
    set stripe_invoice_id = coalesce(excluded.stripe_invoice_id, acquisition_invoices.stripe_invoice_id),
        stripe_hosted_invoice_url = coalesce(excluded.stripe_hosted_invoice_url, acquisition_invoices.stripe_hosted_invoice_url),
        status = case
          when acquisition_invoices.status = 'paid' then 'paid'
          else excluded.status
        end,
        updated_at = timezone('utc', now())
  returning id into v_id;

  return jsonb_build_object('success', true, 'invoice_id', v_id);
end;
$$;

revoke all on function public.create_acquisition_invoice_row(uuid, integer, text, text) from public;
grant execute on function public.create_acquisition_invoice_row(uuid, integer, text, text) to service_role;

create or replace function public.mark_acquisition_invoice_paid(
  p_stripe_invoice_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.acquisition_invoices%rowtype;
begin
  update public.acquisition_invoices
  set status = 'paid',
      paid_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where stripe_invoice_id = p_stripe_invoice_id
  returning * into v_inv;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  update public.coach_client_relationships
  set acquisition_fee_paid_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = v_inv.relationship_id;

  return jsonb_build_object('success', true, 'invoice_id', v_inv.id);
end;
$$;

revoke all on function public.mark_acquisition_invoice_paid(text) from public;
grant execute on function public.mark_acquisition_invoice_paid(text) to service_role;

-- ─── 7. Allow refunded payment_status (webhook charge.refunded) ──────────────

alter table public.sessions
  drop constraint if exists sessions_payment_status_check;

alter table public.sessions
  add constraint sessions_payment_status_check
  check (
    payment_status is null
    or payment_status in (
      'paid',
      'pending',
      'overdue',
      'not_required',
      'awaiting_payment',
      'direct',
      'paid_offline',
      'refunded'
    )
  );
