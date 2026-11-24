-- pgTAP: Sprint 4 — coach roster, snapshot, archive/restore, dashboard (102b)
-- Run: npm run test:bd

begin;
select plan(16);

-- ── Function presence ─────────────────────────────────────────────────────────

select has_function('public', 'client_activity_streak',
  'client_activity_streak exists');

select has_function('public', 'client_status_bucket',
  'client_status_bucket exists');

select has_function('public', 'list_coach_clients',
  'list_coach_clients exists');

select has_function('public', 'get_coach_client_snapshot',
  'get_coach_client_snapshot exists');

select has_function('public', 'coach_archive_client',
  'coach_archive_client exists');

select has_function('public', 'coach_restore_client',
  'coach_restore_client exists');

select has_function('public', 'get_coach_dashboard_summary',
  'get_coach_dashboard_summary exists');

-- ── Fixtures ──────────────────────────────────────────────────────────────────

create temp table _s4 (key text primary key, val text) on commit drop;

do $$
declare
  coach_a uuid := 'cccccccc-0000-0000-0000-0000000000a1'::uuid;
  coach_b uuid := 'cccccccc-0000-0000-0000-0000000000b1'::uuid;
  client_c uuid := 'cccccccc-0000-0000-0000-0000000000c1'::uuid;
  client_b_only uuid := 'cccccccc-0000-0000-0000-0000000000b2'::uuid;
  filler1 uuid := 'cccccccc-0000-0000-0000-0000000000f1'::uuid;
  filler2 uuid := 'cccccccc-0000-0000-0000-0000000000f2'::uuid;
  filler3 uuid := 'cccccccc-0000-0000-0000-0000000000f3'::uuid;
  org_a uuid := 'cccccccc-0000-0000-0000-0000000000oa'::uuid;
  org_b uuid := 'cccccccc-0000-0000-0000-0000000000ob'::uuid;
  food_id uuid := 'cccccccc-0000-0000-0000-0000000000fd'::uuid;
  meal_id uuid;
  habit_a uuid;
  habit_b uuid;
