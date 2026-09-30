-- Run Phone Agent prompt delivery and queued conversational turns continuously.
-- The shared bearer value is stored separately in Vault and Edge Function secrets.
-- If the Vault secret is absent, these schedules issue no request.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('kwilt-phone-agent-tick');
exception
  when others then
    null;
end
$$;

do $$
begin
  perform cron.unschedule('kwilt-agent-channel-tick');
exception
  when others then
    null;
end
$$;

select cron.schedule(
  'kwilt-phone-agent-tick',
  '* * * * *',
  $job$
    select net.http_post(
      url := 'https://auth.kwilt.app/functions/v1/phone-agent-tick',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || decrypted_secret
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    )
    from vault.decrypted_secrets
    where name = 'kwilt_phone_agent_cron_secret';
  $job$
);

select cron.schedule(
  'kwilt-agent-channel-tick',
  '* * * * *',
  $job$
    select net.http_post(
      url := 'https://auth.kwilt.app/functions/v1/agent-channel-tick',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || decrypted_secret
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    )
    from vault.decrypted_secrets
    where name = 'kwilt_phone_agent_cron_secret';
  $job$
);
