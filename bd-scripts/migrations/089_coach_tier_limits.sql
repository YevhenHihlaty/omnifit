-- 089_coach_tier_limits.sql
-- Enforce client roster limits based on coach subscription tier

alter type public.subscription_tier add value if not exists 'starter';

-- Function to check if coach can add a client
create or replace function public.coach_can_add_client(p_coach_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier public.subscription_tier;
  v_active_clients int;
  v_limit int;
begin
  select coalesce(personal_subscription_tier, 'free') into v_tier
  from public.coach_profiles
  where user_id = p_coach_id;

  if v_tier = 'pro' then
    return true;
  end if;

  if v_tier = 'starter' then
    v_limit := 7;
  else
    v_limit := 3;
  end if;

  select count(*) into v_active_clients
  from public.coach_client_relationships
  where coach_id = p_coach_id and status = 'active';

  return v_active_clients < v_limit;
end;
$$;

revoke all on function public.coach_can_add_client(uuid) from public;
grant execute on function public.coach_can_add_client(uuid) to authenticated;

-- Redefine client_join_coach_roster to check limits
create or replace function public.client_join_coach_roster(p_handle text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
  v_relationship_id uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'unauthorized');
  end if;

  select cp.user_id into v_coach_id
  from public.coach_profiles cp
  where cp.handle = p_handle;

  if v_coach_id is null then
    return jsonb_build_object('success', false, 'error', 'coach_not_found');
  end if;

  select id into v_relationship_id
  from public.coach_client_relationships
  where coach_id = v_coach_id and client_id = auth.uid();

  if v_relationship_id is not null then
    return jsonb_build_object('success', true, 'relationship_id', v_relationship_id, 'status', 'existing');
  end if;

  -- Limit check
  if not public.coach_can_add_client(v_coach_id) then
    return jsonb_build_object('success', false, 'error', 'roster_limit_reached');
  end if;

  insert into public.coach_client_relationships (coach_id, client_id, status)
  values (v_coach_id, auth.uid(), 'active')
  returning id into v_relationship_id;

  return jsonb_build_object('success', true, 'relationship_id', v_relationship_id, 'status', 'created');
end;
$$;

-- Note: we'd also need to update create_client_invite but we might not have its exact body here.
-- Assuming create_client_invite checks for coach limits, we could redefine it if we knew its signature,
-- or we can enforce it via a trigger on coach_client_relationships or client_invites.

-- Add a trigger to enforce roster limits at insert/update
create or replace function public.enforce_roster_limit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only check when becoming active
  if new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') then
    if not public.coach_can_add_client(new.coach_id) then
      raise exception 'roster_limit_reached';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_roster_limit on public.coach_client_relationships;
create trigger enforce_roster_limit
  before insert or update on public.coach_client_relationships
  for each row execute function public.enforce_roster_limit_trigger();
