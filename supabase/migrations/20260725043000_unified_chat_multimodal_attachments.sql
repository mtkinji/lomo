-- Phase 6: durable provenance for model-inspected Chat images and PDFs.
-- Binary bytes are intentionally transient and never stored in this table.

alter table public.kwilt_agent_message_attachments
  drop constraint kwilt_agent_message_attachments_mime_type_check,
  drop constraint kwilt_agent_message_attachments_size_bytes_check;

alter table public.kwilt_agent_message_attachments
  add column kind text not null default 'text',
  add column inspection_status text not null default 'ready',
  add column inspection_failure text null,
  add constraint kwilt_agent_message_attachments_kind_check
    check (kind in ('text', 'image', 'pdf')),
  add constraint kwilt_agent_message_attachments_inspection_status_check
    check (inspection_status in ('ready', 'partial')),
  add constraint kwilt_agent_message_attachments_inspection_failure_check
    check (
      (inspection_status = 'ready' and inspection_failure is null)
      or (inspection_status = 'partial' and char_length(btrim(inspection_failure)) between 1 and 500)
    ),
  add constraint kwilt_agent_message_attachments_media_contract_check
    check (
      (kind = 'text' and mime_type in (
        'application/json', 'application/xml', 'application/yaml',
        'text/csv', 'text/markdown', 'text/plain', 'text/tab-separated-values',
        'text/xml', 'text/yaml'
      ) and size_bytes between 1 and 100000)
      or (kind = 'image' and mime_type in ('image/jpeg', 'image/png', 'image/webp')
        and size_bytes between 1 and 5000000)
      or (kind = 'pdf' and mime_type = 'application/pdf'
        and size_bytes between 1 and 5000000)
    );

