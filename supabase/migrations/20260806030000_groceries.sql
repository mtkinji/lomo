-- Versioned, person-owned grocery lists compiled from finalized Meal Plans.

create table public.kwilt_grocery_lists (
  id uuid primary key default gen_random_uuid(),
  owner_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  source_meal_plan_id uuid not null references public.kwilt_meal_plans(id) on delete restrict,
  source_meal_plan_version integer not null check (source_meal_plan_version > 0),
  revision integer not null check (revision > 0),
  status text not null default 'review_needed' check (status in ('compiling','review_needed','ready','stale','archived')),
  payload_hash text not null check (char_length(payload_hash) between 1 and 256),
  rebased_from_list_id uuid,
  rebased_from_revision integer check (rebased_from_revision is null or rebased_from_revision > 0),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_meal_plan_id,source_meal_plan_version)
);

alter table public.kwilt_grocery_lists add constraint kwilt_grocery_lists_rebase_source_fk foreign key(rebased_from_list_id) references public.kwilt_grocery_lists(id) on delete restrict;
alter table public.kwilt_grocery_lists add constraint kwilt_grocery_lists_rebase_pair_check check ((rebased_from_list_id is null) = (rebased_from_revision is null));

create table public.kwilt_grocery_items (
  id uuid primary key default gen_random_uuid(),
  grocery_list_id uuid not null references public.kwilt_grocery_lists(id) on delete cascade,
  position integer not null check (position >= 0),
  concept text not null check (char_length(btrim(concept)) between 1 and 320),
  quantity_min numeric check (quantity_min is null or quantity_min >= 0),
  quantity_max numeric check (quantity_max is null or quantity_max >= 0),
  unit text check (unit is null or char_length(unit) <= 80),
  package_quantity numeric check (package_quantity is null or package_quantity > 0),
  package_unit text check (package_unit is null or char_length(package_unit) <= 80),
  preparation text check (preparation is null or char_length(preparation) <= 320),
  optional boolean not null default false,
  aisle text not null check (aisle in ('produce','bakery','dairy_eggs','meat_seafood','pantry','frozen','beverages','household','other')),
  original_display_texts jsonb not null check (jsonb_typeof(original_display_texts)='array'),
  review_reason text check (review_reason is null or char_length(review_reason) <= 500),
  state text not null default 'needed' check (state in ('needed','already_have','purchased','skipped')),
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(grocery_list_id,position)
);

create table public.kwilt_grocery_item_sources (
  id uuid primary key default gen_random_uuid(),
  grocery_item_id uuid not null references public.kwilt_grocery_items(id) on delete cascade,
  kind text not null check (kind in ('recipe_ingredient','manual','household_request')),
  recipe_version_id uuid references public.kwilt_recipe_versions(id) on delete restrict,
  ingredient_line_id uuid references public.kwilt_recipe_ingredients(id) on delete restrict,
  plan_entry_id uuid references public.kwilt_meal_plan_entries(id) on delete restrict,
  note_id text,
  request_id text,
  requested_by_person_id uuid references public.kwilt_people(id) on delete restrict,
  source_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(source_snapshot)='object'),
  unique(grocery_item_id,kind,recipe_version_id,ingredient_line_id,plan_entry_id)
);

