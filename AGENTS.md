# AGENTS.md

## Cursor Cloud specific instructions

**Kwilt** is a React Native (Expo SDK 54) mobile app for personal life coaching. It uses npm workspaces with one internal package (`packages/arc-survey`).

### Key commands

| Task | Command |
|---|---|
| Install deps | `npm install` |
| Typecheck / lint | `npm run lint` (runs `tsc --noEmit`) |
| Run tests | `npm test` (Jest with `jest-expo` preset) |
| Run tests with coverage | `npm run test:ci` |
| Start Metro bundler | `npx expo start` (serves JS bundles to native devices on port 8081) |

### Cloud VM caveats

- **No iOS/Android simulators available.** Native builds (`expo run:ios`, `expo run:android`) require macOS + Xcode or Android Studio, neither of which is present on the Cloud VM. The primary development loop in this environment is typecheck + Jest tests.
- **Metro bundler** starts successfully and can serve iOS/Android JS bundles (verified via `curl http://localhost:8081/index.bundle?platform=ios&dev=true`). This proves the bundler and all JS transforms work correctly.
- **Expo web mode** (`expo start --web`) fails to bundle because `react-native-maps` imports native-only codegen modules. This is expected and not a bug; the app targets iOS/Android, not web.
- **Environment variables** are loaded from `.env` files by `app.config.ts` (dotenv cascade: `.env`, `.env.<NODE_ENV>`, `.env.local`, `.env.<NODE_ENV>.local`). No `.env` files are required for typecheck, tests, or Metro startup, but backend-connected features (Supabase, AI proxy, RevenueCat, PostHog) need them at runtime on-device.
- **Supabase Edge Functions** (in `supabase/functions/`) are Deno/TypeScript and live outside the npm workspace. They are not covered by `npm run lint` or `npm test`. Use the Supabase CLI to serve/test them locally.
