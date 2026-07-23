alter table public.kwilt_agent_threads
  add column if not exists title_source text not null default 'default';

alter table public.kwilt_agent_threads
  drop constraint if exists kwilt_agent_threads_title_source_check;

alter table public.kwilt_agent_threads
  add constraint kwilt_agent_threads_title_source_check
  check (title_source in ('default', 'generated', 'user'));

-- Preserve any names people already chose before title provenance existed.
update public.kwilt_agent_threads
set title_source = 'user'
where title_source = 'default'
  and lower(trim(title)) <> 'new chat';

comment on column public.kwilt_agent_threads.title_source is
  'Controls title ownership: default and generated titles may be refreshed; user titles are permanent until renamed.';
