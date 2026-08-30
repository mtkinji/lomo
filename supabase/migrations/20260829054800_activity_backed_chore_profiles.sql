-- Activity-backed Household Chores. Activities remain the canonical series and
-- dated completion objects; these tables contain only Chore policy, review,
-- evidence references, and the immutable digital-reward ledger.

create table if not exists public.kwilt_chore_profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  activity_owner_user_id uuid not null references auth.users(id) on delete cascade,
  activity_series_id text not null,
  definition_of_done text not null default '',
  participation text not null default 'open' check (participation in ('assigned','open')),
  assigned_membership_id uuid references public.kwilt_household_memberships(id) on delete set null,
  photo_policy text not null default 'optional' check (photo_policy in ('optional','required')),
  review_policy text not null default 'trusted' check (review_policy in ('trusted','caregiver_review')),
  token_value smallint not null default 1 check (token_value between 1 and 3),
  status text not null default 'active' check (status in ('active','paused','deleted')),
  created_by_membership_id uuid not null references public.kwilt_household_memberships(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (activity_owner_user_id, activity_series_id) references public.kwilt_activities(user_id, id) on delete restrict,
  unique (household_id, activity_series_id)
);

create table if not exists public.kwilt_chore_occurrences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.kwilt_chore_profiles(id) on delete restrict,
  activity_owner_user_id uuid not null references auth.users(id) on delete cascade,
  activity_id text not null,
  scheduled_date date,
  state text not null default 'ready' check (state in ('ready','available','claimed','waiting_approval','needs_another_pass','missed','completed')),
  assigned_membership_id uuid references public.kwilt_household_memberships(id) on delete set null,
  performed_by_membership_id uuid references public.kwilt_household_memberships(id) on delete set null,
  performed_at timestamptz,
  completion_source text not null default 'direct' check (completion_source in ('direct','earlier_day')),
  reported_at timestamptz,
  reviewed_by_membership_id uuid references public.kwilt_household_memberships(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  policy_overrides jsonb not null default '{}'::jsonb,
  token_credited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (activity_owner_user_id, activity_id) references public.kwilt_activities(user_id, id) on delete restrict,
  unique (profile_id, activity_id),
  unique (profile_id, scheduled_date)
);

create table if not exists public.kwilt_chore_evidence_refs (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references public.kwilt_chore_occurrences(id) on delete cascade,
  storage_ref text not null,
  added_by_membership_id uuid not null references public.kwilt_household_memberships(id),
  created_at timestamptz not null default now(),
  unique (occurrence_id, storage_ref)
);

create table if not exists public.kwilt_chore_reward_settings (
  household_id uuid primary key references public.kwilt_households(id) on delete cascade,
  enabled boolean not null default false,
  cents_per_token integer not null default 50 check (cents_per_token between 1 and 100000),
  updated_at timestamptz not null default now()
);

create table if not exists public.kwilt_chore_reward_reservations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  membership_id uuid not null references public.kwilt_household_memberships(id) on delete restrict,
  token_count integer not null check (token_count > 0),
  cents_per_token integer not null check (cents_per_token > 0),
  money_amount_cents integer not null check (money_amount_cents > 0),
  status text not null default 'reserved' check (status in ('reserved','cancelled','settled')),
  created_by_membership_id uuid not null references public.kwilt_household_memberships(id),
  settled_by_membership_id uuid references public.kwilt_household_memberships(id),
  settled_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kwilt_chore_reward_ledger (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  membership_id uuid not null references public.kwilt_household_memberships(id) on delete restrict,
  occurrence_id uuid references public.kwilt_chore_occurrences(id) on delete restrict,
  reservation_id uuid references public.kwilt_chore_reward_reservations(id) on delete restrict,
  kind text not null check (kind in ('earn','reserve','cancel','settle','adjust')),
  token_delta integer not null,
  actor_membership_id uuid not null references public.kwilt_household_memberships(id),
  created_at timestamptz not null default now()
);
create index if not exists kwilt_chore_reward_ledger_occurrence
  on public.kwilt_chore_reward_ledger(occurrence_id) where occurrence_id is not null;
create unique index if not exists kwilt_chore_one_reservation_event
  on public.kwilt_chore_reward_ledger(reservation_id, kind) where reservation_id is not null;

create table if not exists public.kwilt_chore_action_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null,
  operation_id text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);

insert into storage.buckets (id, name, public)
values ('chore_evidence', 'chore_evidence', false)
on conflict (id) do update set public = false;

create policy kwilt_chore_evidence_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id='chore_evidence' and exists (
    select 1 from public.kwilt_chore_occurrences o
    join public.kwilt_chore_profiles p on p.id=o.profile_id
    where o.id=((storage.foldername(name))[1])::uuid
      and public.kwilt_is_active_household_member(p.household_id)
      and ((public.kwilt_agent_household_actor(auth.uid())).role in ('owner','caregiver')
        or o.assigned_membership_id=(public.kwilt_agent_household_actor(auth.uid())).id)
  ));
create policy kwilt_chore_evidence_storage_read on storage.objects for select to authenticated
  using (bucket_id='chore_evidence' and exists (
    select 1 from public.kwilt_chore_occurrences o
    join public.kwilt_chore_profiles p on p.id=o.profile_id
    where o.id=((storage.foldername(name))[1])::uuid
      and public.kwilt_is_active_household_member(p.household_id)
  ));

