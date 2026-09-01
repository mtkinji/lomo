# Kwilt Pro monetization rollout

## Release decision

Source implementation can merge, but the paid launch remains **Hold** until the external evidence below is complete. Merging does not deploy functions, apply migrations, change RevenueCat, submit App Review, start Plaid cleanup, or activate creator promotion.

## Free and Pro contract

Free includes Arcs, Goals, planning, Focus, attachments, banners, views and filters, calendar export, streak protection, Cook Mode MVP, Live Conversation MVP, and one-condition personal Screen Time rules using Focus, time of day, or daily usage.

Pro includes connected Money and Budgets, compound or Kwilt-linked personal Screen Time rules, family Screen Time coordination, advanced cloud AI, attachment analysis, AI scheduling, background AI, and external agents.

Apple introductory periods grant the full Pro entitlement. There is no partial Pro Tools trial. StoreKit and RevenueCat are the subscription source of truth; creator attribution never grants Pro.

## Independent switches

| Switch | Default | Purpose |
|---|---:|---|
| RevenueCat products and offering | Off until configured | Makes the purchase sheet available |
| `KWILT_COOK_MODE_PREVIEW_ENABLED` | Off server-side | Allows bounded Cook voice requests |
| `kwilt-preview-cook-mode` | On client fallback | Hides Cook entry points remotely |
| `KWILT_LIVE_CONVERSATION_PREVIEW_ENABLED` | Off server-side | Allows bounded live sessions |
| `kwilt-preview-live-conversation` | On client fallback | Hides Live entry points remotely |
| `KWILT_CREATOR_PILOT_ENABLED` | Off | Enables creator campaign resolve and claim |
| `kwilt-paywall-advanced-screen-time` | On by default | Emergency rollback makes advanced personal rules Free without a binary |
| family Screen Time marketing | Off | Waits for two-device evidence |
| Plaid cleanup | Disabled | No token or connection deletion until reconciliation is approved |

## Required launch evidence

- Apply migrations in a non-production environment and verify RLS, grants, trigger behavior, idempotent RevenueCat replay, cancellation-through-expiry, grace, expiration, refund, and creator reversal.
- Configure one Apple subscription group, monthly and annual products, the intended one-month introductory offer, and matching RevenueCat `pro` entitlement and offering. Capture live StoreKit prices and eligibility; do not hardcode them.
- Verify purchase, restore, cancellation, billing retry/grace, expiration, refund, account switch, reinstall, offline cache, and duplicate/out-of-order webhook events.
- Verify Money: Free cannot prepare Plaid Link, Pro can connect and sync, cancelled access continues through expiry, downgraded history is readable, mutations and sync pause, and disconnect remains available.
- Verify advanced personal Screen Time and family Screen Time on fresh entitlement-enabled physical iPhones. Confirm whole-rule deactivation and `Deactivation pending` receipts after expiry/refund. Simulator or compilation evidence is insufficient for Apple enforcement.
- Verify external connector authorization, refresh, tool calls, and post-downgrade denial against server-confirmed Pro.
- Verify attachment analysis requires authenticated Pro on both client and server.
- Verify Cook and Live cost ceilings, remote disable behavior, honest unavailable states, and provider failure handling.
- Complete App Review copy, privacy disclosure, support scripts, reviewer account, and a review video that does not overclaim Apple Screen Time behavior.

## Current proof boundary

Local TypeScript, Jest, Deno checks, migration source review, and site build can prove source consistency. They do not prove applied database state, deployed functions, live RevenueCat/App Store configuration, Plaid production behavior, provider cost controls, TestFlight behavior, or signed-device Screen Time enforcement.

The deployed Plaid exchange and sync source could not be downloaded because the CLI returned `401 Unauthorized`; do not replace those deployed functions from an inferred local implementation. Docker was unavailable for a local Supabase database run. These are explicit release blockers, not permission to bypass the checks.
