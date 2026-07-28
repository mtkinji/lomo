-- Track the other provider-managed credentials with fixed expiry dates.
-- Metadata only: no credential values are stored here.

alter table public.kwilt_secret_expirations
  drop constraint if exists kwilt_secret_expirations_last_notified_severity_check;

alter table public.kwilt_secret_expirations
  add constraint kwilt_secret_expirations_last_notified_severity_check
  check (last_notified_severity in ('unknown', 'warning', 'expired'));

insert into public.kwilt_secret_expirations (
  display_name,
  secret_key,
  provider,
  environment,
  expires_at,
  alert_days_before,
  rotation_url,
  notes,
  is_active
)
values
  (
    'Microsoft Calendar OAuth client secret',
    'MICROSOFT_CALENDAR_CLIENT_SECRET',
    'microsoft',
    'prod',
    null,
    60,
    'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
    'Microsoft client secrets expire in at most 24 months. Set the exact expiry from Entra Certificates & secrets; then use overlapping credentials for rotation.',
    true
  ),
  (
    'EAS iOS distribution certificate',
    'EAS_IOS_DISTRIBUTION_CERTIFICATE',
    'apple',
    'prod',
    '2026-11-22T21:00:04Z',
    60,
    'https://expo.dev/accounts/kwilt/projects/kwilt/credentials',
    'EAS serial 50681BF3C888104D9521F39592B1832F. Shared by the Kwilt app and extensions.',
    true
  ),
  (
    'EAS iOS App Store provisioning profiles',
    'EAS_IOS_APP_STORE_PROVISIONING_PROFILES',
    'apple',
    'prod',
    '2026-11-22T21:00:04Z',
    60,
    'https://expo.dev/accounts/kwilt/projects/kwilt/credentials',
    'Four active profiles: app 59HJ53UMP5, widgets U25VR8KJKH, shield configuration K98KMNST66, shield action G2V5GNJFUY.',
    true
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
