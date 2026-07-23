---
id: brief-kwilt-money-capability-integration
title: Kwilt Money Capability Integration
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
serves: [jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-unified-chat, brief-screen-time-controls-contextual-setup]
exploration: docs/design-explorations/kwilt-money-capability-integration
owner: andrew
last_updated: 2026-07-22
---

# Kwilt Money Capability Integration

## Context

Kwilt's accepted direction is one public mobile application built as a modular monolith.
The host now has the Option G capability menu, a registry and lifecycle coordinator, shared
settings ownership, navigation persistence, deep links, and unified Chat. Kwilt Money still
exists as a separate Expo Router TestFlight application, although its users, migrations,
tables, and Edge Functions already live in the shared Kwilt Supabase project.

This brief changes the prior program sequence: Money is the first imported capability;
Games follows after the Money capability contract has been proven.

Design source: [`docs/design-explorations/kwilt-money-capability-integration/`](../design-explorations/kwilt-money-capability-integration/).

## Target audience and persona

Primary audience: `audience-aspirational-family-organizers`.

Maya wants household finances to stay understandable and current without becoming a
finance hobby. She will tolerate a staged integration, but not misleading financial state,
lost data, repeated onboarding, surprise permission requests, or an app-within-an-app.

## Aspirational design challenge

How might we help Maya understand and act on household money reality inside the one Kwilt
app, while preserving Money's trustworthy local workflow, financial privacy, and a fast,
calm experience everywhere else in Kwilt?

## Product definition

Money becomes a first-class Kwilt capability with three local places:

1. Summary
2. Transactions
3. Accounts

Category detail, transaction detail, review, and settings flows sit beneath those places.
The global Option G shell owns capability switching, avatar/global settings, unified Chat,
root restoration, and global deep links. Money owns financial content, local place
navigation, finance-specific visual language, object workflows, data interpretation,
privacy rules, and specialized permissions.

The integration is a capability-native port. It is not:

- a bulk source-tree merge;
- a nested Expo Router or WebView app;
- a redesign of Money's established workflow;
- a second Supabase client/session store or RevenueCat provider;
- a new global household model invented during UI porting;
- a reason to start Money services before entry;
- permission to retire the standalone app before parity is accepted.

## Source-of-truth contract

### Host

- Host repository: `/Users/andrewwatanabe/Kwilt`.
- Integration branch: `codex/kwilt-money-integration`.
- Branch point: `c436be6690352ecaa8ff15c1e599e332229d3697`.
- Kwilt owns the binary, React Navigation root, auth, entitlement state, analytics,
  notifications, settings, deep links, account deletion/export, release, and native targets.

### Money source

- Source repository: `/Users/andrewwatanabe/Documents/Kwilt Budget`.
- Frozen import source: `df383c3ac1538dff0a83b43a21ff3e45c024298b`, the merge commit for
  standalone Money PR #7. Its tree matches reviewed feature commit
  `983cd7fa24af172babc15297a2153aae51b5d772`.
- The route, module, dependency, asset, backend, native-target, ownership, and acceptance-flow
  inventory is frozen in
  [`docs/integration/kwilt-money-source-manifest.md`](../integration/kwilt-money-source-manifest.md).
- Later standalone changes require explicit cherry-pick/port decisions and must not silently
  change this import contract.

### Backend

- Supabase project: Kwilt (`sqxwjtorodqjdfnuvprf`).
- Live migration history already includes the Money schema through
  `20260719155556_enforce_single_budget_transaction_merchant_rule`.
- RLS is enabled on the observed `budget_*` tables.
- Live Plaid functions include `create-plaid-link-token`,
  `exchange-plaid-public-token`, and `sync-plaid-transactions` with JWT verification.
- The first integrated release is read-only and applies no production migration.
- Before future backend changes, reconcile live migration versions with canonical SQL in
  the host repository; do not replay already-applied Money migrations under new versions.

## Architecture

### Source layout

```text
src/capabilities/money/
├── definition.ts
├── domain/
├── data/
├── navigation/
├── native/
├── screens/
├── ui/
└── runtime/
```

Only move code needed by an accepted vertical slice. Do not copy standalone shell files
such as `app/_layout.tsx`, `src/shell/auth-provider.tsx`,
`src/shell/entitlements-provider.tsx`, `src/shell/app-shell.tsx`, or the Expo Router tab
layout.

### Navigation

- Add `money` to `CapabilityId` and a `money` capability group.
- Add one top-level `Money` route to the existing React Navigation root.
- Inside `Money`, use a nested React Navigation tab navigator for Summary, Transactions,
  and Accounts, with one Money stack for object/detail/modal routes.
