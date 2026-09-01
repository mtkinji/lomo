# Kwilt monetization release readiness implementation plan

> **Execution:** Follow this plan task by task with `executing-plans`. Use `pragmatic-tdd-posture`: tests first for policies, lifecycle reducers, quota/accounting, access guards, migrations, and bug fixes; focused behavioral tests for UI state and navigation. Do not create a worktree unless Andrew explicitly approves parallel implementation.

**Goal:** Ship one trustworthy Free/Pro model across the app, backend, store, public site, support, analytics, creator acquisition, and release evidence while keeping core Kwilt Free and charging for advanced, connected, or materially assisted services.

**Architecture:** Preserve RevenueCat's `pro` entitlement, the client `isPro` signal, current product identifiers, and the contextual paywall drawer. Add one declared Pro capability policy for product meaning. Enforce it at client intent, navigation/orchestration, and trusted server/provider boundaries. Project RevenueCat lifecycle into an authenticated, idempotent server mirror and combine it with internal support grants. Keep marketing exposure separate from code presence so only release-proven capabilities are promised. Keep creator acquisition as a separate first-party attribution and commission subsystem that observes Apple/RevenueCat purchase truth but never changes entitlement truth.

**Tech Stack:** React Native/Expo, TypeScript, RevenueCat/StoreKit, Supabase Postgres and Edge Functions, Plaid, OpenAI, MCP, Next.js, Jest, Deno tests, StoreKit/Sandbox/TestFlight, and signed entitlement-enabled iOS devices.

**Repositories:**

- app/backend/docs: `/Users/andrewwatanabe/Kwilt`
- public site: `/Users/andrewwatanabe/kwilt-site`

**Supersedes:** `docs/superpowers/plans/2026-08-26-kwilt-free-pro-gating.md`. That document remains historical context; this plan adds the missing MCP, PMM, support, App Store, feature-readiness, and launch-control work, keeps Cook/Conversation available as non-paywalled MVP previews with independent cost/exposure controls, and corrects current repository paths.

**Companion plan:** `docs/superpowers/plans/2026-08-31-kwilt-creator-acquisition-pilot.md` owns creator claim, attribution, commission, payout, landing, disclosure, and pilot operations. Creator-channel readiness must not block a safe general Pro launch.

---

## Execution posture

- Work in `/Users/andrewwatanabe/Kwilt` on `codex/align-free-pro-paywall` unless Andrew chooses a different integration strategy.
- Before each task, inspect branch, HEAD, working tree, and the affected files. Preserve unrelated work.
- Do not edit `/Users/andrewwatanabe/kwilt-site` until its own current branch, HEAD, and dirty state are recorded. Create a normal matching `codex/align-free-pro-paywall` branch there when site implementation begins; do not create a worktree.
- Use `npx supabase migration new <name>` for migrations. The resulting CLI-generated filename is the canonical path; do not invent a timestamp.
- Keep backend schema changes additive until the known production subscriber and the complete Sandbox lifecycle are reconciled.
- Do not enable automatic Plaid disconnection until webhook authenticity, event ordering, paid-through semantics, retry behavior, and cleanup receipts are proven.
- Do not place an unproven capability in customer-facing paywall or App Store copy.
- Run focused checks during implementation. Run `npm run verify:changed -- --run` once when the app/backend/docs slice is complete, and rerun only after a failure or subsequent diff change.
- Keep source, local backend, Simulator, signed device, Sandbox/TestFlight, and production evidence distinct.

## Program invariants

1. Free is a complete personal and household system; Pro is the connected and assisted service layer.
2. `isPro` is the only client boolean for full paid access.
3. `pro_tools_trial` grants no current customer access and appears in no customer copy or segmentation.
4. Individual and Family products grant the same Pro feature bundle; Family changes Apple Family Sharing only.
5. A capability is Free unless it is explicitly declared in the Pro policy.
6. A hidden button is not enforcement. Paid provider initialization and mutations independently verify trusted Pro.
7. Client `x-kwilt-is-pro` and client-declared job/billing fields are telemetry only.
8. Cancellation preserves access through the paid-through date. Configured grace preserves access. Confirmed expiration or refund revokes it.
9. Downgrade never deletes or hides customer data.
10. Money and Budgets are Pro from first setup. Kwilt will not add manual account
    or transaction entry. Retained history and required data-management access
    remain available after downgrade; setup, connection, sync, planning, and
    transaction-review mutations require Pro.
11. A useful personal Screen Time baseline remains Free: authorization, private app selection, inventory, explanations, recovery, device-local enforcement, and unlimited one-condition rules using Focus, time of day, or daily usage. Pro adds compound AND/OR rules, Kwilt-linked real-step and Money conditions, and family coordination/automation.
12. Cook Mode and Live Conversation are `free_preview` capabilities for this
    launch. They never check Pro or open a paywall while their exposure flags
    are on. Authenticated provider work is cost-bounded and observable; each
    flag defaults on but can hide the capability safely. Neither appears as a
    headline subscription, store, pricing, creator, or marketable-pillar claim.
13. Local AI completion costs zero user credits. Kwilt-selected cloud fallback for a locally eligible job also costs zero.
14. Only a successful, usable, user-initiated cloud result consumes a user credit.
15. Store price, cadence, and introductory eligibility come from live store data.
16. A paid capability is marketed only after its own launch evidence gate passes.
17. Screen Time reading and every safety-reducing action remain available
    without Pro. Confirmed expiration/refund deactivates every advanced personal
    and family rule as a whole, preserves its readable dormant definition, and
    clears enforcement through acknowledged device receipts. Offline devices
    remain **Deactivation pending**, and Restore/resubscribe never silently
    reactivates a rule.
18. Creator attribution and compensation observe Apple/RevenueCat lifecycle but never grant, revoke, discount, or otherwise mutate customer entitlement.

## Dependency map

```text
Baseline/provenance
        ↓
Canonical policy + retired-gate removal
        ↓
Trusted lifecycle + server entitlement union
        ↓
Advanced AI / MCP     Money + Budgets     Advanced + Family Screen Time
        └──────────────────┬──────────────────┘
                           │
                  Cook / Live preview safety
                           ↓
        Paywall + PMM + analytics + support operations
                           ↓
             signed-runtime and Sandbox release gates
                           ↓
             approved creator acquisition pilot
```

---

## Phase 0 — Freeze truth and choose the launch promise

### Task 0.1 — Create the rollout evidence ledger

**Files:**

- Add: `docs/release/kwilt-pro-monetization-rollout.md`
- Reference: `docs/product/monetization-release-readiness-assessment.md`
- Reference: `docs/feature-briefs/monetization-paywall-revenuecat.md`

- [ ] Record the app branch, commit, dirty state, current TestFlight build, Supabase project/function versions, RevenueCat app/entitlement/offering, Apple subscription group/products, webhook configuration status, billing-grace status, and site branch/deployment. Do not include secrets or customer financial/content data.
- [ ] Create a proof matrix with columns: `requirement`, `source/test`, `local backend`, `Simulator`, `signed device`, `Sandbox/TestFlight`, `production`, `owner`, `evidence`, `status`.
- [ ] Add a Pro-capability register for Money and Budgets, advanced personal
  Screen Time, Family Screen Time coordination, advanced AI, AI scheduling,
  background/proactive AI, and external agents. Record Cook Mode and Live
  Conversation separately as `free_preview`, `production_exposed: true`, and
  `marketable: false`, with independent server-controlled flags and cost owners.
- [ ] Initialize every unrun runtime cell to `Not run`; do not infer proof.
- [ ] Record two explicit switches: `marketed` and `provider cleanup enabled`.
- [ ] Record a separate `creator promotion approved` switch for each pillar. It stays off until the capability, claim, disclosure, and campaign path pass; it does not affect core release eligibility.
- [ ] Verify documentation:

```bash
npm run product:lint
git diff --check -- docs/release/kwilt-pro-monetization-rollout.md
```

**Commit:** `docs(monetization): add rollout evidence ledger`

### Task 0.2 — Recover deployed Plaid source before changing enforcement

**Files:**

- Existing: `supabase/functions/create-plaid-link-token/index.ts`
- Add from live deployment: `supabase/functions/exchange-plaid-public-token/`
- Add from live deployment: `supabase/functions/sync-plaid-transactions/`
- Add: `supabase/functions/exchange-plaid-public-token/__tests__/exchangePlaidPublicToken_deno_test.ts`
- Add: `supabase/functions/sync-plaid-transactions/__tests__/syncPlaidTransactions_deno_test.ts`
- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] Capture the pre-download diff and deployed function version identifiers.
- [ ] Download all three functions through the Supabase CLI/API.
- [ ] Diff the checked-in `create-plaid-link-token` source against the deployed source and resolve provenance explicitly.
- [ ] Remove no behavior in this task. Check for downloaded secrets, environment files, access tokens, or customer payloads before staging.
- [ ] Add the named focused Deno test scaffolds without changing production behavior.
- [ ] Verify:

