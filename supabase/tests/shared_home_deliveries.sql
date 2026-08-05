-- Rollback-only RLS assertions for Shared Home.
-- Run against a migrated database using an administrative connection.

begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'shared-home-a@example.invalid', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'shared-home-b@example.invalid', '', now(), now());

insert into public.kwilt_shared_deliveries (
  id,
  idempotency_key,
  recipient_user_id,
  actor_user_id,
  event_kind,
  source_capability,
  source_entity_type,
  source_entity_id,
  title,
  body,
  destination
) values (
  '20000000-0000-0000-0000-000000000001',
  'shared-home-rls',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'goal_invitation',
  'goals',
  'goal_invite',
  'invite-1',
  'Goal invitation',
  'Someone invited you to support a Goal.',
  '{"kind":"goal_invite","inviteCode":"CODE1"}'::jsonb
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);

do $$
begin
  if (select count(*) from public.kwilt_shared_deliveries) <> 1 then
    raise exception 'recipient read failed';
  end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);

do $$
begin
  if exists (select 1 from public.kwilt_shared_deliveries) then
    raise exception 'actor or wrong-recipient read succeeded';
  end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}',
  true
);

do $$
begin
  if exists (select 1 from public.kwilt_shared_deliveries) then
    raise exception 'anonymous recipient read succeeded';
  end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);

do $$
begin
  begin
    insert into public.kwilt_shared_deliveries (
      idempotency_key, recipient_user_id, event_kind, source_capability,
      source_entity_type, source_entity_id, title, body, destination
    ) values (
      'forged',
      '10000000-0000-0000-0000-000000000001',
      'goal_invitation',
      'goals',
      'goal_invite',
      'invite-2',
      'Forged',
      'Forged',
      '{"kind":"goal_invite","inviteCode":"CODE2"}'::jsonb
    );
    raise exception 'authenticated insert succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.kwilt_shared_deliveries
    set recipient_user_id = '10000000-0000-0000-0000-000000000002';
    raise exception 'authenticated update succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    delete from public.kwilt_shared_deliveries;
    raise exception 'authenticated delete succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;
