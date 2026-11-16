-- Add explicit transfer destinations and versioned literal partial matching.
-- Existing rules retain their legacy matcher. No history is rewritten by deployment.
alter table public.budget_transaction_match_rules
  alter column budget_id drop not null,
  add column rule_kind text not null default 'category' check (rule_kind in ('category','transfer')),
  add column match_version text not null default 'legacy' check (match_version in ('legacy','contains_v2')),
  add constraint budget_rule_destination check (
    (rule_kind='category' and nullif(btrim(budget_id),'') is not null)
    or (rule_kind='transfer' and budget_id is null));

create or replace function public.budget_rule_matches_version(
  p_key text, p_mode text, p_merchant text, p_version text, p_description text default null, p_name text default null
)
returns boolean language sql immutable parallel safe security invoker set search_path = '' as $$
  select case when p_version='legacy' then public.budget_merchant_rule_matches(p_key,p_mode,p_merchant)
    when p_version='contains_v2' then
      public.normalize_budget_merchant(p_key,'exact') <> '' and
      case when p_mode='exact' then public.normalize_budget_merchant(p_key,'exact')=public.normalize_budget_merchant(p_merchant,'exact')
        when p_mode='partial' then exists(select 1 from unnest(array[p_merchant,p_description,p_name]) value
          where strpos(public.normalize_budget_merchant(value,'exact'),public.normalize_budget_merchant(p_key,'exact'))>0)
        else false end
    else false end;
$$;
revoke all on function public.budget_rule_matches_version(text,text,text,text,text,text) from public,anon;
grant execute on function public.budget_rule_matches_version(text,text,text,text,text,text) to authenticated,service_role;

create or replace function public.apply_budget_transaction_match_rule_to_row()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_rule public.budget_transaction_match_rules%rowtype;
begin
  -- Keep splits and explicit non-spending/income decisions. Rule-owned transfers
  -- remain eligible so a changed/deleted rule can be reconciled.
  if exists(select 1 from public.budget_transaction_allocations a where a.transaction_id=new.id)
    or (new.money_meaning_source is distinct from 'rule' and
      (new.budget_match_source='excluded' or new.money_meaning in ('transfer','not_counted','category_credit','income')))
  then return new; end if;
  select r.* into v_rule from public.budget_transaction_match_rules r
  where r.user_id=new.user_id and (r.rule_kind='transfer' or new.direction='outflow')
    and public.budget_rule_matches_version(r.merchant_contains,r.merchant_match_mode,coalesce(nullif(btrim(new.merchant_name),''),new.name),r.match_version,new.original_description,new.name)
  order by case when r.merchant_match_mode='exact' then 0 else 1 end,r.updated_at desc,r.id desc limit 1;
  if found or new.budget_match_source='merchant_rule' or new.money_meaning_source='rule' then
    new.budget_id := v_rule.budget_id;
    new.budget_match_source := case when v_rule.id is null then null else 'merchant_rule' end;
    new.budget_match_confidence := case when v_rule.id is null then null else 1 end;
    new.budget_match_reason := case when v_rule.id is null then null when v_rule.rule_kind='transfer' then 'Applied from saved internal transfer rule.' else 'Applied from saved merchant rule.' end;
    new.budget_match_reviewed_at := v_rule.updated_at;
    new.budget_assignment_source := case when v_rule.id is null then null else 'merchant_rule' end;
    new.budget_assignment_policy_version := case when v_rule.id is null then null when v_rule.rule_kind='transfer' then 'merchant-rule-v2' else 'merchant-rule-v1' end;
    new.budget_assignment_governed := v_rule.id is not null;
    new.money_meaning := case when v_rule.rule_kind='transfer' then 'transfer' else null end;
    new.money_meaning_source := case when v_rule.rule_kind='transfer' then 'rule' else null end;
    new.money_meaning_category_budget_id := null;
    new.money_meaning_reason := case when v_rule.rule_kind='transfer' then 'Applied from saved internal transfer rule.' else null end;
    new.money_meaning_reviewed_at := case when v_rule.rule_kind='transfer' then v_rule.updated_at else null end;
    if v_rule.rule_kind='transfer' then
      new.plan_role_override := null; new.plan_role_override_reviewed_at := null;
      new.saved_resource_cents := 0; new.plan_coverage_reviewed_at := null; new.plan_coverage_provenance := null;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.apply_budget_transaction_match_rule_to_row() from public,anon,authenticated;

