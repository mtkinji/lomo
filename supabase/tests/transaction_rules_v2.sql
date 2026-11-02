-- Appended to the rolled-back canonical household fixture by the isolated runner.
create temporary table rule_cases(label text primary key,id uuid default gen_random_uuid());
insert into rule_cases(label) values('source'),('history'),('inflow'),('manual-inflow'),('income'),('credit'),('excluded'),('split'),('other'),('transfer-source'),('future'),('description-update');
grant select on rule_cases to authenticated;
insert into public.budget_transactions(id,user_id,name,merchant_name,original_description,direction,budget_id,budget_match_source,money_meaning,money_meaning_source)
select c.id,case when c.label='other' then f.other_id else f.owner_id end,
  case when c.label='transfer-source' then 'Broker Transfer' else 'Online Payment' end,
  case when c.label='transfer-source' then 'Broker Transfer' else 'Online Payment' end,
  'Online Payment 123456 To Taylor Example 10/23',
  case when c.label in ('inflow','manual-inflow','income','credit') then 'inflow' else 'outflow' end,
  case when c.label in ('manual-inflow','credit','history') then 'legacy-atomic-settings' else null end,
  case when c.label in ('excluded','transfer-source') then 'excluded' when c.label='manual-inflow' then 'corrected' else null end,
  case c.label when 'income' then 'income' when 'credit' then 'category_credit' when 'transfer-source' then 'transfer' else null end,
  case when c.label in ('income','credit','transfer-source') then 'confirmed' else null end
from rule_cases c cross join category_settings_fixture f where c.label not in ('future','description-update');
insert into public.budget_transaction_allocations select c.id,f.owner_id,'legacy-atomic-settings',10000 from rule_cases c cross join category_settings_fixture f where c.label='split';
update public.budget_transactions set plan_role_override='protected',saved_resource_cents=5000,plan_coverage_provenance='user_declared' where id=(select id from rule_cases where label='history');

set local role authenticated;
do $$
declare f record; receipt jsonb; actor uuid; failed boolean; source_id uuid; transfer_id uuid;
begin
 select * into f from category_settings_fixture;
 select id into source_id from rule_cases where label='source';
 select id into transfer_id from rule_cases where label='transfer-source';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.owner_id,'is_anonymous',false)::text,true);
 assert not public.budget_merchant_rule_matches('Taylor Example','partial','Online Payment 123456 To Taylor Example'), 'Legacy matcher changed';
 assert public.budget_rule_matches_version('Taylor Example','partial','Online Payment','contains_v2','To Taylor Example'), 'Raw bank description ignored';
 assert not public.budget_rule_matches_version('To Taylor Example','partial','To Taylor Else','contains_v2'), 'Pattern truncated';
 receipt:=public.upsert_budget_transaction_rule_v2(source_id,'category','legacy-atomic-settings','Taylor Example','partial','Household');
 assert receipt->>'targetKind'='category' and receipt->>'merchantKey'='taylor example', 'Category receipt invalid';
 assert (receipt->>'appliedTransactionCount')::integer=2, 'Category rule touched protected or inflow rows';
 assert (select budget_id='legacy-atomic-settings' and budget_match_source='corrected' from public.budget_transactions where id=(select id from rule_cases where label='manual-inflow')), 'Category rule erased manual inflow';
 -- An adult saves against the same canonical household owner.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.adult_id,'is_anonymous',false)::text,true);
 receipt:=public.upsert_budget_transaction_rule_v2(transfer_id,'transfer',null,'Broker Transfer','exact','Transfer');
 assert receipt->>'targetKind'='transfer' and receipt->'categoryId'='null'::jsonb, 'Transfer destination invented a category';
 -- Change the partial category rule to transfer; both directions must reconcile.
 receipt:=public.upsert_budget_transaction_rule_v2(source_id,'transfer',null,'Taylor Example','partial','Transfer');
 assert (receipt->>'appliedTransactionCount')::integer=4, 'Transfer history did not cover eligible inflows and outflows';
 assert (select bool_and(money_meaning='transfer' and money_meaning_source='rule' and budget_id is null) from public.budget_transactions where id in (select id from rule_cases where label in ('source','history','inflow','manual-inflow'))), 'History transfer not applied';
 assert (select plan_role_override is null and saved_resource_cents=0 and plan_coverage_provenance is null from public.budget_transactions where id=(select id from rule_cases where label='history')), 'Transfer retained spending coverage';
 assert (select money_meaning='income' from public.budget_transactions where id=(select id from rule_cases where label='income')), 'Income changed';
 assert (select money_meaning='category_credit' from public.budget_transactions where id=(select id from rule_cases where label='credit')), 'Credit changed';
 assert (select budget_match_source='excluded' from public.budget_transactions where id=(select id from rule_cases where label='excluded')), 'Excluded changed';
 assert (select budget_id is null and money_meaning is null from public.budget_transactions where id=(select id from rule_cases where label='split')), 'Split changed';
 receipt:=public.upsert_budget_transaction_rule_v2(source_id,'category','legacy-atomic-settings','Online Payment','exact','Household');
 receipt:=public.upsert_budget_transaction_rule_v2(source_id,'transfer',null,'Taylor Example','partial','Transfer');
 assert receipt->>'targetKind'='transfer' and receipt->>'effectiveTargetKind'='category' and receipt->>'effectiveCategoryId'='legacy-atomic-settings', 'Saved rule falsely reported as effective rule';
 foreach actor in array array[f.child_id,f.other_id,null::uuid] loop
   perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'is_anonymous',false)::text,true);
   failed:=false;
   begin perform public.upsert_budget_transaction_rule_v2(source_id,'transfer',null,'Taylor Example','partial','Transfer');
   exception when insufficient_privilege then failed:=true; end;
   assert failed, 'Unauthorized actor saved rule';
 end loop;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.owner_id,'is_anonymous',true)::text,true);
 failed:=false;
 begin perform public.upsert_budget_transaction_rule_v2(source_id,'transfer',null,'Taylor Example','partial','Transfer');
 exception when insufficient_privilege then failed:=true; end;
 assert failed, 'Anonymous actor saved rule';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.owner_id,'fixture_pro',false)::text,true);
 failed:=false;
 begin perform public.upsert_budget_transaction_rule_v2(source_id,'transfer',null,'Taylor Example','partial','Transfer');
 exception when raise_exception then failed:=sqlerrm='kwilt_pro_required'; end;
 assert failed, 'Pro gate bypassed';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.owner_id,'is_anonymous',false)::text,true);
 failed:=false;
 begin perform public.upsert_budget_transaction_rule_v2((select id from rule_cases where label='split'),'transfer',null,'Taylor Example','partial','Transfer');
 exception when insufficient_privilege then failed:=true; end;
 assert failed, 'Split source accepted';
 failed:=false;
 begin perform public.upsert_budget_transaction_rule_v2(source_id,'transfer',null,'Missing Person','partial','Transfer');
 exception when invalid_parameter_value then failed:=true; end;
 assert failed, 'Nonmatching source accepted';
