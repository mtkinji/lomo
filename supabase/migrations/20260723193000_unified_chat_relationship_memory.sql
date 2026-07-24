-- Explicit relationship-memory tool path for canonical Chat channels.
-- Reuses the existing Phone Agent People/Memory/Event/Cadence ownership model,
-- but no longer depends on an incidental Activity capture.

alter table public.kwilt_phone_agent_links
  alter column permissions set default jsonb_build_object(
    'create_activities', false,
    'remember_relationships', false,
    'send_followups', false,
    'log_done_replies', false,
    'offer_drafts', false,
    'suggest_arc_alignment', false
  );

create or replace function public.remember_kwilt_agent_relationship(
  p_user_id uuid,
  p_thread_id uuid,
  p_run_id uuid,
  p_message_id uuid,
  p_call_id text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person_name text := btrim(coalesce(p_payload ->> 'personName', ''));
  v_idempotency_key text := 'server:' || p_run_id::text || ':' || btrim(coalesce(p_call_id, ''));
  v_timestamp timestamptz := now();
  v_person_id uuid;
  v_alias jsonb;
  v_memory jsonb;
  v_event jsonb;
  v_cadence jsonb;
  v_record_id uuid;
  v_record_ids jsonb := '[]'::jsonb;
  v_record_count integer := 0;
  v_proposal_id uuid;
  v_operation_id uuid;
  v_receipt public.kwilt_agent_mutation_receipts%rowtype;
  v_origin_channel text;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_user_id is null then raise exception 'user_id_required'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'invalid_relationship_payload'; end if;
  if p_payload - array['personName', 'aliases', 'memories', 'events', 'cadences'] <> '{}'::jsonb then
    raise exception 'unsupported_relationship_field';
  end if;
  if char_length(v_person_name) < 1 or char_length(v_person_name) > 160 then raise exception 'invalid_person_name'; end if;
  if p_call_id is null or char_length(btrim(p_call_id)) < 1 or char_length(p_call_id) > 120 then
    raise exception 'invalid_tool_call_id';
  end if;
  if jsonb_typeof(coalesce(p_payload -> 'aliases', '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_payload -> 'aliases', '[]'::jsonb)) > 5
    or jsonb_typeof(coalesce(p_payload -> 'memories', '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_payload -> 'memories', '[]'::jsonb)) > 8
    or jsonb_typeof(coalesce(p_payload -> 'events', '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_payload -> 'events', '[]'::jsonb)) > 4
    or jsonb_typeof(coalesce(p_payload -> 'cadences', '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_payload -> 'cadences', '[]'::jsonb)) > 4 then
    raise exception 'invalid_relationship_collections';
  end if;
  if jsonb_array_length(coalesce(p_payload -> 'memories', '[]'::jsonb))
    + jsonb_array_length(coalesce(p_payload -> 'events', '[]'::jsonb))
    + jsonb_array_length(coalesce(p_payload -> 'cadences', '[]'::jsonb)) < 1 then
    raise exception 'relationship_fact_required';
  end if;

  select candidate.origin_channel into v_origin_channel
  from public.kwilt_agent_runs candidate
  where candidate.id = p_run_id and candidate.user_id = p_user_id
    and candidate.thread_id = p_thread_id and candidate.user_message_id = p_message_id
    and candidate.status = 'active';
  if not found then raise exception 'active_run_not_found'; end if;

  select * into v_receipt
  from public.kwilt_agent_mutation_receipts candidate
  where candidate.user_id = p_user_id and candidate.capability_id = 'relationships'
    and candidate.idempotency_key = v_idempotency_key;
  if found then
    return jsonb_build_object(
      'status', v_receipt.status,
      'personId', v_receipt.resulting_object_id,
      'recordIds', coalesce(v_receipt.result_state -> 'recordIds', '[]'::jsonb),
      'receiptId', v_receipt.id,
      'replayed', true
    );
  end if;

  select alias.person_id into v_person_id
  from public.kwilt_phone_agent_person_aliases alias
  where alias.user_id = p_user_id and alias.alias_key = lower(v_person_name)
  limit 1;
  if v_person_id is null then
    select person.id into v_person_id
    from public.kwilt_phone_agent_people person
    where person.user_id = p_user_id and lower(btrim(person.display_name)) = lower(v_person_name)
    order by person.updated_at desc
    limit 1;
  end if;
  if v_person_id is null then
    insert into public.kwilt_phone_agent_people (user_id, display_name)
    values (p_user_id, v_person_name)
    returning id into v_person_id;
  else
    update public.kwilt_phone_agent_people
    set status = 'active', display_name = v_person_name, updated_at = v_timestamp
    where id = v_person_id and user_id = p_user_id;
  end if;

  insert into public.kwilt_phone_agent_person_aliases (user_id, person_id, alias_text)
  values (p_user_id, v_person_id, v_person_name)
  on conflict (user_id, alias_key) do nothing;
  for v_alias in select value from jsonb_array_elements(coalesce(p_payload -> 'aliases', '[]'::jsonb)) loop
    if jsonb_typeof(v_alias) <> 'string'
      or char_length(btrim(v_alias #>> '{}')) < 1
      or char_length(btrim(v_alias #>> '{}')) > 160 then raise exception 'invalid_person_alias'; end if;
    insert into public.kwilt_phone_agent_person_aliases (user_id, person_id, alias_text)
    values (p_user_id, v_person_id, btrim(v_alias #>> '{}'))
    on conflict (user_id, alias_key) do nothing;
  end loop;

  for v_memory in select value from jsonb_array_elements(coalesce(p_payload -> 'memories', '[]'::jsonb)) loop
    if jsonb_typeof(v_memory) <> 'object'
      or v_memory - array['kind', 'text'] <> '{}'::jsonb
      or coalesce(v_memory ->> 'kind', '') not in ('preference', 'constraint', 'note', 'sensitivity', 'milestone')
      or char_length(btrim(coalesce(v_memory ->> 'text', ''))) < 1
      or char_length(btrim(coalesce(v_memory ->> 'text', ''))) > 5000 then
      raise exception 'invalid_relationship_memory';
    end if;
    insert into public.kwilt_phone_agent_memory_items (
      user_id, person_id, kind, text, source_channel, source_twilio_message_sid
    ) values (
      p_user_id, v_person_id, v_memory ->> 'kind', btrim(v_memory ->> 'text'),
      case when v_origin_channel = 'phone' then 'voice' when v_origin_channel = 'sms' then 'sms' else 'app' end,
      null
    ) returning id into v_record_id;
    v_record_ids := v_record_ids || jsonb_build_array(v_record_id);
    v_record_count := v_record_count + 1;
  end loop;

  for v_event in select value from jsonb_array_elements(coalesce(p_payload -> 'events', '[]'::jsonb)) loop
    if jsonb_typeof(v_event) <> 'object'
      or v_event - array['kind', 'title', 'dateText', 'startsAt', 'timeZone'] <> '{}'::jsonb
      or coalesce(v_event ->> 'kind', '') not in ('birthday', 'gathering', 'deadline', 'post_event', 'other')
      or char_length(btrim(coalesce(v_event ->> 'title', ''))) < 1
      or char_length(btrim(coalesce(v_event ->> 'title', ''))) > 500
      or char_length(coalesce(v_event ->> 'dateText', '')) > 160
      or char_length(coalesce(v_event ->> 'timeZone', '')) > 100 then
      raise exception 'invalid_relationship_event';
    end if;
    insert into public.kwilt_phone_agent_events (
      user_id, person_id, kind, title, starts_at, date_text, timezone
    ) values (
      p_user_id, v_person_id, v_event ->> 'kind', btrim(v_event ->> 'title'),
      case when nullif(v_event ->> 'startsAt', '') is null then null else (v_event ->> 'startsAt')::timestamptz end,
      nullif(btrim(coalesce(v_event ->> 'dateText', '')), ''),
      nullif(btrim(coalesce(v_event ->> 'timeZone', '')), '')
    ) returning id into v_record_id;
    v_record_ids := v_record_ids || jsonb_build_array(v_record_id);
    v_record_count := v_record_count + 1;
  end loop;

  for v_cadence in select value from jsonb_array_elements(coalesce(p_payload -> 'cadences', '[]'::jsonb)) loop
    if jsonb_typeof(v_cadence) <> 'object'
      or v_cadence - array['kind', 'intervalDays', 'nextDueAt'] <> '{}'::jsonb
      or coalesce(v_cadence ->> 'kind', '') not in ('drift', 'recurring_followup', 'other')
      or coalesce(v_cadence ->> 'intervalDays', '') !~ '^\d{1,3}$'
      or (v_cadence ->> 'intervalDays')::integer not between 1 and 730 then
      raise exception 'invalid_relationship_cadence';
    end if;
    insert into public.kwilt_phone_agent_cadences (
      user_id, person_id, kind, interval_days, next_due_at
    ) values (
      p_user_id, v_person_id, v_cadence ->> 'kind', (v_cadence ->> 'intervalDays')::integer,
      case when nullif(v_cadence ->> 'nextDueAt', '') is null then null else (v_cadence ->> 'nextDueAt')::timestamptz end
    ) returning id into v_record_id;
    v_record_ids := v_record_ids || jsonb_build_array(v_record_id);
    v_record_count := v_record_count + 1;
  end loop;

  insert into public.kwilt_agent_proposals (
    user_id, thread_id, run_id, message_id, capability_id, title, body, status,
    permission_policy, decided_at, applied_at
  ) values (
    p_user_id, p_thread_id, p_run_id, p_message_id, 'relationships', 'Remember ' || v_person_name,
    'Stores only the explicitly stated relationship details.', 'applied',
    jsonb_build_object('confirmation', 'none', 'autoApplied', true), v_timestamp, v_timestamp
  ) returning id into v_proposal_id;

  insert into public.kwilt_agent_proposal_operations (
    user_id, proposal_id, capability_id, operation_type, target_type, target_id,
    summary, payload, idempotency_key, sequence
  ) values (
    p_user_id, v_proposal_id, 'relationships', 'remember_relationship', 'person', v_person_id::text,
    'Remember ' || v_record_count::text || ' explicit relationship detail(s) for ' || v_person_name,
    p_payload, v_idempotency_key, 1
  ) returning id into v_operation_id;

  insert into public.kwilt_agent_mutation_receipts (
    user_id, thread_id, proposal_id, operation_id, capability_id, idempotency_key,
    status, resulting_object_type, resulting_object_id, result_state, return_target, applied_at
  ) values (
    p_user_id, p_thread_id, v_proposal_id, v_operation_id, 'relationships', v_idempotency_key,
    'applied', 'relationship_memory', v_person_id::text,
    jsonb_build_object('personId', v_person_id, 'personName', v_person_name, 'recordIds', v_record_ids),
    jsonb_build_object('screen', 'SettingsPhoneAgent'), v_timestamp
  ) returning * into v_receipt;

  insert into public.kwilt_phone_agent_action_log (
    user_id, channel, action_type, person_id, input_summary, output_summary, permission_used
  ) values (
    p_user_id,
    case when v_origin_channel = 'phone' then 'voice' when v_origin_channel = 'sms' then 'sms' else 'app' end,
    'relationship_memory_saved', v_person_id,
    'Explicit relationship details for ' || v_person_name,
    v_record_count::text || ' detail(s) saved',
    case when v_origin_channel in ('phone', 'sms') then 'remember_relationships' else null end
  );

  -- The explicit typed tool supersedes the regex-based compatibility extractor for
  -- this channel job, preventing duplicate People/Memory/Event rows after delivery.
  update public.kwilt_agent_channel_jobs
  set legacy_enrichment_at = v_timestamp, updated_at = v_timestamp
  where run_id = p_run_id and user_id = p_user_id and legacy_enrichment_at is null;

  return jsonb_build_object(
    'status', v_receipt.status,
    'personId', v_person_id,
    'recordIds', v_record_ids,
    'receiptId', v_receipt.id,
    'replayed', false
  );
end;
$$;

revoke all on function public.remember_kwilt_agent_relationship(uuid, uuid, uuid, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.remember_kwilt_agent_relationship(uuid, uuid, uuid, uuid, text, jsonb)
  to service_role;
