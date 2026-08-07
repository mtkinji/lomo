-- Rollback-only assertions for personal, reversible hidden Meals.
-- Run against a migrated local database using an administrative connection.

begin;

insert into auth.users(instance_id, id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'hide-owner@example.invalid', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'hide-other@example.invalid', '', now(), now());

insert into public.kwilt_people(id, display_name, kind, created_by_user_id) values
  ('72000000-0000-0000-0000-000000000001', 'Hide owner', 'adult', '71000000-0000-0000-0000-000000000001'),
  ('72000000-0000-0000-0000-000000000002', 'Other person', 'adult', '71000000-0000-0000-0000-000000000002');

insert into public.kwilt_person_auth_bindings(person_id, user_id) values
  ('72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001'),
  ('72000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}', true);
select public.set_kwilt_recipe_hidden('kwilt-starter-test-meal', true);

do $$ begin
  if (select count(*) from public.kwilt_hidden_recipes) <> 1 then
    raise exception 'owner could not read hidden meal';
  end if;
end $$;

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}', true);
do $$ begin
  if exists(select 1 from public.kwilt_hidden_recipes) then
    raise exception 'personal hidden meal leaked to another person';
  end if;
end $$;

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}', true);
select public.set_kwilt_recipe_hidden('kwilt-starter-test-meal', false);
do $$ begin
  if exists(select 1 from public.kwilt_hidden_recipes) then
    raise exception 'restored meal remained hidden';
  end if;
end $$;

reset role;
rollback;
