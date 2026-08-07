-- Rollback-only authority and diner-aware finalization assertions.
begin;

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,created_at,updated_at) values
 ('00000000-0000-0000-0000-000000000000','73000000-0000-0000-0000-000000000001','authenticated','authenticated','meal-owner@example.invalid','',now(),now()),
 ('00000000-0000-0000-0000-000000000000','73000000-0000-0000-0000-000000000002','authenticated','authenticated','meal-caregiver@example.invalid','',now(),now()),
 ('00000000-0000-0000-0000-000000000000','73000000-0000-0000-0000-000000000003','authenticated','authenticated','meal-other@example.invalid','',now(),now());

insert into public.kwilt_people(id,display_name,kind,created_by_user_id) values
 ('74000000-0000-0000-0000-000000000001','Owner','adult','73000000-0000-0000-0000-000000000001'),
 ('74000000-0000-0000-0000-000000000002','Caregiver','adult','73000000-0000-0000-0000-000000000002'),
 ('74000000-0000-0000-0000-000000000003','Dependent','dependent','73000000-0000-0000-0000-000000000001'),
 ('74000000-0000-0000-0000-000000000004','Other adult','adult','73000000-0000-0000-0000-000000000003');

insert into public.kwilt_person_auth_bindings(person_id,user_id) values
 ('74000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000001'),
 ('74000000-0000-0000-0000-000000000002','73000000-0000-0000-0000-000000000002'),
 ('74000000-0000-0000-0000-000000000004','73000000-0000-0000-0000-000000000003');

insert into public.kwilt_households(id,name,created_by_user_id) values
 ('75000000-0000-0000-0000-000000000001','Meal household','73000000-0000-0000-0000-000000000001'),
 ('75000000-0000-0000-0000-000000000002','Other household','73000000-0000-0000-0000-000000000003');

insert into public.kwilt_household_memberships(id,household_id,person_id,role) values
 ('76000000-0000-0000-0000-000000000001','75000000-0000-0000-0000-000000000001','74000000-0000-0000-0000-000000000001','owner'),
 ('76000000-0000-0000-0000-000000000002','75000000-0000-0000-0000-000000000001','74000000-0000-0000-0000-000000000002','caregiver'),
 ('76000000-0000-0000-0000-000000000003','75000000-0000-0000-0000-000000000001','74000000-0000-0000-0000-000000000003','child'),
 ('76000000-0000-0000-0000-000000000004','75000000-0000-0000-0000-000000000002','74000000-0000-0000-0000-000000000004','owner');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"73000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}',true);
select public.set_kwilt_meal_planner_preferences('75000000-0000-0000-0000-000000000001',array['74000000-0000-0000-0000-000000000001','74000000-0000-0000-0000-000000000003']::uuid[],'completed');
select public.set_kwilt_person_food_need('74000000-0000-0000-0000-000000000001','peanut','Peanuts',true);

select set_config('request.jwt.claims','{"sub":"73000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}',true);
select public.set_kwilt_person_food_need('74000000-0000-0000-0000-000000000003','sesame','Sesame',true);
do $$ begin
  begin
    perform public.set_kwilt_person_food_need('74000000-0000-0000-0000-000000000001','milk','Milk',true);
    raise exception 'caregiver changed another adult food need';
  exception when others then
    if sqlerrm = 'caregiver changed another adult food need' then raise; end if;
  end;
end $$;

select set_config('request.jwt.claims','{"sub":"73000000-0000-0000-0000-000000000003","role":"authenticated","is_anonymous":false}',true);
do $$ begin
  if exists(select 1 from public.kwilt_meal_planner_preferences where household_id='75000000-0000-0000-0000-000000000001') then raise exception 'planner preferences leaked'; end if;
  if exists(select 1 from public.kwilt_person_food_needs where household_id='75000000-0000-0000-0000-000000000001') then raise exception 'food needs leaked'; end if;
end $$;

select set_config('request.jwt.claims','{"sub":"73000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}',true);
do $$ begin
  begin
    perform public.set_kwilt_meal_planner_preferences('75000000-0000-0000-0000-000000000001',array['74000000-0000-0000-0000-000000000001','74000000-0000-0000-0000-000000000001']::uuid[],'completed');
    raise exception 'duplicate diner accepted';
  exception when others then
    if sqlerrm = 'duplicate diner accepted' then raise; end if;
  end;
end $$;

reset role;
insert into public.kwilt_meal_plans(id,household_id,organizer_membership_id,organizer_person_id,horizon) values
 ('77000000-0000-0000-0000-000000000001','75000000-0000-0000-0000-000000000001','76000000-0000-0000-0000-000000000001','74000000-0000-0000-0000-000000000001','{"kind":"meal_count","count":1}');
insert into public.kwilt_meal_plan_candidates(id,plan_id,position,kind,title,recipe_snapshot,suggested_by_person_id) values
 ('78000000-0000-0000-0000-000000000001','77000000-0000-0000-0000-000000000001',0,'meal_note','Curry',null,'74000000-0000-0000-0000-000000000001'),
 ('78000000-0000-0000-0000-000000000002','77000000-0000-0000-0000-000000000001',1,'meal_note','Toast',null,'74000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"73000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}',true);
select public.finalize_kwilt_meal_plan(
 '77000000-0000-0000-0000-000000000001',1,
 '[{"id":"79000000-0000-0000-0000-000000000001","title":"Dinner","placementDate":null,"notEatingPersonIds":[],"dishes":[{"id":"7a000000-0000-0000-0000-000000000001","candidateId":"78000000-0000-0000-0000-000000000001","dinerPersonIds":["74000000-0000-0000-0000-000000000001"],"servings":2},{"id":"7a000000-0000-0000-0000-000000000002","candidateId":"78000000-0000-0000-0000-000000000002","dinerPersonIds":["74000000-0000-0000-0000-000000000003"],"servings":1}]}]'::jsonb,
 null,'fit-test','fit-test-hash'
);
do $$ begin
  if (select count(*) from public.kwilt_meal_plan_occasions where plan_id='77000000-0000-0000-0000-000000000001') <> 1 then raise exception 'occasion not retained'; end if;
  if (select count(*) from public.kwilt_meal_plan_entries where plan_id='77000000-0000-0000-0000-000000000001') <> 2 then raise exception 'both dishes not retained'; end if;
end $$;

reset role;
update public.kwilt_household_memberships set status='removed',removed_at=now() where id='76000000-0000-0000-0000-000000000003';
do $$ begin
  if exists (
    select 1
    from public.kwilt_meal_planner_preferences
    where household_id='75000000-0000-0000-0000-000000000001'
      and '74000000-0000-0000-0000-000000000003'::uuid = any(usual_diner_person_ids)
  ) then raise exception 'removed diner remained saved'; end if;
end $$;

rollback;