end $$;
reset role;
-- Trusted future imports and corrections execute the same row trigger.
insert into public.budget_transactions(id,user_id,name,merchant_name,original_description,direction)
select c.id,f.owner_id,'Online Payment','Online Payment',case when c.label='future' then 'Paid To Taylor Example 11/01' else 'Other payee' end,'inflow'
from rule_cases c cross join category_settings_fixture f where c.label in ('future','description-update');
update public.budget_transactions set original_description='Paid To Taylor Example 11/01' where id=(select id from rule_cases where label='description-update');
do $$ begin
 assert (select bool_and(money_meaning='transfer' and money_meaning_source='rule') from public.budget_transactions where id in(select id from rule_cases where label in('future','description-update'))), 'Future import or corrected description missed rule';
 assert (select money_meaning is null and budget_id is null from public.budget_transactions where id=(select id from rule_cases where label='other')), 'Other household changed';
end $$;
-- Deleting a rule only clears its own automatic decisions; explicit transfer stays.
delete from public.budget_transaction_match_rules where merchant_contains='taylor example';
do $$ begin
 assert (select money_meaning is null and budget_match_source is null from public.budget_transactions where id=(select id from rule_cases where label='future')), 'Deleted rule left automatic transfer';
 assert (select money_meaning='transfer' and money_meaning_source='confirmed' from public.budget_transactions where id=(select id from rule_cases where label='transfer-source')), 'Deleted rule erased explicit transfer';
end $$;
set local role authenticated;
do $$ declare receipt jsonb; begin
 receipt:=public.upsert_budget_transaction_match_rule((select id from rule_cases where label='source'),'legacy-atomic-settings','Online Payment To Taylor Example','partial','Legacy client');
 assert receipt->>'merchantKey'='online payment', 'Older client matching contract changed';
 assert (select match_version='legacy' from public.budget_transaction_match_rules where id=(receipt->>'ruleId')::uuid), 'Older writer silently upgraded matching';
end $$;
reset role;
select 'PASS: literal partial matching, transfer history/imports, household authorization, Pro gate, split/meaning protection and deletion.';
rollback;
