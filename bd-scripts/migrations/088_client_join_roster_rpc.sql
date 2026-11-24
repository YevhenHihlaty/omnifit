-- 088_client_join_roster_rpc.sql
-- Allow a client to join a coach's roster via their public handle

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
  -- Must be authenticated
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'unauthorized');
  end if;

  -- Lookup coach by handle
  select cp.user_id into v_coach_id
  from public.coach_profiles cp
  where cp.handle = p_handle;

  if v_coach_id is null then
    return jsonb_build_object('success', false, 'error', 'coach_not_found');
  end if;

  -- Check if relationship already exists
  select id into v_relationship_id
  from public.coach_client_relationships
  where coach_id = v_coach_id and client_id = auth.uid();

  if v_relationship_id is not null then
    return jsonb_build_object('success', true, 'relationship_id', v_relationship_id, 'status', 'existing');
  end if;

  -- Create relationship as active (since they used a shareable join link)
  insert into public.coach_client_relationships (coach_id, client_id, status)
  values (v_coach_id, auth.uid(), 'active')
  returning id into v_relationship_id;

  return jsonb_build_object('success', true, 'relationship_id', v_relationship_id, 'status', 'created');
end;
$$;

revoke all on function public.client_join_coach_roster(text) from public;
grant execute on function public.client_join_coach_roster(text) to authenticated;
