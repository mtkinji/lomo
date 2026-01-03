# Kwilt Users directory (implementation notes)

This document is a deeper engineering reference for the “Kwilt Users” Super Admin directory.

## Why this exists

We want a single internal surface that can answer:

- Who has signed up? (Supabase Auth users)
- Which devices exist, including anonymous installs? (install_id registry)
- What is their current access tier? (paid subscription + grants + expiry)

## Key identifiers

- `install_id` (client-generated, persisted locally): stable per install/device
  - Source: `src/services/installId.ts`
  - Header: `x-kwilt-install-id`
- `auth.users.id` (Supabase user id): stable per account
- `RevenueCat app_user_id`: stable per RevenueCat subscriber identity
  - In our current setup, this may be per-device unless you explicitly log in RevenueCat to a stable id.
- (Optional) PostHog `distinct_id`: analytics correlation only

## Storage

### `public.kwilt_installs`

Keyed by `install_id`. Contains best-effort associations:

- `user_id`, `user_email` (when signed in)
- `revenuecat_app_user_id` (when available)
- basic metadata: platform/app version/build number

### `public.kwilt_revenuecat_subscriptions`

Keyed by `revenuecat_app_user_id`. Updated by a webhook receiver.

### `public.kwilt_pro_entitlements`

Keyed by `quota_key`:

- `install:<install_id>`
- `user:<user_id>`

Contains server-granted Pro state + expiry.

## Edge Function routes (pro-codes)

All routes live in `supabase/functions/pro-codes/index.ts`.

- `POST /ping`
  - Upserts `kwilt_installs`
  - Auth is optional (used to link install ↔ user)
- `POST /webhook/revenuecat`
  - Upserts `kwilt_revenuecat_subscriptions`
  - Protected by `REVENUECAT_WEBHOOK_SECRET` bearer token
- `POST /admin/list-users` (super-admin)
  - Reads Auth users + merges installs and pro status
- `POST /admin/list-installs` (super-admin)
  - Reads installs + merges pro status

## Client ping policy

`pingInstall()` is called on app startup once nav is ready, and on auth user changes.

Throttle behavior:

- No more than once every **6 hours**
- Immediate when user id changes or RevenueCat app user id changes

Cache key:

- `kwilt-install-ping-v1` (AsyncStorage)

Implementation:

- `src/services/installPing.ts`
- called from `src/navigation/RootNavigator.tsx`

## Subscription status merging

In directory endpoints we compute an effective status:

1. RevenueCat mirror (paid)
2. User entitlements (`user:<id>`)
3. Install entitlements (`install:<id>`)

We pick the “best” active Pro:

- prefer non-expiring
- else prefer latest expiry

## Known limitations

- Devices only appear after they ping at least once.
- RevenueCat paid status only appears after webhook events are received and mapped.
- If RevenueCat app_user_id is per-device, paid status can fragment across installs until you unify it.


