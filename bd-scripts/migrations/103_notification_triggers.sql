-- 103_notification_triggers.sql — Sprint 10: message/booking fan-out + archived thread read
-- Depends on: 053_conversations_messages, 094_notifications, 050/104 booking RPCs

-- ---------------------------------------------------------------------------
-- Archived relationships: SELECT history; SEND stays active-only
-- ---------------------------------------------------------------------------

drop policy if exists conversations_select_participant on public.conversations;
create policy conversations_select_participant
  on public.conversations
  for select
  to authenticated
  using (auth.uid() in (coach_id, client_id));

drop policy if exists messages_select_participant on public.messages;
create policy messages_select_participant
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.coach_id, c.client_id)
    )
  );

-- list messages: allow archived (read-only flag); still participant-only
create or replace function public.list_conversation_messages(
  p_conversation_id uuid,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.conversations%rowtype;
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_items jsonb;
  v_active boolean;
  v_rel_status text;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_conversation_id is null then
    return jsonb_build_object('success', false, 'error', 'missing_conversation');
  end if;

  select *
  into v_row
  from public.conversations c
  where c.id = p_conversation_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_uid not in (v_row.coach_id, v_row.client_id) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  v_active := public.coach_has_active_client(v_row.coach_id, v_row.client_id);

  select r.status::text
  into v_rel_status
  from public.coach_client_relationships r
  where r.id = v_row.relationship_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'conversation_id', m.conversation_id,
        'sender_id', m.sender_id,
        'body', m.body,
        'created_at', m.created_at
      )
      order by m.created_at asc
    ),
    '[]'::jsonb
  )
  into v_items
  from (
    select *
    from public.messages msg
    where msg.conversation_id = p_conversation_id
    order by msg.created_at desc
    limit v_limit
  ) m;

  return jsonb_build_object(
    'success', true,
    'conversation_id', v_row.id,
    'relationship_id', v_row.relationship_id,
    'coach_id', v_row.coach_id,
    'client_id', v_row.client_id,
    'read_only', not v_active,
    'relationship_status', coalesce(v_rel_status, 'unknown'),
    'messages', v_items
  );
end;
$$;

-- mark read allowed for archived history (clear unread after leave)
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.conversations%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_conversation_id is null then
    return jsonb_build_object('success', false, 'error', 'missing_conversation');
  end if;

  select *
  into v_row
  from public.conversations c
  where c.id = p_conversation_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_uid not in (v_row.coach_id, v_row.client_id) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if v_uid = v_row.coach_id then
    update public.conversations
    set coach_last_read_at = v_now
    where id = v_row.id;
  else
    update public.conversations
    set client_last_read_at = v_now
    where id = v_row.id;
  end if;

  return jsonb_build_object('success', true);
end;
$$;

-- inbox includes archived threads (read_only)
create or replace function public.list_conversation_inbox()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_items jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select coalesce(
    jsonb_agg(item order by (item ->> 'last_message_at') desc nulls last),
  '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'conversation_id', c.id,
      'relationship_id', c.relationship_id,
      'coach_id', c.coach_id,
      'client_id', c.client_id,
      'counterpart_id', case when v_uid = c.coach_id then c.client_id else c.coach_id end,
      'counterpart_name', coalesce(
        case
          when v_uid = c.coach_id then client_p.display_name
          else coach_p.display_name
        end,
        'User'
      ),
      'last_message_body', lm.body,
      'last_message_at', lm.created_at,
      'last_message_sender_id', lm.sender_id,
      'read_only', not public.coach_has_active_client(c.coach_id, c.client_id),
      'relationship_status', coalesce(r.status::text, 'unknown'),
      'unread',
        case
          when lm.id is null then false
          when v_uid = c.coach_id then
            (c.coach_last_read_at is null or lm.created_at > c.coach_last_read_at)
              and lm.sender_id <> v_uid
          else
            (c.client_last_read_at is null or lm.created_at > c.client_last_read_at)
              and lm.sender_id <> v_uid
        end,
      'unread_count', (
        select count(*)::int
        from public.messages um
        where um.conversation_id = c.id
          and um.sender_id <> v_uid
          and (
            case
              when v_uid = c.coach_id then
                c.coach_last_read_at is null or um.created_at > c.coach_last_read_at
              else
                c.client_last_read_at is null or um.created_at > c.client_last_read_at
            end
          )
      )
    ) as item
    from public.conversations c
    join public.profiles coach_p on coach_p.id = c.coach_id
    join public.profiles client_p on client_p.id = c.client_id
    left join public.coach_client_relationships r on r.id = c.relationship_id
    left join lateral (
      select m.id, m.body, m.sender_id, m.created_at
      from public.messages m
      where m.conversation_id = c.id
      order by m.created_at desc
      limit 1
    ) lm on true
    where v_uid in (c.coach_id, c.client_id)
  ) inbox_rows;

  return jsonb_build_object('success', true, 'items', v_items);
