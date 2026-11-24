-- 098_phone_identity.sql — phone identity fields on profiles
-- phone-match RPC deferred to Sprint 3 / migration 099

alter table public.profiles
  add column if not exists phone_e164 text
    constraint profiles_phone_e164_format_chk
      check (phone_e164 is null or phone_e164 ~ '^\+[1-9]\d{7,14}$');

-- Nullable; unused in MVP — architect requested for Sprint 3/9 phone-match flow
alter table public.profiles
  add column if not exists phone_verified_at timestamptz;

-- Partial unique: only non-null phones must be unique; NULLs do not collide
create unique index if not exists profiles_phone_e164_key
  on public.profiles (phone_e164)
  where phone_e164 is not null;

comment on column public.profiles.phone_e164 is
  'E.164-normalised phone (+[country][number], 8–15 digits). Null = not supplied.';
comment on column public.profiles.phone_verified_at is
  'Timestamp of OTP verification for phone_e164. Null = unverified. Unused in MVP.';
