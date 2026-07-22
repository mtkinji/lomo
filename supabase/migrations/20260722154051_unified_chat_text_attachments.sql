-- Durable, explicitly user-attached text documents for Unified Chat.
-- Binary/image files are intentionally excluded until a capability can inspect
-- their contents rather than merely displaying a decorative filename.

create table public.kwilt_agent_message_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.kwilt_agent_threads(id) on delete cascade,
  message_id uuid not null references public.kwilt_agent_messages(id) on delete cascade,
  client_attachment_id text not null check (char_length(client_attachment_id) between 1 and 120),
  name text not null check (
    char_length(name) between 1 and 120
    and name !~ '[/\\]'
  ),
  mime_type text not null check (mime_type in (
    'application/json', 'application/xml', 'application/yaml',
    'text/csv', 'text/markdown', 'text/plain', 'text/tab-separated-values',
    'text/xml', 'text/yaml'
  )),
  size_bytes integer not null check (size_bytes between 1 and 100000),
  content_text text not null check (octet_length(content_text) between 1 and 100000),
  created_at timestamptz not null default now(),
  unique (message_id, client_attachment_id)
);

create index kwilt_agent_message_attachments_thread_message_idx
  on public.kwilt_agent_message_attachments(thread_id, message_id, created_at, id);

grant select, insert, delete on table public.kwilt_agent_message_attachments to authenticated;
revoke all on table public.kwilt_agent_message_attachments from anon;
alter table public.kwilt_agent_message_attachments enable row level security;

create policy "kwilt_agent_message_attachments_owner_select"
  on public.kwilt_agent_message_attachments for select to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

create policy "kwilt_agent_message_attachments_owner_insert"
  on public.kwilt_agent_message_attachments for insert to authenticated
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1
      from public.kwilt_agent_messages message
      join public.kwilt_agent_threads thread on thread.id = message.thread_id
      where message.id = message_id
        and message.thread_id = thread_id
        and message.role = 'user'
        and message.user_id = (select auth.uid())
        and thread.user_id = (select auth.uid())
    )
  );

create policy "kwilt_agent_message_attachments_owner_delete"
  on public.kwilt_agent_message_attachments for delete to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

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
      or (item ->> 'mime_type') not in (
        'application/json', 'application/xml', 'application/yaml',
        'text/csv', 'text/markdown', 'text/plain', 'text/tab-separated-values',
        'text/xml', 'text/yaml'
      )
      or case
        when jsonb_typeof(item -> 'size_bytes') = 'number'
          then ((item ->> 'size_bytes')::bigint not between 1 and 100000)
        else true
      end
      or nullif(item ->> 'content', '') is null
      or octet_length(item ->> 'content') > 100000
  ) then
    raise exception 'invalid_attachment' using errcode = '22023';
  end if;
  if (
    select count(distinct item ->> 'id') from jsonb_array_elements(v_attachments) item
  ) <> v_attachment_count then
    raise exception 'duplicate_attachment' using errcode = '22023';
  end if;
  select coalesce(sum(greatest(
    (item ->> 'size_bytes')::bigint,
    octet_length(item ->> 'content')::bigint
  )), 0)
  into v_attachment_total
  from jsonb_array_elements(v_attachments) item;
  if v_attachment_total > 200000 then
    raise exception 'attachments_too_large' using errcode = '22023';
  end if;

  if nullif(btrim(p_client_request_id), '') is not null then
    select * into v_message
    from public.kwilt_agent_messages message
    where message.user_id = v_user_id
      and message.client_request_id = btrim(p_client_request_id)
    limit 1;
  end if;

  if v_message.id is null then
    insert into public.kwilt_agent_messages (
      user_id, thread_id, role, body, client_request_id
    ) values (
      v_user_id, p_thread_id, 'user', btrim(p_body), nullif(btrim(p_client_request_id), '')
    ) returning * into v_message;

    insert into public.kwilt_agent_message_attachments (
      user_id, thread_id, message_id, client_attachment_id,
      name, mime_type, size_bytes, content_text
    )
    select
      v_user_id,
      p_thread_id,
      v_message.id,
      btrim(item ->> 'id'),
      btrim(item ->> 'name'),
      item ->> 'mime_type',
      (item ->> 'size_bytes')::integer,
      item ->> 'content'
    from jsonb_array_elements(v_attachments) item;

    update public.kwilt_agent_threads
    set updated_at = now()
    where id = p_thread_id and user_id = v_user_id;
  elsif v_message.thread_id <> p_thread_id or v_message.body <> btrim(p_body) then
    raise exception 'client_request_conflict' using errcode = '23505';
  end if;

  if (
    select count(*) from public.kwilt_agent_message_attachments attachment
    where attachment.message_id = v_message.id and attachment.user_id = v_user_id
  ) <> v_attachment_count or exists (
    select 1
    from jsonb_array_elements(v_attachments) item
    where not exists (
      select 1
      from public.kwilt_agent_message_attachments attachment
      where attachment.message_id = v_message.id
        and attachment.user_id = v_user_id
        and attachment.client_attachment_id = btrim(item ->> 'id')
        and attachment.name = btrim(item ->> 'name')
        and attachment.mime_type = item ->> 'mime_type'
        and attachment.size_bytes = (item ->> 'size_bytes')::integer
        and attachment.content_text = item ->> 'content'
    )
  ) then
    raise exception 'client_request_conflict' using errcode = '23505';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', attachment.id,
    'message_id', attachment.message_id,
    'name', attachment.name,
    'mime_type', attachment.mime_type,
    'size_bytes', attachment.size_bytes,
    'content', attachment.content_text,
    'created_at', attachment.created_at
  ) order by attachment.created_at, attachment.id), '[]'::jsonb)
  into v_attachment_rows
  from public.kwilt_agent_message_attachments attachment
  where attachment.message_id = v_message.id and attachment.user_id = v_user_id;

  return jsonb_build_object(
    'id', v_message.id,
    'thread_id', v_message.thread_id,
    'role', v_message.role,
    'body', v_message.body,
    'feedback', v_message.feedback,
    'created_at', v_message.created_at,
    'updated_at', v_message.updated_at,
    'attachments', v_attachment_rows
  );
end;
$$;

revoke all on function public.create_kwilt_agent_user_message(uuid, text, text, jsonb) from public, anon;
grant execute on function public.create_kwilt_agent_user_message(uuid, text, text, jsonb) to authenticated;