end;
$$;

-- ---------------------------------------------------------------------------
-- Message → notification for counterpart
-- ---------------------------------------------------------------------------

create or replace function public.notify_on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv public.conversations%rowtype;
  v_recipient uuid;
  v_preview text;
  v_sender_name text;
begin
  select * into v_conv
  from public.conversations c
  where c.id = new.conversation_id;

  if not found then
    return new;
  end if;

  if new.sender_id = v_conv.coach_id then
    v_recipient := v_conv.client_id;
  else
    v_recipient := v_conv.coach_id;
  end if;

  select coalesce(nullif(trim(p.display_name), ''), 'User')
  into v_sender_name
  from public.profiles p
  where p.id = new.sender_id;

  v_preview := left(trim(new.body), 120);

  perform public.enqueue_notification(
    v_recipient,
    'message'::public.notification_kind,
    'New message from ' || coalesce(v_sender_name, 'User'),
    case
      when v_preview = '' then null
      else '"' || v_preview || '"'
    end,
    '/messages/' || new.conversation_id::text,
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'relationship_id', v_conv.relationship_id,
      'sender_id', new.sender_id
    )
  );

  return new;
end;
$$;

drop trigger if exists messages_notify_counterpart on public.messages;
create trigger messages_notify_counterpart
  after insert on public.messages
  for each row execute function public.notify_on_message_insert();

-- ---------------------------------------------------------------------------
-- Booking decision → notify client; new pending request → notify coach
-- ---------------------------------------------------------------------------

create or replace function public.notify_on_booking_request_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_name text;
  v_coach_name text;
  v_when text;
