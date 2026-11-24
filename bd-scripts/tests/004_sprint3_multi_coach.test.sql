-- pgTAP: Sprint 3 — multi-coach invites, roster cap, class A/B, lockdown (099–102)
-- Run: npm run test:bd

begin;
select plan(19);

-- ── Schema / lockdown presence ────────────────────────────────────────────────

select has_function('public', 'revoke_client_invite',
  'revoke_client_invite exists');

select has_function('public', 'resend_client_invite',
  'resend_client_invite exists');

select has_function('public', 'list_client_coaches',
  'list_client_coaches exists');

select has_function('public', 'client_leave_coach',
  'client_leave_coach exists');

select has_function('public', 'get_coach_roster_usage',
  'get_coach_roster_usage exists');

select hasnt_column('public', 'coach_client_relationships', 'is_primary',
  'no is_primary column on coach_client_relationships');

select ok(
  not has_function_privilege(
    'authenticated',
    'public.client_join_coach_roster(text)',
    'execute'
  ),
  'authenticated cannot execute client_join_coach_roster'
);

-- ── Fixtures ──────────────────────────────────────────────────────────────────

create temp table _s3 (key text primary key, val text) on commit drop;

do $$
declare
  coach_a uuid := 'bbbbbbbb-0000-0000-0000-0000000000a1'::uuid;
  coach_b uuid := 'bbbbbbbb-0000-0000-0000-0000000000b1'::uuid;
  client_c uuid := 'bbbbbbbb-0000-0000-0000-0000000000c1'::uuid;
  filler1 uuid := 'bbbbbbbb-0000-0000-0000-0000000000f1'::uuid;
  filler2 uuid := 'bbbbbbbb-0000-0000-0000-0000000000f2'::uuid;
  filler3 uuid := 'bbbbbbbb-0000-0000-0000-0000000000f3'::uuid;
  org_a uuid := 'bbbbbbbb-0000-0000-0000-0000000000oa'::uuid;
  org_b uuid := 'bbbbbbbb-0000-0000-0000-0000000000ob'::uuid;
  invite_pending uuid;
  invite_revoked uuid;
  invite_expired uuid;
  meal_id uuid;
  note_a uuid;
  note_b uuid;
  workout_id uuid;
  v_result jsonb;
  v_token text := 's3-pending-token-aaaaaaaaaaaaaaaa';
  v_revoked_token text := 's3-revoked-token-bbbbbbbbbbbbbb';
  v_expired_token text := 's3-expired-token-cccccccccccccccc';