create or replace function public.create_kwilt_agent_user_message(
  p_thread_id uuid,
  p_body text,
  p_client_request_id text default null,
  p_attachments jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_message public.kwilt_agent_messages%rowtype;
  v_attachments jsonb := coalesce(p_attachments, '[]'::jsonb);
  v_attachment_count integer;
  v_attachment_total bigint;
  v_text_total bigint;
  v_attachment_rows jsonb;
begin
  if v_user_id is null or not public.is_non_anonymous_kwilt_user() then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.kwilt_agent_threads thread
    where thread.id = p_thread_id and thread.user_id = v_user_id
  ) then
    raise exception 'thread_not_found' using errcode = 'P0002';
  end if;
  if nullif(btrim(p_body), '') is null or char_length(btrim(p_body)) > 100000 then
    raise exception 'invalid_message_body' using errcode = '22023';
  end if;
  if jsonb_typeof(v_attachments) <> 'array' then
    raise exception 'invalid_attachments' using errcode = '22023';
  end if;

  v_attachment_count := jsonb_array_length(v_attachments);
  if v_attachment_count > 3 then
    raise exception 'too_many_attachments' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_attachments) item
    where jsonb_typeof(item) <> 'object'
      or jsonb_typeof(item -> 'size_bytes') <> 'number'
      or nullif(btrim(item ->> 'id'), '') is null
      or char_length(item ->> 'id') > 120
      or nullif(btrim(item ->> 'name'), '') is null
      or char_length(item ->> 'name') > 120
      or (item ->> 'name') ~ '[/\\]'
      or (item ->> 'kind') not in ('text', 'image', 'pdf')
      or (item ->> 'inspection_status') not in ('ready', 'partial')
      or nullif(btrim(item ->> 'content'), '') is null
      or octet_length(item ->> 'content') > 100000
      or case
        when item ->> 'inspection_status' = 'ready'
          then item -> 'inspection_failure' <> 'null'::jsonb
        when item ->> 'inspection_status' = 'partial'
          then nullif(btrim(item ->> 'inspection_failure'), '') is null
            or char_length(btrim(item ->> 'inspection_failure')) > 500
        else true
      end
      or case
        when item ->> 'kind' = 'text' then
          (item ->> 'mime_type') not in (
            'application/json', 'application/xml', 'application/yaml',
            'text/csv', 'text/markdown', 'text/plain', 'text/tab-separated-values',
            'text/xml', 'text/yaml'
          ) or (item ->> 'size_bytes')::bigint not between 1 and 100000
        when item ->> 'kind' = 'image' then
          (item ->> 'mime_type') not in ('image/jpeg', 'image/png', 'image/webp')
            or (item ->> 'size_bytes')::bigint not between 1 and 5000000
        when item ->> 'kind' = 'pdf' then
          (item ->> 'mime_type') <> 'application/pdf'
            or (item ->> 'size_bytes')::bigint not between 1 and 5000000
        else true
      end
  ) then
    raise exception 'invalid_attachment' using errcode = '22023';
  end if;
  if (select count(distinct item ->> 'id') from jsonb_array_elements(v_attachments) item) <> v_attachment_count then
    raise exception 'duplicate_attachment' using errcode = '22023';
  end if;

  select coalesce(sum((item ->> 'size_bytes')::bigint), 0),
    coalesce(sum(case when item ->> 'kind' = 'text' then (item ->> 'size_bytes')::bigint else 0 end), 0)
  into v_attachment_total, v_text_total
  from jsonb_array_elements(v_attachments) item;
  if v_attachment_total > 10000000 then
    raise exception 'attachments_too_large' using errcode = '22023';
  end if;
  if v_text_total > 200000 then
    raise exception 'text_attachments_too_large' using errcode = '22023';
  end if;

  if nullif(btrim(p_client_request_id), '') is not null then
    select * into v_message
    from public.kwilt_agent_messages message
    where message.user_id = v_user_id
      and message.client_request_id = btrim(p_client_request_id)
    limit 1;
  end if;

  if v_message.id is null then
    insert into public.kwilt_agent_messages (user_id, thread_id, role, body, client_request_id)
    values (v_user_id, p_thread_id, 'user', btrim(p_body), nullif(btrim(p_client_request_id), ''))
    returning * into v_message;

    insert into public.kwilt_agent_message_attachments (
      user_id, thread_id, message_id, client_attachment_id, name, mime_type,
      size_bytes, content_text, kind, inspection_status, inspection_failure
    )
    select v_user_id, p_thread_id, v_message.id, btrim(item ->> 'id'), btrim(item ->> 'name'),
      item ->> 'mime_type', (item ->> 'size_bytes')::integer, item ->> 'content',
      item ->> 'kind', item ->> 'inspection_status', item ->> 'inspection_failure'
    from jsonb_array_elements(v_attachments) item;

    update public.kwilt_agent_threads set updated_at = now()
    where id = p_thread_id and user_id = v_user_id;
  elsif v_message.thread_id <> p_thread_id or v_message.body <> btrim(p_body) then
    raise exception 'client_request_conflict' using errcode = '23505';
  end if;

  if (
    select count(*) from public.kwilt_agent_message_attachments attachment
    where attachment.message_id = v_message.id and attachment.user_id = v_user_id
  ) <> v_attachment_count or exists (
    select 1 from jsonb_array_elements(v_attachments) item
    where not exists (
      select 1 from public.kwilt_agent_message_attachments attachment
      where attachment.message_id = v_message.id and attachment.user_id = v_user_id
        and attachment.client_attachment_id = btrim(item ->> 'id')
        and attachment.name = btrim(item ->> 'name')
        and attachment.mime_type = item ->> 'mime_type'
        and attachment.size_bytes = (item ->> 'size_bytes')::integer
        and attachment.content_text = item ->> 'content'
        and attachment.kind = item ->> 'kind'
        and attachment.inspection_status = item ->> 'inspection_status'
        and attachment.inspection_failure is not distinct from item ->> 'inspection_failure'
    )
  ) then
    raise exception 'client_request_conflict' using errcode = '23505';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', attachment.id, 'message_id', attachment.message_id,
    'name', attachment.name, 'mime_type', attachment.mime_type,
    'size_bytes', attachment.size_bytes, 'content', attachment.content_text,
    'kind', attachment.kind, 'inspection_status', attachment.inspection_status,
    'inspection_failure', attachment.inspection_failure, 'created_at', attachment.created_at
  ) order by attachment.created_at, attachment.id), '[]'::jsonb)
  into v_attachment_rows
  from public.kwilt_agent_message_attachments attachment
  where attachment.message_id = v_message.id and attachment.user_id = v_user_id;

  return jsonb_build_object(
    'id', v_message.id, 'thread_id', v_message.thread_id, 'role', v_message.role,
    'body', v_message.body, 'feedback', v_message.feedback,
    'created_at', v_message.created_at, 'updated_at', v_message.updated_at,
    'attachments', v_attachment_rows
  );
end;
$$;

revoke all on function public.create_kwilt_agent_user_message(uuid, text, text, jsonb) from public, anon;
grant execute on function public.create_kwilt_agent_user_message(uuid, text, text, jsonb) to authenticated;
