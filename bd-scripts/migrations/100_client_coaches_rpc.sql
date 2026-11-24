-- 100_client_coaches_rpc.sql
-- Sprint 3: list_client_coaches + client_leave_coach (no is_primary)

create or replace function public.list_client_coaches()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_coaches jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = v_uid;

  if v_role is distinct from 'client' then
    return jsonb_build_object('success', false, 'error', 'client_role_required');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'relationship_id', r.id,
        'coach_id', r.coach_id,
        'display_name', coalesce(nullif(trim(p.display_name), ''), split_part(p.email, '@', 1)),
        'avatar_url', p.avatar_url,
        'status', r.status,
        'since', r.created_at
      )
      order by coalesce(nullif(trim(p.display_name), ''), p.email)
    ),
    '[]'::jsonb
  )
  into v_coaches
  from public.coach_client_relationships r
  join public.profiles p on p.id = r.coach_id
  where r.client_id = v_uid
    and r.status = 'active';

  return jsonb_build_object('success', true, 'coaches', v_coaches);
end;
$$;

revoke all on function public.list_client_coaches() from public;
grant execute on function public.list_client_coaches() to authenticated;

create or replace function public.client_leave_coach(p_coach_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_rel public.coach_client_relationships%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = v_uid;

  if v_role is distinct from 'client' then
    return jsonb_build_object('success', false, 'error', 'client_role_required');
  end if;

  if p_coach_id is null then
    return jsonb_build_object('success', false, 'error', 'missing_coach_id');
  end if;

  select *
  into v_rel
  from public.coach_client_relationships r
  where r.client_id = v_uid
    and r.coach_id = p_coach_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_rel.status <> 'active' then
    return jsonb_build_object('success', false, 'error', 'not_active', 'status', v_rel.status);
  end if;

  update public.coach_client_relationships
  set status = 'archived',
      updated_at = v_now
  where id = v_rel.id;

  return jsonb_build_object(
    'success', true,
    'relationship_id', v_rel.id,
    'status', 'archived'
  );
end;
$$;

revoke all on function public.client_leave_coach(uuid) from public;
grant execute on function public.client_leave_coach(uuid) to authenticated;

-- Assert: no is_primary column (documentation + comment for reviewers)
comment on table public.coach_client_relationships is
  'Coach–client pairings. OmniFit: equal peers — no is_primary. acquisition_source tracks invite vs marketplace.';