```bash
npm run lint:supabase-functions
git diff --check -- supabase/functions/create-plaid-link-token supabase/functions/exchange-plaid-public-token supabase/functions/sync-plaid-transactions docs/release/kwilt-pro-monetization-rollout.md
```

**Commit:** `chore(money): recover deployed Plaid function source`

### Task 0.3 — Approve the launch promise set

**Files:**

- Add: `docs/marketing/kwilt-free-pro-message-matrix.md`
- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] Put the accepted Free list, Pro list, trial language, Individual/Family distinction, downgrade promises, and proof prerequisites in one message matrix.
- [ ] Record Cook Mode and Live Conversation as available MVP previews, not
  subscription benefits. State that either may be hidden remotely for quality,
  reliability, or cost without presenting a paywall.
- [ ] State the Screen Time boundary precisely: Free basic single-condition personal rules; Pro compound/Kwilt-linked personal rules and family coordination; reading and safety-reducing actions always Free.
- [ ] Give every paid pillar an owner and release-evidence requirement.
- [ ] Mark every pillar `not marketable` until its later evidence task passes.
- [ ] Preserve current price hypotheses without hardcoding them into runtime UI.
- [ ] Obtain Andrew's approval of the benefit hierarchy before applying it to public surfaces.
- [ ] Add creator-safe approved claim variants only after the general product message is accepted. Use the companion creator plan for campaign execution.

**Commit:** `docs(marketing): define the Free and Pro launch promise`

---

## Phase 1 — Replace the old business model with one declared policy

### Task 1.1 — Add the canonical Pro capability policy

**Files:**

- Add: `src/domain/proAccessPolicy.ts`
- Add: `src/domain/proAccessPolicy.test.ts`
- Modify: `src/services/paywall.ts`
- Modify: `src/features/paywall/FEATURE.md`

- [ ] Write failing tests for the exact paid capability list, contextual reason mapping, Free-by-default behavior, and rejection of retired reasons.
- [ ] Declare these capability IDs: `money_budgets`,
  `advanced_screen_time_rules`, `family_screen_time`, `advanced_cloud_ai`,
  `ai_attachment_analysis`, `ai_scheduling`, `background_ai`, and
  `external_agent`. Keep `cook_mode` and `live_conversation` in a separate
  `free_preview` exposure policy rather than `ProCapability`.
- [ ] Limit `PaywallReason` to current paid intents and quota exhaustion. Keep sources separately typed for attribution.
- [ ] Add no Cook or Live `PaywallReason`. An enabled preview resolves to allow
  for Free and Pro; a disabled preview resolves to unavailable, never purchase.
- [ ] Make `decideProAccess(capability, isPro)` pure and fail closed for a declared Pro capability.
- [ ] Add downgrade action classification where a capability needs safety/free exceptions rather than a blanket gate.
- [ ] Verify:

```bash
npx jest src/domain/proAccessPolicy.test.ts --runInBand
npm run lint
```

**Commit:** `feat(monetization): declare the canonical Pro access policy`

### Task 1.2 — Remove Arc and Goal structural limits everywhere

**Files:**

- Modify: `src/domain/limits.ts`
- Modify: `src/domain/limits.test.ts`
- Modify: `src/store/useAppStore.ts`
- Modify: `src/store/useAppStore.lifecycle.test.ts`
- Modify: `src/features/arcs/ArcsScreen.tsx`
- Modify: `src/features/arcs/GoalDetailScreen.tsx`
- Modify: `src/features/goals/GoalsScreen.tsx`
- Modify: `src/features/ai/AiChatScreen.tsx`
- Modify: `src/features/onboarding/IdentityAspirationFlow.tsx`
- Modify affected tests beside those screens

- [ ] Replace old limit tests with Free-account regressions that create multiple Arcs and more than three active Goals without a paywall.
- [ ] Remove the limit constants, decisions, and every `limit_arcs_total` / `limit_goals_per_arc` call site.
- [ ] Preserve universal validation, ownership, and abuse limits that are not subscription gates.
- [ ] Verify focused domain/store/screen tests and run:

```bash
rg -n "limit_arcs_total|limit_goals_per_arc|FREE_MAX_ACTIVE_GOALS_PER_ARC|FREE_MAX_ARCS_TOTAL" src
```

Expected result: no production matches.

**Commit:** `refactor(monetization): make core structure free`

### Task 1.3 — Remove all other retired capability gates

**Files:**

- Modify: `src/store/proToolsAccess.ts`
- Modify: `src/store/useCelebrationStore.ts`
- Modify: `src/features/activities/ActivitiesScreen.tsx`
- Modify: `src/features/activities/ActivityDetailRefresh.tsx`
- Modify: `src/features/activities/hooks/useActivityListData.ts`
- Modify: `src/features/activities/hooks/useViewManagement.ts`
- Modify: `src/features/activities/useStandaloneFocusController.ts`
- Modify: `src/features/plan/usePlanSlotCapture.ts`
- Modify: `src/features/plan/usePlanRecommendationsQuickAdd.ts`
- Modify: `src/features/arcs/ArcDetailScreen.tsx`
- Modify: `src/features/arcs/GoalDetailScreen.tsx`
- Modify: `src/features/goals/GoalsScreen.tsx`
- Modify: `src/features/activities/ActivitiesViewSettingsContract.test.ts`
- Modify: `src/features/activities/useStandaloneFocusController.test.tsx`
- Modify: `src/features/plan/usePlanSlotCapture.test.ts`
- Modify: `src/store/streakProtection.test.ts`

- [ ] Write/adjust focused Free-account tests for views/filter/sort, all Focus lengths, banners/image search, calendar export, and streak recovery.
- [ ] Remove the corresponding paywall calls and Pro checks, not merely the visible badges.
- [ ] Keep AI scheduling distinct from manual scheduling and calendar export.
- [ ] Verify:

```bash
rg -n "pro_only_unsplash_banners|pro_only_calendar_export|pro_only_focus_mode|pro_only_views_filters|pro_only_streak_shields" src
```

Expected result: no production matches.

**Commit:** `refactor(monetization): remove retired convenience gates`

### Task 1.4 — Make attachments Free without weakening safety

**Files:**

- Modify: `src/services/attachments/activityAttachments.ts`
- Modify: `src/features/activities/ActivityDetailRefresh.tsx`
- Modify: `supabase/functions/attachments-init-upload/index.ts`
- Modify: `supabase/functions/attachments-get-download-url/index.ts`
- Modify: `supabase/functions/attachments-set-share/index.ts`
- Modify: `supabase/functions/attachments-delete/index.ts`
- Modify/add focused app and Deno tests for those files

- [ ] Write failing tests proving a Free owner can upload, read, share within allowed scope, and delete an attachment.
- [ ] Remove subscription authorization and `x-kwilt-is-pro` dependence.
- [ ] Preserve authentication, ownership/RLS, content-type, size, storage-path, rate, and share-scope validation.
- [ ] Verify direct Free requests and unauthorized cross-owner denials.
- [ ] Verify:

```bash
rg -n "pro_only_attachments|x-kwilt-is-pro|is_pro_tools_trial" src/services/attachments supabase/functions/attachments-*
npm run lint:supabase-functions
```

**Commit:** `refactor(attachments): make secure attachments free`

### Task 1.5 — Retire the partial-trial access state

**Files:**

- Modify: `src/services/entitlements.ts`
- Modify: `src/services/entitlements.test.ts`
- Modify: `src/store/useEntitlementsStore.ts`
- Modify: `src/store/useEntitlementsStore.test.ts`
- Modify: `src/store/proToolsAccess.ts`
- Modify: `src/domain/generativeCredits.ts`
- Modify: `src/domain/generativeCredits.test.ts`
- Modify: `supabase/functions/_shared/serverAgentEntitlement.ts`
- Modify: `supabase/functions/_shared/__tests__/serverAgentEntitlement.test.ts`
- Modify: `src/features/account/SuperAdminToolsScreen.tsx`

