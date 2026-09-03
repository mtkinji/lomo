-- Rollback-only authorization assertions for contextual UGC safety.
-- Run against a migrated database using an administrative connection.

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'ugc-a@example.invalid', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'ugc-b@example.invalid', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'ugc-c@example.invalid', '', now(), now());

insert into public.kwilt_ugc_reports (
  reporter_user_id, reported_user_id, target_kind, target_id, reason, snapshot, response_due_at
) values (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'user',
  '10000000-0000-0000-0000-000000000002',
  'harassment',
  '{"displayName":"Reported user"}'::jsonb,
  now() + interval '24 hours'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}', true);

do $$
begin
  if exists (select 1 from public.kwilt_ugc_reports) then
    raise exception 'reporter could read moderation queue';
  end if;
  begin
    insert into public.kwilt_ugc_reports (
      reporter_user_id, reported_user_id, target_kind, target_id, reason, snapshot, response_due_at
    ) values (
      '10000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      'user',
      '10000000-0000-0000-0000-000000000002',
      'other',
      '{}'::jsonb,
      now() + interval '24 hours'
    );
    raise exception 'authenticated client inserted moderation row';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;

insert into public.kwilt_people (id, display_name, kind, created_by_user_id)
values
  ('40000000-0000-0000-0000-000000000001', 'Household owner', 'adult', '10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000003', 'Managed child', 'dependent', '10000000-0000-0000-0000-000000000001');
insert into public.kwilt_person_auth_bindings (person_id, user_id)
values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003');
insert into public.kwilt_households (id, name, created_by_user_id)
values ('50000000-0000-0000-0000-000000000001', 'Safety test household', '10000000-0000-0000-0000-000000000001');
insert into public.kwilt_household_memberships (household_id, person_id, role)
values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'owner'),
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'child');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}', true);

do $$
begin
  begin
    perform public.block_kwilt_user('10000000-0000-0000-0000-000000000003');
    raise exception 'same-household social block succeeded';
  exception when others then
    if sqlerrm <> 'household_relationship_requires_role_action' then raise; end if;
  end;
end;
$$;

reset role;

insert into public.kwilt_follows (follower_id, followed_id, status)
values
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'active'),
  ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'active');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}', true);
select public.block_kwilt_user('10000000-0000-0000-0000-000000000002');

reset role;

do $$
begin
  if not public.kwilt_users_blocked('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002') then
    raise exception 'bilateral block predicate failed';
  end if;
  if exists (
    select 1 from public.kwilt_follows
    where follower_id in ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002')
      and followed_id in ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002')
  ) then
    raise exception 'block did not remove bilateral follows';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}', true);

do $$
begin
  begin
    insert into public.kwilt_follows (follower_id, followed_id, status)
    values ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'active');
    raise exception 'blocked follow succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;