begin
  delete from public.coach_notes where coach_id in (coach_a, coach_b);
  delete from public.meal_items mi using public.meals m
    where mi.meal_id = m.id and m.client_id = client_c;
  delete from public.meals where client_id = client_c;
  delete from public.workout_sets ws using public.workouts w
    where ws.workout_id = w.id and w.client_id = client_c;
  delete from public.workouts where client_id = client_c;
  delete from public.client_invites where coach_id in (coach_a, coach_b);
  delete from public.coach_client_relationships
    where coach_id in (coach_a, coach_b, filler1, filler2, filler3)
       or client_id in (client_c, filler1, filler2, filler3);
  delete from public.coach_profiles where user_id in (coach_a, coach_b);
  delete from public.organization_members where organization_id in (org_a, org_b);
  delete from public.organizations where id in (org_a, org_b);
  delete from public.client_profiles
    where user_id in (client_c, filler1, filler2, filler3);
  delete from public.profiles
    where id in (coach_a, coach_b, client_c, filler1, filler2, filler3);
  delete from auth.users
    where id in (coach_a, coach_b, client_c, filler1, filler2, filler3);

  insert into auth.users (id, instance_id, email, encrypted_password, aud, role)
  values
    (coach_a, '00000000-0000-0000-0000-000000000000', 's3_coach_a@t.invalid', 'x', 'authenticated', 'authenticated'),
    (coach_b, '00000000-0000-0000-0000-000000000000', 's3_coach_b@t.invalid', 'x', 'authenticated', 'authenticated'),
    (client_c, '00000000-0000-0000-0000-000000000000', 's3_client@t.invalid', 'x', 'authenticated', 'authenticated'),
    (filler1, '00000000-0000-0000-0000-000000000000', 's3_f1@t.invalid', 'x', 'authenticated', 'authenticated'),
    (filler2, '00000000-0000-0000-0000-000000000000', 's3_f2@t.invalid', 'x', 'authenticated', 'authenticated'),
    (filler3, '00000000-0000-0000-0000-000000000000', 's3_f3@t.invalid', 'x', 'authenticated', 'authenticated');

  insert into public.profiles (id, email, role, display_name, phone_e164)
  values
    (coach_a, 's3_coach_a@t.invalid', 'coach', 'Coach A', null),
    (coach_b, 's3_coach_b@t.invalid', 'coach', 'Coach B', null),
    (client_c, 's3_client@t.invalid', 'client', 'Shared Client', '+48111222333'),
    (filler1, 's3_f1@t.invalid', 'client', 'Filler 1', null),
    (filler2, 's3_f2@t.invalid', 'client', 'Filler 2', null),
    (filler3, 's3_f3@t.invalid', 'client', 'Filler 3', null);

  insert into public.client_profiles (user_id)
  values (client_c), (filler1), (filler2), (filler3);

  insert into public.organizations (id, name, kind, owner_id)
  values
    (org_a, 'Coach A Personal', 'personal', coach_a),
    (org_b, 'Coach B Personal', 'personal', coach_b);

  insert into public.organization_members (organization_id, user_id, role)
  values
    (org_a, coach_a, 'owner'),
    (org_b, coach_b, 'owner');

  insert into public.coach_profiles (
    user_id, current_organization_id, source_organization_id, personal_subscription_tier
  )
  values
    (coach_a, org_a, org_a, 'free'),
    (coach_b, org_b, org_b, 'free');

  -- Dual roster: same client email + phone on both coaches
  insert into public.coach_client_relationships (
    coach_id, client_id, organization_id, status, acquisition_source
  )
  values
    (coach_a, client_c, org_a, 'active', 'coach_invited'),
    (coach_b, client_c, org_b, 'active', 'coach_invited');

  -- Class A meal + workout logged by coach A
  insert into public.meals (id, client_id, meal_type, logged_at)
  values (gen_random_uuid(), client_c, 'lunch', timezone('utc', now()))
  returning id into meal_id;

  insert into public.workouts (id, client_id, logged_by_id, sport_type, source)
  values (gen_random_uuid(), client_c, coach_a, 'weight_lifting', 'coach_offline')
  returning id into workout_id;

  -- Class B notes (one per coach)
  insert into public.coach_notes (id, coach_id, client_id, title, body)
  values
    (gen_random_uuid(), coach_a, client_c, 'A private', 'secret A'),
    (gen_random_uuid(), coach_b, client_c, 'B private', 'secret B')
  returning id into note_b; -- last only; store both via selects later

  select id into note_a from public.coach_notes
    where coach_id = coach_a and client_id = client_c limit 1;
  select id into note_b from public.coach_notes
    where coach_id = coach_b and client_id = client_c limit 1;

  -- Invites for token tests (coach B pending / revoked / expired)
  insert into public.client_invites (
    id, coach_id, organization_id, email, token_hash, expires_at, status
  )
  values (
    gen_random_uuid(), coach_b, org_b, 's3_new@t.invalid',
    public.hash_invite_token(v_token),
    timezone('utc', now()) + interval '7 days',
    'pending'
  )
  returning id into invite_pending;

  insert into public.client_invites (
    id, coach_id, organization_id, email, token_hash, expires_at, status, revoked_at
  )
  values (
    gen_random_uuid(), coach_b, org_b, 's3_revoked@t.invalid',
    public.hash_invite_token(v_revoked_token),
    timezone('utc', now()) + interval '7 days',
    'revoked',
    timezone('utc', now())
  )
  returning id into invite_revoked;

  insert into public.client_invites (
    id, coach_id, organization_id, email, token_hash, expires_at, status
  )
  values (
    gen_random_uuid(), coach_b, org_b, 's3_expired@t.invalid',
    public.hash_invite_token(v_expired_token),
    timezone('utc', now()) - interval '1 day',
    'pending'
  )
  returning id into invite_expired;

  -- Fill coach A to free-tier limit (already has client_c; add 2 more = 3)
  insert into public.coach_client_relationships (
    coach_id, client_id, organization_id, status, acquisition_source
  )
  values
    (coach_a, filler1, org_a, 'active', 'coach_invited'),
    (coach_a, filler2, org_a, 'active', 'coach_invited');

  insert into _s3 values
    ('coach_a', coach_a::text),
    ('coach_b', coach_b::text),
    ('client_c', client_c::text),
    ('meal_id', meal_id::text),
    ('note_a', note_a::text),
    ('note_b', note_b::text),
    ('workout_id', workout_id::text),
    ('pending_token', v_token),
    ('revoked_token', v_revoked_token),
    ('expired_token', v_expired_token),
    ('filler3', filler3::text);
end;
$$;

-- ── Dual roster ───────────────────────────────────────────────────────────────

select is(
  (
    select count(*)::int
    from public.coach_client_relationships
    where client_id = 'bbbbbbbb-0000-0000-0000-0000000000c1'::uuid
      and status = 'active'
  ),
  2,
  'same client on two coach rosters'
);

-- ── Class B isolation (RLS as coach B) ────────────────────────────────────────

do $$
declare
  cnt int;
begin
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-0000000000b1', true);
  set local role authenticated;
  select count(*)::int into cnt
  from public.coach_notes
  where id = (select val::uuid from _s3 where key = 'note_a');
  reset role;
  insert into _s3 values ('class_b_iso', cnt::text)
  on conflict (key) do update set val = excluded.val;
end;
$$;

select is((select val from _s3 where key = 'class_b_iso'), '0',
  'coach B cannot read coach A private notes');

