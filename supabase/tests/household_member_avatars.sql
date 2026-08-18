-- Rollback-only authority and precedence assertions for private Household avatars.
begin;

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,raw_user_meta_data,created_at,updated_at) values
 ('00000000-0000-0000-0000-000000000000','81000000-0000-4000-8000-000000000001','authenticated','authenticated','avatar-owner@example.invalid','',jsonb_build_object('picture','https://images.example.invalid/owner.jpg'),now(),now()),
 ('00000000-0000-0000-0000-000000000000','81000000-0000-4000-8000-000000000002','authenticated','authenticated','avatar-child@example.invalid','',jsonb_build_object('picture','https://images.example.invalid/child.jpg'),now(),now()),
 ('00000000-0000-0000-0000-000000000000','81000000-0000-4000-8000-000000000003','authenticated','authenticated','avatar-other@example.invalid','',null,now(),now());

insert into public.kwilt_people(id,display_name,kind,created_by_user_id) values
 ('82000000-0000-4000-8000-000000000001','Owner','adult','81000000-0000-4000-8000-000000000001'),
 ('82000000-0000-4000-8000-000000000002','Dependent','dependent','81000000-0000-4000-8000-000000000001'),
 ('82000000-0000-4000-8000-000000000003','Connected child','dependent','81000000-0000-4000-8000-000000000001'),
 ('82000000-0000-4000-8000-000000000004','Other owner','adult','81000000-0000-4000-8000-000000000003');

insert into public.kwilt_person_auth_bindings(person_id,user_id) values
 ('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001'),
 ('82000000-0000-4000-8000-000000000003','81000000-0000-4000-8000-000000000002'),
 ('82000000-0000-4000-8000-000000000004','81000000-0000-4000-8000-000000000003');

insert into public.kwilt_households(id,name,created_by_user_id) values
 ('83000000-0000-4000-8000-000000000001','Avatar household','81000000-0000-4000-8000-000000000001'),
 ('83000000-0000-4000-8000-000000000002','Other household','81000000-0000-4000-8000-000000000003');

insert into public.kwilt_household_memberships(id,household_id,person_id,role) values
 ('84000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','owner'),
 ('84000000-0000-4000-8000-000000000002','83000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000002','child'),
 ('84000000-0000-4000-8000-000000000003','83000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000003','child'),
 ('84000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000004','owner');

do $$
declare receipt jsonb;
begin
  receipt := public.kwilt_avatar_upload_authority(
    '81000000-0000-4000-8000-000000000001','dependent','84000000-0000-4000-8000-000000000002'
  );
  if receipt->>'targetId' <> '82000000-0000-4000-8000-000000000002' then
    raise exception 'owner dependent authority resolved wrong person';
  end if;

  if not exists (
    select 1 from public.kwilt_resolve_household_avatars('81000000-0000-4000-8000-000000000001')
    where membership_id='84000000-0000-4000-8000-000000000003'
      and avatar_source='account'
      and avatar_url='https://images.example.invalid/child.jpg'
  ) then raise exception 'connected provider account photo did not resolve'; end if;

  begin
    perform public.kwilt_avatar_upload_authority(
      '81000000-0000-4000-8000-000000000003','dependent','84000000-0000-4000-8000-000000000002'
    );
    raise exception 'cross-household avatar mutation succeeded';
  exception when others then
    if sqlerrm <> 'household_owner_required' then raise; end if;
  end;

  begin
    perform public.kwilt_avatar_upload_authority(
      '81000000-0000-4000-8000-000000000001','dependent','84000000-0000-4000-8000-000000000003'
    );
    raise exception 'owner mutated connected child avatar';
  exception when others then
    if sqlerrm <> 'connected_account_photo_owned_by_member' then raise; end if;
  end;
end;
$$;

select public.kwilt_confirm_avatar_upload(
  '81000000-0000-4000-8000-000000000001','dependent','84000000-0000-4000-8000-000000000002',
  'dependent/85000000-0000-4000-8000-000000000001/85000000-0000-4000-8000-000000000002.jpg'
);
select public.kwilt_confirm_avatar_upload(
  '81000000-0000-4000-8000-000000000002','account',null,
  'account/85000000-0000-4000-8000-000000000003/85000000-0000-4000-8000-000000000004.jpg'
);

do $$
begin
  if not exists (
    select 1 from public.kwilt_resolve_household_avatars('81000000-0000-4000-8000-000000000001')
    where membership_id='84000000-0000-4000-8000-000000000002' and avatar_source='dependent'
  ) then raise exception 'dependent avatar did not resolve'; end if;
  if not exists (
    select 1 from public.kwilt_resolve_household_avatars('81000000-0000-4000-8000-000000000001')
    where membership_id='84000000-0000-4000-8000-000000000003' and avatar_source='account'
  ) then raise exception 'connected account avatar did not take precedence'; end if;
end;
$$;

select public.kwilt_remove_avatar(
  '81000000-0000-4000-8000-000000000001','dependent','84000000-0000-4000-8000-000000000002'
);
do $$ begin
  if (select managed_avatar_storage_path from public.kwilt_people where id='82000000-0000-4000-8000-000000000002') is not null then
    raise exception 'dependent avatar reference remained after removal';
  end if;
end $$;

rollback;
