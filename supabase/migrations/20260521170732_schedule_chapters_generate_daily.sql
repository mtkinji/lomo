-- Schedule Weekly Chapter generation in production.
--
-- `chapters-generate` is idempotent for ready rows: the daily job asks
-- the function to process enabled weekly configs for the last complete
-- period, and the function skips rows that are already ready. Keeping
-- the schedule in a migration makes the operational dependency visible
-- alongside the function and schema it relies on.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('kwilt-chapters-generate-daily');
exception
  when others then
    null;
end
$$;

select cron.schedule(
  'kwilt-chapters-generate-daily',
  '17 10 * * *',
  $$
    select
      net.http_get(
        url := 'https://auth.kwilt.app/functions/v1/chapters-generate',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-kwilt-cron', 'daily'
        ),
        timeout_milliseconds := 120000
      ) as request_id;
  $$
);
