-- Seed the current Apple OAuth expiry. The monthly rotation workflow keeps this
-- row current through the authenticated secrets-expiry-monitor Edge Function.

insert into public.kwilt_secret_expirations (
  display_name,
  secret_key,
  provider,
  environment,
  expires_at,
  alert_days_before,
  rotation_url,
  notes,
  is_active,
  updated_at
)
values (
  'Supabase Apple OAuth client secret',
  'SUPABASE_AUTH_EXTERNAL_APPLE_SECRET',
  'apple',
  'prod',
  '2027-01-24T15:13:42Z',
  45,
  'https://supabase.com/dashboard/project/sqxwjtorodqjdfnuvprf/auth/providers',
  'Automatically rotated monthly by GitHub Actions.',
  true,
  now()
)
on conflict (secret_key, environment) do update set
  display_name = excluded.display_name,
  provider = excluded.provider,
  expires_at = excluded.expires_at,
  alert_days_before = excluded.alert_days_before,
  rotation_url = excluded.rotation_url,
  notes = excluded.notes,
  is_active = excluded.is_active,
  last_notified_at = null,
  last_notified_severity = null,
  updated_at = now();