- Extract only the reusable local-place-bar behavior needed to preserve Money's established
  three-place interaction. Do not make Money a tab in Goals' current `MainTabs`.
- Hide the local place bar at detail/modal depth; preserve native back behavior.
- Add `kwilt://money`, `kwilt://money/transactions`, `kwilt://money/accounts`,
  `kwilt://money/category/:categoryId`, and
  `kwilt://money/transaction/:transactionId`.
- Bump the persisted navigation key and sanitize/migrate the new root deterministically.

### Global/local ownership

| Concern | Owner after integration |
| --- | --- |
| App launch and auth restoration | Kwilt shell |
| Supabase client/session storage | Kwilt shell |
| RevenueCat identity and purchases | Kwilt shell |
| Capability menu and global header | Kwilt shell |
| Money Summary/Transactions/Accounts navigation | Money capability |
| Financial domain and display truth | Money capability |
| Global account/privacy/legal/subscription settings | Kwilt shell |
| Category, connection, and app-control settings | Money capability, linked contextually |
| Unified Chat surface | Kwilt shell |
| Money context/evidence/mutations for Chat | Money capability adapters |
| Root deep-link namespace and restoration | Kwilt shell |
| Widgets and Screen Time extension targets | Kwilt native platform, with Money contributions |

### Session and data

Money repositories receive the host `getSupabaseClient()` instance. They never construct a
second client, choose another auth storage key, call global sign-out, or start/stop global
token refresh. All live queries remain user-scoped under existing RLS.

Read state is published through one capability-owned snapshot source. A screen may retain
known-good data during a refresh error, but a signed-in live state may never substitute
fixture data. Future writes must rebuild and publish the whole affected snapshot so source
list, destination list, totals, detail, activity, and back-navigation agree.

### Lifecycle

Registration is eager; Money work is not. Before Money entry there must be no:

- `budget_*` query or realtime channel;
- Plaid token/link/sync call;
- Skia chart construction caused by an offscreen Money tree;
- LocalAuthentication prompt;
- Money widget refresh/background registration;
- Screen Time reconciliation;
- Money-specific analytics payload containing sensitive financial content.

Activation is idempotent. Deactivation removes channels/listeners, stops foreground sync,
clears large transient chart data, and leaves durable cached/read state safe for return.

### Privacy

- When protected Money content is entered after a legitimate relock, start native
  Face ID/device-owner authentication automatically.
- Keep a visible unlock button only as retry UI after cancel/failure.
- Use Apple's device passcode fallback; do not create a Kwilt PIN.
- Show a quiet app-switcher privacy cover whenever protected Money content is snapshot-able.
- Do not require a Money unlock to use Goals, To-dos, Plan, Arcs, Chapters, or Chat unless
  those surfaces are presenting protected Money evidence.
- Preserve the accepted 30-second background relock unless device evidence justifies change.

### Unified Chat

The standalone Ask tab is not ported. Unified Chat gains bounded Money contexts for:

- Money root/month;
- category;
- transaction;
- account.

The read-only phase can explain current state with safe, minimal evidence and exact return.
Write operations remain unavailable until the owning Money mutation path, confirmation,
receipt, reload, and undo/correction contract is proven.

Analytics may record capability/object type and transition outcome, but never merchant,
transaction description, account name/number, category content, or dollar amount.

## Phased delivery

### Phase 0 - Freeze and reconcile sources

- Checkpoint or explicitly exclude the active standalone Money work.
- Record immutable host and Money SHAs.
- Produce route, module, dependency, asset, migration, function, environment, native target,
  entitlement, privacy-manifest, and parity inventories.
- Verify current host baseline and accepted standalone Money build.

Exit gate: no uncommitted source is in import scope and every standalone owner has a named
host replacement, Money owner, or explicit retirement decision.

### Phase 1 - Capability skeleton and local navigation

- Register Money and its group.
- Add the Money navigator, local three-place bar, side-sheet/header integration, active
  capability derivation, lifecycle hook, deep links, persisted-state migration, and tests.
- Render fixture-free structural placeholders only on the feature branch.

Exit gate: all navigation paths/restoration work and no Money data/native work starts.

### Phase 2 - Read-only live Money learning release

- Port the minimal domain/read projection.
- Port Summary, Transactions, Accounts, category detail, and transaction detail.
- Use the host session and existing live schema.
- Add finance theme primitives and chart dependencies only when the real Summary requires
  them.
