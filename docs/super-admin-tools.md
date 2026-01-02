# Super Admin tools

Kwilt includes a production-only **Super Admin** tools surface (in Settings) for internal support:

- Simulate **Free / Trial / Pro** entitlement states on the current device (local override).
- Generate **1-year, one-time-use** Kwilt Pro access codes.
- Send codes via **email** (Resend) or **SMS** (Twilio).

## Configure Super Admin allowlist (Supabase Edge Function)

These env vars are read by the `pro-codes` edge function:

- `KWILT_SUPER_ADMIN_EMAILS`: comma-separated emails (case-insensitive)
  - Set to: `mtkinji@gmail.com,andy@kwilt.app`
- (Optional) `KWILT_SUPER_ADMIN_USER_IDS`: comma-separated Supabase `auth.users.id` values

Notes:
- Super admins are implicitly admins for `/create`.
- `/admin/send` is **super-admin only**.

## Email provider (Resend)

Required:
- `RESEND_API_KEY`

Optional:
- `PRO_CODE_EMAIL_FROM` (default: `no-reply@mail.kwilt.app`)
- `KWILT_PRO_CODE_FROM_NAME` (default: `Kwilt`)

## SMS provider (Twilio)

Required:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`


