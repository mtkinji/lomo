# Kwilt Users (Super Admin)

Kwilt includes a production-only **Kwilt Users** surface (in Settings) for internal support and debugging.

At a high level it provides:

- A **directory** of signed-up users and known devices (install IDs).
- A unified view of **subscription status** (RevenueCat paid Pro + server grants + code grants).
- Quick utilities:
  - **Simulate Free/Trial/Pro** on the current device (local override).
  - Generate a **1-year, one-time-use** Pro code (share sheet).
  - **Grant Pro for 1 year** to a user or a device.

## Data model (Supabase)

### Installs registry

Devices are tracked in `public.kwilt_installs` (keyed by `install_id`).

Important note: the directory can only show devices that have **pinged at least once** (see “Device ping cadence” below).

### RevenueCat mirror

Paid subscription status is mirrored into `public.kwilt_revenuecat_subscriptions` so the directory can show “everything”
(not just code/admin grants).

### Pro grants (codes/admin/manual)

Server-granted Pro state (including code redemptions and manual grants) is stored in `public.kwilt_pro_entitlements`.

## Data flow overview

1. **Device ping** (app → edge function)
   - Route: `POST /pro-codes/ping`
   - Upserts into `kwilt_installs` using:
     - `x-kwilt-install-id` header (required)
     - optional `Authorization: Bearer <jwt>` (links to `auth.users`)
     - best-effort RevenueCat app user id (links to RC mirror)

2. **RevenueCat webhook** (RevenueCat → edge function)
   - Route: `POST /pro-codes/webhook/revenuecat`
   - Upserts into `kwilt_revenuecat_subscriptions`

3. **Directory read** (Super Admin UI → edge function)
   - `POST /pro-codes/admin/list-users` (paged)
   - `POST /pro-codes/admin/list-installs` (recent devices)
   - Each endpoint merges “Pro status” from:
     - RevenueCat mirror (paid)
     - `kwilt_pro_entitlements` (code/admin grants), including expiry

## Device ping cadence (when/how often devices ping)

Pings are **best-effort** (they fail silently) and are intentionally throttled.

Current behavior:

- Trigger: on app startup once navigation is ready (RootNavigator mounts), and again when `authIdentity.userId` changes.
- Frequency cap: **at most once every 6 hours**
- Exceptions: if the signed-in user changes, or the RevenueCat app user id changes, it will ping immediately.

Client implementation:

- `src/navigation/RootNavigator.tsx` calls `pingInstall({ userId })`
- `src/services/installPing.ts` persists a local cache key `kwilt-install-ping-v1` and enforces the 6-hour throttle.

## Configure Super Admin allowlist (Supabase Edge Function)

These env vars are read by the `pro-codes` edge function:

- `KWILT_SUPER_ADMIN_EMAILS`: comma-separated emails (case-insensitive)
- (Optional) `KWILT_SUPER_ADMIN_USER_IDS`: comma-separated Supabase `auth.users.id` values
- (Optional) `KWILT_ADMIN_EMAILS`, `KWILT_ADMIN_USER_IDS` for non-super admin endpoints

Notes:

- Super admins are implicitly admins for `/create`.
- `/admin/grant`, `/admin/list-users`, and `/admin/list-installs` are **super-admin only**.

## RevenueCat webhook configuration

The edge function expects a bearer token secret:

- Set `REVENUECAT_WEBHOOK_SECRET` in Supabase function secrets
- Configure RevenueCat to send webhooks to your Edge Function URL:
  - `https://<project-ref>.functions.supabase.co/functions/v1/pro-codes/webhook/revenuecat`
  - (or your custom domain equivalent if you proxy functions)
- Include HTTP header:
  - `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`

## Expiry enforcement

Pro expiry is enforced server-side and in-app:

- The `/pro-codes/status` endpoint checks both `install:<id>` and (if signed in) `user:<id>`
- The app entitlements refresh consults `/status` and clears the local override when server says Pro is expired/not-pro.

## PostHog (where it fits)

PostHog is **not** the source of truth for this directory. We keep it separate for analytics.

If needed later, we can store `posthog_distinct_id` on `kwilt_installs` as a correlation aid, but we avoid joining the
directory against PostHog for correctness/performance and privacy reasons.

## Legacy note: email/SMS sending

The `pro-codes` edge function still contains an `/admin/send` endpoint for email/SMS, but the current in-app “Kwilt Users”
surface uses the native share sheet instead. If we want to fully retire email/SMS, we should remove those providers and
routes in a follow-up.

### Pro-code email sending (Resend)

If you want to email a Pro code (instead of sharing it manually), use:

- Route: `POST /pro-codes/admin/send` with `{ channel: "email", code, recipientEmail }`
- Requires: Super Admin allowlist (see above)

Required Supabase Edge Function secrets:

- `RESEND_API_KEY`: Resend API key
- `PRO_CODE_EMAIL_FROM`: sender address (must be a verified sender/domain in Resend)
  - Fallback: if not set, the function will use `INVITE_EMAIL_FROM` (used by goal invites)
- (Optional) `KWILT_PRO_CODE_FROM_NAME`: display name for the sender (default: `Kwilt`)

Optional email branding (code-based templates):

- `KWILT_EMAIL_APP_NAME`: brand/app name shown in the email header (default: `Kwilt`)
- `KWILT_EMAIL_LOGO_URL`: HTTPS image URL for a logo (if omitted, the app name is used as text)
- `KWILT_EMAIL_PRIMARY_COLOR`: hex color for buttons/links (default: `#1F5226`)
- `KWILT_EMAIL_CTA_URL`: URL for “Enjoy Pro” button in the Pro grant email (default: `https://www.kwilt.app`)
