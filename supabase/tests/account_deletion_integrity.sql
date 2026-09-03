-- Rollback-only account deletion graph assertions.
begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'delete-owner@example.invalid', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'delete-successor@example.invalid', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'delete-sole@example.invalid', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'delete-next-caregiver@example.invalid', '', now(), now());

insert into public.kwilt_people (id, display_name, kind, created_by_user_id)
values
  ('72000000-0000-4000-8000-000000000001', 'Departing owner', 'adult', '71000000-0000-4000-8000-000000000001'),
  ('72000000-0000-4000-8000-000000000002', 'Surviving caregiver', 'adult', '71000000-0000-4000-8000-000000000002'),
  ('72000000-0000-4000-8000-000000000003', 'Managed child', 'dependent', '71000000-0000-4000-8000-000000000001'),
  ('72000000-0000-4000-8000-000000000004', 'Sole caregiver', 'adult', '71000000-0000-4000-8000-000000000003'),
  ('72000000-0000-4000-8000-000000000005', 'Sole household child', 'dependent', '71000000-0000-4000-8000-000000000003'),
  ('72000000-0000-4000-8000-000000000006', 'Next caregiver', 'adult', '71000000-0000-4000-8000-000000000004');

insert into public.kwilt_person_auth_bindings (person_id, user_id)
values
  ('72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001'),
  ('72000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000002'),
  ('72000000-0000-4000-8000-000000000004', '71000000-0000-4000-8000-000000000003'),
  ('72000000-0000-4000-8000-000000000006', '71000000-0000-4000-8000-000000000004');

insert into public.kwilt_households (id, name, created_by_user_id)
values
  ('73000000-0000-4000-8000-000000000001', 'Surviving household', '71000000-0000-4000-8000-000000000001'),
  ('73000000-0000-4000-8000-000000000002', 'Sole household', '71000000-0000-4000-8000-000000000003');

insert into public.kwilt_household_memberships (id, household_id, person_id, role, joined_at)
values
  ('74000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', 'owner', now() - interval '2 days'),
  ('74000000-0000-4000-8000-000000000002', '73000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000002', 'caregiver', now() - interval '1 day'),
  ('74000000-0000-4000-8000-000000000003', '73000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000003', 'child', now()),
  ('74000000-0000-4000-8000-000000000004', '73000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000004', 'owner', now()),
  ('74000000-0000-4000-8000-000000000005', '73000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000005', 'child', now()),
  ('74000000-0000-4000-8000-000000000006', '73000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000006', 'caregiver', now());

insert into public.kwilt_food_stock_observations (
  owner_person_id, concept, state, source, confidence, observed_at
) values
  ('72000000-0000-4000-8000-000000000001', 'private pantry item', 'confirmed', 'manual', 1, now()),
  ('72000000-0000-4000-8000-000000000004', 'sole pantry item', 'confirmed', 'manual', 1, now());

insert into public.kwilt_account_deletion_operations (operation_id, user_id, subject_hash, status)
values
  ('75000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', repeat('a', 64), 'running'),
  ('75000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000003', repeat('b', 64), 'running'),
  ('75000000-0000-4000-8000-000000000003', '71000000-0000-4000-8000-000000000002', repeat('c', 64), 'running');

-- A non-owner caregiver leaving must not disturb the existing owner.
select public.prepare_kwilt_account_deletion(
  '71000000-0000-4000-8000-000000000002',
  '75000000-0000-4000-8000-000000000003'
);

do $$
begin
  if not exists (
    select 1 from public.kwilt_household_memberships
    where id = '74000000-0000-4000-8000-000000000001' and role = 'owner' and status = 'active'
  ) then raise exception 'non_owner_deletion_changed_owner'; end if;
  if not exists (
    select 1 from public.kwilt_household_memberships
    where id = '74000000-0000-4000-8000-000000000002' and status = 'removed'
  ) then raise exception 'non_owner_membership_not_removed'; end if;
end;
$$;

delete from auth.users where id = '71000000-0000-4000-8000-000000000002';

select public.prepare_kwilt_account_deletion(
  '71000000-0000-4000-8000-000000000001',
  '75000000-0000-4000-8000-000000000001'
);

do $$
begin
  if not exists (
    select 1 from public.kwilt_household_memberships
    where id = '74000000-0000-4000-8000-000000000006' and role = 'owner' and status = 'active'
  ) then raise exception 'successor_not_promoted'; end if;
  if not exists (
    select 1 from public.kwilt_household_memberships
    where id = '74000000-0000-4000-8000-000000000001' and status = 'removed'
  ) then raise exception 'departing_membership_not_removed'; end if;
  if not exists (
    select 1 from public.kwilt_people
    where id = '72000000-0000-4000-8000-000000000003'
      and created_by_user_id = '71000000-0000-4000-8000-000000000004'
  ) then raise exception 'dependent_stewardship_not_transferred'; end if;
  if exists (
    select 1 from public.kwilt_food_stock_observations
    where owner_person_id = '72000000-0000-4000-8000-000000000001'
  ) then raise exception 'private_person_data_remaining'; end if;
end;
$$;

delete from auth.users where id = '71000000-0000-4000-8000-000000000001';

select public.prepare_kwilt_account_deletion(
  '71000000-0000-4000-8000-000000000003',
  '75000000-0000-4000-8000-000000000002'
);

do $$
begin
  if exists (select 1 from public.kwilt_households where id = '73000000-0000-4000-8000-000000000002') then
    raise exception 'sole_adult_household_remaining';
  end if;
  if exists (select 1 from public.kwilt_people where id = '72000000-0000-4000-8000-000000000005') then
    raise exception 'sole_household_dependent_remaining';
  end if;
  if exists (
    select 1 from public.kwilt_food_stock_observations
    where owner_person_id = '72000000-0000-4000-8000-000000000004'
  ) then raise exception 'sole_private_data_remaining'; end if;
end;
$$;

delete from auth.users where id = '71000000-0000-4000-8000-000000000003';

rollback;
