-- Authored Home content is separate from expiring capability deliveries.
create schema if not exists kwilt_home_private;
revoke all on schema kwilt_home_private from public, anon;
grant usage on schema kwilt_home_private to authenticated;

create table public.kwilt_home_posts (
 id uuid primary key,
 author_id uuid not null references auth.users(id) on delete cascade,
 text text not null default '' check(length(text)<=4000),
 audience text not null check(audience in ('household','people','followers')),
 household_id uuid references public.kwilt_households(id) on delete cascade,
 recipient_ids uuid[] not null default '{}',
 attachment jsonb,
 media jsonb not null default '[]' check(jsonb_typeof(media)='array' and jsonb_array_length(media)<=4),
 state text not null default 'draft' check(state in ('draft','published','deleted')),
 created_at timestamptz not null default clock_timestamp(),
 published_at timestamptz,
 updated_at timestamptz not null default clock_timestamp()
);
create index kwilt_home_posts_recent on public.kwilt_home_posts(published_at desc,id desc) where state='published';
create index kwilt_home_posts_author on public.kwilt_home_posts(author_id);
create index kwilt_home_posts_household on public.kwilt_home_posts(household_id);
create table public.kwilt_home_connections (
 id uuid primary key default gen_random_uuid(),
 follower_id uuid not null references auth.users(id) on delete cascade,
 target_user_id uuid references auth.users(id) on delete cascade,
 target_household_id uuid references public.kwilt_households(id) on delete cascade,
 state text not null default 'pending' check(state in ('pending','accepted','removed')),
 created_at timestamptz not null default clock_timestamp(),
 accepted_at timestamptz,
 check(num_nonnulls(target_user_id,target_household_id)=1),
 check(target_user_id is distinct from follower_id)
);
create unique index kwilt_home_person_connection on public.kwilt_home_connections(follower_id,target_user_id) where state<>'removed';
create unique index kwilt_home_household_connection on public.kwilt_home_connections(follower_id,target_household_id) where state<>'removed';
create index kwilt_home_connections_target_user on public.kwilt_home_connections(target_user_id);
create index kwilt_home_connections_target_household on public.kwilt_home_connections(target_household_id);
create table public.kwilt_home_recipients (
 post_id uuid not null references public.kwilt_home_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 basis text not null check(basis in ('household','people','followers')),
 connection_id uuid references public.kwilt_home_connections(id) on delete cascade,
 primary key(post_id,user_id)
);
create index kwilt_home_recipients_user on public.kwilt_home_recipients(user_id,post_id);
create index kwilt_home_recipients_connection on public.kwilt_home_recipients(connection_id);
create table public.kwilt_home_replies (
 id uuid primary key, post_id uuid not null references public.kwilt_home_posts(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 text text not null check(length(trim(text)) between 1 and 2000),
 created_at timestamptz not null default clock_timestamp()
);
create index kwilt_home_replies_post on public.kwilt_home_replies(post_id,created_at);
create index kwilt_home_replies_author on public.kwilt_home_replies(author_id);
create table public.kwilt_home_reactions (
 post_id uuid not null references public.kwilt_home_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 reaction text not null check(reaction in ('heart','cheer','clap')),
 primary key(post_id,user_id)
);
create index kwilt_home_reactions_user on public.kwilt_home_reactions(user_id);
create table public.kwilt_home_saved_places (
 user_id uuid not null references auth.users(id) on delete cascade,
 post_id uuid not null references public.kwilt_home_posts(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,post_id)
);
create index kwilt_home_saved_places_post on public.kwilt_home_saved_places(post_id);

alter table public.kwilt_ugc_reports drop constraint kwilt_ugc_reports_target_kind_check;
alter table public.kwilt_ugc_reports add constraint kwilt_ugc_reports_target_kind_check check(target_kind in ('shared_delivery','goal_feed_event','user','household_member','meal_reaction','guest_meal_feedback','home_post','home_reply'));

-- Permanent adults only; profile selection on a shared device is not identity.
create function kwilt_home_private.is_adult(u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=u and not coalesce(is_anonymous,false))
 and not exists(select 1 from public.kwilt_person_auth_bindings b join public.kwilt_people p on p.id=b.person_id
 where b.user_id=u and b.status='active' and p.kind='dependent')
 and not exists(select 1 from public.kwilt_person_auth_bindings b join public.kwilt_household_memberships m on m.person_id=b.person_id
 where b.user_id=u and b.status='active' and m.status='active' and m.role='child');
$$;
create function kwilt_home_private.blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.kwilt_blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a));
$$;
create function kwilt_home_private.member(u uuid,h uuid,before_at timestamptz default null) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.kwilt_person_auth_bindings b join public.kwilt_household_memberships m on m.person_id=b.person_id
 where b.user_id=u and b.status='active' and m.household_id=h and m.status='active' and m.role in ('owner','caregiver') and (before_at is null or m.joined_at<=before_at));