-- ── Class A shared meal readable by coach B ───────────────────────────────────

do $$
declare
  cnt int;
begin
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-0000000000b1', true);
  set local role authenticated;
  select count(*)::int into cnt
  from public.meals
  where id = (select val::uuid from _s3 where key = 'meal_id');
  reset role;
  insert into _s3 values ('class_a_meal', cnt::text)
  on conflict (key) do update set val = excluded.val;
end;
$$;

select is((select val from _s3 where key = 'class_a_meal'), '1',
  'coach B can read shared class-A meal');

-- ── Attribution: coach B sees workout logged by coach A ───────────────────────

do $$
declare
  lid text;
begin
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-0000000000b1', true);
  set local role authenticated;
  select logged_by_id::text into lid
  from public.workouts
  where id = (select val::uuid from _s3 where key = 'workout_id');
  reset role;
  insert into _s3 values ('attr_logged_by', coalesce(lid, 'null'))
  on conflict (key) do update set val = excluded.val;
end;
$$;

select is(
  (select val from _s3 where key = 'attr_logged_by'),
  'bbbbbbbb-0000-0000-0000-0000000000a1',
  'coach B sees workout attribution logged_by coach A'
);

-- ── Revoked / expired tokens create no relationship ───────────────────────────

select is(
  (
    select (public.get_client_invite_preview(
      (select val from _s3 where key = 'revoked_token')
    )->>'error')
  ),
  'revoked',
  'revoked invite preview returns revoked'
);

select is(
  (
    select (public.get_client_invite_preview(
      (select val from _s3 where key = 'expired_token')
    )->>'error')
  ),
  'expired',
  'expired invite preview returns expired'
);

do $$
declare
  v_client uuid := 'bbbbbbbb-0000-0000-0000-0000000000c1'::uuid;
  v_before int;
  v_after int;
  v_result jsonb;
begin
  select count(*) into v_before
  from public.coach_client_relationships
  where client_id = v_client;

  perform set_config('request.jwt.claim.sub', v_client::text, true);

  v_result := public.accept_client_invite(
    (select val from _s3 where key = 'revoked_token')
  );

  select count(*) into v_after
  from public.coach_client_relationships
  where client_id = v_client;

  insert into _s3 values
    ('revoked_accept_ok', case when (v_result->>'success') = 'false' and v_before = v_after then '1' else '0' end);
end;
$$;

select is(
  (select val from _s3 where key = 'revoked_accept_ok'),
  '1',
  'accept revoked invite fails and creates no relationship'
);

-- ── Cap blocks 4th invite ─────────────────────────────────────────────────────

do $$
declare
  coach_a uuid := 'bbbbbbbb-0000-0000-0000-0000000000a1'::uuid;
  v_result jsonb;
begin
  perform set_config('request.jwt.claim.sub', coach_a::text, true);

  v_result := public.create_client_invite(
    's3_fourth@t.invalid',
    public.hash_invite_token('s3-fourth-invite-token'),
    timezone('utc', now()) + interval '7 days'
  );

  insert into _s3 values
    ('cap_block', coalesce(v_result->>'error', 'none'));
end;
$$;

select is(
  (select val from _s3 where key = 'cap_block'),
  'roster_limit_reached',
  '4th invite blocked when free tier has 3 active clients'
);

-- ── list_client_coaches — no is_primary, two peers ────────────────────────────

do $$
declare
  client_c uuid := 'bbbbbbbb-0000-0000-0000-0000000000c1'::uuid;
  v_result jsonb;
begin
  perform set_config('request.jwt.claim.sub', client_c::text, true);
  v_result := public.list_client_coaches();
  insert into _s3 values
    ('list_ok', case when (v_result->>'success') = 'true' then '1' else '0' end),
    ('list_count', jsonb_array_length(v_result->'coaches')::text),
    ('list_has_primary', case when v_result::text like '%is_primary%' then '1' else '0' end);
end;
$$;

select is((select val from _s3 where key = 'list_ok'), '1',
  'list_client_coaches succeeds for client');

select is((select val from _s3 where key = 'list_count'), '2',
  'list_client_coaches returns two equal peers');

select is((select val from _s3 where key = 'list_has_primary'), '0',
  'list_client_coaches JSON has no is_primary');

-- ── client_leave_coach archives one pairing ───────────────────────────────────

do $$
declare
  client_c uuid := 'bbbbbbbb-0000-0000-0000-0000000000c1'::uuid;
  coach_b uuid := 'bbbbbbbb-0000-0000-0000-0000000000b1'::uuid;
  v_result jsonb;
begin
  perform set_config('request.jwt.claim.sub', client_c::text, true);
  v_result := public.client_leave_coach(coach_b);
  insert into _s3 values
    ('leave_ok', case when (v_result->>'success') = 'true'
      and (v_result->>'status') = 'archived' then '1' else '0' end);
end;
$$;

select is((select val from _s3 where key = 'leave_ok'), '1',
  'client_leave_coach archives the pairing');

select * from finish();
rollback;