do $$ begin
  create trigger set_kwilt_chore_profiles_updated_at before update on public.kwilt_chore_profiles
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_kwilt_chore_occurrences_updated_at before update on public.kwilt_chore_occurrences
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_kwilt_chore_reward_settings_updated_at before update on public.kwilt_chore_reward_settings
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_kwilt_chore_reward_reservations_updated_at before update on public.kwilt_chore_reward_reservations
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.kwilt_chore_profiles enable row level security;
alter table public.kwilt_chore_occurrences enable row level security;
alter table public.kwilt_chore_evidence_refs enable row level security;
alter table public.kwilt_chore_reward_settings enable row level security;
alter table public.kwilt_chore_reward_reservations enable row level security;
alter table public.kwilt_chore_reward_ledger enable row level security;
alter table public.kwilt_chore_action_receipts enable row level security;

create policy kwilt_chore_profiles_household_read on public.kwilt_chore_profiles for select to authenticated
  using (public.kwilt_is_active_household_member(household_id));
create policy kwilt_chore_occurrences_household_read on public.kwilt_chore_occurrences for select to authenticated
  using (exists (select 1 from public.kwilt_chore_profiles p where p.id = profile_id and public.kwilt_is_active_household_member(p.household_id)));
create policy kwilt_chore_evidence_household_read on public.kwilt_chore_evidence_refs for select to authenticated
  using (exists (select 1 from public.kwilt_chore_occurrences o join public.kwilt_chore_profiles p on p.id=o.profile_id where o.id=occurrence_id and public.kwilt_is_active_household_member(p.household_id)));
create policy kwilt_chore_reward_settings_household_read on public.kwilt_chore_reward_settings for select to authenticated
  using (public.kwilt_is_active_household_member(household_id));
create policy kwilt_chore_reward_reservations_household_read on public.kwilt_chore_reward_reservations for select to authenticated
  using (public.kwilt_is_active_household_member(household_id));
create policy kwilt_chore_reward_ledger_household_read on public.kwilt_chore_reward_ledger for select to authenticated
  using (public.kwilt_is_active_household_member(household_id));
create policy kwilt_chore_action_receipts_owner on public.kwilt_chore_action_receipts for select to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.kwilt_chore_profiles, public.kwilt_chore_occurrences,
  public.kwilt_chore_evidence_refs, public.kwilt_chore_reward_settings,
  public.kwilt_chore_reward_reservations, public.kwilt_chore_reward_ledger,
  public.kwilt_chore_action_receipts from anon, authenticated;
grant select on public.kwilt_chore_profiles, public.kwilt_chore_occurrences,
  public.kwilt_chore_evidence_refs, public.kwilt_chore_reward_settings,
  public.kwilt_chore_reward_reservations, public.kwilt_chore_reward_ledger,
  public.kwilt_chore_action_receipts to authenticated;

create or replace function public.kwilt_next_chore_date(p_anchor date,p_rule text,p_custom jsonb default null)
returns date language plpgsql immutable set search_path = '' as $$
declare v_next date; v_interval integer:=greatest(1,coalesce((p_custom->>'interval')::integer,1)); v_limit integer:=0;
begin
  if p_anchor is null or p_rule is null then return null; end if;
  if p_rule='daily' then return p_anchor+1;
  elsif p_rule='weekdays' then
    v_next:=p_anchor+1; while extract(isodow from v_next)>5 loop v_next:=v_next+1; end loop; return v_next;
  elsif p_rule='weekly' then return p_anchor+7;
  elsif p_rule='monthly' then return (p_anchor+interval '1 month')::date;
  elsif p_rule='yearly' then return (p_anchor+interval '1 year')::date;
  elsif p_rule='custom' and p_custom->>'cadence'='days' then return p_anchor+v_interval;
  elsif p_rule='custom' and p_custom->>'cadence'='weeks' then
    v_next:=p_anchor+1;
    while v_limit<370 loop
      if ((v_next-date_trunc('week',p_anchor)::date)/7)%v_interval=0
        and exists(select 1 from jsonb_array_elements_text(coalesce(p_custom->'weekdays','[]'::jsonb)) d where d::integer=extract(dow from v_next)::integer)
      then return v_next; end if;
      v_next:=v_next+1; v_limit:=v_limit+1;
    end loop;
  end if;
  return null;
end $$;

