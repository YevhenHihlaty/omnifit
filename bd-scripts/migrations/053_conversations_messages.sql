-- 053_conversations_messages.sql — coach–client 1:1 messaging (Sprint 18)
-- ponytail: text-only v1; mutations via SECURITY DEFINER RPCs (mirror booking_requests).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null unique references public.coach_client_relationships (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  coach_last_read_at timestamptz,
  client_last_read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (coach_id <> client_id)
);

create index if not exists conversations_coach_created_idx
  on public.conversations (coach_id, created_at desc);

create index if not exists conversations_client_created_idx
  on public.conversations (client_id, created_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint messages_body_length check (
    char_length(trim(body)) > 0
    and char_length(body) <= 4000
  )
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- ---------------------------------------------------------------------------
-- RLS — participant read only; writes via RPC
-- ---------------------------------------------------------------------------

drop policy if exists conversations_select_participant on public.conversations;
create policy conversations_select_participant
  on public.conversations
  for select
  to authenticated
  using (
    auth.uid() in (coach_id, client_id)
    and public.coach_has_active_client(coach_id, client_id)
  );

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
        and public.coach_has_active_client(c.coach_id, c.client_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Internal: ensure conversation row for active relationship
-- ---------------------------------------------------------------------------

create or replace function public._ensure_conversation_for_relationship(p_relationship_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rel public.coach_client_relationships%rowtype;
  v_row public.conversations%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select *
  into v_rel
  from public.coach_client_relationships r
  where r.id = p_relationship_id;

  if not found then
    raise exception 'relationship_not_found';
  end if;

  if v_rel.status <> 'active' then
    raise exception 'relationship_not_active';
  end if;

  if v_uid not in (v_rel.coach_id, v_rel.client_id) then
    raise exception 'forbidden';
  end if;

  if not public.coach_has_active_client(v_rel.coach_id, v_rel.client_id) then
    raise exception 'no_active_relationship';
  end if;

  insert into public.conversations (
    relationship_id,
    coach_id,
    client_id
  )
  values (
    v_rel.id,
    v_rel.coach_id,
    v_rel.client_id
  )
  on conflict (relationship_id) do nothing;

  select *
  into v_row
  from public.conversations c
  where c.relationship_id = p_relationship_id;

  return v_row;
end;
$$;

revoke all on function public._ensure_conversation_for_relationship(uuid) from public;

-- ---------------------------------------------------------------------------
-- send_message
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
      return jsonb_build_object('success', false, 'error', sqlerrm);
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

-- ---------------------------------------------------------------------------
-- mark_conversation_read
-- ---------------------------------------------------------------------------

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

  if not public.coach_has_active_client(v_row.coach_id, v_row.client_id) then
    return jsonb_build_object('success', false, 'error', 'no_active_relationship');
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

grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- list_conversation_inbox — sorted by last message
-- ---------------------------------------------------------------------------

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
      'unread',
        case
          when lm.id is null then false
          when v_uid = c.coach_id then
            c.coach_last_read_at is null
            or lm.created_at > c.coach_last_read_at
              and lm.sender_id <> v_uid
          else
            c.client_last_read_at is null
            or lm.created_at > c.client_last_read_at
              and lm.sender_id <> v_uid
        end
    ) as item
    from public.conversations c
    join public.profiles coach_p on coach_p.id = c.coach_id
    join public.profiles client_p on client_p.id = c.client_id
    left join lateral (
      select m.id, m.body, m.sender_id, m.created_at
      from public.messages m
      where m.conversation_id = c.id
      order by m.created_at desc
      limit 1
    ) lm on true
    where v_uid in (c.coach_id, c.client_id)
      and public.coach_has_active_client(c.coach_id, c.client_id)
  ) inbox_rows;

  return jsonb_build_object('success', true, 'items', v_items);
end;
$$;

grant execute on function public.list_conversation_inbox() to authenticated;

-- ---------------------------------------------------------------------------
-- list_conversation_messages
-- ---------------------------------------------------------------------------

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

  if not public.coach_has_active_client(v_row.coach_id, v_row.client_id) then
    return jsonb_build_object('success', false, 'error', 'no_active_relationship');
  end if;

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
    'messages', v_items
  );
end;
$$;

grant execute on function public.list_conversation_messages(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- open_conversation_thread — ensure row + list messages by relationship
-- ---------------------------------------------------------------------------

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
begin
  begin
    v_conversation := public._ensure_conversation_for_relationship(p_relationship_id);
  exception
    when others then
      return jsonb_build_object('success', false, 'error', sqlerrm);
  end;

  return public.list_conversation_messages(v_conversation.id, p_limit);
end;
$$;

grant execute on function public.open_conversation_thread(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;