create table public.kwilt_grocery_item_corrections (
  id uuid primary key default gen_random_uuid(),
  grocery_item_id uuid not null references public.kwilt_grocery_items(id) on delete restrict,
  grocery_list_revision integer not null,
  corrected_by_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  before_value jsonb not null,
  after_value jsonb not null,
  reason text check (reason is null or char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

create table public.kwilt_grocery_rebase_conflicts (
  id uuid primary key default gen_random_uuid(),
  owner_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  from_list_id uuid not null references public.kwilt_grocery_lists(id) on delete restrict,
  to_list_id uuid not null references public.kwilt_grocery_lists(id) on delete cascade,
  from_item_id uuid not null references public.kwilt_grocery_items(id) on delete restrict,
  kind text not null check(kind in ('correction_unmatched','correction_ambiguous')),
  proposed_delta jsonb not null check(jsonb_typeof(proposed_delta)='object'),
  state text not null default 'needs_review' check(state in ('needs_review','applied','dismissed')),
  created_at timestamptz not null default now(),
  unique(to_list_id,from_item_id,kind)
);
create index kwilt_grocery_rebase_conflicts_owner_list_idx on public.kwilt_grocery_rebase_conflicts(owner_person_id,to_list_id);

create table public.kwilt_retailer_handoffs (
  id uuid primary key default gen_random_uuid(),
  grocery_list_id uuid not null references public.kwilt_grocery_lists(id) on delete restrict,
  grocery_list_revision integer not null,
  provider text not null,
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 200),
  payload_hash text not null check (char_length(payload_hash) between 1 and 256),
  state text not null default 'list_ready' check (state in ('list_ready','provider_link_requested','provider_link_created','opened_for_product_review','user_reported_checkout_complete','abandoned','expired','failed')),
  private_url text,
  provider_request_id text,
  next_step text not null default 'Review products and check out with the retailer.' check (char_length(next_step) between 1 and 240),
  expires_at timestamptz,
  opened_at timestamptz,
  user_reported_checkout_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(grocery_list_id,grocery_list_revision,provider,payload_hash),
  unique(idempotency_key)
);

create index kwilt_grocery_lists_owner_idx on public.kwilt_grocery_lists(owner_person_id,updated_at desc);
create index kwilt_grocery_items_list_idx on public.kwilt_grocery_items(grocery_list_id,aisle,position);

create or replace function public.kwilt_owns_grocery_list(p_list_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.kwilt_grocery_lists list where list.id=p_list_id and list.owner_person_id=public.kwilt_current_person_id() and list.status<>'archived')
$$;

alter table public.kwilt_grocery_lists enable row level security;
alter table public.kwilt_grocery_items enable row level security;
alter table public.kwilt_grocery_item_sources enable row level security;
alter table public.kwilt_grocery_item_corrections enable row level security;
alter table public.kwilt_grocery_rebase_conflicts enable row level security;
alter table public.kwilt_retailer_handoffs enable row level security;
create policy kwilt_grocery_lists_owner_read on public.kwilt_grocery_lists for select to authenticated using(owner_person_id=public.kwilt_current_person_id() and status<>'archived');
create policy kwilt_grocery_items_owner_read on public.kwilt_grocery_items for select to authenticated using(public.kwilt_owns_grocery_list(grocery_list_id));
create policy kwilt_grocery_sources_owner_read on public.kwilt_grocery_item_sources for select to authenticated using(exists(select 1 from public.kwilt_grocery_items item where item.id=grocery_item_id and public.kwilt_owns_grocery_list(item.grocery_list_id)));
create policy kwilt_grocery_corrections_owner_read on public.kwilt_grocery_item_corrections for select to authenticated using(exists(select 1 from public.kwilt_grocery_items item where item.id=grocery_item_id and public.kwilt_owns_grocery_list(item.grocery_list_id)));
create policy kwilt_grocery_rebase_conflicts_owner_read on public.kwilt_grocery_rebase_conflicts for select to authenticated using(owner_person_id=public.kwilt_current_person_id());
create policy kwilt_retailer_handoffs_owner_read on public.kwilt_retailer_handoffs for select to authenticated using(public.kwilt_owns_grocery_list(grocery_list_id));

create or replace function public.compile_kwilt_grocery_list(p_plan_id uuid,p_expected_plan_version integer,p_payload_hash text,p_compiled_items jsonb,p_rebase_from_list_id uuid default null,p_expected_rebase_revision integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=public.kwilt_require_permanent_user(); v_person uuid; v_plan public.kwilt_meal_plans; v_existing public.kwilt_grocery_lists; v_rebase public.kwilt_grocery_lists; v_list public.kwilt_grocery_lists; v_revision integer; v_item jsonb; v_source jsonb; v_position bigint; v_item_id uuid; v_old_item public.kwilt_grocery_items; v_correction public.kwilt_grocery_item_corrections; v_match_id uuid; v_match_count integer; v_before jsonb; v_manual_count integer:=0; v_correction_count integer:=0; v_conflict_count integer:=0;
begin
  select person_id into v_person from public.kwilt_person_auth_bindings where user_id=v_user and status='active';
  select * into v_plan from public.kwilt_meal_plans where id=p_plan_id for update;
  if v_plan.id is null or v_plan.organizer_person_id<>v_person then raise exception 'grocery_plan_not_owned'; end if;
  if v_plan.version<>p_expected_plan_version or v_plan.state<>'finalized' then raise exception 'stale_or_unfinalized_meal_plan'; end if;
  if char_length(coalesce(p_payload_hash,'')) not between 1 and 256 or jsonb_typeof(p_compiled_items)<>'array' or jsonb_array_length(p_compiled_items)>500 then raise exception 'invalid_grocery_compilation'; end if;
  if (p_rebase_from_list_id is null)<>(p_expected_rebase_revision is null) then raise exception 'invalid_grocery_rebase'; end if;
  if p_rebase_from_list_id is not null then select * into v_rebase from public.kwilt_grocery_lists where id=p_rebase_from_list_id for update; if v_rebase.id is null or v_rebase.owner_person_id<>v_person or v_rebase.source_meal_plan_id<>p_plan_id or v_rebase.revision<>p_expected_rebase_revision then raise exception 'stale_grocery_rebase_source'; end if; end if;
  select * into v_existing from public.kwilt_grocery_lists where source_meal_plan_id=p_plan_id and source_meal_plan_version=p_expected_plan_version;
  if v_existing.id is not null then
    if v_existing.payload_hash<>p_payload_hash then raise exception 'grocery_compilation_idempotency_conflict'; end if;
    if p_rebase_from_list_id is not null and (v_existing.rebased_from_list_id is distinct from p_rebase_from_list_id or v_existing.rebased_from_revision is distinct from p_expected_rebase_revision) then raise exception 'grocery_rebase_idempotency_conflict'; end if;
    select count(*) into v_correction_count from public.kwilt_grocery_item_corrections correction join public.kwilt_grocery_items item on item.id=correction.grocery_item_id where item.grocery_list_id=v_existing.id and correction.reason='rebased:user_elected';
    select count(distinct source.grocery_item_id) into v_manual_count from public.kwilt_grocery_item_sources source join public.kwilt_grocery_items item on item.id=source.grocery_item_id where item.grocery_list_id=v_existing.id and source.source_snapshot?'rebasedFromItemId';
    select count(*) into v_conflict_count from public.kwilt_grocery_rebase_conflicts conflict where conflict.to_list_id=v_existing.id;
    return jsonb_build_object('groceryListId',v_existing.id,'revision',v_existing.revision,'status',v_existing.status,'replayed',true,'rebasedCorrectionCount',v_correction_count,'rebasedManualCount',v_manual_count,'rebaseConflictCount',v_conflict_count);
  end if;
  update public.kwilt_grocery_lists set status='stale',updated_at=now() where source_meal_plan_id=p_plan_id and status in ('review_needed','ready');
  select coalesce(max(revision),0)+1 into v_revision from public.kwilt_grocery_lists where source_meal_plan_id=p_plan_id;
  insert into public.kwilt_grocery_lists(owner_person_id,source_meal_plan_id,source_meal_plan_version,revision,status,payload_hash,rebased_from_list_id,rebased_from_revision)
    values(v_person,p_plan_id,p_expected_plan_version,v_revision,'review_needed',p_payload_hash,p_rebase_from_list_id,p_expected_rebase_revision) returning * into v_list;
  for v_item,v_position in select value,ordinality from jsonb_array_elements(p_compiled_items) with ordinality loop
    if char_length(btrim(coalesce(v_item->>'concept',''))) not between 1 and 320 or jsonb_typeof(coalesce(v_item->'sources','[]'::jsonb))<>'array' then raise exception 'invalid_grocery_item'; end if;
    insert into public.kwilt_grocery_items(grocery_list_id,position,concept,quantity_min,quantity_max,unit,package_quantity,package_unit,preparation,optional,aisle,original_display_texts,review_reason)
      values(v_list.id,v_position-1,btrim(v_item->>'concept'),nullif(v_item->>'quantityMin','')::numeric,nullif(v_item->>'quantityMax','')::numeric,v_item->>'unit',nullif(v_item->>'packageQuantity','')::numeric,v_item->>'packageUnit',v_item->>'preparation',coalesce((v_item->>'optional')::boolean,false),coalesce(v_item->>'aisle','other'),coalesce(v_item->'originalDisplayTexts','[]'::jsonb),v_item->>'reviewReason') returning id into v_item_id;
    for v_source in select value from jsonb_array_elements(v_item->'sources') loop
      if not exists(select 1 from public.kwilt_meal_plan_entries entry where entry.plan_id=p_plan_id and entry.plan_version=p_expected_plan_version and entry.id=(v_source->>'planEntryId')::uuid and entry.recipe_snapshot->>'recipeVersionId'=v_source->>'recipeVersionId') then raise exception 'invalid_grocery_source'; end if;
      if not exists(select 1 from public.kwilt_recipe_ingredients ingredient where ingredient.id=(v_source->>'ingredientLineId')::uuid and ingredient.recipe_version_id=(v_source->>'recipeVersionId')::uuid) then raise exception 'invalid_grocery_source'; end if;
      insert into public.kwilt_grocery_item_sources(grocery_item_id,kind,recipe_version_id,ingredient_line_id,plan_entry_id,source_snapshot)
        values(v_item_id,'recipe_ingredient',(v_source->>'recipeVersionId')::uuid,(v_source->>'ingredientLineId')::uuid,(v_source->>'planEntryId')::uuid,jsonb_build_object('originalText',v_source->>'originalText'));
    end loop;
  end loop;
  if v_rebase.id is not null then
    for v_old_item in select old_item.* from public.kwilt_grocery_items old_item where old_item.grocery_list_id=v_rebase.id and exists(select 1 from public.kwilt_grocery_item_sources old_source where old_source.grocery_item_id=old_item.id and old_source.kind in ('manual','household_request')) order by old_item.position loop
      select coalesce(max(position),-1)+1 into v_position from public.kwilt_grocery_items where grocery_list_id=v_list.id;
      insert into public.kwilt_grocery_items(grocery_list_id,position,concept,quantity_min,quantity_max,unit,package_quantity,package_unit,preparation,optional,aisle,original_display_texts,review_reason,state,note)
      values(v_list.id,v_position,v_old_item.concept,v_old_item.quantity_min,v_old_item.quantity_max,v_old_item.unit,v_old_item.package_quantity,v_old_item.package_unit,v_old_item.preparation,v_old_item.optional,v_old_item.aisle,v_old_item.original_display_texts,v_old_item.review_reason,v_old_item.state,v_old_item.note) returning id into v_item_id;
      insert into public.kwilt_grocery_item_sources(grocery_item_id,kind,note_id,request_id,requested_by_person_id,source_snapshot)
      select v_item_id,kind,note_id,request_id,requested_by_person_id,source_snapshot||jsonb_build_object('rebasedFromItemId',v_old_item.id) from public.kwilt_grocery_item_sources where grocery_item_id=v_old_item.id and kind in ('manual','household_request');
      v_manual_count:=v_manual_count+1;
    end loop;
    for v_correction in select distinct on (correction.grocery_item_id) correction.* from public.kwilt_grocery_item_corrections correction join public.kwilt_grocery_items old_item on old_item.id=correction.grocery_item_id where old_item.grocery_list_id=v_rebase.id order by correction.grocery_item_id,correction.created_at desc loop
      select count(*) into v_match_count from public.kwilt_grocery_items new_item where new_item.grocery_list_id=v_list.id and exists(select 1 from public.kwilt_grocery_item_sources new_source join public.kwilt_grocery_item_sources old_source on old_source.recipe_version_id=new_source.recipe_version_id and old_source.ingredient_line_id=new_source.ingredient_line_id where new_source.grocery_item_id=new_item.id and old_source.grocery_item_id=v_correction.grocery_item_id and new_source.kind='recipe_ingredient' and old_source.kind='recipe_ingredient');
      if v_match_count=1 then
        select new_item.id into v_match_id from public.kwilt_grocery_items new_item where new_item.grocery_list_id=v_list.id and exists(select 1 from public.kwilt_grocery_item_sources new_source join public.kwilt_grocery_item_sources old_source on old_source.recipe_version_id=new_source.recipe_version_id and old_source.ingredient_line_id=new_source.ingredient_line_id where new_source.grocery_item_id=new_item.id and old_source.grocery_item_id=v_correction.grocery_item_id and new_source.kind='recipe_ingredient' and old_source.kind='recipe_ingredient') limit 1;
        select to_jsonb(matched) into v_before from public.kwilt_grocery_items matched where matched.id=v_match_id;
        update public.kwilt_grocery_items set concept=coalesce(nullif(btrim(v_correction.after_value->>'concept'),''),concept),quantity_min=case when v_correction.after_value?'quantity_min' then nullif(v_correction.after_value->>'quantity_min','')::numeric else quantity_min end,quantity_max=case when v_correction.after_value?'quantity_max' then nullif(v_correction.after_value->>'quantity_max','')::numeric else quantity_max end,unit=case when v_correction.after_value?'unit' then v_correction.after_value->>'unit' else unit end,note=case when v_correction.after_value?'note' then v_correction.after_value->>'note' else note end,updated_at=now() where id=v_match_id;
        insert into public.kwilt_grocery_item_corrections(grocery_item_id,grocery_list_revision,corrected_by_person_id,before_value,after_value,reason) select v_match_id,v_list.revision,v_person,v_before,to_jsonb(matched),'rebased:user_elected' from public.kwilt_grocery_items matched where matched.id=v_match_id;
        v_correction_count:=v_correction_count+1;
      else
        insert into public.kwilt_grocery_rebase_conflicts(owner_person_id,from_list_id,to_list_id,from_item_id,kind,proposed_delta) values(v_person,v_rebase.id,v_list.id,v_correction.grocery_item_id,case when v_match_count=0 then 'correction_unmatched' else 'correction_ambiguous' end,v_correction.after_value);
        v_conflict_count:=v_conflict_count+1;
      end if;
    end loop;
  end if;
  return jsonb_build_object('groceryListId',v_list.id,'revision',v_list.revision,'status',v_list.status,'replayed',false,'rebasedCorrectionCount',v_correction_count,'rebasedManualCount',v_manual_count,'rebaseConflictCount',v_conflict_count);
end;
$$;

create or replace function public.update_kwilt_grocery_item(p_item_id uuid,p_expected_revision integer,p_patch jsonb,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=public.kwilt_require_permanent_user(); v_person uuid; v_item public.kwilt_grocery_items; v_list public.kwilt_grocery_lists; v_before jsonb;
begin
  select person_id into v_person from public.kwilt_person_auth_bindings where user_id=v_user and status='active';
  select * into v_item from public.kwilt_grocery_items where id=p_item_id for update; select * into v_list from public.kwilt_grocery_lists where id=v_item.grocery_list_id for update;
  if v_list.owner_person_id<>v_person then raise exception 'grocery_list_not_owned'; end if; if v_list.revision<>p_expected_revision or v_list.status='stale' then raise exception 'stale_grocery_list_revision'; end if;
  v_before:=to_jsonb(v_item);
  update public.kwilt_grocery_items set concept=coalesce(nullif(btrim(p_patch->>'concept'),''),concept),quantity_min=case when p_patch?'quantityMin' then nullif(p_patch->>'quantityMin','')::numeric else quantity_min end,quantity_max=case when p_patch?'quantityMax' then nullif(p_patch->>'quantityMax','')::numeric else quantity_max end,unit=case when p_patch?'unit' then p_patch->>'unit' else unit end,note=case when p_patch?'note' then p_patch->>'note' else note end,updated_at=now() where id=p_item_id returning * into v_item;
  insert into public.kwilt_grocery_item_corrections(grocery_item_id,grocery_list_revision,corrected_by_person_id,before_value,after_value,reason) values(p_item_id,v_list.revision,v_person,v_before,to_jsonb(v_item),nullif(btrim(p_reason),''));
  update public.kwilt_grocery_lists set revision=revision+1,status='review_needed',updated_at=now() where id=v_list.id returning * into v_list;
  return jsonb_build_object('groceryListId',v_list.id,'revision',v_list.revision,'itemId',v_item.id);
end;
$$;

create or replace function public.set_kwilt_grocery_item_state(p_item_id uuid,p_expected_revision integer,p_state text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_item public.kwilt_grocery_items; v_list public.kwilt_grocery_lists; v_person uuid;
begin
  perform public.kwilt_require_permanent_user(); select public.kwilt_current_person_id() into v_person; select * into v_item from public.kwilt_grocery_items where id=p_item_id for update; select * into v_list from public.kwilt_grocery_lists where id=v_item.grocery_list_id for update;
  if v_list.owner_person_id<>v_person then raise exception 'grocery_list_not_owned'; end if; if v_list.revision<>p_expected_revision then raise exception 'stale_grocery_list_revision'; end if; if p_state not in ('needed','already_have','purchased','skipped') then raise exception 'invalid_grocery_item_state'; end if;
  update public.kwilt_grocery_items set state=p_state,updated_at=now() where id=p_item_id; update public.kwilt_grocery_lists set revision=revision+1,updated_at=now() where id=v_list.id returning * into v_list;
  return jsonb_build_object('groceryListId',v_list.id,'revision',v_list.revision,'itemId',p_item_id,'state',p_state);
end;
$$;

create or replace function public.add_kwilt_grocery_item(p_list_id uuid,p_expected_revision integer,p_title text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_list public.kwilt_grocery_lists; v_item uuid; v_position integer;
begin
  perform public.kwilt_require_permanent_user(); select * into v_list from public.kwilt_grocery_lists where id=p_list_id for update;
  if v_list.owner_person_id<>public.kwilt_current_person_id() then raise exception 'grocery_list_not_owned'; end if; if v_list.revision<>p_expected_revision then raise exception 'stale_grocery_list_revision'; end if;
  select coalesce(max(position),-1)+1 into v_position from public.kwilt_grocery_items where grocery_list_id=p_list_id;
  insert into public.kwilt_grocery_items(grocery_list_id,position,concept,aisle,original_display_texts,review_reason) values(p_list_id,v_position,btrim(p_title),'other',jsonb_build_array(btrim(p_title)),null) returning id into v_item;
  insert into public.kwilt_grocery_item_sources(grocery_item_id,kind,note_id,source_snapshot) values(v_item,'manual',v_item::text,jsonb_build_object('title',btrim(p_title)));
  update public.kwilt_grocery_lists set revision=revision+1,status='review_needed',updated_at=now() where id=p_list_id returning * into v_list;
  return jsonb_build_object('groceryListId',p_list_id,'revision',v_list.revision,'itemId',v_item);
end;
$$;

create or replace function public.mark_kwilt_grocery_list_reviewed(p_list_id uuid,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_list public.kwilt_grocery_lists;
begin
  perform public.kwilt_require_permanent_user(); select * into v_list from public.kwilt_grocery_lists where id=p_list_id for update;
  if v_list.owner_person_id<>public.kwilt_current_person_id() then raise exception 'grocery_list_not_owned'; end if; if v_list.revision<>p_expected_revision or v_list.status='stale' then raise exception 'stale_grocery_list_revision'; end if;
  update public.kwilt_grocery_lists set status='ready',reviewed_at=now(),updated_at=now() where id=p_list_id returning * into v_list;
  return jsonb_build_object('groceryListId',p_list_id,'revision',v_list.revision,'status',v_list.status);
end;
$$;

grant select on public.kwilt_grocery_lists,public.kwilt_grocery_items,public.kwilt_grocery_item_sources,public.kwilt_grocery_item_corrections,public.kwilt_grocery_rebase_conflicts,public.kwilt_retailer_handoffs to authenticated;
revoke insert,update,delete on public.kwilt_grocery_lists,public.kwilt_grocery_items,public.kwilt_grocery_item_sources,public.kwilt_grocery_item_corrections,public.kwilt_grocery_rebase_conflicts,public.kwilt_retailer_handoffs from public,anon,authenticated;
revoke execute on function public.kwilt_owns_grocery_list(uuid) from public,anon; grant execute on function public.kwilt_owns_grocery_list(uuid) to authenticated;
revoke execute on function public.compile_kwilt_grocery_list(uuid,integer,text,jsonb,uuid,integer),public.update_kwilt_grocery_item(uuid,integer,jsonb,text),public.set_kwilt_grocery_item_state(uuid,integer,text),public.add_kwilt_grocery_item(uuid,integer,text),public.mark_kwilt_grocery_list_reviewed(uuid,integer) from public,anon;
grant execute on function public.compile_kwilt_grocery_list(uuid,integer,text,jsonb,uuid,integer),public.update_kwilt_grocery_item(uuid,integer,jsonb,text),public.set_kwilt_grocery_item_state(uuid,integer,text),public.add_kwilt_grocery_item(uuid,integer,text),public.mark_kwilt_grocery_list_reviewed(uuid,integer) to authenticated;
