-- pgTAP: Sprint 2 — phone identity + coach personal org (098 / 098b)
-- Requires: create extension pgtap;  Run: npm run test:bd

begin;
select plan(15);

-- ── Schema presence ───────────────────────────────────────────────────────────

select has_column('public', 'profiles', 'phone_e164',
  'profiles.phone_e164 column exists');

select has_column('public', 'profiles', 'phone_verified_at',
  'profiles.phone_verified_at column exists');

select has_function('public', 'ensure_coach_personal_organization',
  'ensure_coach_personal_organization function exists');

select has_function('public', 'guard_profiles_role',
  'guard_profiles_role trigger function exists');

-- ── Indexes ───────────────────────────────────────────────────────────────────

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename  = 'profiles'
      and indexname  = 'profiles_phone_e164_key'
  ),
  'profiles_phone_e164_key partial unique index exists'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename  = 'organizations'
      and indexname  = 'organizations_personal_owner_uniq'
  ),
  'organizations_personal_owner_uniq partial unique index exists'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgname = 'profiles_role_guard'
  ),
  'profiles_role_guard trigger exists on profiles'
);

-- ── phone_e164 constraints ────────────────────────────────────────────────────

-- Use a temp table to thread results out of DO blocks
create temp table _t_sprint2 (key text primary key, val boolean) on commit drop;

-- Invalid format → check_violation (errcode 23514)
select throws_ok(
  $q$
    do $do$
    declare v uuid := gen_random_uuid();
    begin
      insert into auth.users (id, instance_id, email, encrypted_password, aud, role)
      values (v, '00000000-0000-0000-0000-000000000000',
              v::text||'@t.invalid', 'x', 'authenticated', 'authenticated');
      insert into public.profiles (id, email, phone_e164)
      values (v, v::text||'@t.invalid', '12345678901');  -- missing leading +
    end;
    $do$
  $q$,
  '23514',
  'invalid phone_e164 format raises check_violation'
);

-- Two NULL phones must not collide (partial unique on non-null only)
do $$
declare v1 uuid := gen_random_uuid(); v2 uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, email, encrypted_password, aud, role)
  values (v1,'00000000-0000-0000-0000-000000000000',v1::text||'@t.invalid','x','authenticated','authenticated'),
         (v2,'00000000-0000-0000-0000-000000000000',v2::text||'@t.invalid','x','authenticated','authenticated');
  insert into public.profiles (id, email) values (v1,v1::text||'@t.invalid');
  insert into public.profiles (id, email) values (v2,v2::text||'@t.invalid');
  insert into _t_sprint2 values ('null_phones_ok', true);
exception when others then
  insert into _t_sprint2 values ('null_phones_ok', false);
end;
$$;
select ok((select val from _t_sprint2 where key='null_phones_ok'),
  'two null phone_e164 values do not collide');

-- Duplicate non-null phone → unique_violation (errcode 23505)
select throws_ok(
  $q$
    do $do$
    declare v1 uuid := gen_random_uuid(); v2 uuid := gen_random_uuid();
    begin
      insert into auth.users (id, instance_id, email, encrypted_password, aud, role)
      values (v1,'00000000-0000-0000-0000-000000000000',v1::text||'@t.invalid','x','authenticated','authenticated'),
             (v2,'00000000-0000-0000-0000-000000000000',v2::text||'@t.invalid','x','authenticated','authenticated');
      insert into public.profiles (id, email, phone_e164)
      values (v1, v1::text||'@t.invalid', '+12345678901');
      insert into public.profiles (id, email, phone_e164)
      values (v2, v2::text||'@t.invalid', '+12345678901');  -- duplicate
    end;
    $do$
  $q$,
  '23505',
  'duplicate non-null phone_e164 raises unique_violation'
);

-- ── Role guard ────────────────────────────────────────────────────────────────

-- Setup: create a plain user (no role set) in a DO block.
-- We'll reference their row in the throws_ok via a fixed sub-UUID approach.
do $$
declare v uuid := 'aaaaaaaa-0000-0000-0000-000000000001'::uuid;
begin
  delete from public.profiles where id = v;
  delete from auth.users      where id = v;
  insert into auth.users (id, instance_id, email, encrypted_password, aud, role)
  values (v,'00000000-0000-0000-0000-000000000000','rg_guard@t.invalid','x','authenticated','authenticated');
  insert into public.profiles (id, email)
  values (v,'rg_guard@t.invalid');
end;
$$;

-- Attempt to self-assign role='client' as 'authenticated' → check_violation
select throws_ok(
  $q$
    set local role authenticated;
    update public.profiles
    set role = 'client'
    where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  $q$,
  '23514',
  'authenticated user cannot self-assign role=client'
);

