-- Make the human-entered fallback easy to transcribe while retaining the
-- high-entropy QR token. Only active setup sessions require unique manual codes.

alter table public.kwilt_household_device_setup_sessions
  drop constraint if exists kwilt_household_device_setup_sessions_manual_code_hash_key;

create unique index if not exists kwilt_one_issued_device_setup_manual_code
  on public.kwilt_household_device_setup_sessions (manual_code_hash)
  where status = 'issued';

create or replace function public.create_kwilt_household_device_setup_session(
  p_child_membership_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_child public.kwilt_household_memberships;
  v_actor public.kwilt_household_memberships;
  v_secret text := encode(extensions.gen_random_bytes(32), 'hex');
  v_random_bytes bytea;
  v_random_value bigint;
  v_manual_code text;
  v_manual_code_hash text;
  v_session public.kwilt_household_device_setup_sessions;
begin
  select * into v_child from public.kwilt_household_memberships
  where id = p_child_membership_id and role = 'child' and status = 'active';
  if v_child.id is null then raise exception 'child_membership_not_found'; end if;
  v_actor := public.kwilt_require_household_device_manager(v_child.household_id);

  update public.kwilt_household_device_setup_sessions
  set status = 'expired'
  where status = 'issued' and expires_at <= now();
  if exists (
    select 1 from public.kwilt_household_device_setup_sessions
    where child_membership_id = v_child.id and status = 'issued'
  ) then raise exception 'household_device_setup_already_active'; end if;
  if exists (
    select 1 from public.kwilt_household_devices
    where child_membership_id = v_child.id and device_kind = 'personal_child' and status <> 'revoked'
  ) then raise exception 'child_personal_device_already_connected'; end if;

  loop
    v_random_bytes := extensions.gen_random_bytes(4);
    v_random_value := get_byte(v_random_bytes, 0)::bigint * 16777216
      + get_byte(v_random_bytes, 1)::bigint * 65536
      + get_byte(v_random_bytes, 2)::bigint * 256
      + get_byte(v_random_bytes, 3)::bigint;
    if v_random_value < 4294000000 then
      v_manual_code := lpad((v_random_value % 1000000)::text, 6, '0');
      v_manual_code_hash := encode(extensions.digest(v_manual_code, 'sha256'), 'hex');
      exit when not exists (
        select 1 from public.kwilt_household_device_setup_sessions
        where manual_code_hash = v_manual_code_hash and status = 'issued'
      );
    end if;
  end loop;

  insert into public.kwilt_household_device_setup_sessions
    (household_id, child_membership_id, created_by_membership_id, secret_hash, manual_code_hash, expires_at)
  values (
    v_child.household_id, v_child.id, v_actor.id,
    encode(extensions.digest(v_secret, 'sha256'), 'hex'),
    v_manual_code_hash,
    now() + interval '15 minutes'
  ) returning * into v_session;

  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, subject_membership_id, details)
  values (v_child.household_id, v_actor.id, 'household_device_setup_issued', v_child.id,
    jsonb_build_object('sessionId', v_session.id));

  return jsonb_build_object(
    'id', v_session.id,
    'token', v_secret,
    'manualCode', v_manual_code,
    'expiresAt', v_session.expires_at,
    'childMembershipId', v_child.id
  );
end;
$$;

revoke execute on function public.create_kwilt_household_device_setup_session(uuid) from public, anon;
grant execute on function public.create_kwilt_household_device_setup_session(uuid) to authenticated;
