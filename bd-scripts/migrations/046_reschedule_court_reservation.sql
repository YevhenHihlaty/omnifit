-- Reschedule court reservation atomically (change slot without self-service cancel).

create or replace function public.reschedule_court_reservation(
  p_reservation_id uuid,
  p_new_slot_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reservation public.court_reservations%rowtype;
  v_old_slot public.court_slots%rowtype;
  v_new_slot public.court_slots%rowtype;
  v_court public.courts%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_reservation_id is null then
    return jsonb_build_object('success', false, 'error', 'missing_reservation_id');
  end if;

  if p_new_slot_id is null then
    return jsonb_build_object('success', false, 'error', 'missing_slot_id');
  end if;

  select *
  into v_reservation
  from public.court_reservations r
  where r.id = p_reservation_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'reservation_not_found');
  end if;

  if v_reservation.user_id <> v_uid then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if v_reservation.status <> 'confirmed' then
    return jsonb_build_object('success', false, 'error', 'not_editable');
  end if;

  select *
  into v_old_slot
  from public.court_slots s
  where s.id = v_reservation.slot_id
  for update;

  if v_old_slot.starts_at <= v_now then
    return jsonb_build_object('success', false, 'error', 'slot_already_started');
  end if;

  if p_new_slot_id = v_old_slot.id then
    return jsonb_build_object(
      'success', true,
      'reservation_id', v_reservation.id
    );
  end if;

  select *
  into v_new_slot
  from public.court_slots s
  where s.id = p_new_slot_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'slot_not_found');
  end if;

  if v_new_slot.status <> 'available' then
    return jsonb_build_object('success', false, 'error', 'slot_not_available');
  end if;

  if v_new_slot.starts_at <= v_now then
    return jsonb_build_object('success', false, 'error', 'slot_in_past');
  end if;

  select *
  into v_court
  from public.courts c
  where c.id = v_new_slot.court_id;

  if not v_court.is_active then
    return jsonb_build_object('success', false, 'error', 'court_inactive');
  end if;

  if v_court.organization_id <> v_reservation.organization_id then
    return jsonb_build_object('success', false, 'error', 'org_mismatch');
  end if;

  if not exists (
    select 1
    from public.organizations o
    join public.organization_places op
      on op.organization_id = o.id
     and op.place_id = v_court.place_id
    where o.id = v_court.organization_id
      and o.kind = 'team'
      and o.rocketplay_enabled = true
      and op.is_published = true
  ) then
    return jsonb_build_object('success', false, 'error', 'org_not_bookable');
  end if;

  update public.court_reservations
  set slot_id = v_new_slot.id,
      place_id = v_court.place_id
  where id = v_reservation.id;

  update public.court_slots
  set status = 'available'
  where id = v_old_slot.id;

  update public.court_slots
  set status = 'booked'
  where id = v_new_slot.id;

  return jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation.id
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'slot_already_booked');
end;
$$;

revoke all on function public.reschedule_court_reservation(uuid, uuid) from public;
grant execute on function public.reschedule_court_reservation(uuid, uuid) to authenticated;