-- Setup: create a coach user with role already set to 'coach'
do $$
declare v uuid := 'aaaaaaaa-0000-0000-0000-000000000002'::uuid;
begin
  delete from public.profiles where id = v;
  delete from auth.users      where id = v;
  insert into auth.users (id, instance_id, email, encrypted_password, aud, role)
  values (v,'00000000-0000-0000-0000-000000000000','rg_immut@t.invalid','x','authenticated','authenticated');
  insert into public.profiles (id, email, role)
  values (v,'rg_immut@t.invalid','coach');
end;
$$;

-- Attempt to change an already-set role as 'authenticated' → check_violation (write-once)
select throws_ok(
  $q$
    set local role authenticated;
    update public.profiles
    set role = 'coach'  -- same value → no-op by Postgres IS DISTINCT FROM, but test with different
    where id = 'aaaaaaaa-0000-0000-0000-000000000002'
      and role = 'coach';

    -- Now try to actually change it
    update public.profiles
    set role = 'client'
    where id = 'aaaaaaaa-0000-0000-0000-000000000002';
  $q$,
  '23514',
  'authenticated user cannot mutate an already-set role (write-once)'
);

-- ── ensure_coach_personal_organization RPC ────────────────────────────────────

-- non-coach rejected
do $$
declare
  v     uuid := 'bbbbbbbb-0000-0000-0000-000000000001'::uuid;
  raised boolean := false;
begin
  delete from public.profiles where id = v;
  delete from auth.users      where id = v;
  insert into auth.users (id, instance_id, email, encrypted_password, aud, role)
  values (v,'00000000-0000-0000-0000-000000000000','nc_test@t.invalid','x','authenticated','authenticated');
  insert into public.profiles (id, email, role)
  values (v,'nc_test@t.invalid','client');
  perform set_config('request.jwt.claim.sub', v::text, true);
  begin
    perform public.ensure_coach_personal_organization();
  exception when check_violation then raised := true;
  end;
  insert into _t_sprint2 values ('non_coach_rejected', raised);
end;
$$;
select ok((select val from _t_sprint2 where key='non_coach_rejected'),
  'non-coach profile rejected by ensure_coach_personal_organization');

-- First call: org created with kind='personal', source_org = current_org
do $$
declare
  v        uuid := 'bbbbbbbb-0000-0000-0000-000000000002'::uuid;
  v_org_id uuid;
  v_kind   text;
  v_src    uuid;
  v_cur    uuid;
begin
  delete from public.profiles where id = v;
  delete from auth.users      where id = v;
  insert into auth.users (id, instance_id, email, encrypted_password, aud, role)
  values (v,'00000000-0000-0000-0000-000000000000','coach1@t.invalid','x','authenticated','authenticated');
  insert into public.profiles (id, email, role)
  values (v,'coach1@t.invalid','coach');
  perform set_config('request.jwt.claim.sub', v::text, true);

  v_org_id := public.ensure_coach_personal_organization('Coach One');

  select o.kind into v_kind from public.organizations o where o.id = v_org_id;
  select cp.source_organization_id, cp.current_organization_id
  into v_src, v_cur
  from public.coach_profiles cp where cp.user_id = v;

  insert into _t_sprint2 values ('org_kind_personal', v_kind = 'personal');
  insert into _t_sprint2 values ('src_eq_cur',        v_src = v_cur and v_src = v_org_id);
end;
$$;
select ok((select val from _t_sprint2 where key='org_kind_personal'),
  'personal org has kind=personal');
select ok((select val from _t_sprint2 where key='src_eq_cur'),
  'source_organization_id = current_organization_id = returned org id');

-- Second call: idempotent — same org returned, no duplicate created
do $$
declare
  v        uuid := 'bbbbbbbb-0000-0000-0000-000000000003'::uuid;
  v_org1   uuid;
  v_org2   uuid;
  v_count  int;
begin
  delete from public.profiles where id = v;
  delete from auth.users      where id = v;
  insert into auth.users (id, instance_id, email, encrypted_password, aud, role)
  values (v,'00000000-0000-0000-0000-000000000000','coach2@t.invalid','x','authenticated','authenticated');
  insert into public.profiles (id, email, role)
  values (v,'coach2@t.invalid','coach');
  perform set_config('request.jwt.claim.sub', v::text, true);

  v_org1 := public.ensure_coach_personal_organization('Coach Two');
  v_org2 := public.ensure_coach_personal_organization('Coach Two');

  select count(*) into v_count
  from public.organizations
  where owner_id = v and kind = 'personal';

  insert into _t_sprint2 values ('idempotent_same_id',    v_org1 = v_org2);
  insert into _t_sprint2 values ('idempotent_single_org', v_count = 1);
end;
$$;
select ok((select val from _t_sprint2 where key='idempotent_same_id'),
  'second call returns same org_id');
select ok((select val from _t_sprint2 where key='idempotent_single_org'),
  'exactly one personal org created across two calls');

select * from finish();
rollback;
