-- Live rollback-only acceptance. All identities and chores exist only inside this transaction.
-- Exercises the real RPCs as authenticated, with separate adult/child JWT subjects.
begin;
do $$
declare owner_id uuid:=gen_random_uuid(); child_id uuid:=gen_random_uuid(); peer_id uuid:=gen_random_uuid();
 h uuid:=gen_random_uuid(); cm uuid:=gen_random_uuid(); om uuid:=gen_random_uuid();
begin
 perform set_config('kwilt.qa.owner',owner_id::text,true);
 perform set_config('kwilt.qa.child',child_id::text,true);
 perform set_config('kwilt.qa.peer',peer_id::text,true);
 perform set_config('kwilt.qa.household',h::text,true);
 perform set_config('kwilt.qa.child_member',cm::text,true);
 insert into auth.users(id,aud,role,email,is_anonymous) values
 (owner_id,'authenticated','authenticated',owner_id::text||'@home-chore-qa.invalid',false),
 (child_id,'authenticated','authenticated',child_id::text||'@home-chore-qa.invalid',false),
 (peer_id,'authenticated','authenticated',peer_id::text||'@home-chore-qa.invalid',false);
 insert into public.kwilt_people(id,display_name,kind,created_by_user_id) values
 (owner_id,'Home chore QA adult','adult',owner_id),(child_id,'Home chore QA child','dependent',owner_id),(peer_id,'Home chore QA outsider','adult',peer_id);
 insert into public.kwilt_person_auth_bindings(person_id,user_id) values(owner_id,owner_id),(child_id,child_id),(peer_id,peer_id);
 insert into public.kwilt_households(id,name,created_by_user_id) values(h,'Temporary chore QA',owner_id);
 insert into public.kwilt_household_memberships(id,household_id,person_id,role) values (om,h,owner_id,'owner'),(cm,h,child_id,'child');
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('kwilt.qa.owner'),true);
do $$
declare r jsonb;
begin
 r:=public.execute_kwilt_chore_action(jsonb_build_object('requestId',gen_random_uuid(),'operationId','chores.definition.create','payload',jsonb_build_object('fields',jsonb_build_object('title','Recycling','assignedMembershipId',current_setting('kwilt.qa.child_member'),'reviewPolicy','trusted'))));
 r:=public.execute_kwilt_chore_action(jsonb_build_object('requestId',gen_random_uuid(),'operationId','chores.definition.create','payload',jsonb_build_object('fields',jsonb_build_object('title','Dishes','assignedMembershipId',current_setting('kwilt.qa.child_member'),'reviewPolicy','caregiver_review'))));
 if jsonb_array_length(public.kwilt_home_command('feed','{}')->'posts')<>0 then raise exception 'Unexpected historical posts'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('kwilt.qa.child'),true);
do $$
declare o jsonb; request jsonb; result jsonb;
begin
 for o in select value from jsonb_array_elements(public.get_kwilt_chore_snapshot()->'occurrences') loop
 request:=jsonb_build_object('requestId',gen_random_uuid(),'operationId','chores.occurrence.complete','targetId',o->>'id','expectedVersion',o->>'updatedAt','payload','{}'::jsonb);
 result:=public.execute_kwilt_chore_action(request);
 if result is distinct from public.execute_kwilt_chore_action(request) then raise exception 'Retry changed receipt'; end if;
 end loop;
end $$;
select set_config('request.jwt.claim.sub',current_setting('kwilt.qa.owner'),true);
do $$
declare posts jsonb; p jsonb; o jsonb; op text;
begin
 posts:=public.kwilt_home_command('feed','{}')->'posts';
 if jsonb_array_length(posts)<>1 then raise exception 'Expected one grouped update: %',posts; end if;
 p:=posts->0;
 perform set_config('kwilt.qa.post',p->>'id',true);
 if p->>'authorId' is not null or p->>'authorName'<>'Home chore QA child' or p->>'kind'<>'chore_update' then raise exception 'Wrong actor attribution'; end if;
 if jsonb_array_length(p#>'{choreUpdate,items}')<>2 then raise exception 'Expected two chores'; end if;
 if (select count(*) from jsonb_array_elements(p#>'{choreUpdate,items}') i where i->>'state'='waiting_approval')<>1 then raise exception 'Missing pending status'; end if;
 foreach op in array array['draft','publish','discard','edit','delete'] loop
 begin
 perform public.kwilt_home_command(op,jsonb_build_object('id',p->>'id','text','Fake','audience','followers'));
 raise exception 'System post modification was permitted';
 exception when insufficient_privilege then null;
 end;
 end loop;
 perform public.kwilt_home_command('react',jsonb_build_object('id',p->>'id','reaction','heart'));
 perform public.kwilt_home_command('reply',jsonb_build_object('id',gen_random_uuid(),'postId',p->>'id','text','Thanks for helping!'));
 for o in select value from jsonb_array_elements(public.get_kwilt_chore_snapshot()->'occurrences') where value->>'status'='waiting_approval' loop
 perform public.execute_kwilt_chore_action(jsonb_build_object('requestId',gen_random_uuid(),'operationId','chores.review.approve','targetId',o->>'id','expectedVersion',o->>'updatedAt','payload','{}'::jsonb));
 end loop;
 p:=public.kwilt_home_command('conversation',jsonb_build_object('id',current_setting('kwilt.qa.post')))->'post';
 if (p->>'reactionCount')::int<>1 or (p->>'replyCount')::int<>1 then raise exception 'Approval lost responses'; end if;
 if exists(select 1 from jsonb_array_elements(p#>'{choreUpdate,items}') i where i->>'state'<>'completed') then raise exception 'Approval not reflected'; end if;
 perform public.kwilt_home_command('report',jsonb_build_object('id',p->>'id','kind','home_post','reason','other','note','Temporary rollback-only QA'));
end $$;
select set_config('request.jwt.claim.sub',current_setting('kwilt.qa.peer'),true);
do $$ begin
 if jsonb_array_length(public.kwilt_home_command('feed','{}')->'posts')<>0 then raise exception 'Outsider read household updates'; end if;
 begin
 perform public.kwilt_home_command('react',jsonb_build_object('id',current_setting('kwilt.qa.post'),'reaction','heart'));
 raise exception 'Outsider reacted';
 exception when insufficient_privilege then null;
 end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('kwilt.qa.child'),true);
do $$
declare o jsonb;
begin
 for o in select value from jsonb_array_elements(public.get_kwilt_chore_snapshot()->'occurrences') loop
 perform public.execute_kwilt_chore_action(jsonb_build_object('requestId',gen_random_uuid(),'operationId','chores.occurrence.reopen','targetId',o->>'id','expectedVersion',o->>'updatedAt','payload','{}'::jsonb));
 end loop;
end $$;
select set_config('request.jwt.claim.sub',current_setting('kwilt.qa.owner'),true);
do $$ begin
 if jsonb_array_length(public.kwilt_home_command('feed','{}')->'posts')<>0 then raise exception 'Undo left a completed update'; end if;
end $$;
select 'PASS: authenticated Chores completion/retry -> grouped Home update -> approve with responses -> undo; attribution, mutation guard, outsider denial, reporting' as verification;
rollback;
