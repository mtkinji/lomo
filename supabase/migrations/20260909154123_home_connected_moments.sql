-- Additive private product state; every projection intersects current Home authority.
create table public.kwilt_home_bookmarks (
 user_id uuid not null references auth.users(id) on delete cascade,
 post_id uuid not null references public.kwilt_home_posts(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,post_id)
);
-- Explicit Explore copy; never marks a visit or reveals a route. Survives post withdrawal.
create table public.kwilt_home_explore_places (
 user_id uuid not null references auth.users(id) on delete cascade,
 source_post_id uuid not null,
 name text not null, latitude double precision not null, longitude double precision not null,
 created_at timestamptz not null default now(), primary key(user_id,source_post_id)
);
create table public.kwilt_home_seen (
 user_id uuid not null references auth.users(id) on delete cascade,
 post_id uuid not null references public.kwilt_home_posts(id) on delete cascade,
 seen_at timestamptz not null default now(), primary key(user_id,post_id)
);
create table public.kwilt_home_collections (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 80), created_at timestamptz not null default now()
);
create index kwilt_home_collections_owner on public.kwilt_home_collections(user_id);
create table public.kwilt_home_collection_items (
 collection_id uuid not null references public.kwilt_home_collections(id) on delete cascade,
 user_id uuid not null, post_id uuid not null,
 foreign key(user_id,post_id) references public.kwilt_home_bookmarks(user_id,post_id) on delete cascade,
 primary key(collection_id,post_id)
);
create index kwilt_home_bookmarks_post on public.kwilt_home_bookmarks(post_id);
create index kwilt_home_seen_post on public.kwilt_home_seen(post_id);
do $$ declare t text; begin
 foreach t in array array['kwilt_home_explore_places','kwilt_home_bookmarks','kwilt_home_seen','kwilt_home_collections','kwilt_home_collection_items'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
-- Preserve existing post/chore serialization and dispatcher as private implementation details.
alter function kwilt_home_private.post_json(public.kwilt_home_posts) rename to post_json_v1;
create function kwilt_home_private.post_json(p public.kwilt_home_posts) returns jsonb language sql stable security definer set search_path='' as $$
 select kwilt_home_private.post_json_v1(p) || jsonb_build_object(
 'saved',exists(select 1 from public.kwilt_home_bookmarks b where b.user_id=auth.uid() and b.post_id=p.id),
 'seen',exists(select 1 from public.kwilt_home_seen s where s.user_id=auth.uid() and s.post_id=p.id),
 'reactors',coalesce((select jsonb_agg(jsonb_build_object('id',r.user_id,'name',kwilt_home_private.name(r.user_id))) from (select user_id from public.kwilt_home_reactions where post_id=p.id and not kwilt_home_private.blocked(auth.uid(),user_id) order by user_id limit 2) r),'[]'),
 'replyPreview',(select jsonb_build_object('id',r.id,'authorId',r.author_id,'authorName',kwilt_home_private.name(r.author_id),'text',r.text,'createdAt',r.created_at) from public.kwilt_home_replies r where r.post_id=p.id and not kwilt_home_private.blocked(auth.uid(),r.author_id) order by r.created_at desc,r.id desc limit 1));
$$;
alter function kwilt_home_private.command(text,jsonb) rename to command_v1;
create function kwilt_home_private.command(op text,args jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare u uuid:=auth.uid(); pid uuid; cid uuid; result jsonb;
begin
 if not kwilt_home_private.is_adult(u) then raise exception 'Home sharing requires a permanent adult account' using errcode='42501'; end if;
 if op='save_place' then
 result:=kwilt_home_private.command_v1(op,args);
 insert into public.kwilt_home_explore_places(user_id,source_post_id,name,latitude,longitude)
 select u,p.id,p.attachment->>'name',(p.attachment->>'latitude')::double precision,(p.attachment->>'longitude')::double precision from public.kwilt_home_posts p where p.id=(args->>'id')::uuid on conflict do nothing;
 return result;
 elsif op='explore_places' then
 return coalesce((select jsonb_agg(jsonb_build_object('id',source_post_id,'name',name,'latitude',latitude,'longitude',longitude) order by created_at desc) from public.kwilt_home_explore_places where user_id=u),'[]');
 elsif op='remove_explore_place' then
 delete from public.kwilt_home_explore_places where user_id=u and source_post_id=(args->>'id')::uuid;
 return jsonb_build_object('ok',true);
 elsif op='bookmark' then
 pid:=(args->>'id')::uuid;
 if coalesce((args->>'saved')::boolean,true) then
 if not exists(select 1 from public.kwilt_home_posts where id=pid and state='published' and kwilt_home_private.can_read(id)) then raise exception 'Post unavailable' using errcode='42501'; end if;
 insert into public.kwilt_home_bookmarks values(u,pid,now()) on conflict do nothing;
 else delete from public.kwilt_home_bookmarks where user_id=u and post_id=pid; end if;
 return jsonb_build_object('ok',true);
 elsif op='seen' then
 if jsonb_array_length(args->'ids')>100 then raise exception 'Too many moments'; end if;
 insert into public.kwilt_home_seen(user_id,post_id) select u,p.id from public.kwilt_home_posts p where p.id in(select value::uuid from jsonb_array_elements_text(args->'ids')) and p.state='published' and kwilt_home_private.can_read(p.id) on conflict do nothing;
 return jsonb_build_object('ok',true);
 elsif op='reactors' then
 pid:=(args->>'id')::uuid;
 if not kwilt_home_private.can_read(pid) then raise exception 'Post unavailable' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',user_id,'name',kwilt_home_private.name(user_id))) from public.kwilt_home_reactions where post_id=pid and not kwilt_home_private.blocked(u,user_id)),'[]');
 elsif op='catchup' then
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'kind',kind,'count',n) order by latest desc) from (
 select p.author_id id,kwilt_home_private.name(p.author_id) name,'person' kind,count(*) n,max(p.published_at) latest from public.kwilt_home_posts p where p.kind='moment' and p.author_id<>u and p.state='published' and kwilt_home_private.can_read(p.id) and not exists(select 1 from public.kwilt_home_seen s where s.user_id=u and s.post_id=p.id) group by p.author_id
 union all
 select h.id,h.name,'household',count(*),max(p.published_at) from public.kwilt_home_posts p join public.kwilt_households h on h.id=p.household_id where p.kind='moment' and p.author_id<>u and p.state='published' and kwilt_home_private.can_read(p.id) and not exists(select 1 from public.kwilt_home_seen s where s.user_id=u and s.post_id=p.id) group by h.id,h.name
 order by latest desc limit 12) x),'[]');
 elsif op='catchup_posts' then
 return jsonb_build_object('posts',coalesce((select jsonb_agg(kwilt_home_private.post_json(p) order by p.published_at,p.id) from (select * from public.kwilt_home_posts p where p.kind='moment' and p.state='published' and p.author_id<>u and kwilt_home_private.can_read(p.id) and p.published_at<=coalesce((args->>'until')::timestamptz,now()) and (case when args->>'kind'='household' then p.household_id else p.author_id end)=(args->>'id')::uuid and not exists(select 1 from public.kwilt_home_seen s where s.user_id=u and s.post_id=p.id) order by p.published_at,p.id limit 100) p),'[]'));
 elsif op='collection_put' then
 cid:=(args->>'id')::uuid;
 insert into public.kwilt_home_collections(id,user_id,name) values(cid,u,trim(args->>'name')) on conflict(id) do update set name=excluded.name where kwilt_home_collections.user_id=u;
 if not exists(select 1 from public.kwilt_home_collections where id=cid and user_id=u) then raise exception 'Collection unavailable' using errcode='42501'; end if;
 return jsonb_build_object('id',cid);
 elsif op='collection_delete' then
 delete from public.kwilt_home_collections where id=(args->>'id')::uuid and user_id=u; return jsonb_build_object('ok',true);
 elsif op='collect' then
 cid:=(args->>'collectionId')::uuid;pid:=(args->>'id')::uuid;
 if not exists(select 1 from public.kwilt_home_collections where id=cid and user_id=u) or not kwilt_home_private.can_read(pid) then raise exception 'Collection unavailable' using errcode='42501'; end if;
 if coalesce((args->>'included')::boolean,true) then
 insert into public.kwilt_home_bookmarks values(u,pid,now()) on conflict do nothing;
 insert into public.kwilt_home_collection_items values(cid,u,pid) on conflict do nothing;
 else delete from public.kwilt_home_collection_items where collection_id=cid and user_id=u and post_id=pid; end if;
 return jsonb_build_object('ok',true);
 elsif op='collections' then
 return coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'included',exists(select 1 from public.kwilt_home_collection_items i where i.collection_id=c.id and i.post_id=(args->>'postId')::uuid)) order by c.created_at desc) from public.kwilt_home_collections c where c.user_id=u),'[]');
 elsif op='library' then
 return jsonb_build_object('posts',coalesce((select jsonb_agg(kwilt_home_private.post_json(p) order by p.published_at desc,p.id desc) from (select p.* from public.kwilt_home_posts p join public.kwilt_home_bookmarks b on b.post_id=p.id and b.user_id=u where p.state='published' and kwilt_home_private.can_read(p.id) and (args->>'collectionId' is null or exists(select 1 from public.kwilt_home_collection_items i where i.user_id=u and i.post_id=p.id and i.collection_id=(args->>'collectionId')::uuid)) and (not coalesce((args->>'places')::boolean,false) or p.attachment->>'kind'='place') and (args->>'before' is null or (p.published_at,p.id)<((args->>'before')::timestamptz,(args->>'beforeId')::uuid)) and (coalesce(args->>'query','')='' or position(lower(args->>'query') in lower(p.text||' '||coalesce(p.attachment->>'name','')))>0) order by p.published_at desc,p.id desc limit 30) p),'[]'));
 end if;
 return kwilt_home_private.command_v1(op,args);
end $$;
-- SQL-language wrappers bind function OIDs: explicitly point the public entry at v2.
create or replace function public.kwilt_home_command(op text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select kwilt_home_private.command(op,args); $$;
revoke all on function kwilt_home_private.post_json_v1(public.kwilt_home_posts),kwilt_home_private.post_json(public.kwilt_home_posts),kwilt_home_private.command_v1(text,jsonb),kwilt_home_private.command(text,jsonb) from public,anon,authenticated;
grant execute on function kwilt_home_private.command(text,jsonb) to authenticated;
