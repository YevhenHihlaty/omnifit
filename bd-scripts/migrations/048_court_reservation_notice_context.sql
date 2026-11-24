-- 048_court_reservation_notice_context.sql — staff email hook context (M3)

create or replace function public.get_court_reservation_notice_context(p_reservation_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_reservation public.court_reservations%rowtype;
  v_slot public.court_slots%rowtype;
  v_court public.courts%rowtype;
  v_org public.organizations%rowtype;
  v_player_email text;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select *
  into v_reservation
  from public.court_reservations r
  where r.id = p_reservation_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'reservation_not_found');
  end if;

  if not public.is_org_booking_staff(v_reservation.organization_id) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  select *
  into v_slot
  from public.court_slots s
  where s.id = v_reservation.slot_id;

  select *
  into v_court
  from public.courts c
  where c.id = v_slot.court_id;

  select *
  into v_org
  from public.organizations o
  where o.id = v_reservation.organization_id;

  select p.email
  into v_player_email
  from public.profiles p
  where p.id = v_reservation.user_id;

  return jsonb_build_object(
    'success', true,
    'player_email', coalesce(v_player_email, ''),
    'court_name', v_court.name,
    'organization_name', v_org.name,
    'starts_at', v_slot.starts_at,
    'ends_at', v_slot.ends_at,
    'staff_note', v_reservation.staff_note
  );
end;
$$;

revoke all on function public.get_court_reservation_notice_context(uuid) from public;
grant execute on function public.get_court_reservation_notice_context(uuid) to authenticated;