-- Transfer rules also cover inflows. Keep the exact-match history path indexed.
create index if not exists budget_transactions_user_rule_exact_merchant_idx
on public.budget_transactions(user_id,(public.normalize_budget_merchant(coalesce(nullif(btrim(merchant_name),''),name),'exact')));

create or replace function public.apply_budget_transaction_match_rule_to_history()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_owner uuid; v_old public.budget_transaction_match_rules%rowtype; v_new public.budget_transaction_match_rules%rowtype;
  v_count integer := 0; v_candidates uuid[] := '{}'; v_partial_candidates uuid[] := '{}'; v_exact_keys text[] := '{}';
begin
  if tg_op<>'INSERT' then v_old:=old; end if;
  if tg_op<>'DELETE' then v_new:=new; end if;
  v_owner:=coalesce(v_new.user_id,v_old.user_id);
  if v_new.merchant_match_mode='exact' then v_exact_keys:=array_append(v_exact_keys,public.normalize_budget_merchant(v_new.merchant_contains,'exact')); end if;
  if v_old.merchant_match_mode='exact' then v_exact_keys:=array_append(v_exact_keys,public.normalize_budget_merchant(v_old.merchant_contains,'exact')); end if;
  if cardinality(v_exact_keys)>0 then
    select coalesce(array_agg(t.id),'{}') into v_candidates from public.budget_transactions t
    where t.user_id=v_owner and public.normalize_budget_merchant(coalesce(nullif(btrim(t.merchant_name),''),t.name),'exact')=any(v_exact_keys);
  end if;
  if v_new.merchant_match_mode='partial' or v_old.merchant_match_mode='partial' then
    select coalesce(array_agg(t.id),'{}') into v_partial_candidates from public.budget_transactions t
    where t.user_id=v_owner and (
      (v_new.merchant_match_mode='partial' and public.budget_rule_matches_version(v_new.merchant_contains,'partial',coalesce(nullif(btrim(t.merchant_name),''),t.name),v_new.match_version,t.original_description,t.name))
      or (v_old.merchant_match_mode='partial' and public.budget_rule_matches_version(v_old.merchant_contains,'partial',coalesce(nullif(btrim(t.merchant_name),''),t.name),v_old.match_version,t.original_description,t.name)));
  end if;
  with candidates as (
    select t.* from public.budget_transactions t
    where t.user_id=v_owner and t.id=any(v_candidates || v_partial_candidates)
      and (t.direction='outflow' or v_new.rule_kind='transfer' or v_old.rule_kind='transfer' or t.money_meaning_source='rule')
      and not exists(select 1 from public.budget_transaction_allocations a where a.transaction_id=t.id)
      and (t.money_meaning_source='rule' or
        (t.budget_match_source is distinct from 'excluded' and
          (t.money_meaning is null or t.money_meaning not in ('transfer','not_counted','category_credit','income'))))
  ), resolved as (
    select t.id as transaction_id,r.* from candidates t
    left join lateral (
      select r.* from public.budget_transaction_match_rules r
      where r.user_id=t.user_id and (r.rule_kind='transfer' or t.direction='outflow')
        and public.budget_rule_matches_version(r.merchant_contains,r.merchant_match_mode,coalesce(nullif(btrim(t.merchant_name),''),t.name),r.match_version,t.original_description,t.name)
      order by case when r.merchant_match_mode='exact' then 0 else 1 end,r.updated_at desc,r.id desc limit 1
    ) r on true
  )
  update public.budget_transactions t set
    budget_id = r.budget_id,
    budget_match_source = case when r.id is null then null else 'merchant_rule' end,
    budget_match_confidence = case when r.id is null then null else 1 end,
    budget_match_reason = case when r.id is null then null when r.rule_kind='transfer' then 'Applied from saved internal transfer rule.' else 'Applied from saved merchant rule.' end,
    budget_match_reviewed_at = r.updated_at,
    budget_assignment_source = case when r.id is null then null else 'merchant_rule' end,
    budget_assignment_policy_version = case when r.id is null then null when r.rule_kind='transfer' then 'merchant-rule-v2' else 'merchant-rule-v1' end,
    budget_assignment_governed = r.id is not null,
    money_meaning = case when r.rule_kind='transfer' then 'transfer' else null end,
    money_meaning_source = case when r.rule_kind='transfer' then 'rule' else null end,
    money_meaning_category_budget_id = null,
    money_meaning_reason = case when r.rule_kind='transfer' then 'Applied from saved internal transfer rule.' else null end,
    money_meaning_reviewed_at = case when r.rule_kind='transfer' then r.updated_at else null end,
    plan_role_override = case when r.rule_kind='transfer' then null else t.plan_role_override end,
    plan_role_override_reviewed_at = case when r.rule_kind='transfer' then null else t.plan_role_override_reviewed_at end,
    saved_resource_cents = case when r.rule_kind='transfer' then 0 else t.saved_resource_cents end,
    plan_coverage_reviewed_at = case when r.rule_kind='transfer' then null else t.plan_coverage_reviewed_at end,
    plan_coverage_provenance = case when r.rule_kind='transfer' then null else t.plan_coverage_provenance end
  from resolved r where t.id=r.transaction_id and t.user_id=v_owner
    and (r.id is not null or t.budget_match_source='merchant_rule' or t.money_meaning_source='rule')
    and row(t.budget_id,t.budget_match_source,t.budget_match_confidence,t.budget_match_reason,t.budget_match_reviewed_at,t.budget_assignment_source,t.budget_assignment_policy_version,t.budget_assignment_governed,t.money_meaning,t.money_meaning_source,t.money_meaning_category_budget_id,t.money_meaning_reason,t.money_meaning_reviewed_at,t.plan_role_override,t.plan_role_override_reviewed_at,t.saved_resource_cents,t.plan_coverage_reviewed_at,t.plan_coverage_provenance)
    is distinct from row(r.budget_id,case when r.id is null then null else 'merchant_rule' end,case when r.id is null then null else 1 end,case when r.id is null then null when r.rule_kind='transfer' then 'Applied from saved internal transfer rule.' else 'Applied from saved merchant rule.' end,r.updated_at,case when r.id is null then null else 'merchant_rule' end,case when r.id is null then null when r.rule_kind='transfer' then 'merchant-rule-v2' else 'merchant-rule-v1' end,r.id is not null,case when r.rule_kind='transfer' then 'transfer' else null end,case when r.rule_kind='transfer' then 'rule' else null end,null,case when r.rule_kind='transfer' then 'Applied from saved internal transfer rule.' else null end,case when r.rule_kind='transfer' then r.updated_at else null end,case when r.rule_kind='transfer' then null else t.plan_role_override end,case when r.rule_kind='transfer' then null else t.plan_role_override_reviewed_at end,case when r.rule_kind='transfer' then 0 else t.saved_resource_cents end,case when r.rule_kind='transfer' then null else t.plan_coverage_reviewed_at end,case when r.rule_kind='transfer' then null else t.plan_coverage_provenance end);
  get diagnostics v_count=row_count;
  perform set_config('kwilt.merchant_rule_applied_count',v_count::text,true);
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.apply_budget_transaction_match_rule_to_history() from public,anon,authenticated;
drop trigger if exists apply_budget_transaction_match_rule_to_history on public.budget_transaction_match_rules;
create trigger apply_budget_transaction_match_rule_to_history
after insert or update of budget_id,merchant_contains,merchant_match_mode,rule_kind,match_version
on public.budget_transaction_match_rules for each row execute function public.apply_budget_transaction_match_rule_to_history();

