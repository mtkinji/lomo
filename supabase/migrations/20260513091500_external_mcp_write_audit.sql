-- Extend external MCP audit rows for write-capable tools.

alter table public.kwilt_external_capture_log
  add column if not exists object_type text null,
  add column if not exists object_id text null,
  add column if not exists idempotency_key_hash text null,
  add column if not exists scope_used text null,
  add column if not exists result_status text null,
  add column if not exists result_summary text null;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'kwilt_external_capture_log_result_status_check'
  ) then
    alter table public.kwilt_external_capture_log
      add constraint kwilt_external_capture_log_result_status_check
      check (result_status is null or result_status in ('success', 'error', 'idempotent_replay'));
  end if;
end $$;

create index if not exists kwilt_external_capture_log_object_idx
  on public.kwilt_external_capture_log(user_id, object_type, object_id, created_at desc)
  where object_type is not null and object_id is not null;

create unique index if not exists kwilt_external_capture_log_idempotency_idx
  on public.kwilt_external_capture_log(user_id, oauth_client_id, idempotency_key_hash)
  where idempotency_key_hash is not null;

comment on column public.kwilt_external_capture_log.object_type is
  'Domain object type touched by an external MCP tool, when applicable.';

comment on column public.kwilt_external_capture_log.object_id is
  'Domain object id touched by an external MCP tool, when applicable.';

comment on column public.kwilt_external_capture_log.idempotency_key_hash is
  'SHA-256 hash of the caller-provided idempotency key for replay-safe writes.';

comment on column public.kwilt_external_capture_log.scope_used is
  'OAuth scope required for the tool call, e.g. read or write.';

comment on column public.kwilt_external_capture_log.result_summary is
  'Short owner-visible summary for Settings -> Connections action history.';