- [ ] Write failing compatibility tests showing historical `pro_tools_trial` data may parse but grants no current feature access.
- [ ] Remove `isProToolsTrial` from current Zustand state, access decisions, quota tier, admin grants, and server decisions.
- [ ] Keep migrations/history intact unless a later data migration is explicitly required; do not erase audit history.
- [ ] Prove an Apple introductory-period customer with active RevenueCat `pro` resolves to `isPro === true`.
- [ ] Verify:

```bash
rg -n "isProToolsTrial|pro_tools_trial" src supabase/functions --glob '!**/*.md'
```

Expected result: only explicitly documented/tested historical compatibility matches.

**Commit:** `refactor(entitlements): collapse trial access into Pro`

### Task 1.6 — Rebuild contextual paywall and subscription presentation

**Files:**

- Modify: `src/features/paywall/PaywallDrawer.tsx`
- Modify: `src/features/paywall/PaywallContent.test.tsx`
- Modify: `src/features/paywall/PaywallInterstitialScreen.test.tsx`
- Modify: `src/features/account/ManageSubscriptionScreen.tsx`
- Add: `src/features/account/ManageSubscriptionScreen.test.tsx`
- Modify: `src/features/account/subscriptionPricing.ts`
- Modify: `src/features/account/subscriptionPricing.test.ts`
- Modify: `src/services/analytics/events.ts`

- [ ] Write failing tests for every current contextual reason, eligible-trial copy, ineligible Subscribe copy, unavailable-package recovery, Restore, Manage subscription, and Family Sharing explanation.
- [ ] Replace the old unlimited-structure value list with the approved outcome hierarchy from the message matrix.
- [ ] Load localized product price/cadence from RevenueCat. Never display a hardcoded price as a fallback.
- [ ] Use the SDK's introductory eligibility result; do not infer eligibility from the presence of intro metadata.
- [ ] Carry `reason`, `source`, `product_id`, `period`, `eligibility`, and `offering_id` through the purchase funnel without customer content.
- [ ] Keep Restore and Manage available in every recoverable state.

**Commit:** `feat(paywall): present the truthful Free and Pro offer`

### Task 1.7 — Add a retired-gate ratchet

**Files:**

- Add: `src/domain/proAccessPolicyRatchet.test.ts`

- [ ] Scan production TypeScript and Edge Function source for retired reasons, constants, customer-facing partial-trial copy, and Free-feature entitlement checks.
- [ ] Allow only named compatibility fixtures or migrations.
- [ ] Fail with the offending file and token so future features cannot silently restore the old business model.

**Commit:** `test(monetization): prevent retired gates from returning`

---

## Phase 2 — Make subscription lifecycle and server entitlement authoritative

### Task 2.1 — Add an event ledger and period-correct subscription projection

**Files:**

- Add via CLI: `supabase/migrations/*_monetization_subscription_lifecycle.sql`
- Add: `supabase/functions/_shared/revenueCatSubscriptionLifecycle.ts`
- Add: `supabase/functions/_shared/__tests__/revenueCatSubscriptionLifecycle.test.ts`
- Modify: `supabase/migrations/20260103000000_kwilt_installs_and_revenuecat_mirror.sql` only if comments need clarification; do not rewrite applied schema

- [ ] Use `npx supabase migration new monetization_subscription_lifecycle`.
- [ ] Add an immutable provider-event ledger keyed by RevenueCat event ID, with received/occurred timestamps, app user ID and aliases, transaction/original-transaction IDs, product, entitlement IDs, period type, expiration, environment, event type, price/currency/tax/commission fields, `offer_code`, `presented_offering_id`, `is_family_share`, and a bounded redacted payload or parsed fields.
- [ ] Extend the current subscription projection with renewal status, period/grace state, latest provider event timestamp/ID, environment, and cleanup status/last-attempt fields.
- [ ] Write reducer tests before SQL/handler wiring for initial purchase, trial, renewal, cancellation, uncancellation, billing issue, grace recovery, product change, expiration, refund, duplicate delivery, and out-of-order delivery.
- [ ] Define cancellation as “will not renew” while retaining access through expiration; never as immediate revocation.
- [ ] Verify migration locally and run focused Deno tests.
- [ ] Preserve these creator-safe fields for the companion plan, but do not let webhook-supplied campaign fields become payout authority without a qualified first-party claim.

**Commit:** `feat(subscriptions): add durable lifecycle projection`

### Task 2.2 — Harden the RevenueCat webhook

**Files:**

- Modify: `supabase/functions/pro-codes/index.ts`
- Add/modify focused tests for the RevenueCat webhook route
- Modify: `supabase/functions/_shared/founderAlerts.ts`
- Modify: `supabase/functions/_shared/__tests__/founderAlerts.test.ts`

- [ ] Write failing tests proving a missing or incorrect webhook secret is rejected.
- [ ] Store each event before applying its projection and make duplicate receipt idempotent.
- [ ] Apply events through the lifecycle reducer using provider timestamps and current projected state.
- [ ] Treat Sandbox `TEST` events as non-entitling diagnostics.
- [ ] Keep founder alerts derived from accepted events without making alert delivery part of entitlement correctness.
- [ ] Return bounded, non-secret responses and log event IDs rather than customer payloads.
- [ ] Verify duplicate/out-of-order tests and `npm run lint:supabase-functions`.

**Commit:** `fix(subscriptions): authenticate and order RevenueCat lifecycle events`

### Task 2.3 — Resolve one trusted server Pro union

**Files:**

- Modify: `supabase/functions/_shared/serverAgentEntitlement.ts`
- Modify: `supabase/functions/_shared/__tests__/serverAgentEntitlement.test.ts`
- Add: `supabase/functions/_shared/serverProAccess.ts`
- Add: `supabase/functions/_shared/__tests__/serverProAccess.test.ts`
- Add via CLI: `supabase/migrations/*_trusted_pro_access.sql`
- Add: `supabase/tests/trusted_pro_access.sql`

- [ ] Write failing tests for active RevenueCat purchase, cancelled-but-paid, grace, expired, refunded, active internal grant, expired internal grant, and conflicting rows.
- [ ] Resolve purchase truth from `kwilt_revenuecat_subscriptions` and support/comp truth from `kwilt_pro_entitlements` as a union.
- [ ] Exclude historical partial-trial state.
- [ ] Return a typed decision with source, active-through timestamp, and reason suitable for enforcement and support telemetry.
- [ ] Require authenticated user identity; do not accept a RevenueCat app user ID or Pro boolean supplied by the client as proof.
- [ ] Add one RLS-safe SQL helper for authenticated RPC guards that resolves the
  same paid-through/grace/internal-grant union from `auth.uid()`. Use a fixed
  search path, revoke public/anon execution, and prove cross-user denial plus
  parity with the Edge resolver.

**Commit:** `feat(entitlements): centralize trusted server Pro access`

### Task 2.4 — Configure and prove store products

**External configuration plus evidence:**

- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] Confirm `pro_monthly`, `pro_annual`, `pro_family_monthly`, and `pro_family_annual` are in one Apple subscription group and all map to RevenueCat `pro`.
- [ ] Configure the one-month introductory offer for intended products/storefronts.
- [ ] Enable Apple Family Sharing only for Family products.
- [ ] Configure RevenueCat offering/package mappings and mandatory webhook authorization.
- [ ] Enable and document billing grace behavior.
- [ ] Record screenshots/IDs and who verified each setting; do not record secrets.
- [ ] Reconcile legacy product aliases so existing customers retain `pro`.

No source commit is complete until the evidence ledger is updated.

---

## Phase 3 — Enforce advanced AI services and exposure-control unready capabilities

### Task 3.1 — Freeze the provider-call and job-class inventory

**Files:**

- Add: `docs/architecture/monetization-provider-boundaries.md`
- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] Inventory every OpenAI/other-model, Live Conversation, phone, scheduled/background, MCP, attachment-analysis, routing, evaluation, title, retry, and fallback call.
- [ ] For each call record: user intent, capability, job ID, access class, billing class, user-credit cost, provider-cost owner, trusted enforcement point, retry semantics, and analytics event.
- [ ] Mark authored/deterministic/internal work and locally eligible fallback as zero user credits.
- [ ] Treat any unclassified provider call as a release blocker.

**Commit:** `docs(ai): map paid provider boundaries`

### Task 3.2 — Make AI job policy and successful-result metering authoritative

**Files:**

- Modify: `src/services/ai.ts`
- Modify: `src/domain/generativeCredits.ts`
- Modify: `src/domain/generativeCredits.test.ts`
- Modify: `src/features/unifiedChat/localChatRoute.ts`
- Modify: `src/features/unifiedChat/onDeviceGenerationPolicy.ts`
- Modify: `supabase/functions/_shared/aiModelRouting.ts`
- Modify: `supabase/functions/_shared/__tests__/aiModelRouting.test.ts`
- Modify: `supabase/functions/ai-chat/index.ts`
- Add focused Deno tests for access, quota, success, failure, retry, and fallback accounting

