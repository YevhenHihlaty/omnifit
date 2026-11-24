-- 096_payment_invite_invariants.sql
-- Guard acquisition_source immutability; document payments write path; optional Cal.com stub.

-- 1) acquisition_source is immutable after insert
create or replace function public.prevent_acquisition_source_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.acquisition_source is distinct from old.acquisition_source then
    raise exception 'acquisition_source is immutable'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists coach_client_relationships_acquisition_immutable
  on public.coach_client_relationships;
create trigger coach_client_relationships_acquisition_immutable
  before update on public.coach_client_relationships
  for each row execute function public.prevent_acquisition_source_mutation();

-- 2) Explicit deny for authenticated writes on payments (SELECT-only policies exist)
-- Postgres RLS: no INSERT policy ⇒ INSERT denied for authenticated. Document via comment.
comment on table public.payments is
  'Stripe payment records. SELECT by coach/client; INSERT/UPDATE only via service_role webhook handlers.';

-- 3) Future Cal.com linkage (nullable stub — unused until Cal.com integration)
alter table public.sessions
  add column if not exists cal_com_booking_id text;

create unique index if not exists sessions_cal_com_booking_id_idx
  on public.sessions (cal_com_booking_id)
  where cal_com_booking_id is not null;

comment on column public.sessions.cal_com_booking_id is
  'Optional Cal.com booking uid when scheduling sync ships. Null for native booking_requests flow.';

-- 4) Re-assert acquisition_fee_owed is service_role only
revoke execute on function public.acquisition_fee_owed(uuid) from anon, authenticated, public;
grant execute on function public.acquisition_fee_owed(uuid) to service_role;
