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
do $$ declare p uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); r jsonb; begin
 perform set_config('kwilt.qa.post',p::text,true);
 perform public.kwilt_home_command('draft',jsonb_build_object('id',p,'text','Rollback-only QA','audience','household','householdId',current_setting('kwilt.qa.household'),'attachment',jsonb_build_object('kind','place','name','Fixture park','latitude',40,'longitude',-111)));
 perform public.kwilt_home_command('publish',jsonb_build_object('id',p));
 perform public.kwilt_home_command('bookmark',jsonb_build_object('id',p,'saved',true));
 perform public.kwilt_home_command('collection_put',jsonb_build_object('id',c,'name','QA collection'));
 perform public.kwilt_home_command('collect',jsonb_build_object('id',p,'collectionId',c));
 if jsonb_array_length(public.kwilt_home_command('library',jsonb_build_object('collectionId',c))->'posts')<>1 then raise exception 'Library failed';end if;
 perform public.kwilt_home_command('save_place',jsonb_build_object('id',p));
 perform public.kwilt_home_command('react',jsonb_build_object('id',p,'reaction','heart'));
 perform public.kwilt_home_command('reply',jsonb_build_object('id',gen_random_uuid(),'postId',p,'text','Fixture reply'));
 r:=public.kwilt_home_command('conversation',jsonb_build_object('id',p));
 if r#>>'{post,replyPreview,text}'<>'Fixture reply' or jsonb_array_length(r#>'{post,reactors}')<>1 then raise exception 'New serializer not wired';end if;
 perform public.kwilt_home_command('collection_delete',jsonb_build_object('id',c));
 if jsonb_array_length(public.kwilt_home_command('library')->'posts')<>1 then raise exception 'Deleting collection unsaved post';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('kwilt.qa.peer'),true);
do $$ begin
 if jsonb_array_length(public.kwilt_home_command('library')->'posts')<>0 then raise exception 'Private library leaked';end if;
 begin perform public.kwilt_home_command('bookmark',jsonb_build_object('id',current_setting('kwilt.qa.post')));raise exception 'Outsider saved private post';exception when insufficient_privilege then null;end;
 if jsonb_array_length(public.kwilt_home_command('catchup'))<>0 then raise exception 'Catch-up leaked';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('kwilt.qa.child'),true);
do $$ begin
 begin perform public.kwilt_home_command('collections');raise exception 'Child bypassed adult boundary';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('kwilt.qa.owner'),true);
do $$ begin
 perform public.kwilt_home_command('delete',jsonb_build_object('id',current_setting('kwilt.qa.post')));
 if jsonb_array_length(public.kwilt_home_command('library')->'posts')<>0 then raise exception 'Deleted post retained';end if;
 if jsonb_array_length(public.kwilt_home_command('explore_places'))<>1 then raise exception 'Explicit place copy missing';end if;
end $$;
reset role;
select 'PASS: live private saves, collections, preview, child boundary and explicit Explore copy' as result;
rollback;