create or replace function public.reconcile_kwilt_agent_chore_occurrences(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_actor public.kwilt_household_memberships; v_profile public.kwilt_chore_profiles;
  v_series jsonb; v_anchor date; v_next date; v_activity_id text; v_guard integer;
begin
  v_actor:=public.kwilt_agent_household_actor(p_user_id);
  for v_profile in select cp.* from public.kwilt_chore_profiles cp
    join public.kwilt_activities a on a.user_id=cp.activity_owner_user_id and a.id=cp.activity_series_id
    where cp.household_id=v_actor.household_id and cp.status='active' and a.data->>'repeatRule' is not null
  loop
    select a.data into v_series from public.kwilt_activities a
      where a.user_id=v_profile.activity_owner_user_id and a.id=v_profile.activity_series_id;
    select max(scheduled_date) into v_anchor from public.kwilt_chore_occurrences where profile_id=v_profile.id;
    v_anchor:=coalesce(v_anchor,nullif(v_series->>'scheduledDate','')::date,current_date);
    if coalesce(v_series->>'repeatBasis','scheduled')='scheduled' then
      v_guard:=0;
      while v_anchor<=current_date and v_guard<400 loop
        v_next:=public.kwilt_next_chore_date(v_anchor,v_series->>'repeatRule',v_series->'repeatCustom');
        exit when v_next is null;
        if not exists(select 1 from public.kwilt_chore_occurrences where profile_id=v_profile.id and scheduled_date=v_next) then
          v_activity_id:='chore-activity-'||gen_random_uuid()::text;
          insert into public.kwilt_activities(user_id,id,data) values(v_profile.activity_owner_user_id,v_activity_id,
            v_series||jsonb_build_object('id',v_activity_id,'scheduledDate',v_next,'repeatSeriesId',v_profile.activity_series_id,'status','planned','completedAt',null,'createdAt',now(),'updatedAt',now()));
          insert into public.kwilt_chore_occurrences(profile_id,activity_owner_user_id,activity_id,scheduled_date,state,assigned_membership_id)
            values(v_profile.id,v_profile.activity_owner_user_id,v_activity_id,v_next,case when v_profile.participation='open' then 'available' else 'ready' end,v_profile.assigned_membership_id);
        end if;
        v_anchor:=v_next; v_guard:=v_guard+1;
        exit when v_anchor>current_date;
      end loop;
    end if;
    update public.kwilt_chore_occurrences set state='missed'
      where profile_id=v_profile.id and scheduled_date<current_date and state in ('ready','available');
  end loop;
end $$;

revoke all on function public.kwilt_next_chore_date(date,text,jsonb) from public,anon,authenticated;
revoke all on function public.reconcile_kwilt_agent_chore_occurrences(uuid) from public,anon,authenticated;

create or replace function public.kwilt_chore_actor(p_user_id uuid,p_actor_membership_id uuid default null,p_install_id text default null)
returns public.kwilt_household_memberships language plpgsql stable security definer set search_path = '' as $$
declare v_signed public.kwilt_household_memberships; v_actor public.kwilt_household_memberships;
begin
  v_signed:=public.kwilt_agent_household_actor(p_user_id);
  if p_actor_membership_id is null or p_actor_membership_id=v_signed.id then return v_signed; end if;
  select target.* into v_actor from public.kwilt_household_memberships target
  where target.id=p_actor_membership_id and target.household_id=v_signed.household_id and target.status='active' and target.role='child'
    and exists(select 1 from public.kwilt_household_devices d
      join public.kwilt_household_device_member_access access on access.device_id=d.id and access.child_membership_id=target.id
      where d.household_id=v_signed.household_id and d.device_kind='shared_household' and d.status='ready'
        and d.assigned_caregiver_membership_id=v_signed.id and d.install_id=btrim(coalesce(p_install_id,'')));
  if v_actor.id is null then raise exception 'invalid_household_mode_chore_actor'; end if;
  return v_actor;
end $$;

revoke all on function public.kwilt_chore_actor(uuid,uuid,text) from public,anon,authenticated;

create or replace function public.get_kwilt_agent_chore_snapshot(p_user_id uuid,p_actor_membership_id uuid default null,p_install_id text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_actor public.kwilt_household_memberships;
  v_household public.kwilt_households;
  v_members jsonb;
  v_definitions jsonb;
  v_occurrences jsonb;
  v_balances jsonb;
  v_reservations jsonb;
begin
  v_actor := public.kwilt_chore_actor(p_user_id,p_actor_membership_id,p_install_id);
  perform public.reconcile_kwilt_agent_chore_occurrences(p_user_id);
  select * into v_household from public.kwilt_households where id=v_actor.household_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'membershipId',m.id,'displayName',p.display_name,'role',m.role
  ) order by m.joined_at),'[]'::jsonb) into v_members
  from public.kwilt_household_memberships m
  join public.kwilt_people p on p.id=m.person_id
  where m.household_id=v_actor.household_id and m.status='active';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',cp.id,'activitySeriesId',cp.activity_series_id,'title',coalesce(a.data->>'title','Chore'),
    'definitionOfDone',cp.definition_of_done,'status',cp.status,'participation',cp.participation,
    'assignedMembershipId',cp.assigned_membership_id,'repeatRule',a.data->>'repeatRule',
    'repeatCustom',coalesce(a.data->'repeatCustom','null'::jsonb),
    'repeatBasis',coalesce(a.data->>'repeatBasis','scheduled'),
    'photoPolicy',cp.photo_policy,'reviewPolicy',cp.review_policy,
    'tokenValue',cp.token_value,'updatedAt',cp.updated_at
  ) order by cp.created_at),'[]'::jsonb) into v_definitions
  from public.kwilt_chore_profiles cp
  left join public.kwilt_activities a
    on a.user_id=cp.activity_owner_user_id and a.id=cp.activity_series_id
  where cp.household_id=v_actor.household_id and cp.status<>'deleted'
    and (v_actor.role in ('owner','caregiver') or cp.assigned_membership_id is null
      or cp.assigned_membership_id=v_actor.id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',o.id,'definitionId',o.profile_id,'activityId',o.activity_id,
    'scheduledDate',o.scheduled_date,'title',coalesce(a.data->>'title','Chore'),
    'status',o.state,'assignedMembershipId',o.assigned_membership_id,
    'performedByMembershipId',o.performed_by_membership_id,'performedAt',o.performed_at,
    'completionSource',o.completion_source,'reportedAt',o.reported_at,
    'evidenceRefs',coalesce((select jsonb_agg(e.storage_ref)
      from public.kwilt_chore_evidence_refs e where e.occurrence_id=o.id),'[]'::jsonb),
    'reviewNote',o.review_note,'policyOverrides',o.policy_overrides,
    'tokenCredited',o.token_credited,'updatedAt',o.updated_at
  ) order by o.scheduled_date nulls first,o.created_at),'[]'::jsonb) into v_occurrences
  from public.kwilt_chore_occurrences o
  join public.kwilt_chore_profiles cp on cp.id=o.profile_id
  left join public.kwilt_activities a
    on a.user_id=cp.activity_owner_user_id and a.id=o.activity_id
  where cp.household_id=v_actor.household_id and cp.status<>'deleted'
    and (v_actor.role in ('owner','caregiver') or o.assigned_membership_id is null
      or o.assigned_membership_id=v_actor.id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'membershipId',m.id,
    'availableTokens',coalesce((select sum(l.token_delta)
      from public.kwilt_chore_reward_ledger l where l.membership_id=m.id),0),
    'reservedTokens',coalesce((select sum(r.token_count)
      from public.kwilt_chore_reward_reservations r
      where r.membership_id=m.id and r.status='reserved'),0)
  )),'[]'::jsonb) into v_balances
  from public.kwilt_household_memberships m
  where m.household_id=v_actor.household_id and m.status='active' and m.role='child';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'membershipId',r.membership_id,'tokenCount',r.token_count,
    'centsPerToken',r.cents_per_token,'moneyAmountCents',r.money_amount_cents,
    'status',r.status,'updatedAt',r.updated_at
  ) order by r.created_at desc),'[]'::jsonb) into v_reservations
  from public.kwilt_chore_reward_reservations r
  where r.household_id=v_actor.household_id
    and (v_actor.role in ('owner','caregiver') or r.membership_id=v_actor.id);

  return jsonb_build_object(
    'household', jsonb_build_object('id',v_household.id,'name',v_household.name),
    'actor', (select jsonb_build_object('membershipId',m.id,'displayName',p.display_name,'role',m.role) from public.kwilt_household_memberships m join public.kwilt_people p on p.id=m.person_id where m.id=v_actor.id),
    'members',v_members,
    'definitions',v_definitions,
    'occurrences',v_occurrences,
    'reward', jsonb_build_object(
      'enabled',coalesce((select enabled from public.kwilt_chore_reward_settings where household_id=v_actor.household_id),false),
      'centsPerToken',coalesce((select cents_per_token from public.kwilt_chore_reward_settings where household_id=v_actor.household_id),50),
      'version',coalesce((select updated_at::text from public.kwilt_chore_reward_settings where household_id=v_actor.household_id),'0'),
      'balances',v_balances,
      'reservations',v_reservations),
    'observedAt',now());