begin
  if tg_op = 'INSERT' and new.status = 'pending' and new.kind = 'coaching' then
    select coalesce(nullif(trim(p.display_name), ''), 'Client')
    into v_client_name
    from public.profiles p
    where p.id = new.client_id;

    v_when := to_char(new.starts_at at time zone 'UTC', 'Mon DD, HH12:MI AM');

    perform public.enqueue_notification(
      new.coach_id,
      'booking_request'::public.notification_kind,
      'New booking request',
      coalesce(v_client_name, 'Client') || ' requested ' || coalesce(v_when, 'a session') || '.',
      '/sessions',
      jsonb_build_object('request_id', new.id, 'client_id', new.client_id)
    );
    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'pending'
    and new.status in ('accepted', 'declined')
    and new.kind = 'coaching'
  then
    select coalesce(nullif(trim(p.display_name), ''), 'Coach')
    into v_coach_name
    from public.profiles p
    where p.id = new.coach_id;

    v_when := to_char(new.starts_at at time zone 'UTC', 'Mon DD, HH12:MI AM');

    perform public.enqueue_notification(
      new.client_id,
      'booking_decision'::public.notification_kind,
      case
        when new.status = 'accepted' then 'Booking accepted'
        else 'Booking declined'
      end,
      case
        when new.status = 'accepted' then
          coalesce(v_coach_name, 'Your coach') || ' confirmed ' || coalesce(v_when, 'your session') || '.'
        else
          coalesce(
            nullif(trim(new.decline_reason), ''),
            coalesce(v_coach_name, 'Your coach') || ' declined ' || coalesce(v_when, 'the request') || '.'
          )
      end,
      '/calendar',
      jsonb_build_object(
        'request_id', new.id,
        'status', new.status,
        'session_id', new.session_id
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists booking_requests_notify on public.booking_requests;
create trigger booking_requests_notify
  after insert or update of status on public.booking_requests
  for each row execute function public.notify_on_booking_request_change();

grant execute on function public.list_conversation_messages(uuid, integer) to authenticated;
grant execute on function public.list_conversation_inbox() to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

create or replace function public.open_conversation_thread(
  p_relationship_id uuid,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation public.conversations;
  v_err text;
begin
  begin
    v_conversation := public._ensure_conversation_for_relationship(p_relationship_id);
  exception
    when others then
      v_err := sqlerrm;
      return jsonb_build_object(
        'success', false,
        'error',
        case
          when v_err in (
            'not_authenticated',
            'relationship_not_found',
            'relationship_not_active',
            'forbidden',
            'no_active_relationship'
          ) then v_err
          else 'load_failed'
        end
      );
  end;

  return public.list_conversation_messages(v_conversation.id, p_limit);
end;
$$;

grant execute on function public.open_conversation_thread(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Hardening: sanitize send_message exceptions; reaffirm enqueue grants
-- ---------------------------------------------------------------------------

create or replace function public.send_message(
  p_relationship_id uuid,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_body text := trim(coalesce(p_body, ''));
  v_conversation public.conversations;
  v_message_id uuid;
  v_err text;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_relationship_id is null then
    return jsonb_build_object('success', false, 'error', 'missing_relationship');
  end if;

  if v_body = '' then
    return jsonb_build_object('success', false, 'error', 'empty_body');
  end if;

  if char_length(v_body) > 4000 then
    return jsonb_build_object('success', false, 'error', 'body_too_long');
  end if;

  begin
    v_conversation := public._ensure_conversation_for_relationship(p_relationship_id);
  exception
    when others then
      v_err := sqlerrm;
      return jsonb_build_object(
        'success', false,
        'error',
        case
          when v_err in (
            'not_authenticated',
            'relationship_not_found',
            'relationship_not_active',
            'forbidden',
            'no_active_relationship'
          ) then v_err
          else 'send_failed'
        end
      );
  end;

  insert into public.messages (
    conversation_id,
    sender_id,
    body
  )
  values (
    v_conversation.id,
    v_uid,
    v_body
  )
  returning id into v_message_id;

  if v_uid = v_conversation.coach_id then
    update public.conversations
    set coach_last_read_at = timezone('utc', now())
    where id = v_conversation.id;
  else
    update public.conversations
    set client_last_read_at = timezone('utc', now())
    where id = v_conversation.id;
  end if;

  return jsonb_build_object(
    'success', true,
    'message_id', v_message_id,
    'conversation_id', v_conversation.id
  );
end;
$$;

grant execute on function public.send_message(uuid, text) to authenticated;

revoke all on function public.enqueue_notification(uuid, public.notification_kind, text, text, text, jsonb) from public;
revoke all on function public.enqueue_notification(uuid, public.notification_kind, text, text, text, jsonb) from anon, authenticated;
grant execute on function public.enqueue_notification(uuid, public.notification_kind, text, text, text, jsonb)
  to service_role;

comment on function public.notify_on_message_insert() is
  'Sprint 10: fan-out message insert to counterpart via enqueue_notification.';
comment on function public.notify_on_booking_request_change() is
  'Sprint 10: fan-out booking request/decision notifications.';
