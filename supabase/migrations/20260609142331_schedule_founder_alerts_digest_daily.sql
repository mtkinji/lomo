-- Schedule the daily founder activation/retention Slack digest.
--
-- The function reads public.kwilt_founder_alert_events for the previous UTC day
-- and posts a compact launch pulse to the configured Slack webhook.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('kwilt-founder-alerts-digest-daily');
exception
  when others then
    null;
end
$$;

select cron.schedule(
  'kwilt-founder-alerts-digest-daily',
  '5 15 * * *',
  $$
    select
      net.http_get(
        url := 'https://auth.kwilt.app/functions/v1/founder-alerts-digest',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-kwilt-cron', 'daily'
        ),
        timeout_milliseconds := 120000
      ) as request_id;
  $$
);