exception when others then
  if sqlerrm in ('authentication_required','household_membership_required') then return null; end if; raise;
end $$;

create or replace function public.get_kwilt_chore_snapshot(p_actor_membership_id uuid default null,p_install_id text default null)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select public.get_kwilt_agent_chore_snapshot(public.kwilt_require_permanent_user(),p_actor_membership_id,p_install_id)
$$;

create or replace function public.execute_kwilt_agent_chore_action(p_user_id uuid,p_operation jsonb,p_actor_membership_id uuid default null,p_install_id text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor public.kwilt_household_memberships; v_id text:=btrim(coalesce(p_operation->>'requestId',''));
  v_op text:=p_operation->>'operationId'; v_target uuid; v_expected text:=p_operation->>'expectedVersion';
  v_payload jsonb:=coalesce(p_operation->'payload','{}'::jsonb); v_result jsonb; v_profile public.kwilt_chore_profiles;
  v_occurrence public.kwilt_chore_occurrences; v_reservation public.kwilt_chore_reward_reservations;
  v_activity_id text; v_title text; v_fields jsonb; v_tokens integer; v_rate integer; v_available integer;
  v_series jsonb; v_next_date date;
begin
  if v_id='' or v_op not like 'chores.%' then raise exception 'invalid_chore_action'; end if;
  select result into v_result from public.kwilt_chore_action_receipts where user_id=p_user_id and request_id=v_id;
  if v_result is not null then return v_result; end if;
  v_actor:=public.kwilt_chore_actor(p_user_id,p_actor_membership_id,p_install_id);
  v_target:=nullif(p_operation->>'targetId','')::uuid;
  if v_op='chores.definition.create' then
    if v_actor.role not in ('owner','caregiver') then raise exception 'chore_caregiver_required'; end if;
    v_fields:=coalesce(v_payload->'fields','{}'::jsonb);
    if jsonb_typeof(v_fields)='array' then select coalesce(jsonb_object_agg(e->>'key',e->'value'),'{}'::jsonb) into v_fields from jsonb_array_elements(v_fields) e; end if;
    v_title:=btrim(coalesce(v_fields->>'title',''));
    if v_title='' then raise exception 'chore_title_required'; end if;
    v_activity_id:='chore-activity-'||gen_random_uuid()::text;
    insert into public.kwilt_activities(user_id,id,data) values(p_user_id,v_activity_id,jsonb_build_object(
      'id',v_activity_id,'goalId',null,'title',v_title,'type','task','tags',jsonb_build_array('chore'),
      'notes',coalesce(v_fields->>'definitionOfDone',''),'scheduledDate',coalesce(v_fields->>'scheduledDate',case when v_fields->>'repeatRule' is not null then current_date::text else null end),
      'repeatRule',v_fields->>'repeatRule','repeatCustom',v_fields->'repeatCustom','repeatSeriesId',v_activity_id,
      'repeatBasis',coalesce(v_fields->>'repeatBasis','scheduled'),'status','planned','forceActual','{}'::jsonb,
      'createdAt',now(),'updatedAt',now()));
    insert into public.kwilt_chore_profiles(household_id,activity_owner_user_id,activity_series_id,definition_of_done,participation,assigned_membership_id,photo_policy,review_policy,token_value,created_by_membership_id)
      values(v_actor.household_id,p_user_id,v_activity_id,coalesce(v_fields->>'definitionOfDone',''),case when v_fields->>'assignedMembershipId' is null then 'open' else 'assigned' end,
        nullif(v_fields->>'assignedMembershipId','')::uuid,coalesce(v_fields->>'photoPolicy','optional'),coalesce(v_fields->>'reviewPolicy','trusted'),coalesce((v_fields->>'tokenValue')::int,1),v_actor.id)
      returning * into v_profile;
    insert into public.kwilt_chore_occurrences(profile_id,activity_owner_user_id,activity_id,scheduled_date,state,assigned_membership_id)
      values(v_profile.id,v_profile.activity_owner_user_id,v_activity_id,coalesce(nullif(v_fields->>'scheduledDate','')::date,case when v_fields->>'repeatRule' is not null then current_date else null end),case when v_profile.participation='open' then 'available' else 'ready' end,v_profile.assigned_membership_id);
    v_target:=v_profile.id;
  elsif v_op like 'chores.definition.%' then
    if v_actor.role not in ('owner','caregiver') then raise exception 'chore_caregiver_required'; end if;
    select * into v_profile from public.kwilt_chore_profiles where id=v_target and household_id=v_actor.household_id for update;
    if v_profile.id is null then raise exception 'chore_not_found'; end if;
    if v_profile.updated_at::text<>v_expected then raise exception 'stale_chore_definition'; end if;
    if v_op='chores.definition.pause' then update public.kwilt_chore_profiles set status='paused' where id=v_target;
    elsif v_op='chores.definition.delete' then update public.kwilt_chore_profiles set status='deleted' where id=v_target;
    else
      v_fields:=coalesce(v_payload->'fields','{}'::jsonb);
      if jsonb_typeof(v_fields)='array' then select coalesce(jsonb_object_agg(e->>'key',e->'value'),'{}'::jsonb) into v_fields from jsonb_array_elements(v_fields) e; end if;
      if v_payload->>'scope'='today' then
        select * into v_occurrence from public.kwilt_chore_occurrences where profile_id=v_profile.id and scheduled_date=current_date for update;
        if v_occurrence.id is null then raise exception 'chore_today_occurrence_not_found'; end if;
        update public.kwilt_chore_occurrences set
          assigned_membership_id=case when v_fields ? 'assignedMembershipId' then nullif(v_fields->>'assignedMembershipId','')::uuid else assigned_membership_id end,
          state=case when v_fields ? 'assignedMembershipId' and v_fields->>'assignedMembershipId' is null then 'available'
            when v_fields ? 'assignedMembershipId' then 'ready' else state end,
          policy_overrides=policy_overrides||jsonb_strip_nulls(jsonb_build_object(
            'definitionOfDone',v_fields->>'definitionOfDone','photoPolicy',v_fields->>'photoPolicy',
            'reviewPolicy',v_fields->>'reviewPolicy','tokenValue',v_fields->'tokenValue'))
          where id=v_occurrence.id;
        update public.kwilt_activities set data=data||jsonb_strip_nulls(jsonb_build_object('title',v_fields->>'title','notes',v_fields->>'definitionOfDone','updatedAt',now())),updated_at=now()
          where user_id=v_profile.activity_owner_user_id and id=v_occurrence.activity_id;
      else
      update public.kwilt_chore_profiles set definition_of_done=coalesce(v_fields->>'definitionOfDone',definition_of_done),
        assigned_membership_id=case when v_fields ? 'assignedMembershipId' then nullif(v_fields->>'assignedMembershipId','')::uuid else assigned_membership_id end,
        participation=case when v_fields ? 'assignedMembershipId' then case when v_fields->>'assignedMembershipId' is null then 'open' else 'assigned' end else participation end,
        photo_policy=coalesce(v_fields->>'photoPolicy',photo_policy),review_policy=coalesce(v_fields->>'reviewPolicy',review_policy),token_value=coalesce((v_fields->>'tokenValue')::int,token_value) where id=v_target;
      update public.kwilt_activities set data=data||jsonb_strip_nulls(jsonb_build_object('title',v_fields->>'title','notes',v_fields->>'definitionOfDone','repeatRule',v_fields->>'repeatRule','repeatCustom',v_fields->'repeatCustom','repeatBasis',v_fields->>'repeatBasis','updatedAt',now())),updated_at=now()
        where user_id=v_profile.activity_owner_user_id and id=v_profile.activity_series_id;
      end if;
    end if;
  elsif v_op in ('chores.occurrence.claim','chores.occurrence.release','chores.occurrence.reopen') then
    select o.* into v_occurrence from public.kwilt_chore_occurrences o join public.kwilt_chore_profiles p on p.id=o.profile_id where o.id=v_target and p.household_id=v_actor.household_id for update of o;
    if v_occurrence.id is null then raise exception 'chore_occurrence_not_found'; end if;
    if v_occurrence.updated_at::text<>v_expected then raise exception 'stale_chore_occurrence'; end if;
    select * into v_profile from public.kwilt_chore_profiles where id=v_occurrence.profile_id;
    if v_op='chores.occurrence.claim' then
      if v_actor.role<>'child' or v_occurrence.state<>'available' or v_occurrence.assigned_membership_id is not null then raise exception 'chore_not_authorized'; end if;
      update public.kwilt_chore_occurrences set state='claimed',assigned_membership_id=v_actor.id where id=v_target;
    elsif v_op='chores.occurrence.release' then
      if v_actor.role<>'child' or v_occurrence.state<>'claimed' or v_occurrence.assigned_membership_id<>v_actor.id then raise exception 'chore_not_authorized'; end if;
      update public.kwilt_chore_occurrences set state='available',assigned_membership_id=null where id=v_target;
    else
      if v_occurrence.state<>'completed' or (v_actor.role='child' and v_occurrence.performed_by_membership_id<>v_actor.id) then raise exception 'chore_not_authorized'; end if;
      if v_occurrence.token_credited then
        insert into public.kwilt_chore_reward_ledger(household_id,membership_id,occurrence_id,kind,token_delta,actor_membership_id)
          values(v_actor.household_id,coalesce(v_occurrence.performed_by_membership_id,v_occurrence.assigned_membership_id),v_occurrence.id,'adjust',-coalesce((v_occurrence.policy_overrides->>'tokenValue')::integer,v_profile.token_value),v_actor.id);
      end if;
      update public.kwilt_chore_occurrences set state=case when assigned_membership_id is null then 'available' else 'ready' end,
        performed_by_membership_id=null,performed_at=null,completion_source='direct',reported_at=null,
        reviewed_by_membership_id=null,reviewed_at=null,review_note=null,token_credited=false where id=v_target;
      update public.kwilt_activities set data=data||jsonb_build_object('status','planned','completedAt',null,'updatedAt',now()),updated_at=now()
        where user_id=v_profile.activity_owner_user_id and id=v_occurrence.activity_id;
    end if;
  elsif v_op='chores.occurrence.report_earlier' then
    if v_actor.role<>'child' or jsonb_array_length(coalesce(v_payload->'items','[]'::jsonb))=0 then raise exception 'chore_not_authorized'; end if;
    for v_fields in select value from jsonb_array_elements(v_payload->'items') loop
      select o.* into v_occurrence from public.kwilt_chore_occurrences o join public.kwilt_chore_profiles p on p.id=o.profile_id where o.id=(v_fields->>'occurrenceId')::uuid and p.household_id=v_actor.household_id for update of o;
      if v_occurrence.id is null or v_occurrence.updated_at::text<>(v_fields->>'expectedUpdatedAt') or v_occurrence.state<>'missed' or v_occurrence.assigned_membership_id<>v_actor.id then raise exception 'invalid_chore_correction_target'; end if;
      update public.kwilt_chore_occurrences set state='waiting_approval',performed_by_membership_id=v_actor.id,performed_at=now(),completion_source='earlier_day',reported_at=now() where id=v_occurrence.id;
      select * into v_profile from public.kwilt_chore_profiles where id=v_occurrence.profile_id;
      update public.kwilt_activities set data=data||jsonb_build_object('status','in_progress','updatedAt',now()),updated_at=now() where user_id=v_profile.activity_owner_user_id and id=v_occurrence.activity_id;
    end loop;
  elsif v_op='chores.evidence.add' then
    select o.* into v_occurrence from public.kwilt_chore_occurrences o join public.kwilt_chore_profiles p on p.id=o.profile_id where o.id=v_target and p.household_id=v_actor.household_id for update of o;
    if v_occurrence.id is null then raise exception 'chore_occurrence_not_found'; end if;
    if v_occurrence.updated_at::text<>v_expected then raise exception 'stale_chore_occurrence'; end if;
    if v_actor.role='child' and v_occurrence.assigned_membership_id<>v_actor.id then raise exception 'chore_not_authorized'; end if;
    if btrim(coalesce(v_payload->>'storageRef','')) not like v_occurrence.id::text||'/%' then raise exception 'invalid_chore_evidence_ref'; end if;
    if not exists(select 1 from storage.objects where bucket_id='chore_evidence' and name=v_payload->>'storageRef') then raise exception 'chore_evidence_upload_missing'; end if;
    insert into public.kwilt_chore_evidence_refs(occurrence_id,storage_ref,added_by_membership_id)
      values(v_occurrence.id,v_payload->>'storageRef',v_actor.id) on conflict do nothing;
    update public.kwilt_chore_occurrences set updated_at=now() where id=v_occurrence.id;
  elsif v_op in ('chores.occurrence.complete','chores.review.approve','chores.review.return','chores.review.leave_missed') then
    select o.* into v_occurrence from public.kwilt_chore_occurrences o join public.kwilt_chore_profiles p on p.id=o.profile_id where o.id=v_target and p.household_id=v_actor.household_id for update of o;
    if v_occurrence.id is null then raise exception 'chore_occurrence_not_found'; end if;
    if v_occurrence.updated_at::text<>v_expected then raise exception 'stale_chore_occurrence'; end if;
    select * into v_profile from public.kwilt_chore_profiles where id=v_occurrence.profile_id;
    if v_op='chores.occurrence.complete' then
      if v_occurrence.state not in ('ready','claimed','needs_another_pass') then raise exception 'chore_occurrence_not_completable'; end if;
      if v_actor.role='child' and coalesce(v_occurrence.assigned_membership_id,v_actor.id)<>v_actor.id then raise exception 'chore_not_authorized'; end if;
      if coalesce(v_occurrence.policy_overrides->>'photoPolicy',v_profile.photo_policy)='required' and jsonb_array_length(coalesce(v_payload->'evidenceRefIds','[]'::jsonb))=0
        and not exists(select 1 from public.kwilt_chore_evidence_refs where occurrence_id=v_occurrence.id) then raise exception 'chore_evidence_required'; end if;
      insert into public.kwilt_chore_evidence_refs(occurrence_id,storage_ref,added_by_membership_id)
        select v_occurrence.id,value#>>'{}',v_actor.id from jsonb_array_elements(coalesce(v_payload->'evidenceRefIds','[]'::jsonb)) on conflict do nothing;
      update public.kwilt_chore_occurrences set performed_by_membership_id=v_actor.id,performed_at=now(),
        state=case when coalesce(v_occurrence.policy_overrides->>'reviewPolicy',v_profile.review_policy)='caregiver_review' then 'waiting_approval' else 'completed' end where id=v_target;
      update public.kwilt_activities set data=data||jsonb_build_object('status',case when coalesce(v_occurrence.policy_overrides->>'reviewPolicy',v_profile.review_policy)='caregiver_review' then 'in_progress' else 'done' end,'completedAt',case when coalesce(v_occurrence.policy_overrides->>'reviewPolicy',v_profile.review_policy)='trusted' then to_jsonb(now()) else 'null'::jsonb end,'updatedAt',now()),updated_at=now()
        where user_id=v_profile.activity_owner_user_id and id=v_occurrence.activity_id;
    elsif v_op='chores.review.leave_missed' then
      if v_actor.role not in ('owner','caregiver') or v_occurrence.state<>'waiting_approval' or v_occurrence.completion_source<>'earlier_day' then raise exception 'chore_not_authorized'; end if;
      update public.kwilt_chore_occurrences set state='missed',performed_by_membership_id=null,performed_at=null,completion_source='direct',reported_at=null,reviewed_by_membership_id=v_actor.id,reviewed_at=now(),review_note=null where id=v_target;
      update public.kwilt_activities set data=data||jsonb_build_object('status','planned','completedAt',null,'updatedAt',now()),updated_at=now() where user_id=v_profile.activity_owner_user_id and id=v_occurrence.activity_id;
    elsif v_op='chores.review.return' then
      if v_actor.role not in ('owner','caregiver') then raise exception 'chore_caregiver_required'; end if;
      if v_occurrence.state<>'waiting_approval' or v_occurrence.completion_source='earlier_day' then raise exception 'chore_not_waiting_approval'; end if;
      update public.kwilt_chore_occurrences set state='needs_another_pass',reviewed_by_membership_id=v_actor.id,reviewed_at=now(),review_note=nullif(v_payload->>'note','') where id=v_target;
    else
      if v_actor.role not in ('owner','caregiver') then raise exception 'chore_caregiver_required'; end if;
      if v_occurrence.state<>'waiting_approval' then raise exception 'chore_not_waiting_approval'; end if;
      update public.kwilt_chore_occurrences set state='completed',reviewed_by_membership_id=v_actor.id,reviewed_at=now(),review_note=null where id=v_target;
      update public.kwilt_activities set data=data||jsonb_build_object('status','done','completedAt',now(),'updatedAt',now()),updated_at=now() where user_id=v_profile.activity_owner_user_id and id=v_occurrence.activity_id;
    end if;
    if (v_op='chores.review.approve' or (v_op='chores.occurrence.complete' and coalesce(v_occurrence.policy_overrides->>'reviewPolicy',v_profile.review_policy)='trusted')) and not v_occurrence.token_credited and coalesce((v_occurrence.policy_overrides->>'tokenValue')::integer,v_profile.token_value)>0 then
      insert into public.kwilt_chore_reward_ledger(household_id,membership_id,occurrence_id,kind,token_delta,actor_membership_id)
        values(v_actor.household_id,coalesce(v_occurrence.assigned_membership_id,v_occurrence.performed_by_membership_id,v_actor.id),v_occurrence.id,'earn',coalesce((v_occurrence.policy_overrides->>'tokenValue')::integer,v_profile.token_value),v_actor.id) on conflict do nothing;
      update public.kwilt_chore_occurrences set token_credited=true where id=v_target;
    end if;
    if v_op in ('chores.review.approve','chores.occurrence.complete') then
      select data into v_series from public.kwilt_activities where user_id=v_profile.activity_owner_user_id and id=v_profile.activity_series_id;
      if v_series->>'repeatRule' is not null and coalesce(v_series->>'repeatBasis','scheduled')='after_completion' then
        v_next_date:=public.kwilt_next_chore_date(current_date,v_series->>'repeatRule',v_series->'repeatCustom');
        if v_next_date is not null and not exists(select 1 from public.kwilt_chore_occurrences where profile_id=v_profile.id and scheduled_date=v_next_date) then
          v_activity_id:='chore-activity-'||gen_random_uuid()::text;
          insert into public.kwilt_activities(user_id,id,data) values(v_profile.activity_owner_user_id,v_activity_id,
            v_series||jsonb_build_object('id',v_activity_id,'scheduledDate',v_next_date,'repeatSeriesId',v_profile.activity_series_id,'status','planned','completedAt',null,'createdAt',now(),'updatedAt',now()));
          insert into public.kwilt_chore_occurrences(profile_id,activity_owner_user_id,activity_id,scheduled_date,state,assigned_membership_id)
            values(v_profile.id,v_profile.activity_owner_user_id,v_activity_id,v_next_date,case when v_profile.participation='open' then 'available' else 'ready' end,v_profile.assigned_membership_id);
        end if;
      end if;
    end if;
  elsif v_op='chores.reward.configure' then
    if v_actor.role not in ('owner','caregiver') then raise exception 'chore_caregiver_required'; end if;
    if exists(select 1 from public.kwilt_chore_reward_settings where household_id=v_actor.household_id)
      and (select updated_at::text from public.kwilt_chore_reward_settings where household_id=v_actor.household_id for update)<>v_expected then raise exception 'stale_chore_reward_settings'; end if;
    if not exists(select 1 from public.kwilt_chore_reward_settings where household_id=v_actor.household_id) and v_expected<>'0' then raise exception 'stale_chore_reward_settings'; end if;
    insert into public.kwilt_chore_reward_settings(household_id,enabled,cents_per_token) values(v_actor.household_id,(v_payload->>'enabled')::boolean,(v_payload->>'centsPerToken')::int)
      on conflict(household_id) do update set enabled=excluded.enabled,cents_per_token=excluded.cents_per_token;
    v_target:=v_actor.household_id;
  elsif v_op='chores.reward.reserve' then
    if v_actor.role='child' and v_target<>v_actor.id then raise exception 'chore_not_authorized'; end if;
    if not exists(select 1 from public.kwilt_household_memberships where id=v_target and household_id=v_actor.household_id and status='active' and role='child') then raise exception 'chore_not_authorized'; end if;
    perform pg_advisory_xact_lock(hashtext(v_target::text));
    select cents_per_token into v_rate from public.kwilt_chore_reward_settings where household_id=v_actor.household_id and enabled=true and updated_at::text=v_expected for update;
    if v_rate is null then raise exception 'stale_or_disabled_chore_reward_settings'; end if;
    v_tokens:=(v_payload->>'tokenCount')::int;
    select coalesce(sum(token_delta),0) into v_available from public.kwilt_chore_reward_ledger where membership_id=v_target;
    if v_tokens<1 or v_tokens>v_available then raise exception 'insufficient_chore_tokens'; end if;
    insert into public.kwilt_chore_reward_reservations(household_id,membership_id,token_count,cents_per_token,money_amount_cents,created_by_membership_id)
      values(v_actor.household_id,v_target,v_tokens,v_rate,v_tokens*v_rate,v_actor.id) returning * into v_reservation;
    insert into public.kwilt_chore_reward_ledger(household_id,membership_id,reservation_id,kind,token_delta,actor_membership_id)
      values(v_actor.household_id,v_target,v_reservation.id,'reserve',-v_tokens,v_actor.id);
    v_target:=v_reservation.id;
  elsif v_op in ('chores.reward.cancel','chores.reward.settle') then
    if v_op='chores.reward.settle' and v_actor.role not in ('owner','caregiver') then raise exception 'chore_caregiver_required'; end if;
    select * into v_reservation from public.kwilt_chore_reward_reservations where id=v_target and household_id=v_actor.household_id for update;
    if v_reservation.id is null then raise exception 'chore_reservation_not_found'; end if;
    if v_actor.role='child' and v_reservation.membership_id<>v_actor.id then raise exception 'chore_not_authorized'; end if;
    if v_reservation.updated_at::text<>v_expected or v_reservation.status<>'reserved' then raise exception 'stale_chore_reservation'; end if;
    if v_op='chores.reward.cancel' then
      update public.kwilt_chore_reward_reservations set status='cancelled',cancelled_at=now() where id=v_target;
      insert into public.kwilt_chore_reward_ledger(household_id,membership_id,reservation_id,kind,token_delta,actor_membership_id) values(v_actor.household_id,v_reservation.membership_id,v_target,'cancel',v_reservation.token_count,v_actor.id);
    else
      update public.kwilt_chore_reward_reservations set status='settled',settled_at=now(),settled_by_membership_id=v_actor.id where id=v_target;
      insert into public.kwilt_chore_reward_ledger(household_id,membership_id,reservation_id,kind,token_delta,actor_membership_id) values(v_actor.household_id,v_reservation.membership_id,v_target,'settle',0,v_actor.id);
    end if;
  else raise exception 'unsupported_chore_operation'; end if;
  v_result:=jsonb_build_object('operationId',v_op,'status','completed','result',jsonb_build_object('targetId',v_target),'updatedAt',now());
  insert into public.kwilt_chore_action_receipts(user_id,request_id,operation_id,result) values(p_user_id,v_id,v_op,v_result);
  return v_result;
end $$;

create or replace function public.execute_kwilt_chore_action(p_operation jsonb,p_actor_membership_id uuid default null,p_install_id text default null)
returns jsonb language sql security definer set search_path = '' as $$
  select public.execute_kwilt_agent_chore_action(public.kwilt_require_permanent_user(),p_operation,p_actor_membership_id,p_install_id)
$$;

revoke all on function public.get_kwilt_chore_snapshot(uuid,text) from public,anon,authenticated;
revoke all on function public.execute_kwilt_chore_action(jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.get_kwilt_chore_snapshot(uuid,text) to authenticated;
grant execute on function public.execute_kwilt_chore_action(jsonb,uuid,text) to authenticated;
revoke all on function public.get_kwilt_agent_chore_snapshot(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.execute_kwilt_agent_chore_action(uuid,jsonb,uuid,text) from public,anon,authenticated;