$$;
create function kwilt_home_private.known(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select a<>b and kwilt_home_private.is_adult(b) and not kwilt_home_private.blocked(a,b) and (
 exists(select 1 from public.kwilt_friendships where status='active' and ((user_a=a and user_b=b) or (user_a=b and user_b=a)))
 or exists(select 1 from public.kwilt_households h where kwilt_home_private.member(a,h.id) and kwilt_home_private.member(b,h.id)));
$$;
create function kwilt_home_private.name(u uuid) returns text language sql stable security definer set search_path='' as $$
 select coalesce((select p.display_name from public.kwilt_people p join public.kwilt_person_auth_bindings b on b.person_id=p.id where b.user_id=u and b.status='active' limit 1),'Someone in Kwilt');
$$;
create function kwilt_home_private.can_read(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select kwilt_home_private.is_adult(auth.uid()) and exists(select 1 from public.kwilt_home_posts p where p.id=p_id and p.state<>'deleted' and (
 p.author_id=auth.uid() or (p.state='published' and not kwilt_home_private.blocked(auth.uid(),p.author_id) and exists(
 select 1 from public.kwilt_home_recipients r where r.post_id=p.id and r.user_id=auth.uid() and (
 (r.basis='household' and kwilt_home_private.member(auth.uid(),p.household_id,p.published_at) and kwilt_home_private.member(p.author_id,p.household_id,p.published_at))
 or (r.basis='people' and kwilt_home_private.known(p.author_id,auth.uid()))
 or (r.basis='followers' and exists(select 1 from public.kwilt_home_connections c where c.id=r.connection_id and c.state='accepted' and c.accepted_at<=p.published_at and (c.target_household_id is null or kwilt_home_private.member(p.author_id,c.target_household_id,p.published_at))))
 )))));
$$;
create function kwilt_home_private.post_json(p public.kwilt_home_posts) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'authorId',p.author_id,'authorName',kwilt_home_private.name(p.author_id),'text',p.text,'audience',p.audience,
 'householdId',p.household_id,'householdName',(select name from public.kwilt_households where id=p.household_id),'attachment',p.attachment,'media',p.media,'createdAt',p.published_at,'updatedAt',p.updated_at,
 'reactionCount',(select count(*) from public.kwilt_home_reactions r where r.post_id=p.id and not kwilt_home_private.blocked(auth.uid(),r.user_id)),
 'myReaction',(select reaction from public.kwilt_home_reactions where post_id=p.id and user_id=auth.uid()),
 'replyCount',(select count(*) from public.kwilt_home_replies r where r.post_id=p.id and not kwilt_home_private.blocked(auth.uid(),r.author_id)));
$$;

create function kwilt_home_private.command(op text,args jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare u uuid:=auth.uid(); p public.kwilt_home_posts; c public.kwilt_home_connections;
 pid uuid; h uuid; target uuid; item jsonb; a jsonb; result jsonb; at_time timestamptz:=clock_timestamp();
begin
 if not kwilt_home_private.is_adult(u) then raise exception 'Home sharing requires a permanent adult account' using errcode='42501'; end if;
 if op in ('draft','edit','reply') and not public.kwilt_shared_text_allowed(args->>'text') then raise exception 'shared_text_not_allowed: Change that wording and try again.' using errcode='22023'; end if;
 if op='cleanup' then
 return coalesce((select jsonb_agg(o.name) from storage.objects o where o.bucket_id='home-moments' and exists(select 1 from public.kwilt_home_posts p where p.author_id=u and o.name like u::text||'/'||p.id::text||'/%' and (p.state='deleted' or (p.state='draft' and not exists(select 1 from jsonb_array_elements(p.media) m where m->>'path'=o.name))))),'[]');
 elsif op='discard' then
 select * into p from public.kwilt_home_posts where id=(args->>'id')::uuid for update;
 if p.id is null then return jsonb_build_object('ok',true); end if;
 if p.author_id<>u or p.state='published' then raise exception 'This draft cannot be discarded' using errcode='42501'; end if;
 update public.kwilt_home_posts set state='deleted',text='',attachment=null,updated_at=clock_timestamp() where id=p.id;
 return jsonb_build_object('ok',true);
 elsif op='refresh_posts' then
 return jsonb_build_object('posts',coalesce((select jsonb_agg(kwilt_home_private.post_json(p) order by p.published_at desc,p.id desc) from public.kwilt_home_posts p where p.state='published' and kwilt_home_private.can_read(p.id) and p.id in (select value::uuid from jsonb_array_elements_text(args->'ids'))),'[]'));
 elsif op='bootstrap' then
 return jsonb_build_object('households',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from public.kwilt_households where kwilt_home_private.member(u,id)),'[]'),
 'people',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',kwilt_home_private.name(id))) from auth.users where kwilt_home_private.known(u,id)),'[]'),
 'householdChoices',coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'name',h.name)) from public.kwilt_households h where not kwilt_home_private.member(u,h.id) and exists(select 1 from auth.users x where kwilt_home_private.known(u,x.id) and kwilt_home_private.member(x.id,h.id))),'[]'));
 elsif op='notes' then
 return coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'eventKind','goal_note','sourceCapability','goals','sourceEntityType','goal_feed_event','sourceEntityId',e.id,
 'actorUserId',e.actor_id,'actorDisplayName',kwilt_home_private.name(e.actor_id),'title','A note on your goal','body',left(e.payload->>'text',500),
 'destination',jsonb_build_object('kind','goal','goalId',e.entity_id),'state','available','settledReason',null,'createdAt',e.created_at,'updatedAt',e.created_at,'settledAt',null,'expiresAt',null,'retainUntil','9999-01-01T00:00:00Z') order by e.created_at desc)
 from (select ev.* from public.kwilt_feed_events ev where ev.entity_type='goal' and ev.type='checkin_reply' and ev.actor_id<>u and length(trim(coalesce(ev.payload->>'text','')))>0 and not kwilt_home_private.blocked(u,ev.actor_id)
 and exists(select 1 from public.kwilt_memberships m where m.entity_type='goal' and m.entity_id=ev.entity_id and m.user_id=u and m.status='active')
 order by ev.created_at desc limit 100) e),'[]');
 elsif op='feed' then
 return jsonb_build_object('posts',coalesce((select jsonb_agg(kwilt_home_private.post_json(q) order by q.published_at desc,q.id desc) from (
 select p.* from public.kwilt_home_posts p where p.state='published' and kwilt_home_private.can_read(p.id)
 and (args->>'householdId' is null or p.household_id=(args->>'householdId')::uuid)
 and (args->>'authorId' is null or p.author_id=(args->>'authorId')::uuid)
 and (not coalesce((args->>'saved')::boolean,false) or exists(select 1 from public.kwilt_home_saved_places s where s.post_id=p.id and s.user_id=u))
 and (args->>'before' is null or (p.published_at,p.id)<((args->>'before')::timestamptz,(args->>'beforeId')::uuid))
 order by p.published_at desc,p.id desc limit 30) q),'[]'));
 elsif op='draft' then
 pid:=(args->>'id')::uuid; h:=(args->>'householdId')::uuid; a:=nullif(args->'attachment','null'::jsonb);
 if args->>'audience'='household' and h is null then raise exception 'Choose your household'; end if;
 if h is not null and not kwilt_home_private.member(u,h) then raise exception 'Household access required' using errcode='42501'; end if;
 if length(coalesce(args->>'text',''))>4000 then raise exception 'Post is too long'; end if;
 if a is not null then
 if a->>'kind' not in ('place','outing') or not (a ? 'kind') then raise exception 'Invalid attachment'; end if;
 if a->>'kind'='place' then
 if a-'kind'-'name'-'latitude'-'longitude'<>'{}'::jsonb or length(trim(coalesce(a->>'name',''))) not between 1 and 160
 or not (a ? 'latitude' and a ? 'longitude') or not ((a->>'latitude')::numeric between -90 and 90 and (a->>'longitude')::numeric between -180 and 180) then raise exception 'Invalid place preview'; end if;
 else
 if a-'kind'-'title'<>'{}'::jsonb or length(trim(coalesce(a->>'title',''))) not between 1 and 160 then raise exception 'Invalid outing preview'; end if;
 end if;
 end if;
 if exists(select 1 from jsonb_array_elements_text(coalesce(args->'recipientIds','[]')) x where not kwilt_home_private.known(u,x::uuid)) then raise exception 'Choose people you are connected to'; end if;
 if args->>'audience'='people' and jsonb_array_length(coalesce(args->'recipientIds','[]')) not between 1 and 50 then raise exception 'Choose at least one person'; end if;
 for item in select value from jsonb_array_elements(coalesce(args->'media','[]')) loop
 if item-'path'-'alt'<>'{}'::jsonb or coalesce(item->>'path','') !~ ('^'||u::text||'/'||pid::text||'/[a-zA-Z0-9-]+\.jpg$') or length(trim(coalesce(item->>'alt',''))) not between 1 and 200 then raise exception 'Invalid photo'; end if;
 end loop;
 insert into public.kwilt_home_posts(id,author_id,text,audience,household_id,recipient_ids,attachment,media)
 values(pid,u,coalesce(args->>'text',''),args->>'audience',h,array(select value::uuid from jsonb_array_elements_text(coalesce(args->'recipientIds','[]'))),a,coalesce(args->'media','[]'))
 on conflict(id) do update set text=excluded.text,audience=excluded.audience,household_id=excluded.household_id,recipient_ids=excluded.recipient_ids,attachment=excluded.attachment,media=excluded.media,updated_at=clock_timestamp()
 where kwilt_home_posts.author_id=u and kwilt_home_posts.state='draft';
 if not found then raise exception 'Draft unavailable'; end if;
 return jsonb_build_object('id',pid);
 elsif op='publish' then
 select * into p from public.kwilt_home_posts where id=(args->>'id')::uuid and author_id=u for update;
 if p.id is null or p.state='deleted' then raise exception 'Draft unavailable'; end if;
 if p.state='published' then return jsonb_build_object('id',p.id); end if;
 if trim(p.text)='' and p.attachment is null and jsonb_array_length(p.media)=0 then raise exception 'Add a thought or photo'; end if;
 if p.household_id is not null and not kwilt_home_private.member(u,p.household_id) then raise exception 'Household access changed'; end if;
 for item in select value from jsonb_array_elements(p.media) loop
 if not exists(select 1 from storage.objects where bucket_id='home-moments' and name=item->>'path') then raise exception 'Photo upload is not complete'; end if;
 end loop;
 if p.audience='people' and exists(select 1 from unnest(p.recipient_ids) r where not kwilt_home_private.known(u,r)) then raise exception 'Audience changed. Review your post.'; end if;
 update public.kwilt_home_posts set state='published',published_at=at_time,updated_at=at_time where id=p.id;
 if p.audience='household' then
 insert into public.kwilt_home_recipients(post_id,user_id,basis)
 select p.id,x.id,'household' from auth.users x where x.id<>u and kwilt_home_private.is_adult(x.id) and kwilt_home_private.member(x.id,p.household_id) and not kwilt_home_private.blocked(u,x.id);
 elsif p.audience='people' then
 insert into public.kwilt_home_recipients(post_id,user_id,basis) select p.id,r,'people' from unnest(p.recipient_ids) r on conflict do nothing;
 else
 insert into public.kwilt_home_recipients(post_id,user_id,basis,connection_id)
 select p.id,c.follower_id,'followers',c.id from public.kwilt_home_connections c where c.state='accepted' and kwilt_home_private.is_adult(c.follower_id) and not kwilt_home_private.blocked(u,c.follower_id)
 and ((p.household_id is null and c.target_user_id=u) or c.target_household_id=p.household_id);
 end if;
 return jsonb_build_object('id',p.id);
 elsif op in ('conversation','reply','react','edit','delete','save_place') then
 pid:=coalesce(args->>'postId',args->>'id')::uuid;
 if not kwilt_home_private.can_read(pid) then raise exception 'This post is no longer available' using errcode='42501'; end if;
 select * into p from public.kwilt_home_posts where id=pid;
 if op='conversation' then
 return jsonb_build_object('post',kwilt_home_private.post_json(p),'replies',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'authorId',r.author_id,'authorName',kwilt_home_private.name(r.author_id),'text',r.text,'createdAt',r.created_at) order by r.created_at) from public.kwilt_home_replies r where r.post_id=pid and not kwilt_home_private.blocked(u,r.author_id)),'[]'));
 elsif op='reply' then
 if p.state<>'published' then raise exception 'Publish before responding'; end if;
 insert into public.kwilt_home_replies(id,post_id,author_id,text) values((args->>'id')::uuid,pid,u,trim(args->>'text')) on conflict(id) do nothing;
 if exists(select 1 from public.kwilt_home_replies where id=(args->>'id')::uuid and (author_id<>u or post_id<>pid)) then raise exception 'Reply unavailable'; end if;
 elsif op='react' then
 if p.state<>'published' then raise exception 'Publish before responding'; end if;
 if args->>'reaction' is null then delete from public.kwilt_home_reactions where post_id=pid and user_id=u;
 else insert into public.kwilt_home_reactions values(pid,u,args->>'reaction') on conflict(post_id,user_id) do update set reaction=excluded.reaction; end if;
 elsif op='save_place' then
 if p.attachment->>'kind' is distinct from 'place' then raise exception 'No place to save'; end if;
 insert into public.kwilt_home_saved_places values(u,pid,now()) on conflict do nothing;
 else
 if p.author_id<>u then raise exception 'Only the author can change this post' using errcode='42501'; end if;
 if op='delete' then update public.kwilt_home_posts set state='deleted',text='',attachment=null,updated_at=clock_timestamp() where id=pid;
 delete from public.kwilt_home_replies where post_id=pid; delete from public.kwilt_home_reactions where post_id=pid;
 else update public.kwilt_home_posts set text=trim(args->>'text'),updated_at=clock_timestamp() where id=pid;
 end if;
 end if;
 return jsonb_build_object('id',pid);
 elsif op='delete_reply' then
 delete from public.kwilt_home_replies where id=(args->>'id')::uuid and author_id=u and kwilt_home_private.can_read(post_id);
 if not found then raise exception 'Reply unavailable' using errcode='42501'; end if;
 return jsonb_build_object('id',args->>'id');
 elsif op='report' then
 pid:=(args->>'id')::uuid;
 if args->>'kind'='home_reply' then
 select post_id into pid from public.kwilt_home_replies where id=(args->>'id')::uuid;
 end if;
 if not kwilt_home_private.can_read(pid) then raise exception 'Report target unavailable' using errcode='42501'; end if;
 select * into p from public.kwilt_home_posts where id=pid;
 target:=p.author_id; result:=kwilt_home_private.post_json(p);
 if args->>'kind'='home_reply' then
 select author_id,jsonb_build_object('postId',post_id,'text',text,'createdAt',created_at) into target,result from public.kwilt_home_replies where id=(args->>'id')::uuid;
 end if;
 if target=u then raise exception 'Cannot report your own content'; end if;
 if args->>'reason' not in ('harassment','hate_or_abuse','sexual_content','violence_or_threat','spam_or_scam','privacy','other') or args->>'reason' is null or length(coalesce(args->>'note',''))>500 then raise exception 'Invalid report'; end if;
 insert into public.kwilt_ugc_reports(reporter_user_id,reported_user_id,target_kind,target_id,reason,reporter_note,snapshot,priority,response_due_at)
 values(u,target,case when args->>'kind'='home_reply' then 'home_reply' else 'home_post' end,(args->>'id')::uuid,args->>'reason',args->>'note',result,
 case when args->>'reason' in ('sexual_content','violence_or_threat','privacy') then 'urgent' else 'standard' end,
 now()+case when args->>'reason' in ('sexual_content','violence_or_threat','privacy') then interval '4 hours' else interval '24 hours' end) returning id into pid;
 return jsonb_build_object('reportId',pid,'status','submitted','followup',case when exists(select 1 from public.kwilt_households h where kwilt_home_private.member(u,h.id) and kwilt_home_private.member(target,h.id)) then jsonb_build_object('kind','manage_household','reporterRole','caregiver') else jsonb_build_object('kind','peer_block') end);
 elsif op='connections' then
 return coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'followerId',c.follower_id,'followerName',kwilt_home_private.name(c.follower_id),'targetUserId',c.target_user_id,'targetHouseholdId',c.target_household_id,
 'targetName',case when c.target_household_id is null then kwilt_home_private.name(c.target_user_id) else (select name from public.kwilt_households where id=c.target_household_id) end,
 'state',c.state,'incoming',c.follower_id<>u) order by c.created_at desc) from public.kwilt_home_connections c where c.state<>'removed' and (c.follower_id=u or c.target_user_id=u or kwilt_home_private.member(u,c.target_household_id))),'[]');
 elsif op='follow_request' then
 h:=(args->>'targetHouseholdId')::uuid; target:=(args->>'targetUserId')::uuid;
 if (target is not null and not kwilt_home_private.known(u,target)) or (h is not null and not exists(select 1 from auth.users x where kwilt_home_private.known(u,x.id) and kwilt_home_private.member(x.id,h))) then raise exception 'Choose a connected person or household'; end if;
 select * into c from public.kwilt_home_connections where follower_id=u and state<>'removed' and (target_user_id=target or target_household_id=h);
 if c.id is not null then return jsonb_build_object('id',c.id); end if;
 insert into public.kwilt_home_connections(follower_id,target_user_id,target_household_id) values(u,target,h) returning id into pid;
 return jsonb_build_object('id',pid);
 elsif op in ('follow_accept','follow_remove') then
 select * into c from public.kwilt_home_connections where id=(args->>'id')::uuid for update;
 if c.id is null or not (c.target_user_id=u or kwilt_home_private.member(u,c.target_household_id) or (op='follow_remove' and c.follower_id=u)) then raise exception 'Connection access denied' using errcode='42501'; end if;
 if op='follow_accept' then
 if c.state<>'pending' or not kwilt_home_private.is_adult(c.follower_id) or kwilt_home_private.blocked(u,c.follower_id) then raise exception 'Request unavailable'; end if;
 update public.kwilt_home_connections set state='accepted',accepted_at=clock_timestamp() where id=c.id;
 else update public.kwilt_home_connections set state='removed' where id=c.id; end if;
 return jsonb_build_object('id',c.id);
 end if;
 raise exception 'Unknown Home action';