- [ ] Add explicit access and billing classes to the canonical generation-job contract.
- [ ] Derive access and quota from authenticated server state and server-known job ID.
- [ ] Remove authorization use of `x-kwilt-is-pro`; retain only clearly labeled diagnostic telemetry if needed.
- [ ] Count one credit after a successful usable user result; count zero for provider/network/schema/rejected-output failure, internal work, local completion, and Kwilt-selected fallback.
- [ ] Keep retry/regenerate as a new user action that consumes a credit only when successful.
- [ ] Add concurrency-safe quota behavior so parallel successful completions cannot overrun the allowance silently.

**Commit:** `feat(ai): enforce trusted access and successful-result credits`

### Task 3.3 — Ship Live Conversation as a free, cost-bounded MVP preview

**Files:**

- Add: `src/domain/mvpPreviewExposure.ts`
- Add: `src/domain/mvpPreviewExposure.test.ts`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.tsx`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.test.tsx`
- Modify: `src/features/liveConversation/liveConversationSessionClient.ts`
- Modify: `supabase/functions/live-conversation-session/index.ts`
- Modify: `supabase/functions/_shared/liveConversationSession.ts`
- Modify: `supabase/functions/_shared/__tests__/liveConversationSession_deno_test.ts`
- Add: `supabase/functions/_shared/serverMvpPreviewAccess.ts`
- Add: `supabase/functions/_shared/__tests__/serverMvpPreviewAccess.test.ts`
- Add via CLI: `supabase/migrations/*_mvp_preview_usage_budgets.sql`
- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] Define `live_conversation` and `cook_mode` as `free_preview`
  capabilities. Use client flags `kwilt-preview-live-conversation` and
  `kwilt-preview-cook-mode` plus server kill switches
  `KWILT_LIVE_CONVERSATION_PREVIEW_ENABLED` and
  `KWILT_COOK_MODE_PREVIEW_ENABLED`. Configure all four on for the intended MVP
  launch; a missing server switch fails closed.
- [ ] Implement and test the composed decision: exposure on plus authenticated
  account → allow without a paywall; exposure off → unavailable for Free and
  Pro with no paywall; signed-out → require sign-in before provider work.
- [ ] Keep the Live Conversation entry/CTA visible while exposure is on and
  prove Free and Pro accounts take the same MVP path.
- [ ] Add an atomic server usage reservation before minting an ephemeral
  secret: at most five Live session mints per authenticated account per UTC day
  and one active fifteen-minute server lease at a time. Add a ten-minute client
  preview timer and disconnect receipt; label duration as a client/runtime
  safeguard, not a hard provider-session guarantee.
- [ ] Start the global circuit breaker at 100 Live session mints per UTC day and
  document the value as server configuration, not a customer promise. Emit a
  provider-cost alert at 80% and reject new mints at 100%. Return retry-later or
  unavailable, never a Pro upsell, when a guard trips.
- [ ] Enforce the exposure flag in the Edge Function so stale or modified
  clients cannot create a session after the preview is hidden.
- [ ] Preserve typed Chat, dictation, and ordinary Free/Pro AI behavior.
- [ ] Keep Live Conversation out of purchase, creator, and subscription-benefit
  analytics. Track preview start, completed conversation, repeat use, duration,
  provider cost, guard rejection, and flag state so a later Pro decision has
  evidence.

**Commit:** `feat(live-conversation): bound the free MVP preview`

### Task 3.4 — Gate background, phone, and scheduled agent execution

**Files:**

- Modify: `supabase/functions/agent-run/index.ts`
- Modify: `supabase/functions/agent-channel-tick/index.ts`
- Modify: `supabase/functions/phone-agent-link/index.ts`
- Modify: `supabase/functions/phone-agent-sms/index.ts`
- Modify: `supabase/functions/phone-agent-tick/index.ts`
- Modify: `supabase/functions/_shared/agentRunCoordinator.ts`
- Modify: `supabase/functions/_shared/__tests__/agentRunCoordinator.test.ts`
- Modify: `supabase/functions/_shared/__tests__/agentChannelWorker.test.ts`
- Modify: `src/features/account/PhoneAgentSettingsScreen.tsx`
- Modify: `src/features/account/actions/phoneAgentSettingsActions.ts`
- Modify: `src/features/account/actions/phoneAgentSettingsActions.test.ts`
- Modify: `src/services/phoneAgent.ts`
- Modify: `src/services/phoneAgent.test.ts`

- [ ] Test both job creation and later execution against the current entitlement; a job created while Pro must not continue scheduling new paid runs after confirmed expiry.
- [ ] Keep in-flight completion idempotent and record whether a run was completed, skipped for access, retried, or cancelled.
- [ ] Use the central server access resolver and server-known job class.
- [ ] Ensure phone/background retries do not double-count user credits.

**Commit:** `feat(agents): enforce Pro on proactive execution`

### Task 3.5 — Gate external MCP at approval, token, and tool execution

**Files:**

- Modify: `src/features/account/ConnectedToolsScreen.tsx`
- Modify: `src/features/account/ConnectedToolsScreen.test.tsx`
- Modify: `supabase/functions/mcp/index.ts`
- Modify: `supabase/functions/_shared/__tests__/externalMcpOAuth.test.ts`
- Modify: `supabase/functions/_shared/__tests__/externalMcpActionParity.test.ts`
- Modify: `supabase/functions/mcp/README.md`

- [ ] Write client and endpoint tests for Free setup, OAuth approval/token issuance or use, read tools, and write tools.
- [ ] Open the external-agent contextual paywall before presenting setup as available.
- [ ] Enforce trusted Pro at a point that protects every tool call, including already-issued tokens after expiration.
- [ ] Preserve token revocation, account safety, and subscription-management recovery.
- [ ] Return a protocol-correct paid-access error that does not leak entitlement internals.

**Commit:** `feat(mcp): require Pro for external agent access`

---

## Phase 4 — Gate Money and Budgets and stop provider cost safely

### Task 4.1 — Put the first Money setup and all active Money use behind Pro

**Files:**

- Modify: `src/capabilities/money/screens/MoneySetupScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneySetupScreen.test.tsx`
- Modify: `src/capabilities/money/screens/MoneyEntryScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.test.tsx`
- Modify: `src/capabilities/money/screens/MoneyAccountsScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyAccountsScreen.test.tsx`
- Modify relevant category, plan, and transaction screen tests
- Modify: `src/capabilities/money/native/moneyPlaidLink.native.ts`
- Modify: `src/capabilities/money/native/moneyPlaidLink.native.test.ts`
- Modify: `src/capabilities/money/data/moneyPlaidApi.ts`
- Modify: `src/capabilities/money/data/moneyPlaidApi.test.ts`

- [ ] Write Free regressions proving the first real Money setup action opens the
  contextual full-Pro interstitial before a token request, native Plaid
  initialization, budget change, or transaction-review mutation.
- [ ] For an eligible storefront account, present the live one-month
  introductory offer; for an ineligible account, present the live subscription
  price without trial language.
- [ ] Let Free people understand what Money connects and how the data is used
  before purchase. Do not add manual account or transaction-entry UI, actions,
  repository methods, or backend routes.
- [ ] Remove the “additional institution” distinction. The first connection is the paid boundary; Pro has no published numeric connection cap.
- [ ] During active trial, paid, and grace states, expose the complete Money and
  Budgets workflow, including categories, plans, and transaction review.
- [ ] After confirmed expiration, keep imported accounts, transactions, and
  budget history readable with `Connection paused`, but disable active Money
  editing and provider operations while keeping deletion and required
  data-management routes accessible.
- [ ] Add non-UI guards in the native/data layer so restored navigation, deep
  links, Chat, or another screen cannot bypass the policy.

**Commit:** `feat(money): gate Money and Budgets from first setup`

### Task 4.2 — Enforce Pro on every Plaid server operation

**Files:**

- Modify: `supabase/functions/create-plaid-link-token/index.ts`
- Modify recovered `supabase/functions/exchange-plaid-public-token/index.ts`
- Modify recovered `supabase/functions/sync-plaid-transactions/index.ts`
- Add/modify focused Deno tests for all three functions

- [ ] Reject Free authenticated direct requests before calling Plaid.
- [ ] Use `serverProAccess`; do not trust client headers or product IDs.
- [ ] Cover new Link, update/relink Link, token exchange, manual refresh, scheduled refresh, and retry.
- [ ] Preserve owner/account validation and never log Plaid tokens or financial payloads.
- [ ] Return a typed paid-access error the app can map to the Money and Budgets interstitial.

