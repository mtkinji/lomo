# Authentication parity runbook

This runbook keeps local auth testing aligned with production installs.

## Baseline parity settings

- Use the same Supabase auth host in local + EAS profiles: `https://auth.kwilt.app`.
- Keep the app URL scheme as `kwilt://` (configured in `app.config.ts`).
- Prefer a dev client or release build for OAuth testing. Expo Go is useful for quick checks but can be less stable for redirect/session flows.

## Local test lane (dev client)

1. Start from a clean app install on simulator/device (delete the app first for auth tests).
2. Run:
   - `npx expo start --dev-client`
   - `npx expo run:ios --no-bundler -d "<device>"`
3. Validate auth flows:
   - cold start shows auth hydration then signed-out/signed-in correctly
   - Apple + Google sign-in success paths
   - cancel sign-in path returns to sign-in interstitial without lockups
   - relaunch preserves session
   - forced stale token recovery falls back to signed-out cleanly

## Production-like lane (TestFlight/release)

1. Build with `production` or `production-widgets` profile (see `eas.json`).
2. Validate on a physical iPhone:
   - Apple + Google sign-in success
   - relaunch session persistence
   - sign-out
   - invalid refresh token recovery (no endless loops/crashes)

## Quick diagnostics to capture in bug reports

- app ownership (`expo`, `standalone`, etc.)
- `SUPABASE_URL` resolved at runtime
- `AUTH_BRAND_ORIGIN` resolved at runtime
- device/simulator model + iOS version
- exact step where auth transitions fail (open browser, callback, session restore, post-login navigation)