begin
  delete from public.habit_completions where client_id in (client_c, client_b_only);
  delete from public.daily_habits where client_id in (client_c, client_b_only);
  delete from public.client_nutrition_targets where client_id in (client_c, client_b_only);
  delete from public.coach_notes where coach_id in (coach_a, coach_b);
  delete from public.meal_items mi using public.meals m
    where mi.meal_id = m.id and m.client_id in (client_c, client_b_only);
  delete from public.meals where client_id in (client_c, client_b_only);
  delete from public.workouts where client_id in (client_c, client_b_only);
  delete from public.body_metrics where client_id in (client_c, client_b_only);
  delete from public.weekly_checkins where client_id in (client_c, client_b_only);
  delete from public.sessions where coach_id in (coach_a, coach_b);
  delete from public.coach_client_relationships
    where coach_id in (coach_a, coach_b)
       or client_id in (client_c, client_b_only, filler1, filler2, filler3);
  delete from public.food_products where id = food_id;
  delete from public.coach_profiles where user_id in (coach_a, coach_b);
  delete from public.organization_members where organization_id in (org_a, org_b);
  delete from public.organizations where id in (org_a, org_b);
  delete from public.client_profiles
    where user_id in (client_c, client_b_only, filler1, filler2, filler3);
  delete from public.profiles
    where id in (coach_a, coach_b, client_c, client_b_only, filler1, filler2, filler3);
  delete from auth.users
    where id in (coach_a, coach_b, client_c, client_b_only, filler1, filler2, filler3);

  insert into auth.users (id, instance_id, email, encrypted_password, aud, role)
  values
    (coach_a, '00000000-0000-0000-0000-000000000000', 's4_coach_a@t.invalid', 'x', 'authenticated', 'authenticated'),
    (coach_b, '00000000-0000-0000-0000-000000000000', 's4_coach_b@t.invalid', 'x', 'authenticated', 'authenticated'),
    (client_c, '00000000-0000-0000-0000-000000000000', 's4_client@t.invalid', 'x', 'authenticated', 'authenticated'),
    (client_b_only, '00000000-0000-0000-0000-000000000000', 's4_b_only@t.invalid', 'x', 'authenticated', 'authenticated'),
    (filler1, '00000000-0000-0000-0000-000000000000', 's4_f1@t.invalid', 'x', 'authenticated', 'authenticated'),
    (filler2, '00000000-0000-0000-0000-000000000000', 's4_f2@t.invalid', 'x', 'authenticated', 'authenticated'),
    (filler3, '00000000-0000-0000-0000-000000000000', 's4_f3@t.invalid', 'x', 'authenticated', 'authenticated');

  insert into public.profiles (id, email, role, display_name)
  values
    (coach_a, 's4_coach_a@t.invalid', 'coach', 'Coach A'),
    (coach_b, 's4_coach_b@t.invalid', 'coach', 'Coach B'),
    (client_c, 's4_client@t.invalid', 'client', 'Shared Client'),
    (client_b_only, 's4_b_only@t.invalid', 'client', 'B Only'),
    (filler1, 's4_f1@t.invalid', 'client', 'Filler 1'),
    (filler2, 's4_f2@t.invalid', 'client', 'Filler 2'),
    (filler3, 's4_f3@t.invalid', 'client', 'Filler 3');

  insert into public.client_profiles (user_id, goal)
  values (client_c, 'Build muscle'), (client_b_only, null),
         (filler1, null), (filler2, null), (filler3, null);

  insert into public.organizations (id, name, kind, owner_id)
  values
    (org_a, 'S4 Coach A', 'personal', coach_a),
    (org_b, 'S4 Coach B', 'personal', coach_b);

  insert into public.organization_members (organization_id, user_id, role)
  values (org_a, coach_a, 'owner'), (org_b, coach_b, 'owner');

  insert into public.coach_profiles (
    user_id, current_organization_id, source_organization_id, personal_subscription_tier
  )
  values
    (coach_a, org_a, org_a, 'free'),
    (coach_b, org_b, org_b, 'free');

  -- Shared client on both coaches + B-only client
  insert into public.coach_client_relationships (
    coach_id, client_id, organization_id, status, acquisition_source
  )
  values
    (coach_a, client_c, org_a, 'active', 'coach_invited'),
    (coach_b, client_c, org_b, 'active', 'coach_invited'),
    (coach_b, client_b_only, org_b, 'active', 'coach_invited');

  -- Cap fillers for coach A (client_c + 2 = 3)
  insert into public.coach_client_relationships (
    coach_id, client_id, organization_id, status, acquisition_source
  )
  values
    (coach_a, filler1, org_a, 'active', 'coach_invited'),
    (coach_a, filler2, org_a, 'active', 'coach_invited');

  -- Food: 100 kcal/serving × 2 servings = 200 kcal today
  insert into public.food_products (
    id, name, barcode, barcode_type, calories_kcal, source, created_by
  )
  values (food_id, 'S4 Test Food', '9990000000001', 'ean13', 100, 'seed', coach_a);

  insert into public.meals (id, client_id, meal_type, logged_at)
  values (gen_random_uuid(), client_c, 'lunch', timezone('utc', now()))
  returning id into meal_id;

  insert into public.meal_items (meal_id, product_id, quantity_servings)
  values (meal_id, food_id, 2);

  -- 3-day streak (today, yesterday, day-2)
  insert into public.workouts (client_id, logged_by_id, sport_type, source, logged_at)
  values
    (client_c, client_c, 'running', 'client_self', timezone('utc', now()) - interval '1 day'),
    (client_c, client_c, 'running', 'client_self', timezone('utc', now()) - interval '2 days');

  -- Class-B habits + targets
  insert into public.client_nutrition_targets (client_id, coach_id, calories_kcal)
  values (client_c, coach_a, 2200), (client_c, coach_b, 1800);

  insert into public.daily_habits (id, client_id, coach_id, title, target_value, unit)
  values
    (gen_random_uuid(), client_c, coach_a, 'A water', 2, 'liters'),
    (gen_random_uuid(), client_c, coach_b, 'B steps', 8000, 'count')
  returning id into habit_b;

  select id into habit_a from public.daily_habits
    where coach_id = coach_a and client_id = client_c limit 1;
  select id into habit_b from public.daily_habits
    where coach_id = coach_b and client_id = client_c limit 1;

  insert into public.coach_notes (coach_id, client_id, title, body)
  values
    (coach_a, client_c, 'A note', 'private A body'),
    (coach_b, client_c, 'B note', 'private B body');

  insert into _s4 values
    ('coach_a', coach_a::text),
    ('coach_b', coach_b::text),
    ('client_c', client_c::text),
    ('client_b_only', client_b_only::text),
    ('filler3', filler3::text),
    ('habit_a', habit_a::text),
    ('habit_b', habit_b::text),
    ('org_a', org_a::text);
end;
$$;

-- ── Roster scoping ────────────────────────────────────────────────────────────

do $$
declare
  v_result jsonb;
  v_ids text;
begin
  perform set_config('request.jwt.claim.sub', (select val from _s4 where key = 'coach_a'), true);
  set local role authenticated;
  v_result := public.list_coach_clients('active', null, 'UTC');
  reset role;
  select string_agg(c->>'client_id', ',' order by c->>'client_id')
  into v_ids
  from jsonb_array_elements(v_result->'clients') c;
  insert into _s4 values ('roster_a', coalesce(v_ids, ''))
  on conflict (key) do update set val = excluded.val;
  insert into _s4 values ('roster_a_ok', (v_result->>'success'))
  on conflict (key) do update set val = excluded.val;
  insert into _s4 values (
    'roster_a_has_b_only',
    case when v_ids like '%' || (select val from _s4 where key = 'client_b_only') || '%'
      then 'yes' else 'no' end
  ) on conflict (key) do update set val = excluded.val;
end;
$$;

select is((select val from _s4 where key = 'roster_a_ok'), 'true',
  'list_coach_clients succeeds for coach A');

select is((select val from _s4 where key = 'roster_a_has_b_only'), 'no',
  'coach A roster omits coach B exclusive client');

-- ── Snapshot calories + class-B isolation ─────────────────────────────────────