**Commit:** `feat(money): enforce Pro at Plaid boundaries`

### Task 4.3 — Enforce Pro on active budget and transaction mutations

**Files:**

- Modify: `src/capabilities/money/data/MoneyDataContext.tsx`
- Modify: `src/capabilities/money/data/MoneyDataContext.test.tsx`
- Modify: `src/capabilities/money/data/moneyRepository.ts`
- Modify: `src/capabilities/money/data/moneyRepository.test.ts`
- Modify: `src/capabilities/money/data/livingPlanRepository.ts`
- Modify: `src/capabilities/money/data/livingPlanRepository.test.ts`
- Add via CLI: `supabase/migrations/*_gate_money_mutations_to_pro.sql`

- [ ] Write failing tests showing a Free direct call cannot create or change a
  category, budget plan, transaction classification, split, note, merchant
  rule, or other active Money decision.
- [ ] Keep snapshot/history reads available after downgrade, but distinguish
  them from active writes in the shared access policy.
- [ ] Enforce the same trusted Pro decision in server-owned RPCs/RLS; client
  visibility and disabled controls are not authorization.
- [ ] Keep connection deletion/disconnect and account-level data deletion
  available without Pro.
- [ ] Return one typed paid-access result that preserves the intended action and
  opens the same Money and Budgets interstitial.

**Commit:** `feat(money): enforce Pro on active budgeting`

### Task 4.4 — Implement expiration cleanup with receipts and retry

**Files:**

- Add via CLI: `supabase/migrations/*_connected_money_expiry_cleanup.sql`
- Add: `supabase/functions/connected-money-entitlement-cleanup/index.ts`
- Add: `supabase/functions/connected-money-entitlement-cleanup/config.toml`
- Add focused cleanup Deno tests
- Modify: `supabase/functions/pro-codes/index.ts`
- Modify Money connection-state presentation files and tests
- Modify: `docs/operations/kwilt-pro-subscription-runbook.md` after it is added in Phase 7

- [ ] Schedule cleanup only from confirmed expiration/refund projection, never cancellation or billing issue alone.
- [ ] Make cleanup idempotent and retryable per Plaid Item.
- [ ] Revoke provider access/refresh capability without deleting imported accounts or transactions.
- [ ] Project `Connection paused`, last successful refresh, cleanup status, and honest reconnection expectations.
- [ ] Record a privacy-safe receipt and allow support to retry failed cleanup.
- [ ] Keep the cleanup worker disabled until Task 8.4 reconciliation passes.

**Commit:** `feat(money): pause connections safely after Pro expires`

---

## Phase 5 — Launch Screen Time and bound the free Cook Mode preview

### Task 5.1 — Ship Cook Mode as a free, cost-bounded MVP preview

**Files:**

- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeReadinessScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeReadinessScreen.test.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeCookModeScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeCookModeScreen.test.tsx`
- Modify: `src/capabilities/recipes/runtime/useRecipeCookSession.ts`
- Modify: `src/capabilities/recipes/actions/recipeCookActions.ts`
- Modify: `src/capabilities/recipes/actions/recipeCookActions.test.ts`
- Modify: `src/capabilities/recipes/voice/cookVoiceNaturalSpeech.ts`
- Modify: `src/capabilities/recipes/voice/cookVoiceNaturalSpeech.test.ts`
- Modify: `src/domain/mvpPreviewExposure.ts`
- Modify: `src/domain/mvpPreviewExposure.test.ts`
- Modify: `src/navigation/linkingConfig.ts`
- Modify navigation persistence/deep-link tests
- Modify Chat/food tool handoff files and tests that open Cook Mode
- Modify: `supabase/functions/cook-voice-speech/index.ts`
- Modify: `supabase/functions/_shared/cookVoiceSpeech.ts`
- Modify: `supabase/functions/_shared/__tests__/cookVoiceSpeech_deno_test.ts`
- Modify: `supabase/functions/_shared/serverFoodTools.ts`
- Modify: `supabase/functions/_shared/__tests__/serverFoodTools_deno_test.ts`

- [ ] Keep Cook entry available from Recipe Home, Readiness, restored
  navigation, deep links, and Chat while the preview flag is on. Prove Free and
  Pro accounts take the same path without a paywall.
- [ ] Preserve launch-ready recipe reading, ingredients, method, scaling,
  planning, and groceries without a Cook dependency.
- [ ] Route stale/deep-linked Cook destinations to the owning Recipe surface
  with an honest unavailable state rather than a purchase request when the flag
  is off.
- [ ] Enforce the exposure flag in Cook navigation, Chat/server Food tools, and
  `cook-voice-speech` so stale or modified clients cannot reach provider work
  after the preview is hidden.
- [ ] Require authentication and add bounded per-user speech requests,
  request-size/burst, and global/provider-cost safeguards before OpenAI speech
  or other Cook-specific provider work. Start with the existing 1,200-character
  request limit, 20 speech requests per minute, and 120 per authenticated
  account per UTC day. Reserve usage atomically through
  `serverMvpPreviewAccess`; start the global daily speech-request breaker at
  2,500 and alert at 80%. A tripped guard never opens a paywall.
- [ ] Keep Cook session state and Recipe content independent of subscription
  lifecycle; cancellation or expiration does not change the preview.
- [ ] Keep Cook Mode out of subscription benefits, creator claims, and paid
  conversion denominators. Track preview starts, completion, repeat use,
  provider cost, guard rejection, and flag state as future-classification
  evidence.

**Commit:** `feat(cook-mode): bound the free MVP preview`

### Task 5.2 — Classify basic and advanced personal Screen Time rules

**Files:**

- Add: `src/features/screen-time/domain/screenTimeMonetizationPolicy.ts`
- Add: `src/features/screen-time/domain/screenTimeMonetizationPolicy.test.ts`
- Modify: `src/features/screen-time/domain/personalCompositeScreenTimeRule.ts`
- Modify: `src/features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderScreen.tsx`
- Modify focused personal rule-builder tests
- Modify: `src/services/paywall.ts`

- [ ] Write a pure classifier over scope, condition types, condition count, connector, and mutation class.
- [ ] Define Free authoring as unlimited device-local personal rules with exactly one standard condition: Focus is running, time of day, or daily usage allowance.
- [ ] Define Pro authoring as any two-or-more-condition rule (where AND/OR becomes meaningful) or a Kwilt-linked `real_step_complete` or `budget` condition. Do not classify a stored default connector on a one-condition rule as premium by itself.
- [ ] Keep authorization, native picker, inventory, explanation, recovery, reading, disabling, deleting, loosening, release, and cleanup outside the paid authoring gate.
- [ ] Open the advanced-rule contextual interstitial before adding a premium condition/connector or leaving a draft unsavable. Never apply an enforcement change before the access decision.
- [ ] Add `access_class`, bounded condition types/count, scope, mutation class, and entry source to analytics; never include selected apps, Apple tokens, generated rule sentences, Activities, or Money content.

**Commit:** `feat(screen-time): classify basic and advanced personal rules`

### Task 5.3 — Enforce advanced personal Screen Time at every authoring path

**Files:**

- Add: `src/features/screen-time/domain/screenTimeEntitlementLifecycle.ts`
- Add: `src/features/screen-time/domain/screenTimeEntitlementLifecycle.test.ts`
- Modify personal Screen Time rule save/update services and focused tests
- Modify native projection/generator guards and focused tests
- Modify: `src/features/screen-time/runtime/screenTimeHandoffForegroundSync.ts`
- Modify: `src/features/screen-time/runtime/screenTimeHandoffForegroundSync.test.ts`
- Modify: `src/features/screen-time/runtime/screenTimeHandoffStore.ts`
- Modify: `src/features/screen-time/runtime/screenTimeHandoffStore.test.ts`
- Modify Screen Time Chat/tool proposal and execution files and tests
- Modify navigation/deep-link persistence tests for the rule builder

- [ ] Prove Free can create each supported basic rule and Pro can create the compound and Kwilt-linked matrix.
- [ ] Apply the same classifier to form save, restored draft, deep link, Chat proposal execution, and direct native projection entry.
- [ ] Treat client `isPro` as the local UX decision only; any server-backed Kwilt condition or cross-device mutation independently requires trusted Pro.
- [ ] Write the entitlement-lifecycle reducer first. It ignores
  cancelled-but-active, billing retry with configured grace, and transient
  unknown state; confirmed `expired` or `refunded` moves each advanced rule
  through `active → deactivation_pending → inactive_due_to_entitlement`.
- [ ] On that transition, disable the whole advanced rule, clear its desired
  native enforcement projection, and enqueue release/cleanup. Keep its complete
  definition readable for audit, deletion, and later review; do not convert it
  to one Free condition.
- [ ] Persist the last acknowledged native state and receipt per rule/device.
  Retry release on foreground/reconciliation and show **Deactivation pending**
  until the native extension acknowledges cleanup.
- [ ] Keep basic personal rules active and unchanged.
- [ ] On Restore/resubscribe, leave the dormant rule inactive and require a
  deliberate **Review and turn back on** action after Pro is confirmed.
- [ ] Prove expiration never leaves desired paid enforcement active, blocks a
  release/delete action, claims offline cleanup succeeded, or silently
  reactivates a dormant rule.

**Commit:** `feat(screen-time): enforce advanced rule access across entry paths`

### Task 5.4 — Build the Free-to-Pro Screen Time upgrade journey

**Files:**

- Add: `src/features/screen-time/domain/screenTimeUpgradeJourney.ts`
- Add: `src/features/screen-time/domain/screenTimeUpgradeJourney.test.ts`
- Modify: `src/features/account/ScreenTimeProtectionSettingsScreen.tsx`
- Modify: `src/features/account/ScreenTimeProtectionSettingsScreen.test.tsx`
- Modify: `src/features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderScreen.tsx`
- Modify: `src/features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderScreen.test.tsx`
- Modify: `src/features/household/screenTime/FamilyScreenTimeLearningScreen.tsx`
- Modify: `src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx`
- Modify Screen Time Chat proposal/preview files and focused tests
- Modify: `src/store/usePaywallStore.ts`
- Modify its focused tests
- Modify: `src/features/paywall/PaywallDrawer.tsx`
- Modify: `src/features/paywall/PaywallContent.test.tsx`
- Modify: `src/services/analytics/events.ts`

- [ ] Define one bounded upgrade-intent model: entry source, advanced outcome
  type, rule ID or safe draft token, condition class/count, and return
  destination. Never store selected apps, Apple tokens, rule sentences, real
  steps, budgets, child names, or other private content in analytics.
- [ ] On the rules overview, show advanced personal examples and family
  coordination as secondary, clearly **Pro**-labeled possibilities beside the
  person's working Free rules. Do not replace the primary **Add rule** action.
- [ ] In the basic builder, keep premium conditions and **Add another
  condition** visible with a **Pro** label. A tap previews the concrete outcome
  and opens the contextual interstitial before the draft becomes invalid or
  enforcement changes.
- [ ] After the first successful basic-rule save, show a secondary **Make this
  rule smarter** action. Saving remains uninterrupted and complete without
  purchase.
- [ ] On rule detail, offer secondary paths to add another condition, connect
  the rule to a real step or Money review, or coordinate it for a child.
- [ ] In family learning, explain the outcome and device requirements before
  the interstitial; open it before enrollment, selection, or delivery begins.
- [ ] In Chat, allow a typed advanced-rule proposal and preview, but require Pro
  before execution or native/server projection.
- [ ] Preserve the draft and exact return destination through purchase, Restore,
  dismissal, and app foregrounding. After confirmed Pro, return to the requested
  action; never make the person reconstruct the rule.
- [ ] Use live StoreKit price/cadence/eligibility in the interstitial and avoid
  arbitrary rule quotas, blank paywalls, launch-time nags, or repeated prompts
  after dismissal.
- [ ] Instrument the privacy-safe journey:
  `upgrade_path_viewed → premium_intent_selected → paywall_viewed →
  purchase_started/succeeded_or_restored → intent_returned →
  advanced_rule_enabled → advanced_value_completed`.

**Commit:** `feat(screen-time): add contextual Free-to-Pro paths`

### Task 5.5 — Classify Family Screen Time actions by paid and safety meaning

**Files:**

- Modify: `src/features/household/screenTime/familyScreenTimeCommands.ts`
- Modify: `src/features/household/screenTime/familyScreenTimeCommands.test.ts`
- Modify: `src/features/household/screenTime/data/familyScreenTime.ts`
- Modify: `src/features/household/screenTime/data/familyScreenTime.test.ts`
- Modify: `src/features/household/HouseholdSettingsScreen.tsx`
- Modify: `src/features/household/HouseholdSettingsScreen.test.tsx`
- Modify: `src/features/household/HouseholdMemberDetailScreen.tsx`
- Modify: `src/features/household/HouseholdMemberDetailScreen.test.tsx`
- Modify: `src/features/household/HouseholdDeviceSetupScreen.tsx`
- Modify: `src/features/household/HouseholdDeviceSetupScreen.test.tsx`
- Modify Family Screen Time learning/setup screens and tests

- [ ] Add a pure action classifier with tests: read/release/disable/revoke/cleanup are Free-safe; enroll/select/deliver/create/tighten/extend/new override require Pro.
- [ ] Keep basic personal Screen Time rules and device-local enforcement outside this family policy; route advanced personal authoring through Task 5.2 instead.
- [ ] Gate family setup/admin navigation contextually without hiding existing state or recovery.
- [ ] If entitlement changes during setup, stop new restrictive work and leave an explicit release/cleanup route.
- [ ] On confirmed expiration/refund, mark every family rule desired-inactive and
  enqueue release for each affected child device. Keep the definition readable
  as **Inactive because Pro ended** and the last acknowledged applied state
  visible for operational truth.
- [ ] Show **Deactivation pending** until each child-device receipt proves
  release. Never preserve paid enforcement as the desired state, auto-convert
  the agreement, or automatically restart it after resubscription.

**Commit:** `feat(screen-time): gate family administration safely`

### Task 5.6 — Enforce Family Screen Time for Chat and direct server/RPC paths

**Files:**

- Modify: `src/features/unifiedChat/loadFamilyScreenTimeChatSnapshot.ts`
- Modify: `src/features/unifiedChat/familyScreenTimeChatEvidence.test.ts`
- Modify Family Screen Time server tools under `supabase/functions/_shared/serverHouseholdTools.ts`
- Modify relevant server tool/action-runtime tests
- Add via CLI: `supabase/migrations/*_family_screen_time_pro_enforcement.sql`

- [ ] Keep bounded read evidence available where privacy/role policy allows it.
- [ ] Apply the same paid/safety action classifier to Chat and server tools.
- [ ] Enforce trusted Pro inside each tightening mutation/RPC, not only in Chat planning.
- [ ] Prove a Free direct request cannot tighten controls and can still release/disable them.
- [ ] Project a trusted confirmed expiration/refund into idempotent desired-inactive
  family rules and queued device releases; cancellation with remaining paid time
  and configured grace do nothing.
- [ ] Require desired/applied receipts for delivery, override, release, and
  entitlement cleanup; retry offline devices and do not claim completion from a
  server write alone.
- [ ] Reject silent reactivation after resubscription; require a new reviewed
  caregiver activation that then passes trusted Pro and authority checks.

**Commit:** `feat(screen-time): enforce paid family controls server-side`

### Task 5.7 — Prepare Screen Time for Guideline 4.10 review and fallback

**Files:**

- Add: `docs/app-store/screen-time-monetization-review-notes.md`
- Modify: `docs/release/kwilt-pro-monetization-rollout.md`
- Modify: `docs/marketing/kwilt-free-pro-message-matrix.md`

- [ ] Inventory the exact Free baseline and paid developer-created value on the submitted build.
- [ ] Describe Pro as advanced rule composition, Kwilt-linked conditions, family coordination, automation, and desired/applied delivery—not as payment for Apple authorization, the native picker, raw blocking, or Screen Time API access.
- [ ] Record Family Controls distribution entitlement status and signed-device proof for each marketed personal/family behavior.
- [ ] Prepare the App Review account states and a concise review path
  demonstrating Free basic rules, progressive contextual upgrade paths, Pro
  compound rules, unique Kwilt conditions, family coordination, cancellation
  with paid-through access, expiration deactivation receipts, reviewed
  reactivation, release, and Restore.
- [ ] Add a remote fallback that removes Screen Time benefits from the marketed Pro list and makes advanced personal authoring Free without changing the rest of Pro if review rejects the packaging boundary.
- [ ] Do not activate paid creator campaigns using Screen Time claims until this task and the companion campaign approval pass.

**Commit:** `docs(screen-time): prepare monetization review and fallback`

---

## Phase 6 — Align the public promise, legal terms, support, and App Store

### Task 6.1 — Apply the approved message matrix in the app

**Files:**

- Modify: `src/features/paywall/PaywallDrawer.tsx`
- Modify: `src/features/account/ManageSubscriptionScreen.tsx`
- Modify: `src/features/paywall/FEATURE.md`
- Modify relevant screen tests

- [ ] Use the proof register to select the benefits shown at release.
- [ ] Give advanced personal Screen Time and family coordination distinct contextual reasons; keep the Free basic baseline and safety exits explicit.
- [ ] Keep one primary outcome, one concrete explanation, live price/cadence, and one purchase CTA per contextual interstitial.
- [ ] Explain trial eligibility, auto-renewal, Restore, Manage, data preservation, and Family Sharing accurately without overloading the interstitial.
- [ ] Use the `kwilt-copywriting` skill for final customer-facing language.

**Commit:** `copy(monetization): align in-app Pro messaging`

### Task 6.2 — Build the public pricing and support story

**Repository:** `/Users/andrewwatanabe/kwilt-site`

**Files:**

- Modify: `app/(site)/pricing/page.tsx`
- Add: `app/(site)/pricing/pricing.module.css`
- Modify: `app/(site)/support/page.tsx`
- Modify: `components/marketing/home/HomeFaq.tsx`

- [ ] Replace the dead `/#pricing` redirect with a real pricing destination or a verified home-section anchor.
- [ ] Present Free, Pro, Individual, Family Sharing, trial eligibility, downgrade, cancellation, and Restore consistently with the message matrix.
- [ ] Do not promise an unproven paid pillar.
- [ ] Use stable marketing price copy only if approved for the storefront scope; make the in-app live price the purchase truth.
- [ ] Add support answers for entitlement mismatch, ineligible trial, billing issue, cancellation, expiration, Restore, Money connection pause, and family-control release.
- [ ] Explain basic versus advanced personal Screen Time, paid-through access
  after cancellation, whole-rule deactivation after expiration/refund,
  **Deactivation pending** for offline devices, reviewed reactivation, and why
  release/delete/cleanup remain available without Pro.
- [ ] Run the site's focused tests, typecheck/lint, and production build according to its package scripts.

**Commit in site repo:** `feat(marketing): publish the Kwilt Free and Pro offer`

### Task 6.3 — Reconcile legal and privacy language

**Repository:** `/Users/andrewwatanabe/kwilt-site`

**Files:**

- Modify: `app/(site)/terms/page.tsx`
- Review and modify only if needed: `app/(site)/privacy/page.tsx`
- Modify: `/Users/andrewwatanabe/Kwilt/docs/legal/mega-app-data-disclosure-matrix.md`

- [ ] Remove customer-facing “Pro Tools Trial.”
- [ ] State Apple-managed auto-renewal, eligibility, cancellation, Restore, and data-preservation behavior accurately.
- [ ] Preserve truthful provider and privacy disclosures for Money, AI, subscription state, and household/device data.
- [ ] Route material legal wording for human review; code review is not legal approval.

**Commit in site repo:** `docs(legal): reconcile subscription terms`

### Task 6.4 — Prepare App Store product and review materials

**Files:**

- Add: `docs/app-store/monetization-release-submission.md`
- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] Draft current description/promotional text, subscription display names/descriptions, review notes, test-account instructions, feature prerequisites, privacy/legal/support links, and screenshot plan.
- [ ] Include live price/cadence in the purchase UI, working Restore, Manage subscription, and clear auto-renewal/trial disclosure.
- [ ] Clarify Apple Family Sharing versus Kwilt household membership.
- [ ] Include the Screen Time monetization explanation, Free/Pro review-account states, Family Controls entitlement evidence, downgrade safety, and the approved remote fallback from Task 5.7.
- [ ] Use synthetic-safe data for every screenshot and review account.
- [ ] Do not submit metadata, subscription products, or a build without Andrew's explicit approval.

**Commit:** `docs(app-store): prepare monetization release submission`

### Task 6.5 — Prepare creator acquisition as a separate launch lane

**Files:**

- Reference: `docs/feature-briefs/creator-acquisition-pilot.md`
- Reference: `docs/superpowers/plans/2026-08-31-kwilt-creator-acquisition-pilot.md`
- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] Record creator-channel readiness independently from the general App Store release decision.
- [ ] Require an approved promise, FTC disclosure, landing, attribution claim, verified lifecycle, commission reconciliation, and capability evidence before paid creator traffic.
- [ ] Keep Apple/RevenueCat as the subscription source of truth. A creator code never grants Pro; an Apple offer code is an optional later campaign type, not the affiliate ledger.
- [ ] Start with Marcus-aligned digital-wellness/productivity creators and advanced personal Screen Time only after Task 5.7 passes. Delay Maya/family creators until the two-device family corpus passes.
- [ ] Allow `Proceed` for the core Pro release while creator status remains `Hold`.

**Commit:** `docs(creators): add the creator launch lane`

---

## Phase 7 — Make the launch measurable and supportable

### Task 7.1 — Implement one monetization analytics contract

**Files:**

- Modify: `src/services/analytics/events.ts`
- Add/modify analytics contract tests
- Modify paid capability entry points completed in Phases 3–5
- Modify: `supabase/functions/_shared/founderAlerts.ts` only where lifecycle names need normalization
- Add: `docs/analytics/monetization-funnel.md`

- [ ] Define canonical events for paid intent, paywall view, CTA, purchase start/success/failure, trial start, paid value start/completion, renewal, cancellation, billing issue, grace recovery, expiration, refund, restore, and resubscribe.
- [ ] Carry reason/source through the funnel and deduplicate client/webhook events with explicit event ownership.
- [ ] Preserve optional creator campaign/claim lineage as opaque IDs from paid intent through first paid renewal, while keeping commission events and financial reconciliation server-owned.
- [ ] Add provider/unit-economics fields without customer content.
- [ ] Add a production query/check proving no retired paywall reasons appear.
- [ ] Add privacy ratchets for Screen Time and creator analytics: no app identities, rule sentences, child names, Activity/Goal/Chat/Money content, or creator bank/tax data.
- [ ] Document denominators and do not treat route arrival as paid value.

**Commit:** `feat(analytics): measure monetization and paid value`

### Task 7.2 — Add the subscription and provider-cleanup runbook

**Files:**

- Add: `docs/operations/kwilt-pro-subscription-runbook.md`
- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] Document how to reconcile RevenueCat, the event ledger, subscription mirror, internal grant, install/client state, and cleanup receipts.
- [ ] Add response paths for webhook outage, entitlement mismatch, billing issue, premature revocation, failed Restore, Plaid cleanup failure, MCP token after expiry, and family-control safety access.
- [ ] Include rollback switches, retry commands/procedures, owners, escalation, and privacy boundaries.
- [ ] Never instruct support to inspect private Money, Chat, or family-control content.

**Commit:** `docs(operations): add Pro lifecycle runbook`

### Task 7.3 — Add future-feature monetization intake

**Files:**

- Modify: `docs/feature-briefs/_AUTHORING.md`
- Modify: `docs/feature-briefs/monetization-paywall-revenuecat.md`

- [ ] Require every new paid candidate to declare access class, paid intent, contextual reason, alternate entry points, trusted enforcement boundary, downgrade behavior, metering, analytics, marketing claim, and evidence gate.
- [ ] Require an explicit Free fallback for capability-adjacent paid AI.
- [ ] Require Screen Time candidates to declare Free baseline, advanced-value rationale, safety-reducing exceptions, desired/applied receipt behavior, Guideline 4.10 positioning, and a remote marketing/access fallback.
- [ ] Require acquisition candidates to separate customer entitlement, attribution, commission, customer benefit, disclosure, and payout truth.
- [ ] Keep the accepted brief's open questions deferred unless new evidence supports a change.

**Commit:** `docs(product): add monetization intake to feature briefs`

---

## Phase 8 — Prove the system and release deliberately

### Task 8.1 — Complete focused source and local-backend proof

**Files:**

- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] Run all focused tests named in earlier tasks.
- [ ] Run the retired-gate and provider-boundary inventories and resolve every unexplained match.
- [ ] Run local migration reset/test and Edge Function checks appropriate to the changed backend.
- [ ] Run once after the app/backend/docs diff is complete:

```bash
npm run verify:changed -- --run
```

- [ ] Run the public site's own typecheck/lint/tests/build on its matching branch.
- [ ] Record command, commit, date, result, and limitations in the rollout ledger.

### Task 8.2 — Run the Free and contextual-paywall runtime corpus

**Files:**

- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] In the app checkout that owns runtime verification, record branch, commit, dirty state, native build/install provenance, Metro path/port, and account type.
- [ ] Verify a Free account can exceed old Arc/Goal limits and use views,
  filters, Focus, attachments, banners, calendar export, streak recovery,
  household participation, launch-ready Food workflows, Chores, Games, Explore, and
  unlimited basic personal Screen Time rules using Focus, time of day, and daily
  usage one at a time.
- [ ] Verify a Free account can inspect the Money setup explanation but cannot
  begin Plaid or mutate budgets/transactions; the same intent shows the live
  one-month full-Pro trial only when Apple reports eligibility.
- [ ] Verify trial and paid accounts can complete the full Money and Budgets
  workflow, while an expired account retains readable history and data controls
  with sync and active editing paused.
- [ ] Verify each paid intent—including adding a second Screen Time condition, selecting AND/OR, choosing a real-step or Money condition, and beginning family coordination—opens the correct contextual interstitial before the draft becomes unsavable or any provider/mutation begins.
- [ ] Verify each Free-to-Pro Screen Time path: overview preview, premium builder
  choice, successful basic-rule secondary action, rule-detail action, family
  learning, and Chat proposal. The basic job completes without purchase; the
  intended draft and return destination survive dismissal, purchase, and
  Restore.
- [ ] Verify deep links, restored navigation, and Chat reach the same decision.
- [ ] Verify cancellation with remaining paid time changes renewal messaging but
  leaves every paid rule active through the paid-through date.
- [ ] Verify confirmed expiration/refund deactivates every advanced personal and
  family rule as a whole, preserves a readable dormant definition, clears
  desired enforcement, and exposes release/delete/cleanup without repurchasing.
- [ ] Verify an offline affected device shows **Deactivation pending** until its
  native release receipt arrives, and Restore/resubscribe does not automatically
  reactivate the rule.
- [ ] Do not claim physical enforcement, store eligibility, or live provider behavior from Simulator results.

### Task 8.3 — Prove marketed Pro pillars and exposed MVP previews

**Files:**

- Modify: `docs/release/kwilt-pro-monetization-rollout.md`
- Modify only when new evidence changes the score: `docs/job-flows/maya-review-budget-reality-before-spending.md`
- Modify only when new evidence changes the score: `docs/job-flows/maya-feed-household-with-less-work.md`
- Modify only when new evidence changes the score: `docs/job-flows/maya-establish-family-screen-time.md`
- Modify only when new evidence changes the score: `docs/job-flows/marcus-move-the-few-things-that-matter.md`
- Modify only when new evidence changes the score: `docs/job-flows/nina-trust-ai-with-my-life-system.md`

- [ ] Money and Budgets: eligible one-month-trial activation, signed-device
  Plaid OAuth, link, relink, sync, relaunch, transaction review, budget planning,
  downgrade-to-readable-history, and TestFlight/provider proof with
  synthetic-safe accounts.
- [ ] Advanced personal Screen Time: every basic condition, every premium
  Kwilt-linked condition, two-plus-condition AND/OR truth table, native
  schedule/selection isolation, shield explanation, recovery, cancellation
  paid-through retention, expiration whole-rule deactivation, offline pending
  truth, reviewed reactivation, and release on an entitlement-enabled signed
  device.
- [ ] Family Screen Time: caregiver/child enrollment, schedules, allowances,
  responsibilities, prerequisite app, Chat change, native authorization,
  policy delivery, desired/applied receipt, temporary override, cancellation
  paid-through retention, expiration whole-rule desired-inactive projection,
  online/offline child release receipts, reviewed reactivation, recovery,
  release, and replacement on entitlement-enabled caregiver and child devices.
- [ ] Cook Mode and Live Conversation: with preview flags on, prove Free and Pro
  accounts use the same no-paywall entry; provider requests are authenticated
  and bounded; cost telemetry is emitted; and the minimum signed-runtime MVP
  works. With flags off, prove UI, stale links, Chat tools, and direct provider
  requests return an honest unavailable state with no upsell.
- [ ] If an MVP preview fails its minimum runtime proof, turn its exposure flag
  off and record the evidence boundary rather than holding the otherwise-safe
  Pro launch or inventing a paywall.
- [ ] Advanced/background/external agents: trusted access, metering, retry, expiry, and protocol behavior on their real execution surfaces.
- [ ] Mark only passing pillars `marketable`. Update in-app/site/App Store benefit lists if the passing set is narrower than planned.
- [ ] Run the Screen Time App Review demonstration and verify the remote fallback can remove Screen Time marketing and paid authoring without disturbing the rest of Pro.

### Task 8.4 — Run the Apple/RevenueCat lifecycle matrix

**Files:**

- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] Prove eligible and ineligible introductory-offer presentation with live StoreKit/RevenueCat results.
- [ ] Prove Individual monthly/annual and Family monthly/annual grant the same `pro` bundle.
- [ ] Prove Apple Family Sharing on a separate eligible family member without conflating it with Kwilt household membership.
- [ ] Prove purchase, trial, renewal, cancellation with remaining access, billing issue/grace, recovery, expiration, refund, Restore, and resubscribe.
- [ ] For each state, reconcile Apple/RevenueCat, webhook ledger, mirror, internal grant union, client `isPro`, capability access, analytics, and cleanup status.
- [ ] Reconcile the known production subscriber before enabling automatic provider cleanup.

### Task 8.5 — Enable cleanup, run rollback rehearsal, and make the go/no-go decision

**Files:**

- Modify: `docs/release/kwilt-pro-monetization-rollout.md`
- Modify: `docs/operations/kwilt-pro-subscription-runbook.md`

- [ ] Enable automatic Plaid cleanup only after Task 8.4 passes and Andrew approves the activation.
- [ ] Rehearse disabling a marketed paid pillar, pausing cleanup, replaying a webhook event idempotently, retrying cleanup, and restoring access without deleting customer data.
- [ ] Rehearse hiding and restoring each free MVP preview independently of Pro
  entitlement and confirm disabled direct provider requests stop creating cost.
- [ ] Confirm website, Terms, support, App Store materials, in-app paywall, and live store configuration still agree.
- [ ] Decide creator readiness separately using the companion plan. General release may proceed while paid creator traffic remains paused.
- [ ] Apply the decision rules from `docs/design-explorations/monetization-release-readiness/05-evaluate-learning.md`.
- [ ] Record one decision: `Proceed`, `Narrow`, or `Hold`, with evidence and unresolved risks.
- [ ] Do not submit or publish without Andrew's explicit approval.

---

## Final acceptance checklist

- [ ] No retired Free-feature gate remains in production behavior.
- [ ] No customer-facing or access-granting partial-trial state remains.
- [ ] Every Pro capability has one contextual reason and every entry path resolves consistently.
- [ ] Every paid provider/mutation rejects a Free direct request using trusted server state.
- [ ] Trial, price, and cadence are live-store truthful.
- [ ] Cancellation, grace, expiration, refund, Restore, and resubscribe are period-correct.
- [ ] Downgrade preserves data and safety-reducing controls.
- [ ] Free personal Screen Time is useful on its own and contains clear,
  contextual, work-preserving upgrade paths without generic interruption.
- [ ] Advanced personal and family Screen Time boundaries are deterministic
  across UI, Chat, native, server, and lifecycle states: cancellation retains
  paid-through access; expiration/refund deactivates whole rules; offline
  releases remain pending; resubscription requires reviewed reactivation.
- [ ] Screen Time marketing sells Kwilt-created composition/coordination value, has signed-device and App Review evidence, and can be remotely narrowed without changing the rest of Pro.
- [ ] Provider cleanup is authenticated, idempotent, retryable, observable, and separately enabled.
- [ ] Analytics measures paid intent, conversion, completed value, lifecycle, and unit economics without customer content.
- [ ] Support can reconcile entitlement and cleanup without inspecting private content.
- [ ] Site, legal, support, App Store, and in-app messaging agree.
- [ ] Every marketed paid pillar has the required signed-runtime proof.
- [ ] Cook Mode and Live Conversation are no-paywall MVP previews: Free and Pro
  receive the same enabled experience, provider use is authenticated and
  bounded, each can be hidden remotely, and neither is marketed as a
  subscription benefit.
- [ ] Creator acquisition is a separate gated lane: creator codes do not grant Pro, and no paid creator traffic runs without approved claims, disclosures, deterministic attribution, lifecycle reconciliation, and commission/refund proof.
- [ ] `npm run verify:changed -- --run` and applicable site/backend checks pass on the final diff.
- [ ] The release ledger contains the final go/no-go decision and proof boundaries.
