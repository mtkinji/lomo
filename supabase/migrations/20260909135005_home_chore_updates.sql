-- System household updates are source-owned, not posts authored by a child or caregiver.
alter table public.kwilt_home_posts alter column author_id drop not null;
alter table public.kwilt_home_posts add column kind text not null default 'moment' check(kind in ('moment','chore_update'));
alter table public.kwilt_home_posts add column chore_membership_id uuid references public.kwilt_household_memberships(id) on delete cascade;
alter table public.kwilt_home_posts add constraint kwilt_home_post_origin check (
 (kind='moment' and author_id is not null and chore_membership_id is null) or
 (kind='chore_update' and author_id is null and chore_membership_id is not null and household_id is not null and audience='household' and attachment is null and media='[]'::jsonb and recipient_ids='{}'::uuid[])
);
create index kwilt_home_chore_groups on public.kwilt_home_posts(chore_membership_id,published_at desc) where kind='chore_update' and state='published';
create table public.kwilt_home_chore_events (
 occurrence_id uuid primary key references public.kwilt_chore_occurrences(id) on delete cascade,
 post_id uuid not null references public.kwilt_home_posts(id) on delete cascade,
 title text not null,
 created_at timestamptz not null default clock_timestamp()
);
create index kwilt_home_chore_events_post on public.kwilt_home_chore_events(post_id);
alter table public.kwilt_home_chore_events enable row level security;
revoke all on public.kwilt_home_chore_events from public,anon,authenticated;
grant all on public.kwilt_home_chore_events to service_role;

create function kwilt_home_private.chore_items(pid uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('occurrenceId',o.id,'title',e.title,'state',o.state,'scheduledDate',o.scheduled_date,'reportedEarlier',o.completion_source='earlier_day') order by e.created_at,e.occurrence_id),'[]')
 from public.kwilt_home_chore_events e
 join public.kwilt_home_posts p on p.id=e.post_id
 join public.kwilt_chore_occurrences o on o.id=e.occurrence_id
 join public.kwilt_chore_profiles cp on cp.id=o.profile_id
 where e.post_id=pid and o.state in ('completed','waiting_approval') and o.performed_by_membership_id=p.chore_membership_id and cp.household_id=p.household_id and cp.status<>'deleted';
$$;

