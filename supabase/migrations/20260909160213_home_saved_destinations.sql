create or replace function kwilt_home_private.post_json(p public.kwilt_home_posts) returns jsonb language sql stable security definer set search_path='' as $$
 select kwilt_home_private.post_json_v1(p) || jsonb_build_object(
 'savedToExplore',exists(select 1 from public.kwilt_home_explore_places s where s.user_id=auth.uid() and s.source_post_id=p.id),
 'savedAt',(select b.created_at from public.kwilt_home_bookmarks b where b.user_id=auth.uid() and b.post_id=p.id),
 'saved',exists(select 1 from public.kwilt_home_bookmarks b where b.user_id=auth.uid() and b.post_id=p.id),
 'seen',exists(select 1 from public.kwilt_home_seen s where s.user_id=auth.uid() and s.post_id=p.id),
 'reactors',coalesce((select jsonb_agg(jsonb_build_object('id',r.user_id,'name',kwilt_home_private.name(r.user_id))) from (select user_id from public.kwilt_home_reactions where post_id=p.id and not kwilt_home_private.blocked(auth.uid(),user_id) order by user_id limit 2) r),'[]'),
 'replyPreview',(select jsonb_build_object('id',r.id,'authorId',r.author_id,'authorName',kwilt_home_private.name(r.author_id),'text',r.text,'createdAt',r.created_at) from public.kwilt_home_replies r where r.post_id=p.id and not kwilt_home_private.blocked(auth.uid(),r.author_id) order by r.created_at desc,r.id desc limit 1));
$$;

create function kwilt_home_private.saved_library(args jsonb) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('posts',coalesce((select jsonb_agg(kwilt_home_private.post_json(x.post) order by x.saved_at desc,x.id desc) from (
 select p as post,p.id,b.created_at saved_at from public.kwilt_home_posts p join public.kwilt_home_bookmarks b on b.post_id=p.id and b.user_id=auth.uid()
 where p.state='published' and kwilt_home_private.can_read(p.id)
 and (args->>'collectionId' is null or exists(select 1 from public.kwilt_home_collection_items i where i.user_id=auth.uid() and i.post_id=p.id and i.collection_id=(args->>'collectionId')::uuid))
 and (not coalesce((args->>'places')::boolean,false) or p.attachment->>'kind'='place')
 and (args->>'beforeSavedAt' is null or (b.created_at,p.id)<((args->>'beforeSavedAt')::timestamptz,(args->>'beforeId')::uuid))
 and (coalesce(args->>'query','')='' or position(lower(args->>'query') in lower(p.text||' '||coalesce(p.attachment->>'name',p.attachment->>'title','')))>0)
 order by b.created_at desc,p.id desc limit 30) x),'[]'));
$$;
revoke all on function kwilt_home_private.saved_library(jsonb) from public,anon,authenticated;
do $$ declare source text; begin
 select pg_get_functiondef('kwilt_home_private.command(text,jsonb)'::regprocedure) into source;
 if position('if op=''save_place'' then' in source)=0 then raise exception 'Home dispatcher signature changed';end if;
 source:=replace(source,'if op=''save_place'' then','if op=''library'' then return kwilt_home_private.saved_library(args); elsif op=''save_place'' then');
 execute source;
end $$;
create index kwilt_home_collection_items_owner_post on public.kwilt_home_collection_items(user_id,post_id);
