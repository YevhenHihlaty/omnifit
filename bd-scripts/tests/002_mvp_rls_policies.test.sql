-- pgTAP: RLS smoke — policies exist on MVP tables
-- Full auth.uid() impersonation tests need seeded auth users; this asserts policies are present.

begin;
select plan(10);

select policies_are(
  'public',
  'weekly_checkins',
  array[
    'weekly_checkins_select_own',
    'weekly_checkins_insert_own',
    'weekly_checkins_update_own',
    'weekly_checkins_delete_own'
  ],
  'weekly_checkins RLS policies'
);

select policies_are(
  'public',
  'notifications',
  array[
    'notifications_select_own',
    'notifications_update_own'
  ],
  'notifications RLS policies (no authenticated insert)'
);

select policies_are(
  'public',
  'exercises',
  array[
    'exercises_select_visible',
    'exercises_insert_own',
    'exercises_update_own',
    'exercises_delete_own'
  ],
  'exercises RLS policies'
);

select policies_are(
  'public',
  'payments',
  array[
    'payments_select_coach',
    'payments_select_client'
  ],
  'payments SELECT-only for authenticated'
);

select isnt_empty(
  $$
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organizations'
      and policyname = 'organizations_select_member'
  $$,
  'organizations_select_member present'
);

select is(
  (
    select count(*)::int
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organizations'
      and policyname = 'organizations_select_active_member'
  ),
  0,
  'legacy organizations_select_active_member removed (merged)'
);

-- Spot-check wrapped auth.uid() on a critical policy
select ok(
  (
    select coalesce(qual, '') like '%(select auth.uid())%'
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'payments_select_coach'
  ),
  'payments_select_coach uses (select auth.uid())'
);

select ok(
  (
    select replace(coalesce(qual, ''), '(select auth.uid())', '') not like '%auth.uid()%'
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'payments_select_coach'
  ),
  'payments_select_coach has no bare auth.uid()'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgname = 'coach_client_relationships_acquisition_immutable'
  ),
  'acquisition_source immutability trigger exists'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgname = 'progress_photos_notify_coach'
  ),
  'progress photo notification trigger exists'
);

select * from finish();
rollback;