create or replace function kwilt_home_private.can_read(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select kwilt_home_private.is_adult(auth.uid()) and exists(select 1 from public.kwilt_home_posts p where p.id=p_id and p.state<>'deleted' and
 case when p.kind='chore_update' then
 p.state='published' and kwilt_home_private.member(auth.uid(),p.household_id,p.published_at)
 and exists(select 1 from public.kwilt_home_recipients r where r.post_id=p.id and r.user_id=auth.uid() and r.basis='household')
 and exists(select 1 from public.kwilt_household_memberships m where m.id=p.chore_membership_id and m.household_id=p.household_id and m.status='active'
   and not exists(select 1 from public.kwilt_person_auth_bindings b where b.person_id=m.person_id and b.status='active' and kwilt_home_private.blocked(auth.uid(),b.user_id)))
 and jsonb_array_length(kwilt_home_private.chore_items(p.id))>0
 else (
 p.author_id=auth.uid() or (p.state='published' and not kwilt_home_private.blocked(auth.uid(),p.author_id) and exists(
 select 1 from public.kwilt_home_recipients r where r.post_id=p.id and r.user_id=auth.uid() and (
 (r.basis='household' and kwilt_home_private.member(auth.uid(),p.household_id,p.published_at) and kwilt_home_private.member(p.author_id,p.household_id,p.published_at))
 or (r.basis='people' and kwilt_home_private.known(p.author_id,auth.uid()))
 or (r.basis='followers' and exists(select 1 from public.kwilt_home_connections c where c.id=r.connection_id and c.state='accepted' and c.accepted_at<=p.published_at and (c.target_household_id is null or kwilt_home_private.member(p.author_id,c.target_household_id,p.published_at))))
 )))) end);
$$;

-- Extend serialization while preserving the existing response/count contract.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('kwilt_home_private.post_json(public.kwilt_home_posts)'::regprocedure);
 if position('''authorName'',kwilt_home_private.name(p.author_id)' in definition)=0 then raise exception 'Home serialization changed'; end if;
 definition:=replace(definition,'''authorName'',kwilt_home_private.name(p.author_id)',
 '''authorName'',case when p.kind=''chore_update'' then (select pe.display_name from public.kwilt_household_memberships m join public.kwilt_people pe on pe.id=m.person_id where m.id=p.chore_membership_id) else kwilt_home_private.name(p.author_id) end');
 definition:=replace(definition,'''text'',p.text',
 '''kind'',p.kind,''choreUpdate'',case when p.kind=''chore_update'' then jsonb_build_object(''items'',kwilt_home_private.chore_items(p.id)) else null end,''text'',p.text');
 execute definition;
 -- Defense at the command boundary: no human can edit or republish source updates.
 definition:=pg_get_functiondef('kwilt_home_private.command(text,jsonb)'::regprocedure);
 if position('begin' in definition)=0 then raise exception 'Home command changed'; end if;
 definition:=replace(definition,E'begin\n if not kwilt_home_private.is_adult',E'begin\n if op in (''draft'',''publish'',''discard'',''edit'',''delete'') and exists(select 1 from public.kwilt_home_posts where id=(args->>''id'')::uuid and kind=''chore_update'') then raise exception ''Chore updates are managed in Chores'' using errcode=''42501''; end if;\n if not kwilt_home_private.is_adult');
 if position('Chore updates are managed' in definition)=0 then raise exception 'Home command guard insertion failed'; end if;
 execute definition;
end;
$$;

create function kwilt_home_private.project_chore_update() returns trigger language plpgsql security definer set search_path='' as $$
declare pid uuid; old_pid uuid; h uuid; m uuid; title text; stamp timestamptz:=clock_timestamp();
begin
 if tg_op='UPDATE' and (old.state,old.performed_by_membership_id,old.performed_at,old.profile_id) is not distinct from (new.state,new.performed_by_membership_id,new.performed_at,new.profile_id) then return new; end if;
 select post_id into old_pid from public.kwilt_home_chore_events where occurrence_id=coalesce(new.id,old.id);
 if tg_op='DELETE' then
   delete from public.kwilt_home_chore_events where occurrence_id=old.id;
 else
   select cp.household_id,coalesce(nullif(left(trim(a.data->>'title'),160),''),'Household chore') into h,title
   from public.kwilt_chore_profiles cp join public.kwilt_activities a on a.user_id=new.activity_owner_user_id and a.id=new.activity_id
   where cp.id=new.profile_id and cp.status<>'deleted';
   m:=new.performed_by_membership_id;
   if h is not null then perform pg_advisory_xact_lock(hashtextextended('home-chores:'||h::text,0)); end if;
   if new.state in ('completed','waiting_approval') and new.performed_at is not null and exists(select 1 from public.kwilt_household_memberships where id=m and household_id=h and status='active') then
     select id into pid from public.kwilt_home_posts where id=old_pid and chore_membership_id=m and household_id=h and state='published';
     if pid is null then
       delete from public.kwilt_home_chore_events where occurrence_id=new.id;
       select p.id into pid from public.kwilt_home_posts p where p.kind='chore_update' and p.state='published' and p.household_id=h and p.chore_membership_id=m
         and p.published_at>=stamp-interval '30 minutes'
         and (select count(*) from public.kwilt_home_chore_events e where e.post_id=p.id)<12
         order by p.published_at desc,p.id desc limit 1;
       if pid is null then
         pid:=gen_random_uuid();
         insert into public.kwilt_home_posts(id,author_id,kind,chore_membership_id,household_id,audience,state,published_at)
         values(pid,null,'chore_update',m,h,'household','published',stamp);
         insert into public.kwilt_home_recipients(post_id,user_id,basis)
         select distinct pid,b.user_id,'household' from public.kwilt_person_auth_bindings b
         join public.kwilt_household_memberships hm on hm.person_id=b.person_id
         where b.status='active' and hm.status='active' and hm.household_id=h and hm.role in ('owner','caregiver') and hm.joined_at<=stamp and kwilt_home_private.is_adult(b.user_id);
       end if;
       insert into public.kwilt_home_chore_events(occurrence_id,post_id,title) values(new.id,pid,title);
     end if;
     update public.kwilt_home_posts set updated_at=stamp where id=pid;
   else
     delete from public.kwilt_home_chore_events where occurrence_id=new.id;
   end if;
 end if;
 if old_pid is not null then
   update public.kwilt_home_posts set state=case when exists(select 1 from public.kwilt_home_chore_events where post_id=old_pid) then 'published' else 'deleted' end,updated_at=stamp where id=old_pid;
 end if;
 return coalesce(new,old);
end;
$$;
revoke all on function kwilt_home_private.chore_items(uuid),kwilt_home_private.project_chore_update() from public,anon,authenticated;
-- Fires after the authorized Chores transaction changes its canonical occurrence.
-- No backfill of existing completed chores and no client-side publication call.
create trigger kwilt_home_chore_projection before delete on public.kwilt_chore_occurrences for each row execute function kwilt_home_private.project_chore_update();
create trigger kwilt_home_chore_projection_write after insert or update on public.kwilt_chore_occurrences for each row execute function kwilt_home_private.project_chore_update();
