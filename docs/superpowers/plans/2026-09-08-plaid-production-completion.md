# Plaid Production Completion Implementation Plan

> Execute inline using executing-plans and pragmatic-tdd-posture. Preserve unrelated dirty work. No additional worktree or simulator ownership.

**Goal:** Finish the deployed Plaid lifecycle, automatic updates, diagnostics, duplicate protection, and release acceptance evidence.

**Architecture:** Restore the deployed exchange/sync code into source control. Use a service-only durable job queue and per-connection leases to serialize sync, webhook reconciliation, and disconnect; authenticate incoming webhooks using Plaid ES256 signatures. Persist sanitized failures and expose reconnect state through the existing app contract.

**Tech Stack:** Supabase Postgres/RLS/Cron, Deno Edge Functions, React Native Plaid SDK, Jest.

## Acceptance and execution order

- [x] Restore deployed source without overwriting unrelated shared helpers; record deployed versions (sync 26, exchange 24).
- [x] Regression-first lifecycle: disconnected connections are never synced; environment selection is connection-specific; failures persist sanitized codes; sync pagination restarts from the original cursor on mutation errors; simultaneous requests cannot corrupt cursors.
- [x] Migrate allowed statuses and add service-only connection leases and job queue. Disconnect reserves the connection, removes the provider Item, then atomically removes its token and records completion. Retry after partial failure is safe.
- [x] Add verified webhook receiver with algorithm, key, signature, age, and exact-body hash checks. Queue transaction updates durably; persist Item errors/revocations and reconnect signals. Duplicate deliveries cannot lose later work.
- [x] Add authenticated bounded worker with lease recovery, exponential retries, periodic stale-connection catch-up, and existing-Item webhook registration. Schedule using a dedicated secret stored in Vault, never public credentials.
- [x] Include webhook URL for new Link sessions. Prevent duplicate Items using institution plus provider-verified account identity; remove only newly created redundant Items, retain existing working connections, and keep distinct accounts possible.
- [x] Capture sanitized Link diagnostics; retain cancellation and update-mode behavior. Regression tests must show tokens, account data, and arbitrary error messages cannot enter diagnostics.
- [x] Run focused Deno/Jest tests red then green, review authorization and concurrency, and run verify:changed at completion; record baseline failures separately. Deployment must include all relative dependencies.
- [x] Deploy migrations and functions, register existing production webhook URLs, verify live sync/queue state, invalid-signature rejection, unauthorized-worker rejection, and actual signed production provider delivery. Sandbox secrets were unavailable; live production webhook delivery supplies the provider evidence without removing a real bank connection.
- [ ] Record published-device acceptance for bank OAuth return, import, later update, reconnect, cancellation, disconnect and account deletion. User bank authentication and signed build checks remain explicit until observed.

## Baseline evidence

Checkout /Users/andrewwatanabe/Kwilt, base 88cb2b77, branch codex/plaid-production-completion. Unrelated Explore/Focus/verifier changes preserved. Plaid production access and Transactions enabled; major-bank OAuth enabled; app.kwilt.app/plaid/oauth registered and live AASA matches the app. Three production connections, 3,828 transaction rows; newest sync September 3. No deployed disconnect function or webhook receiver and no Plaid cron. Current database status constraint excludes disconnected/disconnecting.

## Verification commands

`deno test --allow-env --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/plaid*_deno_test.ts supabase/functions/disconnect-money-connection/__tests__/*_deno_test.ts supabase/functions/create-plaid-link-token/__tests__/*_deno_test.ts`

`npx jest --runInBand src/capabilities/money/native/moneyPlaidLink.native.test.ts`

`npm run verify:changed -- --run`

Do not mark completion from source tests alone. Retain deployed receipts and the exact remaining device checks in docs/qa/plaid-production-acceptance.md.