create or replace function public.upsert_budget_transaction_rule_v2(
  p_transaction_id uuid, p_rule_kind text, p_budget_id text,
  p_merchant_contains text, p_match_mode text, p_label text,
  p_match_version text default 'contains_v2'
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_owner uuid := public.budget_effective_owner_user_id();
  v_merchant text; v_description text; v_name text; v_direction text; v_effective public.budget_transaction_match_rules%rowtype; v_key text; v_rule_id uuid; v_count integer;
begin
  if v_owner is null or auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
    raise exception 'An active adult household membership is required.' using errcode='42501';
  end if;
  if p_rule_kind is null or p_rule_kind not in ('category','transfer')
    or p_match_mode is null or p_match_mode not in ('exact','partial')
    or p_match_version is null or p_match_version not in ('legacy','contains_v2') then
    raise exception 'Unsupported merchant rule.' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('budget-merchant-rules:'||v_owner::text,0));
  select coalesce(nullif(btrim(t.merchant_name),''),t.name),t.original_description,t.name,t.direction into v_merchant,v_description,v_name,v_direction
  from public.budget_transactions t
  where t.id=p_transaction_id and t.user_id=v_owner and (p_rule_kind='transfer' or t.direction='outflow')
    and not exists(select 1 from public.budget_transaction_allocations a where a.transaction_id=t.id)
  for update;
  if v_merchant is null then raise exception 'The source transaction is unavailable.' using errcode='42501'; end if;
  v_key:=public.normalize_budget_merchant(p_merchant_contains,case when p_match_version='legacy' then p_match_mode else 'exact' end);
  if v_key='' or not public.budget_rule_matches_version(v_key,p_match_mode,v_merchant,p_match_version,v_description,v_name) then
    raise exception 'The merchant rule does not match its source transaction.' using errcode='22023';
  end if;
  if p_rule_kind='transfer' and p_budget_id is not null then
    raise exception 'An internal transfer cannot have a spending category.' using errcode='22023';
  end if;
  if p_rule_kind='category' and not exists(select 1 from public.budget_categories c
    where c.user_id=v_owner and c.status='active'
      and (c.id::text=btrim(p_budget_id) or coalesce(nullif(btrim(c.legacy_budget_id),''),c.slug)=btrim(p_budget_id))) then
    raise exception 'The category is not available.' using errcode='22023';
  end if;
  perform set_config('kwilt.merchant_rule_applied_count','0',true);
  insert into public.budget_transaction_match_rules(user_id,budget_id,rule_kind,match_version,merchant_contains,merchant_match_mode,label,created_from_transaction_id)
  values(v_owner,case when p_rule_kind='category' then btrim(p_budget_id) else null end,p_rule_kind,p_match_version,v_key,p_match_mode,
    coalesce(nullif(btrim(p_label),''),'Merchant rule'),p_transaction_id)
  on conflict(user_id,merchant_contains,merchant_match_mode) do update
    set budget_id=excluded.budget_id,rule_kind=excluded.rule_kind,match_version=excluded.match_version,
      label=excluded.label,created_from_transaction_id=excluded.created_from_transaction_id,updated_at=now()
  returning id into v_rule_id;
  v_count:=coalesce(nullif(current_setting('kwilt.merchant_rule_applied_count',true),'')::integer,0);
  select r.* into v_effective from public.budget_transaction_match_rules r
    where r.user_id=v_owner and (r.rule_kind='transfer' or v_direction='outflow')
      and public.budget_rule_matches_version(r.merchant_contains,r.merchant_match_mode,v_merchant,r.match_version,v_description,v_name)
    order by case when r.merchant_match_mode='exact' then 0 else 1 end,r.updated_at desc,r.id desc limit 1;
  return jsonb_build_object('ruleId',v_rule_id,'appliedTransactionCount',v_count,'merchantKey',v_key,
    'matchMode',p_match_mode,'categoryId',case when p_rule_kind='category' then btrim(p_budget_id) else null end,'targetKind',p_rule_kind,
    'effectiveTargetKind',v_effective.rule_kind,'effectiveCategoryId',v_effective.budget_id);
