-- pgTAP: MVP schema presence after 093–096
-- Requires: create extension pgtap;

begin;
select plan(12);

select has_table('public', 'weekly_checkins', 'weekly_checkins exists');
select has_table('public', 'notifications', 'notifications exists');
select has_table('public', 'exercises', 'exercises exists');
select has_table('public', 'payments', 'payments exists');

select has_column('public', 'sessions', 'cal_com_booking_id', 'cal.com stub column');
select has_column('public', 'coach_client_relationships', 'acquisition_source', 'acquisition_source column');

select col_is_pk('public', 'weekly_checkins', 'id');
select col_is_pk('public', 'notifications', 'id');
select col_is_pk('public', 'exercises', 'id');

select has_function('public', 'enqueue_notification', 'enqueue_notification helper');
select has_function('public', 'acquisition_fee_owed', 'acquisition_fee_owed helper');
select has_function('public', 'prevent_acquisition_source_mutation', 'acquisition immutability trigger fn');

select * from finish();
rollback;
