create or replace function public.rename_budget_category_from_agent(
  p_user_id uuid,
  p_thread_id uuid,
  p_run_id uuid,
  p_message_id uuid,
  p_call_id text,
  p_category_id uuid,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_idempotency_key text := 'server:' || p_run_id::text || ':' || btrim(coalesce(p_call_id, ''));
  v_timestamp timestamptz := now();
  v_previous_name text;
  v_proposal_id uuid;
  v_operation_id uuid;
  v_receipt public.kwilt_agent_mutation_receipts%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_user_id is null then raise exception 'user_id_required'; end if;
  if p_category_id is null then raise exception 'category_id_required'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 120 then raise exception 'invalid_category_name'; end if;
  if p_call_id is null or char_length(btrim(p_call_id)) < 1 or char_length(p_call_id) > 120 then
    raise exception 'invalid_tool_call_id';
  end if;
  if not exists (
    select 1 from public.kwilt_agent_runs candidate
    where candidate.id = p_run_id and candidate.user_id = p_user_id
      and candidate.thread_id = p_thread_id and candidate.user_message_id = p_message_id
      and candidate.status = 'active'
  ) then raise exception 'active_run_not_found'; end if;

  if not (
    exists (
      select 1 from public.kwilt_revenuecat_subscriptions subscription
      where subscription.revenuecat_app_user_id = p_user_id::text
        and subscription.is_pro is true
        and (subscription.expires_at is null or subscription.expires_at > v_timestamp)
    )
    or exists (
      select 1 from public.kwilt_pro_entitlements entitlement
      where entitlement.quota_key = 'user:' || p_user_id::text
        and entitlement.is_pro is true
        and (entitlement.expires_at is null or entitlement.expires_at > v_timestamp)
    )
  ) then
    return jsonb_build_object('status', 'pro_required');
  end if;

  select * into v_receipt
  from public.kwilt_agent_mutation_receipts candidate
  where candidate.user_id = p_user_id and candidate.capability_id = 'money'
    and candidate.idempotency_key = v_idempotency_key;
  if found then
    return jsonb_build_object(
      'status', v_receipt.status,
      'categoryId', v_receipt.resulting_object_id,
      'receiptId', v_receipt.id,
      'updatedAt', v_receipt.applied_at,
      'replayed', true
    );
  end if;

  select category.name into v_previous_name
  from public.budget_categories category
  where category.id = p_category_id and category.user_id = p_user_id and category.status = 'active'
  for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;

  insert into public.kwilt_agent_proposals (
    user_id, thread_id, run_id, message_id, capability_id, title, body, status,
    permission_policy, decided_at, applied_at
  ) values (
    p_user_id, p_thread_id, p_run_id, p_message_id, 'money', 'Rename Money category',
    'Applies the explicitly confirmed category name through Kwilt.', 'applied',
    jsonb_build_object('confirmation', 'explicit', 'autoApplied', true), v_timestamp, v_timestamp
  ) returning id into v_proposal_id;

  insert into public.kwilt_agent_proposal_operations (
    user_id, proposal_id, capability_id, operation_type, target_type, target_id,
    summary, payload, idempotency_key, sequence
  ) values (
    p_user_id, v_proposal_id, 'money', 'rename_money_category', 'money_category', p_category_id::text,
    'Rename Money category to ' || v_name,
    jsonb_build_object('name', v_name, 'expectedName', v_previous_name), v_idempotency_key, 1
  ) returning id into v_operation_id;

  update public.budget_categories category
  set name = v_name
  where category.id = p_category_id and category.user_id = p_user_id and category.status = 'active';
  if not found then raise exception 'category_changed_during_rename'; end if;

  insert into public.kwilt_agent_mutation_receipts (
    user_id, thread_id, proposal_id, operation_id, capability_id, idempotency_key,
    status, resulting_object_type, resulting_object_id, result_state, return_target,
    undo_operation, applied_at
  ) values (
    p_user_id, p_thread_id, v_proposal_id, v_operation_id, 'money', v_idempotency_key,
    'applied', 'money_category', p_category_id::text,
    jsonb_build_object('categoryId', p_category_id, 'name', v_name, 'previousName', v_previous_name, 'updatedAt', v_timestamp),
    jsonb_build_object('screen', 'MoneyCategoryDetail', 'params', jsonb_build_object('categoryId', p_category_id)),
    jsonb_build_object(
      'type', 'rename_money_category', 'targetId', p_category_id,
      'payload', jsonb_build_object('name', v_previous_name, 'expectedName', v_name)
    ),
    v_timestamp
  ) returning * into v_receipt;

  return jsonb_build_object(
    'status', v_receipt.status,
    'categoryId', p_category_id,
    'receiptId', v_receipt.id,
    'updatedAt', v_timestamp,
    'replayed', false
  );
end;
$$;

revoke all on function public.rename_budget_category_from_agent(uuid, uuid, uuid, uuid, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.rename_budget_category_from_agent(uuid, uuid, uuid, uuid, text, uuid, text)
  to service_role;
