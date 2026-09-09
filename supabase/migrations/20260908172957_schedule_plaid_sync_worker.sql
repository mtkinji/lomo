-- Dedicated secret is provisioned to Vault and Edge Function secrets during release.
-- If absent, this schedule issues no request. Never put a service-role key in cron SQL.
select cron.schedule(
  'kwilt-plaid-sync-worker',
  '* * * * *',
  $job$
    select net.http_post(
      url := 'https://sqxwjtorodqjdfnuvprf.supabase.co/functions/v1/plaid-sync-worker',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||decrypted_secret),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    ) from vault.decrypted_secrets where name='kwilt_plaid_worker_secret';
  $job$
);
