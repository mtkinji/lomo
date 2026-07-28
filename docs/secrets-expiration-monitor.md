# Secrets expiration monitor (Supabase)

Goal: **never get surprised by expiring provider credentials**.

This repo includes:
- A metadata table: `public.kwilt_secret_expirations`
- A scheduled Edge Function: `supabase/functions/secrets-expiry-monitor`

No secret values are stored in the table — only **names + expiry metadata**.

## What to configure (prod)

### 1) Deploy the function

Deploy `secrets-expiry-monitor` to your Supabase project. The authenticated
`.github/workflows/monitor-secret-expirations.yml` workflow invokes it daily.

### 2) Set function secrets

Required:
- `RESEND_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `KWILT_SECRET_MONITOR_CRON_SECRET`: bearer credential shared only with the daily monitor, Apple rotation workflow, and Edge Function

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

The authenticated GitHub Actions schedule invokes the function daily. The function will:
- Email when a credential is **expired**, **within `alert_days_before` days**, or missing its required provider-side expiry metadata
- Throttle repeats (missing metadata: weekly, warnings: ~daily, expired: ~twice daily) until you update the record

The Apple expiry metadata seed is committed in
`supabase/migrations/20260728153555_seed_apple_auth_secret_expiration.sql`. The
monitor credential is shared only between the protected GitHub environment and
the Edge Function; it is never committed.

An active record with no valid `expires_at` is treated as missing metadata. The
monitor alerts immediately and then weekly until the provider-side date is filled
in. This is intentional: an expiring credential is not considered covered until
its actual expiry is known.

## Automatic Apple OAuth rotation

`.github/workflows/rotate-apple-auth-secret.yml` runs monthly and can also be
started manually. It:

1. Generates a new ES256 Apple client-secret JWT valid for 150 days.
2. Preflights the client identity against Apple's token endpoint.
3. Updates only `external_apple_secret` through the Supabase Management API.
4. Calls this monitor's authenticated `record_rotation` endpoint so the Apple
   expiry row remains current.

The `production-auth` GitHub environment requires these encrypted secrets:

- `APPLE_AUTH_PRIVATE_KEY_P8`
- `SUPABASE_ACCESS_TOKEN`
- `KWILT_SECRET_MONITOR_CRON_SECRET`

Apple Key ID, Team ID, Services ID, Supabase project ref, and monitor URL are
identifiers rather than credentials and are declared directly in the workflow.

## Suggested workflow

- Whenever you add a new expiring secret to Supabase, **also add a row** to `kwilt_secret_expirations` immediately.
- When you rotate a secret, update `expires_at` and (optionally) `notes`.

## Credential lifecycle audit (2026-07-28)

| Credential | Fixed expiry? | Current handling |
|---|---:|---|
| Supabase Apple OAuth client secret | Yes, at most 6 months | Automatically rotated monthly to a 150-day lifetime; expiry is recorded after each successful rotation. |
| Microsoft Calendar OAuth client secret | Yes, at most 24 months | Tracked as `unknown` until the exact Entra expiry is entered. Rotate with overlapping credentials; do not delete the old credential until the replacement is live and tested. |
| EAS iOS distribution certificate | Yes | Live EAS value is tracked with a 60-day alert window. Renew through EAS/Apple before a release needs signing. |
| EAS App Store provisioning profiles | Yes, 12 months | The four current app/extension profiles share one tracked expiry and a 60-day alert window. Regenerate together with the distribution certificate when required. |
| Apple APNs signing key | No fixed expiry | Do not calendar-rotate. Replace through an overlapping create/test/revoke flow because revocation immediately affects push delivery. |
| EAS App Store Connect API key | No fixed expiry documented | Audit access and revoke on compromise or ownership change; it is not an expiry-monitor record. |
| Google Calendar OAuth client secret | No fixed expiry documented | Do not invent an expiry. Handle refresh-token revocation in product and periodically audit unused OAuth clients. |
| Plaid secret | No fixed expiry documented | Supports overlap: create/test the replacement, then delete the old secret. Rotate periodically or on compromise, not through the expiry table. |
| Twilio Auth Token | No fixed expiry documented | Supports a secondary token. Update and test consumers before promoting it; promotion invalidates the former primary immediately. |
| Supabase, Resend, RevenueCat, and OpenAI API keys | No fixed provider expiry identified | Prefer scoped/dedicated keys and rolling create/update/test/revoke where supported. Track scheduled hygiene separately from expiry alerts. |
| Kwilt HMAC/encryption secrets (`CALENDAR_TOKEN_SECRET`, OAuth state, unsubscribe, cron/webhook secrets) | No provider expiry | Never blind-replace encryption/signing keys. Add key versioning and an overlap/read-old-write-new migration before periodic rotation. |

Primary references: [Microsoft Entra app credentials](https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials),
[Expo app credentials](https://docs.expo.dev/app-signing/app-credentials/),
[Google OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies),
[Plaid key rotation](https://plaid.com/docs/account/security/),
[Twilio secondary Auth Token](https://www.twilio.com/docs/iam/api/secondary_authtoken), and
[Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).