end; $$;

create function public.kwilt_home_command(op text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$
 select kwilt_home_private.command(op,args);
$$;
revoke all on all functions in schema kwilt_home_private from public,anon,authenticated;
grant execute on function kwilt_home_private.command(text,jsonb),kwilt_home_private.can_read(uuid) to authenticated;
revoke all on function public.kwilt_home_command(text,jsonb) from public,anon;
grant execute on function public.kwilt_home_command(text,jsonb) to authenticated;

do $$ declare t text; begin
 foreach t in array array['kwilt_home_posts','kwilt_home_connections','kwilt_home_recipients','kwilt_home_replies','kwilt_home_reactions','kwilt_home_saved_places'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
-- No direct table grants: all data operations recheck current account/authority.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('home-moments','home-moments',false,10485760,array['image/jpeg']) on conflict(id) do nothing;
create function kwilt_home_private.media_access(object_name text,writing boolean) returns boolean language sql stable security definer set search_path='' as $$
 select kwilt_home_private.is_adult(auth.uid()) and exists(select 1 from public.kwilt_home_posts p
 where (writing and p.author_id=auth.uid() and p.state='draft' or not writing and (kwilt_home_private.can_read(p.id) or p.author_id=auth.uid()))
 and (exists(select 1 from jsonb_array_elements(p.media) m where m->>'path'=object_name) or (not writing and p.author_id=auth.uid() and object_name like auth.uid()::text||'/'||p.id::text||'/%')));
$$;
revoke all on function kwilt_home_private.media_access(text,boolean) from public,anon;
grant execute on function kwilt_home_private.media_access(text,boolean) to authenticated;
create policy home_photo_read on storage.objects for select to authenticated using(bucket_id='home-moments' and kwilt_home_private.media_access(name,false));
create policy home_photo_insert on storage.objects for insert to authenticated with check(bucket_id='home-moments' and kwilt_home_private.media_access(name,true));
create policy home_photo_update on storage.objects for update to authenticated using(bucket_id='home-moments' and kwilt_home_private.media_access(name,true)) with check(bucket_id='home-moments' and kwilt_home_private.media_access(name,true));
create function kwilt_home_private.media_remove(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select kwilt_home_private.is_adult(auth.uid()) and exists(select 1 from public.kwilt_home_posts p where p.author_id=auth.uid() and object_name like auth.uid()::text||'/'||p.id::text||'/%' and (p.state='deleted' or (p.state='draft' and not exists(select 1 from jsonb_array_elements(p.media) m where m->>'path'=object_name))));
$$;
revoke all on function kwilt_home_private.media_remove(text) from public,anon;
grant execute on function kwilt_home_private.media_remove(text) to authenticated;
create policy home_photo_delete on storage.objects for delete to authenticated using(bucket_id='home-moments' and kwilt_home_private.media_remove(name));
