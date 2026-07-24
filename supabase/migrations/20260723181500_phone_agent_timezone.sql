alter table public.kwilt_phone_agent_links
  add column if not exists timezone text null;

alter table public.kwilt_phone_agent_links
  drop constraint if exists kwilt_phone_agent_links_timezone_length;

alter table public.kwilt_phone_agent_links
  add constraint kwilt_phone_agent_links_timezone_length
  check (timezone is null or char_length(timezone) between 1 and 100);
