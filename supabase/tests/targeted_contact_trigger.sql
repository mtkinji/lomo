-- Rollback-only unit regression for the two row shapes sharing this trigger.
-- Run as an administrator in a disposable migrated database. The existing
-- shared_home_deliveries.sql also exercises the real delivery table and RLS.
begin;

insert into auth.users(instance_id, id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'contact-a@example.invalid', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'contact-b@example.invalid', '', now(), now());

-- Deliberately disjoint fields: a table-name condition must be evaluated
-- before preparing expressions that refer to that table's NEW record.
create temporary table kwilt_invites(created_by uuid, intended_recipient_user_id uuid) on commit drop;
create temporary table kwilt_shared_deliveries(actor_user_id uuid, recipient_user_id uuid) on commit drop;
create trigger contact_invite before insert or update on pg_temp.kwilt_invites
  for each row execute function public.suppress_blocked_targeted_contact();
create trigger contact_delivery before insert or update on pg_temp.kwilt_shared_deliveries
  for each row execute function public.suppress_blocked_targeted_contact();

select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}', true);

insert into pg_temp.kwilt_shared_deliveries values
  ('91000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000002');
insert into pg_temp.kwilt_invites values
  ('91000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000002');

insert into public.kwilt_blocks(blocker_id, blocked_id) values
  ('91000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001');

do $$
begin
  begin
    update pg_temp.kwilt_shared_deliveries set actor_user_id = actor_user_id;
    raise exception 'blocked delivery update succeeded';
  exception when insufficient_privilege then
    if sqlerrm <> 'blocked_relationship' then raise; end if;
  end;
  begin
    update pg_temp.kwilt_invites set created_by = created_by;
    raise exception 'blocked invite update succeeded';
  exception when insufficient_privilege then
    if sqlerrm <> 'blocked_relationship' then raise; end if;
  end;
  begin
    insert into pg_temp.kwilt_shared_deliveries values
      ('91000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001');
    raise exception 'blocked delivery insert succeeded';
  exception when insufficient_privilege then
    if sqlerrm <> 'blocked_relationship' then raise; end if;
  end;
  begin
    insert into pg_temp.kwilt_invites values
      ('91000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001');
    raise exception 'blocked invite insert succeeded';
  exception when insufficient_privilege then
    if sqlerrm <> 'blocked_relationship' then raise; end if;
  end;
end $$;

-- System deliveries and untargeted invites remain valid even with a block.
insert into pg_temp.kwilt_shared_deliveries values
  (null, '91000000-0000-0000-0000-000000000001');
insert into pg_temp.kwilt_invites values
  ('91000000-0000-0000-0000-000000000001', null);
rollback;
