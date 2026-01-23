# Secrets expiration monitor (Supabase)

Goal: **never get surprised by expiring provider secrets** (Azure/Microsoft app client secrets, Google OAuth client secrets, RevenueCat webhooks, etc).

This repo includes:
- A metadata table: `public.kwilt_secret_expirations`
- A scheduled Edge Function: `supabase/functions/secrets-expiry-monitor`

No secret values are stored in the table — only **names + expiry metadata**.

## What to configure (prod)

### 1) Deploy the function

Deploy `secrets-expiry-monitor` to your Supabase project, then set it up as a scheduled function (daily).

### 2) Set function secrets

Required:
- `RESEND_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Recommended:
- `KWILT_SECRET_MONITOR_EMAIL_TO`: comma-separated emails to notify

Optional:
- `KWILT_SECRET_MONITOR_ENVIRONMENT`: `prod` (default), `staging`, `dev`
- `KWILT_SECRET_MONITOR_EMAIL_FROM`: from email (fallback: `INVITE_EMAIL_FROM`, then `no-reply@kwilt.app`)
- `KWILT_SECRET_MONITOR_FROM_NAME`: display name (default: `Kwilt`)

Fallback recipients (if `KWILT_SECRET_MONITOR_EMAIL_TO` is unset/empty):
- `KWILT_SUPER_ADMIN_EMAILS`
- `KWILT_ADMIN_EMAILS`

### 3) Add expiry records (SQL)

Add one row per expiring secret per environment:

```sql
insert into public.kwilt_secret_expirations
  (display_name, secret_key, provider, environment, expires_at, alert_days_before, owner_email, rotation_url, notes)
values
  (
    'Microsoft Calendar OAuth client secret',
    'MICROSOFT_CALENDAR_CLIENT_SECRET',
    'microsoft',
    'prod',
    '2026-05-01T00:00:00Z',
    30,
    'you@kwilt.app',
    'https://portal.azure.com/',
    'Rotate in Azure App Registration → Certificates & secrets'
  );
```

Notes:
- `secret_key` should match the Supabase Function secret / env var name (example above matches `calendar-auth-microsoft`).
- `expires_at` is when the provider-side secret expires (not access tokens).
- Set `is_active=false` when retiring an integration.

## Scheduling

Configure a daily schedule in Supabase (e.g. every morning). The function will:
- Email when a secret is **expired** or **within `alert_days_before` days**
- Throttle repeats (warnings: ~daily, expired: ~twice daily) until you update the record

## Suggested workflow

- Whenever you add a new expiring secret to Supabase, **also add a row** to `kwilt_secret_expirations` immediately.
- When you rotate a secret, update `expires_at` and (optionally) `notes`.