- Add capability-local privacy and read-only Chat context/exact return.

Exit gate: live parity, privacy, lifecycle, archive, App Thinning, launch, memory, deep-link,
and physical-device evidence passes in an internal TestFlight build.

### Phase 3 - Authoritative write slices

Enable one slice at a time:

1. Transaction category/money-meaning correction and merchant-rule persistence.
2. Category creation/name/plan settings.
3. Living target, automatic plan, impact preview, receipts, and reversal.
4. Household invite behavior, if it is accepted as part of unified household identity.

Each slice needs regression-first domain tests, write/reload proof, one rebuilt snapshot,
all affected surface parity, and explicit failure/partial-success handling.

Exit gate: every accepted standalone core write has a unified authoritative path or an
explicitly accepted deferral.

### Phase 4 - Connections and specialized native behavior

- Add Plaid Link SDK and connect/relink/sync flows as one archive-measured dependency step.
- Consolidate Money widgets into the existing Kwilt widget target/app group.
- Consolidate Money Screen Time rules into the existing Kwilt shield action/configuration
  targets and foreground coordinator.
- Preserve Money's blue shield and active, explicit review copy.
- Expect users to re-add widgets and reselect Screen Time apps; do not claim opaque
  standalone app-group state can migrate.

Exit gate: signed-device Plaid OAuth, widget refresh, shield/review/cadence, entitlements,
privacy manifests, extension signing, and App Thinning evidence passes.

### Phase 5 - Global ownership and standalone retirement

- Reconcile global settings, RevenueCat products, notification routing, privacy/legal copy,
  data export, account deletion, and support diagnostics.
- Compare all accepted standalone workflows on the same account.
- Keep the standalone TestFlight build available until unified parity is accepted.
- Retire standalone distribution only with separate authorization.

## Acceptance criteria

### Product and navigation

- [ ] Money appears once in Option G and opens without a second app shell.
- [ ] Summary, Transactions, and Accounts retain their local navigation contract.
- [ ] Category/transaction detail back behavior returns to the exact local place/state.
- [ ] Capability switching works from each local place and detail depth.
- [ ] Unified Chat enters and returns to exact Money context.
- [ ] Existing Kwilt deep links and persisted states still migrate/fail safely.

### Data and trust

- [ ] The same user sees the same accepted totals, categories, transactions, and accounts in both builds.
- [ ] Signed-in query failure never renders fixture financial values.
- [ ] Actual, planned, outside-budget, forecast, and freshness values remain distinct.
- [ ] Every write reloads authoritative state across all affected surfaces.
- [ ] Existing Money data is not copied, reset, or destructively migrated.

### Ownership and lifecycle

- [ ] One Supabase client/session, RevenueCat identity, settings home, deep-link root, and account-delete path exist.
- [ ] No Money query/subscription/native work occurs before entry.
- [ ] Exit releases Money foreground listeners and large transient state.
- [ ] Permissions are requested only at the relevant Money action.

### Native and release

- [ ] LocalAuthentication follows native auto-unlock/passcode-fallback behavior.
- [ ] Protected Money content is hidden in app-switcher snapshots.
- [ ] Plaid, widgets, and Screen Time each pass their own archive and physical-device gate.
- [ ] Production-widgets App Thinning, launch, and memory evidence is recorded at every native boundary.
- [ ] Prior accepted unified and standalone TestFlight builds remain recoverable until retirement.

## Spec refinement

Clear enough to plan:

- Host and Money frameworks are compatible at Expo/React Native level.
- Host global ownership and Money local workflow are explicit.
- The live backend already carries Money data under shared identity.
- The first coherent learning release and later write/native sequence are bounded.

User-owned decision before implementation:

- Select the immutable Money source SHA after current uncommitted Money work is
  checkpointed. This is a source-control boundary, not a product-design ambiguity.

Assumptions:

- Money-first supersedes the prior Games-first sequence.
- The standalone app remains available through parity acceptance.
- The first learning release is internal TestFlight, not production-default.
- Existing widget placement and Screen Time opaque selections are reconfigured rather than migrated.

Verification evidence:

- `npm run verify:changed -- --run` and targeted Jest at each phase.
- `npm run product:lint` and `npm run architecture:lint` for contract changes.
- Production-widgets archive/App Thinning and same-device launch/memory comparisons.
- Signed physical-device parity, privacy, navigation, Plaid, widget, and Screen Time matrices.
- A recorded standalone-versus-unified parity checklist under the immutable source/build IDs.