end;
$$;
revoke all on function public.upsert_budget_transaction_rule_v2(uuid,text,text,text,text,text,text) from public,anon;
grant execute on function public.upsert_budget_transaction_rule_v2(uuid,text,text,text,text,text,text) to authenticated;

-- Older clients retain their original matching contract and category-only API.
create or replace function public.upsert_budget_transaction_match_rule(
  p_transaction_id uuid, p_budget_id text, p_merchant_contains text, p_match_mode text, p_label text
)
returns jsonb language sql security invoker set search_path = '' as $$
  select public.upsert_budget_transaction_rule_v2(p_transaction_id,'category',p_budget_id,p_merchant_contains,p_match_mode,p_label,'legacy');
$$;
revoke all on function public.upsert_budget_transaction_match_rule(uuid,text,text,text,text) from public,anon;
grant execute on function public.upsert_budget_transaction_match_rule(uuid,text,text,text,text) to authenticated;
-- Import description corrections must use the same matcher as rule creation.
drop trigger if exists apply_budget_transaction_match_rule on public.budget_transactions;
create trigger apply_budget_transaction_match_rule
before insert or update of merchant_name,name,original_description,user_id
on public.budget_transactions for each row execute function public.apply_budget_transaction_match_rule_to_row();
notify pgrst, 'reload schema';