do $$
declare
  v_result jsonb;
  v_kcal text;
  v_habit_titles text;
  v_note text;
begin
  perform set_config('request.jwt.claim.sub', (select val from _s4 where key = 'coach_a'), true);
  set local role authenticated;
  v_result := public.get_coach_client_snapshot(
    (select val::uuid from _s4 where key = 'client_c'),
    'UTC'
  );
  reset role;
  v_kcal := v_result->'calories'->>'consumed_kcal';
  select string_agg(h->>'title', ',') into v_habit_titles
  from jsonb_array_elements(v_result->'habits') h;
  v_note := v_result->'coach_note'->>'body';
  insert into _s4 values
    ('snap_ok', v_result->>'success'),
    ('snap_kcal', coalesce(v_kcal, '')),
    ('snap_habits', coalesce(v_habit_titles, '')),
    ('snap_note', coalesce(v_note, '')),
    ('snap_target', coalesce(v_result->'calories'->>'target_kcal', ''))
  on conflict (key) do update set val = excluded.val;
end;
$$;

select is((select val from _s4 where key = 'snap_ok'), 'true',
  'snapshot succeeds for active pairing');

select is((select val from _s4 where key = 'snap_kcal'), '200',
  'snapshot calories_today = 2 servings × 100 kcal');

select ok(
  (select val from _s4 where key = 'snap_habits') = 'A water'
  and (select val from _s4 where key = 'snap_habits') not like '%B steps%',
  'snapshot habits are class-B (coach A only)'
);

select is((select val from _s4 where key = 'snap_note'), 'private A body',
  'snapshot note is coach A class-B note');

select is((select val from _s4 where key = 'snap_target'), '2200',
  'snapshot nutrition target is coach A class-B target');

-- Forbidden for non-paired / archived handled via B-only client as coach A
do $$
declare
  v_result jsonb;
begin
  perform set_config('request.jwt.claim.sub', (select val from _s4 where key = 'coach_a'), true);
  set local role authenticated;
  v_result := public.get_coach_client_snapshot(
    (select val::uuid from _s4 where key = 'client_b_only'),
    'UTC'
  );
  reset role;
  insert into _s4 values ('snap_forbidden', v_result->>'error')
  on conflict (key) do update set val = excluded.val;
end;
$$;

select is((select val from _s4 where key = 'snap_forbidden'), 'forbidden',
  'snapshot forbidden for unpaired client');

-- Streak is tested via snapshot RPC (helpers are not granted to authenticated)
do $$
declare
  v_result jsonb;
begin
  perform set_config('request.jwt.claim.sub', (select val from _s4 where key = 'coach_a'), true);
  set local role authenticated;
  v_result := public.get_coach_client_snapshot(
    (select val::uuid from _s4 where key = 'client_c'),
    'UTC'
  );
  reset role;
  insert into _s4 values ('snap_streak', coalesce(v_result->'stats'->>'streak_days', ''))
  on conflict (key) do update set val = excluded.val;
end;
$$;

select is((select val from _s4 where key = 'snap_streak'), '3',
  'activity streak is 3 for today+2 prior workout days');

-- ── Archive frees Free slot; restore at cap fails ─────────────────────────────

do $$
declare
  v_can_before boolean;
  v_can_after boolean;
  v_arch jsonb;
  v_rest jsonb;
  v_coach uuid := (select val::uuid from _s4 where key = 'coach_a');
  v_client uuid := (select val::uuid from _s4 where key = 'client_c');
begin
  v_can_before := public.coach_can_add_client(v_coach);

  perform set_config('request.jwt.claim.sub', v_coach::text, true);
  set local role authenticated;
  v_arch := public.coach_archive_client(v_client);
  reset role;

  v_can_after := public.coach_can_add_client(v_coach);

  -- Fill the freed slot with filler3 so restore hits cap
  insert into public.coach_client_relationships (
    coach_id, client_id, organization_id, status, acquisition_source
  )
  values (
    v_coach,
    (select val::uuid from _s4 where key = 'filler3'),
    (select val::uuid from _s4 where key = 'org_a'),
    'active',
    'coach_invited'
  );

  perform set_config('request.jwt.claim.sub', v_coach::text, true);
  set local role authenticated;
  v_rest := public.coach_restore_client(v_client);
  reset role;

  insert into _s4 values
    ('can_before', v_can_before::text),
    ('arch_ok', v_arch->>'success'),
    ('can_after', v_can_after::text),
    ('rest_err', coalesce(v_rest->>'error', '')),
    ('rest_ok', coalesce(v_rest->>'success', ''))
  on conflict (key) do update set val = excluded.val;
end;
$$;

select is((select val from _s4 where key = 'can_before'), 'false',
  'coach A at free cap before archive');

select is((select val from _s4 where key = 'arch_ok'), 'true',
  'archive succeeds');

select is((select val from _s4 where key = 'can_after'), 'true',
  'archive frees a Free-tier slot');

select is((select val from _s4 where key = 'rest_err'), 'roster_limit_reached',
  'restore at cap returns roster_limit_reached');

select * from finish();
rollback;
