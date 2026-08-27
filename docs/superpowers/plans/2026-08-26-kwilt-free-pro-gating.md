# Kwilt Free and Pro Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the original Kwilt system, household participation, manual Money, and unlimited on-device AI free forever while reserving Pro for connected Money, Cook Mode, family Screen Time administration, and advanced or costly cloud services.

**Architecture:** Keep the existing RevenueCat `pro` entitlement and client `isPro` boolean. Put paid capabilities behind one typed policy used at UI, navigation, provider-initialization, and server-mutation boundaries; put AI access and billing on the canonical generation-job contract; make RevenueCat webhooks and the server subscription mirror authoritative for paid external services. Remove legacy structural and convenience gates completely instead of bypassing them in selected screens.

**Tech Stack:** React Native / Expo SDK 54, TypeScript, Zustand, Jest, RevenueCat (`react-native-purchases`), Supabase Postgres and Edge Functions, Deno tests, Plaid, PostHog.

---

## Execution posture

- Execute in the current checkout and ordinary branch. Do not create a worktree unless Andrew explicitly approves parallel implementation.
- Before each task, inspect `git status --short --branch`, `git rev-parse HEAD`, and the exact affected diff. The checkout was already dirty when this plan was written; preserve unrelated work and use `git add -p` for mixed files.
- Use test-first implementation for policies, counters, lifecycle reducers, SQL behavior, and other branching logic. UI-only copy/layout does not require strict TDD, but access-state and navigation behavior do.
- Create migrations with `npx supabase migration new <name>`; do not invent timestamps manually. Apply and test them locally before linking or pushing to a hosted project.
- Treat local tests, Simulator, physical device, Sandbox/TestFlight, backend deployment, App Store submission, and public release as separate proof boundaries.
- Do not activate automatic Plaid disconnection until the known production subscriber has been reconciled through RevenueCat, the webhook event ledger, the subscription mirror, and client `isPro`.
- Stage only files from the completed task. Never use `git add -A` in this checkout.

## Commercial contract to preserve

| Free forever | Pro |
| --- | --- |
| Unlimited Arcs, Goals, To-dos, reminders, views, filters, and sorting | Connected Money from the first Plaid connection, with unlimited institutions/accounts |
| Attachments, banners/image search, all Focus lengths, calendar export, streak recovery | Cook Mode |
| Household membership, Goal sharing, personal Screen Time | Family Screen Time administration and automation |
| Food except Cook Mode, Chores, Games, Explore | Advanced cloud AI, AI scheduling, Live Conversation, background AI, external agents |
| Manual Money and retained connected-Money history | 1,000 successful user-initiated cloud actions per month |
| Unlimited locally completed AI and zero-credit Kwilt-selected fallback | Full Pro access during the Apple introductory trial |
| 50 successful standard cloud actions per month | Same feature bundle for Individual and Family; Family changes Apple billing sharing only |

## Program invariants

1. `isPro` remains the single client boolean for full paid access; no replacement entitlement is introduced.
2. `pro_tools_trial` grants no customer-facing access and appears in no customer copy, access policy, or analytics segmentation.
3. A capability is Free unless it is explicitly listed in `ProCapability`; absence from the paid list cannot silently become a gate.
4. Hiding a button is never sufficient enforcement. Paid provider initialization and server mutations independently verify Pro.
5. Manual Money never requires Pro. The first Plaid Link request, every relink, exchange, and refresh do.
6. Cancellation does not revoke Pro before the paid-through date. Configured billing grace remains active. Confirmed expiration/refund revokes it.
7. Downgrade never deletes or hides customer data. Provider cost stops after confirmed expiry while imported history stays usable.
8. Personal Screen Time is Free. Family control creation/tightening requires Pro, while release/disable/safety-reducing actions always remain available.
9. On-device completion costs zero user credits. Kwilt-selected cloud fallback for a locally eligible job also costs zero; cancellation never forces fallback.
10. Only a successful, usable, user-initiated cloud result consumes one credit. Internal calls, provider errors, rejected output, and schema errors cost zero.
11. Server policy derives entitlement and billing class from trusted identity plus the canonical job ID. Client `x-kwilt-is-pro` and client-declared billing fields are telemetry only.
12. Individual and Family products map to the same RevenueCat `pro` entitlement and Apple subscription group.

## Requirement traceability

| Outcome | Primary projects | Release proof |
| --- | --- | --- |
| Original Kwilt structure is free | Projects 1 and 2 | Gate ratchet plus Free-account Simulator corpus |
| Unlimited on-device AI is honest | Project 4 | Supported and unsupported-device route/credit corpus |
| Cloud costs remain bounded | Project 4 | Server quota, successful-result accounting, and rate-limit proof |
| Paid external services are enforceable | Projects 3, 5, and 6 | Direct API/RPC denial tests plus Sandbox entitlement lifecycle |
| Trial is one full Pro experience | Project 3 | StoreKit eligibility and Sandbox purchase proof |
| Expiry preserves value but stops Plaid cost | Project 5 | Cancellation/grace/expiry/restore lifecycle run |
| Existing subscriber remains whole | Projects 3, 5, and 8 | Production reconciliation before cleanup activation |

## Project 0 — Freeze the baseline and recover deployed Money source

### Task 0.1: Record checkout and backend provenance

**Files:**
- Add: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] Record the branch, HEAD, dirty files, Supabase project reference, RevenueCat project/app, App Store subscription group, current TestFlight build, and currently deployed Money function versions. Do not include secrets or customer financial data.

```bash
git status --short --branch
git rev-parse HEAD
npx supabase --version
npx supabase functions list
```

- [ ] Add a proof matrix with columns `surface`, `source/test`, `local backend`, `Simulator`, `signed device`, `Sandbox/TestFlight`, `production`, `owner`, and `evidence`. Initialize unproved cells to `Not run`; do not infer runtime proof from source.

- [ ] Add a named release blocker: automatic Plaid cleanup remains disabled until the known production subscriber's RevenueCat state, webhook event, mirror row, and client `isPro` agree.

- [ ] Verify and commit only this document:

```bash
git diff --check -- docs/release/kwilt-pro-monetization-rollout.md
git add docs/release/kwilt-pro-monetization-rollout.md
git diff --cached --check
git commit -m "docs(monetization): add rollout proof matrix"
```

### Task 0.2: Check in the deployed Plaid function sources before changing enforcement

**Files:**
- Existing: `supabase/functions/create-plaid-link-token/index.ts`
- Add from deployed source: `supabase/functions/exchange-plaid-public-token/`
- Add from deployed source: `supabase/functions/sync-plaid-transactions/`
- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] Download the live functions through the Supabase Management API. Save the command output and deployed version IDs in the rollout document.

```bash
npx supabase functions download create-plaid-link-token --use-api
npx supabase functions download exchange-plaid-public-token --use-api
npx supabase functions download sync-plaid-transactions --use-api
```

- [ ] Diff `create-plaid-link-token` against its pre-download source. If the command overwrote uncommitted user work, stop and restore that hunk manually from the pre-command diff; never discard the user's work wholesale.

- [ ] Treat any retired Kwilt Budget repository as comparison evidence only. The downloaded deployed source is the implementation baseline.

- [ ] Ensure each checked-in function has `config.toml`, imports shared CORS/auth helpers where applicable, and contains no downloaded `.env`, token, access key, or customer payload.

- [ ] Run the focused Deno tests and type checks before committing:

```bash
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/create-plaid-link-token/__tests__/*_deno_test.ts
npm run lint:supabase-functions
git diff --check -- supabase/functions/create-plaid-link-token supabase/functions/exchange-plaid-public-token supabase/functions/sync-plaid-transactions docs/release/kwilt-pro-monetization-rollout.md
```

- [ ] Commit the provenance baseline separately from monetization behavior:

```bash
git add supabase/functions/create-plaid-link-token supabase/functions/exchange-plaid-public-token supabase/functions/sync-plaid-transactions docs/release/kwilt-pro-monetization-rollout.md
git diff --cached --check
git commit -m "chore(money): check in deployed Plaid functions"
```

## Project 1 — Make the paid boundary explicit and testable

### Task 1.1: Add the canonical Pro capability policy

**Files:**
- Add: `src/domain/proAccessPolicy.ts`
- Add: `src/domain/proAccessPolicy.test.ts`
- Modify: `src/services/paywall.ts`
- Modify: `src/features/paywall/PaywallDrawer.tsx`
- Modify: `src/features/paywall/PaywallContent.test.tsx`
- Modify: `src/features/paywall/PaywallInterstitialScreen.test.tsx`
- Modify: `src/features/paywall/FEATURE.md`

- [ ] Write failing tests proving the paid list is exhaustive, every paid capability has one contextual reason, and old structural reasons are rejected.

- [ ] Add this pure contract:

```ts
export const PRO_CAPABILITIES = [
  'connected_money',
  'cook_mode',
  'family_screen_time',
  'ai_scheduling',
  'advanced_cloud_ai',
  'ai_attachment_analysis',
  'live_conversation',
  'background_ai',
  'external_agent',
] as const;

export type ProCapability = typeof PRO_CAPABILITIES[number];

export type ProAccessDecision =
  | { allowed: true }
  | { allowed: false; reason: PaywallReason };

export function decideProAccess(
  capability: ProCapability,
  isPro: boolean,
): ProAccessDecision;
```

- [ ] Replace `PaywallReason` with only current commercial reasons:

```ts
export type PaywallReason =
  | 'cloud_ai_quota_exceeded'
  | 'pro_only_connected_money'
  | 'pro_only_cook_mode'
  | 'pro_only_family_screen_time'
  | 'pro_only_ai_scheduling'
  | 'pro_only_advanced_cloud_ai'
  | 'pro_only_ai_attachment_analysis'
  | 'pro_only_live_conversation'
  | 'pro_only_background_ai'
  | 'pro_only_external_agent';
```

- [ ] Add contextual drawer copy for those reasons. Copy must promise the full Kwilt Pro trial only when live StoreKit eligibility is `eligible`; otherwise it must say `Subscribe to Kwilt Pro` and show the live price/cadence.

- [ ] Do not put `isPro` checks in free feature screens. Paid callers ask the central policy for a decision immediately before the paid action.

- [ ] Run and commit:

```bash
npm test -- --runInBand src/domain/proAccessPolicy.test.ts src/features/paywall/PaywallContent.test.tsx src/features/paywall/PaywallInterstitialScreen.test.tsx
git add src/domain/proAccessPolicy.ts src/domain/proAccessPolicy.test.ts src/services/paywall.ts src/features/paywall/PaywallDrawer.tsx src/features/paywall/PaywallContent.test.tsx src/features/paywall/PaywallInterstitialScreen.test.tsx src/features/paywall/FEATURE.md
git diff --cached --check
git commit -m "refactor(monetization): centralize Pro capability policy"
```

### Task 1.2: Add a ratchet that prevents retired gates from returning

**Files:**
- Add: `scripts/monetization-gate-contract.test.mjs`
- Modify: `package.json`

- [ ] Write a Node test that recursively scans production source and fails when any retired reason or count-limit constant appears outside migration/history fixtures. Ban:

```text
limit_goals_per_arc
limit_arcs_total
pro_only_unsplash_banners
pro_only_calendar_export
pro_only_focus_mode
pro_only_attachments
pro_only_views_filters
pro_only_streak_shields
pro_only_additional_financial_institution
FREE_ARC_LIMIT
FREE_GOALS_PER_ARC_LIMIT
```

- [ ] Add positive assertions that `PRO_CAPABILITIES` contains exactly the nine paid IDs and that `PaywallReason` has a mapping for each.

- [ ] Wire this test into `architecture:lint`, keeping the existing architecture test first.

- [ ] Verify the test initially fails against the current source, then leave it red until Project 2 removes every legacy gate. Commit the test with Project 2.4, not while the branch is intentionally red.

## Project 2 — Remove every original-system and free-capability gate

### Task 2.1: Remove Arc and Goal count enforcement from all creation paths

**Files:**
- Delete or reduce to non-commercial utilities: `src/domain/limits.ts`
- Modify: `src/domain/limits.test.ts`
- Modify: `src/features/onboarding/IdentityAspirationFlow.tsx`
- Modify: `src/features/onboarding/IdentityAspirationFlow.test.tsx`
- Modify: `src/features/goals/GoalsScreen.tsx`
- Modify: `src/features/ai/AiChatScreen.tsx`
- Modify: `src/features/arcs/ArcsScreen.tsx`
- Modify: `src/features/unifiedChat/arcProposalExecutor.ts`
- Modify: `src/features/unifiedChat/arcProposalExecutor.test.ts`
- Modify: `src/store/useAppStore.lifecycle.test.ts`
- Modify: `src/features/dev/DevToolsScreen.tsx`
- Modify any Chapter nomination call sites found by the retired-gate ratchet.

- [ ] Change tests first so signed-out and Free identities can create a second Arc, a fourth Goal in one Arc, and accept equivalent AI/Chapter proposals without opening a paywall.

- [ ] Delete the preflight branches and limit copy. Preserve validation unrelated to monetization: required fields, duplicate handling, ownership, archived state, and database errors.

- [ ] Search again after implementation:

```bash
rg -n "FREE_ARC_LIMIT|FREE_GOALS_PER_ARC_LIMIT|limit_arcs_total|limit_goals_per_arc|chapter_(arc|goal)_nomination" src scripts
```

Expected result: no production call sites; only intentional historical test strings in the ratchet if encoded there.

- [ ] Run focused tests and commit:

```bash
npm test -- --runInBand src/domain/limits.test.ts src/features/onboarding/IdentityAspirationFlow.test.tsx src/features/unifiedChat/arcProposalExecutor.test.ts src/store/useAppStore.lifecycle.test.ts
git add -p src/domain/limits.ts src/domain/limits.test.ts src/features/onboarding/IdentityAspirationFlow.tsx src/features/onboarding/IdentityAspirationFlow.test.tsx src/features/goals/GoalsScreen.tsx src/features/ai/AiChatScreen.tsx src/features/arcs/ArcsScreen.tsx src/features/unifiedChat/arcProposalExecutor.ts src/features/unifiedChat/arcProposalExecutor.test.ts src/store/useAppStore.lifecycle.test.ts src/features/dev/DevToolsScreen.tsx
git diff --cached --check
git commit -m "feat(free): remove Arc and Goal limits"
```

### Task 2.2: Make views, Focus, banners, streak recovery, and calendar export free

**Files:**
- Modify: `src/store/proToolsAccess.ts`
- Modify: `src/store/useCelebrationStore.ts`
- Modify: `src/store/useCelebrationStore.sound.test.ts`
- Modify: `src/features/activities/useActivityFocusController.ts`
- Modify: `src/features/activities/useActivityFocusController.test.tsx`
- Modify: `src/features/activities/useStandaloneFocusController.ts`
- Modify: `src/features/activities/useStandaloneFocusController.test.tsx`
- Modify relevant Activities, Activity Detail, Goal Detail, Arc Detail, Plan slot/quick-add, banner-sheet, view/filter/sort, and calendar-export call sites found by `rg`.

- [ ] Write focused regressions proving a Free identity can select every Focus duration, create/save multiple views, filter/sort, choose/search banners, recover a streak, and export to calendar without touching `usePaywallStore`.

- [ ] Remove Pro branches rather than returning `true` from a misleading `canUseProTool` helper. Delete unused access selectors and trial-preview state after their last caller is gone.

- [ ] Preserve OS permission prompts for calendar, notifications, and media. Those are platform permissions, not subscription gates.

- [ ] Run affected Jest tests selected from the changed call sites, then search:

```bash
rg -n "pro_only_(unsplash_banners|calendar_export|focus_mode|views_filters|streak_shields)|focus_mode" src
```

Expected result: zero production matches.

- [ ] Commit only this free-capability slice:

```bash
git add -p src/store/proToolsAccess.ts src/store/useCelebrationStore.ts src/store/useCelebrationStore.sound.test.ts src/features/activities
git diff --cached --check
git commit -m "feat(free): open original Kwilt tools"
```

### Task 2.3: Make attachments free without weakening security limits

**Files:**
- Modify: `src/services/attachments/activityAttachments.ts`
- Modify or add its focused Jest test.
- Modify: `supabase/functions/attachments-init-upload/index.ts`
- Modify: `supabase/functions/attachments-get-download-url/index.ts`
- Modify: `supabase/functions/attachments-delete/index.ts`
- Modify: `supabase/functions/attachments-set-share/index.ts`
- Add: `supabase/functions/_shared/activityAttachmentAuthorization.ts`
- Add: `supabase/functions/_shared/__tests__/activityAttachmentAuthorization_deno_test.ts`

- [ ] Write tests proving Free users may initialize, read, share, and delete their own attachments, while unauthenticated requests, non-owners, oversized files, disallowed content types, and expired upload intents are rejected.

- [ ] Extract duplicated auth/ownership/size policy into `activityAttachmentAuthorization.ts`. Delete `requirePro`, `is_pro`, `is_pro_tools_trial`, and any trust-header bypass from all four functions.

- [ ] Keep the universal attachment limits explicit constants shared by initialization tests. Do not make limits depend on subscription state.

- [ ] Run and commit:

```bash
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/activityAttachmentAuthorization_deno_test.ts
npm run lint:supabase-functions
rg -n "pro_only_attachments|requirePro|is_pro_tools_trial|x-kwilt-is-pro" src/services/attachments supabase/functions/attachments-*
git add src/services/attachments supabase/functions/_shared/activityAttachmentAuthorization.ts supabase/functions/_shared/__tests__/activityAttachmentAuthorization_deno_test.ts supabase/functions/attachments-init-upload supabase/functions/attachments-get-download-url supabase/functions/attachments-delete supabase/functions/attachments-set-share
git diff --cached --check
git commit -m "feat(free): make secure attachments available to everyone"
```

### Task 2.4: Close the free-feature ratchet

**Files:**
- Add: `scripts/monetization-gate-contract.test.mjs`
- Modify: `package.json`
- Modify: `docs/feature-briefs/monetization-paywall-revenuecat.md` only if implementation revealed a contract correction.

- [ ] Run the ratchet and all retired-gate searches. The test must now pass.

```bash
node --test scripts/monetization-gate-contract.test.mjs
npm run architecture:lint
npm run product:lint
```

- [ ] Manually use a clean Free identity in Simulator to create two Arcs, four Goals in one Arc, multiple To-dos/views, a long Focus session, a banner, and an attachment. Record exact build/Metro provenance and results in the rollout proof matrix.

- [ ] Run the project completion gate once and commit:

```bash
npm run verify:changed -- --run
git add scripts/monetization-gate-contract.test.mjs package.json docs/feature-briefs/monetization-paywall-revenuecat.md docs/release/kwilt-pro-monetization-rollout.md
git diff --cached --check
git commit -m "test(monetization): prevent retired paywalls from returning"
```

## Project 3 — Collapse access to one full Pro entitlement and one honest trial

### Task 3.1: Retire `pro_tools_trial` while preserving `isPro`

**Files:**
- Modify: `src/services/entitlements.ts`
- Modify: `src/services/entitlements.test.ts`
- Modify: `src/store/useEntitlementsStore.ts`
- Modify: `src/store/useEntitlementsStore.test.ts`
- Modify: `src/services/entitlementsAuthSync.ts`
- Modify: `src/services/entitlementsAuthSync.test.ts`
- Modify: `supabase/functions/_shared/serverAgentEntitlement.ts`
- Modify: `supabase/functions/_shared/__tests__/serverAgentEntitlement.test.ts`
- Modify: `supabase/functions/pro-codes/index.ts`

- [ ] Change tests so access is the union of active RevenueCat `pro` and active internal `is_pro` support grants. `is_pro_tools_trial` alone must not grant access.

- [ ] Remove `isProToolsTrial` from `EntitlementsSnapshot`, Zustand state, selectors, auth-sync payloads, fixtures, and UI. Bump the entitlement cache key from v1 to v2 so stale partial-trial state is not restored.

- [ ] Preserve an internal admin `trial` action only if it writes a time-bounded full `is_pro = true` support grant. Do not expose it as a second client tier.

- [ ] Leave the historical database column and migration in place for non-destructive compatibility; stop selecting or writing it in active code. A later cleanup migration may drop it after production evidence confirms no dependency.

- [ ] Verify and commit:

```bash
npm test -- --runInBand src/services/entitlements.test.ts src/store/useEntitlementsStore.test.ts src/services/entitlementsAuthSync.test.ts supabase/functions/_shared/__tests__/serverAgentEntitlement.test.ts
rg -n "isProToolsTrial|pro_tools_trial|is_pro_tools_trial" src supabase/functions --glob '!**/__tests__/**'
```

Expected result: no active client/server access use; only explicit legacy rejection or migration history.

```bash
git add src/services/entitlements.ts src/services/entitlements.test.ts src/store/useEntitlementsStore.ts src/store/useEntitlementsStore.test.ts src/services/entitlementsAuthSync.ts src/services/entitlementsAuthSync.test.ts supabase/functions/_shared/serverAgentEntitlement.ts supabase/functions/_shared/__tests__/serverAgentEntitlement.test.ts supabase/functions/pro-codes/index.ts
git diff --cached --check
git commit -m "refactor(entitlements): use one full Pro access state"
```

### Task 3.2: Make introductory-trial copy depend on live StoreKit eligibility

**Files:**
- Modify: `src/services/entitlements.ts`
- Modify: `src/services/entitlements.test.ts`
- Modify: `src/features/account/ManageSubscriptionScreen.tsx`
- Add or modify: `src/features/account/ManageSubscriptionScreen.test.tsx`
- Modify: `src/features/paywall/PaywallDrawer.tsx`
- Modify: `src/features/paywall/PaywallContent.test.tsx`

- [ ] Extend the dynamically loaded RevenueCat surface with `checkTrialOrIntroductoryPriceEligibility(productIdentifiers)` and normalize its numeric values without assuming an intro price means the person is eligible.

```ts
export type IntroEligibility =
  | 'eligible'
  | 'ineligible'
  | 'unknown'
  | 'no_offer';

export type ProSkuPricing = {
  sku: string;
  priceString?: string;
  currencyCode?: string;
  introPrice?: ProIntroPrice;
  introEligibility: IntroEligibility;
};
```

- [ ] Call eligibility once for all product identifiers returned by the current offering. Map RevenueCat `ELIGIBLE`, `INELIGIBLE`, `UNKNOWN`, and `NO_INTRO_OFFER_EXISTS` explicitly; fail to `unknown` on SDK error.

- [ ] Display `Start one month free` and trial legal copy only for `eligible`. For `unknown`, `ineligible`, or `no_offer`, display `Subscribe` with the live price and cadence. Do not manufacture a price when StoreKit data is absent.

- [ ] Fire `free_trial_started` only when the successful purchased package was eligibility-confirmed before purchase and CustomerInfo now shows active `pro`. All purchase paths still emit `purchase_started` and `purchase_succeeded` with reason/source/product/cadence.

- [ ] Tests must cover all four eligibility states, offering absence, eligibility-call failure, monthly/annual products, and the same behavior in contextual and Settings purchase entry.

- [ ] Verify and commit:

```bash
npm test -- --runInBand src/services/entitlements.test.ts src/features/account/ManageSubscriptionScreen.test.tsx src/features/paywall/PaywallContent.test.tsx
git add src/services/entitlements.ts src/services/entitlements.test.ts src/features/account/ManageSubscriptionScreen.tsx src/features/account/ManageSubscriptionScreen.test.tsx src/features/paywall/PaywallDrawer.tsx src/features/paywall/PaywallContent.test.tsx
git diff --cached --check
git commit -m "feat(subscriptions): show only eligible introductory trials"
```

### Task 3.3: Configure and verify the single Apple subscription group

**Files:**
- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] In App Store Connect, verify `pro_monthly`, `pro_annual`, `pro_family_monthly`, and `pro_family_annual` are in one subscription group and each has a one-month introductory free trial for intended storefronts.

- [ ] Verify Apple Family Sharing is enabled only for the two Family products. Confirm all four products attach to RevenueCat entitlement `pro`; keep supported legacy Money products mapped to `pro` until no active customer needs them.

- [ ] Confirm current prices rather than changing them: Individual $9.99 monthly / $59.99 annual; Family $14.99 monthly / $79.99 annual. Record storefront screenshots or dashboard export references in the proof matrix without adding account secrets.

- [ ] Verify on a Sandbox Apple ID that the purchase sheet presents the payment confirmation, the introductory period activates normal `pro`, and restore works after reinstall. Record signed binary/build provenance.

## Project 4 — Make AI access and credits match the work requested

### Task 4.0: Inventory every model/provider call before changing quota semantics

**Files:**
- Add: `docs/architecture/ai-service-billing-inventory.md`
- Add: `scripts/ai-service-billing-contract.test.mjs`
- Modify: `package.json`
- Inspect and classify every provider caller under `src/`, `packages/`, and `supabase/functions/`.

- [ ] Build the inventory from source, not feature names. Start with:

```bash
rg -n "api\.openai\.com|OPENAI_API_KEY|chat/completions|responses|transcriptions|audio/speech|realtime" src packages supabase/functions --glob '*.ts' --glob '*.tsx'
```

- [ ] Record an owner, authenticated identity, initiating user action, access class, user-credit owner, and server enforcement point for every provider operation. Apply these decisions to the current non-`ai-chat` entry points:

| Provider operation | Access | User-credit treatment |
| --- | --- | --- |
| Recipe import/update assistance and AI view creation | Free | One standard cloud credit for the successful parent user action |
| Story game generation | Free | One standard cloud credit for the successful parent user action; Games itself remains free |
| Unified Chat transcription, title, summary, routing, and judgment helpers | Inherit parent action | Internal zero-credit components; never double-charge the parent turn |
| Chapter/Heart deep synthesis | Pro | One credit for the successful parent advanced-cloud action |
| Connected-transaction classification | Pro through connected Money | Internal zero-credit component of paid sync; no second credit |
| Cook voice speech | Pro through Cook Mode | Internal zero-credit component of Cook Mode |
| Live Conversation session/provider initialization | Pro | Session access gate; usage telemetry is separate from monthly action credits |
| Recipe editorial enrichment and recipe image administration | Internal admin | No customer entitlement or user credit; service authorization required |
| Phone/background agent delivery and external agent model work | Pro | Charge once at the parent background/external action when applicable |

- [ ] If the scan finds another provider path, classify and add it to the inventory in this task before implementation proceeds. This is an exhaustive source-discovery step, not an open product decision.

- [ ] Add a contract test that fails when a production provider caller lacks a nearby canonical job/operation policy reference. Allow an explicit, reviewed admin-only exemption list in the test; do not allow a generic directory exemption.

- [ ] Add the contract to `architecture:lint`. Run it red against the baseline and close every finding through Tasks 4.1–4.3 before committing it.

### Task 4.1: Add access and billing classes to generation-job contracts

**Files:**
- Modify: `packages/kwilt-agent-runtime/src/generationJobContracts.ts`
- Modify: `packages/kwilt-agent-runtime/src/generationJobContracts.test.ts`
- Modify: `packages/kwilt-agent-runtime/src/index.ts`
- Modify: `src/services/coachChatCreditPolicy.ts`
- Modify its focused test.

- [ ] Write failing tests requiring every job to declare both `access` and `billingClass` and preventing a local-eligible job from being classified as a required paid cloud action.

```ts
export type KwiltGenerationAccess = 'free' | 'pro';
export type KwiltGenerationBillingClass =
  | 'user_cloud_credit'
  | 'local_unmetered'
  | 'internal_unmetered';
```

- [ ] Apply this canonical mapping:

| Job | Access | Billing class |
| --- | --- | --- |
| `arc_generation`, `goal_generation`, `activity_generation`, `story_game`, `default_chat` | Free | `user_cloud_credit` |
| `arc_image_query`, `conversation_summary`, `lightweight_helper`, `agent_judgment` | Free | `internal_unmetered` |
| `deep_planning`, `current_information`, `unified_chat_attachment` | Pro | `user_cloud_credit` |
| `chat_rewrite`, `chat_proofread`, `chat_shorten`, `chat_summarize`, `chat_brainstorm`, `thread_title` | Free | `local_unmetered` |

- [ ] Treat `agent_judgment` as an internal component; the parent user request determines access. Treat `arc_image_query` as free banner infrastructure, not an advanced AI feature.

- [ ] Ensure any new generation job fails tests until its access and billing class are intentionally assigned.

- [ ] Verify and commit:

```bash
npm test -- --runInBand packages/kwilt-agent-runtime/src/generationJobContracts.test.ts src/services/coachChatCreditPolicy.test.ts
git add packages/kwilt-agent-runtime/src/generationJobContracts.ts packages/kwilt-agent-runtime/src/generationJobContracts.test.ts packages/kwilt-agent-runtime/src/index.ts src/services/coachChatCreditPolicy.ts src/services/coachChatCreditPolicy.test.ts
git diff --cached --check
git commit -m "feat(ai): classify generation access and billing"
```

### Task 4.2: Keep local completion and Kwilt-selected fallback at zero credits

**Files:**
- Modify: `src/features/unifiedChat/turnExecutionPhase.ts`
- Modify its focused test.
- Modify: `src/services/ai.ts`
- Modify its focused test.
- Modify: `src/domain/generativeCredits.ts`
- Modify: `src/domain/generativeCredits.test.ts`
- Modify: `src/store/useAppStore.ts`
- Modify credit-related store tests.

- [ ] Add an explicit execution result from the local router:

```ts
type GenerationRouteResult =
  | { route: 'local'; userCreditCost: 0 }
  | { route: 'cloud_fallback'; userCreditCost: 0; fallbackReason: string }
  | { route: 'cloud'; userCreditCost: 1 };
```

- [ ] When local succeeds, do not call the cloud meter. When local is unavailable, unsupported, or rejected by a quality gate, request fallback with the original canonical job ID. A user cancellation returns cancelled and never falls back.

- [ ] Do not pretend the server can prove that an untrusted client attempted local execution. The server derives zero-credit treatment from the canonical job's `local_unmetered` class, not from the client-provided fallback reason. This makes cloud execution of those narrowly scoped jobs sponsored under universal burst/abuse controls; the client reason is telemetry only.

- [ ] Remove authoritative client decrement from `tryConsumeGenerativeCredit`. Keep a server-returned quota snapshot for display and optimistic CTA state only.

- [ ] Replace `pro_tools_trial: 200` with only Free 50 and Pro 1,000. Month boundaries use one server UTC calendar month definition everywhere.

- [ ] Add tests for local success, unsupported hardware fallback, locale fallback, native error fallback, quality rejection fallback, user cancellation, explicit standard cloud action, hard-Pro job, and retry/regenerate.

- [ ] Verify and commit:

```bash
npm test -- --runInBand src/domain/generativeCredits.test.ts src/features/unifiedChat/turnExecutionPhase.test.ts src/services/ai.test.ts src/store/useAppStore.lifecycle.test.ts
git add src/features/unifiedChat/turnExecutionPhase.ts src/features/unifiedChat/turnExecutionPhase.test.ts src/services/ai.ts src/services/ai.test.ts src/domain/generativeCredits.ts src/domain/generativeCredits.test.ts src/store/useAppStore.ts src/store/useAppStore.lifecycle.test.ts
git diff --cached --check
git commit -m "fix(ai): keep local routing free of cloud credits"
```

### Task 4.3: Make server entitlement and successful-result quota authoritative

**Files:**
- Add: `supabase/functions/_shared/proEntitlement.ts`
- Add: `supabase/functions/_shared/__tests__/proEntitlement_deno_test.ts`
- Add: `supabase/functions/_shared/generationBillingPolicy.ts`
- Add: `supabase/functions/_shared/__tests__/generationBillingPolicy_deno_test.ts`
- Modify: `supabase/functions/ai-chat/index.ts`
- Create with CLI: migration `ai_generation_usage_ledger`
- Add: `src/services/analytics/events.ts` event/property additions.

- [ ] Write entitlement tests for authenticated internal grant, authenticated RevenueCat mirror, install mapping, expired record, grace-active record, missing identity, and a forged `x-kwilt-is-pro: true` header.

- [ ] Resolve Pro as the union of a non-expired internal `kwilt_pro_entitlements.is_pro` grant and active/grace RevenueCat mirror state, keyed from the verified JWT user and trusted install mapping. Never use a request-header boolean for authorization.

- [ ] Create the migration through the CLI:

```bash
npx supabase migration new ai_generation_usage_ledger
```

- [ ] Add a private/service-only usage ledger with stable request ID, identity key, job ID, billing class, route, success state, user-credit cost, provider request ID, UTC month, and timestamps. Add a unique constraint on `(identity_key, request_id)` so retries are idempotent. Revoke anon/authenticated table access; expose only narrowly scoped service functions/RPCs.

- [ ] Implement atomic reserve/finalize semantics: reserve checks the applicable 50/1,000 successful-action limit plus a small concurrent in-flight bound; finalize success sets cost 1; finalize failure/cancellation sets cost 0. Expired reservations become failed cost-0 through reconciliation. Do not increment the monthly successful count before usable output exists.

- [ ] Derive access and billing class from the shared job ID. Reject unknown jobs. Reject Free users before provider initialization for `access: 'pro'`. Honor `local_unmetered` cloud execution at cost 0 because the server recognizes that exact job class; never honor a client-declared billing override.

- [ ] Add per-identity and per-install burst controls to sponsored cloud execution without describing them as a paid limit. Log route, job, provider, untrusted fallback reason, entitlement, and final user-credit cost.

- [ ] Verify migration security and Deno behavior:

```bash
npx supabase db reset
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/proEntitlement_deno_test.ts supabase/functions/_shared/__tests__/generationBillingPolicy_deno_test.ts
npm run lint:supabase-functions
```

- [ ] Attempt direct forged-header and duplicate-request calls against local Supabase. Expected: forged Pro denied, duplicate returns original ledger result, failed provider result costs zero.

- [ ] Run `npm run verify:changed -- --run` once, then commit the project.

- [ ] Close and commit `scripts/ai-service-billing-contract.test.mjs`, its `architecture:lint` wiring, and `docs/architecture/ai-service-billing-inventory.md` only after every discovered provider caller has an enforced classification.

## Project 5 — Gate connected Money from the first provider call and stop cost after expiry

### Task 5.1: Gate the first Link path while leaving Manual Money free

**Files:**
- Modify: `src/capabilities/money/domain/moneyOnboardingAssessment.ts`
- Modify: `src/capabilities/money/domain/moneyOnboardingAssessment.test.ts`
- Modify: `src/capabilities/money/screens/MoneySetupScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneySetupScreen.test.tsx`
- Modify: `src/capabilities/money/data/moneyPlaidApi.ts`
- Modify: `src/capabilities/money/data/moneyPlaidApi.test.ts`
- Modify downloaded Plaid Edge Functions from Task 0.2.
- Add focused Deno authorization tests beside each function.

- [ ] Replace `getAdditionalInstitutionDecision` with a first-connection decision:

```ts
export function getConnectedMoneyAccessDecision(isPro: boolean):
  | 'open_connection'
  | 'offer_pro' {
  return isPro ? 'open_connection' : 'offer_pro';
}
```

- [ ] Gate before calling `createMoneyPlaidLinkToken` or initializing native Plaid Link. Use `pro_only_connected_money` whether this is the first or tenth institution. Pro has no numeric account/institution cap.

- [ ] Keep manual-account, manual-transaction, plan, category, correction, read, and export paths independent of this decision.

- [ ] In `create-plaid-link-token`, `exchange-plaid-public-token`, and `sync-plaid-transactions`, verify caller identity and server-resolved Pro before any Plaid request. Relink and manual/automatic refresh use the same check.

- [ ] Tests must prove the UI gate happens before Link-token invocation and direct Edge calls by Free/forged clients return 403 without calling Plaid.

- [ ] Run focused Jest/Deno tests and commit as one enforcement slice.

### Task 5.2: Make RevenueCat webhook lifecycle idempotent and period-correct

**Files:**
- Add: `supabase/functions/_shared/revenueCatSubscriptionLifecycle.ts`
- Add: `supabase/functions/_shared/__tests__/revenueCatSubscriptionLifecycle_deno_test.ts`
- Modify: `supabase/functions/pro-codes/index.ts`
- Create with CLI: migration `revenuecat_subscription_lifecycle`
- Modify: `supabase/functions/_shared/founderAlerts.ts` and tests only as required by normalized events.

- [ ] Extract a pure reducer and write tests for initial purchase, renewal, cancellation with future expiry, uncancellation, product change, subscription extension, billing issue with grace, grace recovery, expiration, refund, duplicate event, older out-of-order event, and RevenueCat `TEST`.

- [ ] Apply these exact rules:

```text
INITIAL_PURCHASE / RENEWAL / UNCANCELLATION / PRODUCT_CHANGE / SUBSCRIPTION_EXTENDED
  => active when provider dates say active
CANCELLATION
  => will_renew=false; access remains through expiration
BILLING_ISSUE
  => access remains only through configured grace expiration
EXPIRATION / REFUND
  => access=false
TEST
  => record only; never grant Pro
```

- [ ] Create the migration:

```bash
npx supabase migration new revenuecat_subscription_lifecycle
```

- [ ] Add `kwilt_revenuecat_webhook_events` with provider event ID unique, environment, occurred/received timestamps, type, app user ID, product ID, raw payload, and processing result. Extend the subscription mirror with `subscription_state`, `will_renew`, `period_type`, `environment`, `last_event_id`, provider occurrence time, expiration, and grace expiration.

- [ ] Enable RLS, revoke anon/authenticated access to webhook events and mirror writes, and grant only service-role access. Record all duplicates safely; do not let an older event regress newer mirror state.

- [ ] Make webhook authorization secret mandatory. Missing server configuration or a mismatched `Authorization` header returns an error before parsing/mutation.

- [ ] Keep the current webhook URL stable unless RevenueCat is updated in the same controlled operation. The route may remain under `pro-codes`; lifecycle logic belongs in the shared reducer.

- [ ] Reset local DB, run Deno tests, replay the same event twice, replay expiration before an older renewal, and inspect the mirror/event ledger.

### Task 5.3: Disconnect Plaid only after confirmed entitlement expiry

**Files:**
- Create with CLI: migration `money_connected_entitlement_lifecycle`
- Add: `supabase/functions/_shared/connectedMoneyLifecycle.ts`
- Add: `supabase/functions/_shared/__tests__/connectedMoneyLifecycle_deno_test.ts`
- Add: `supabase/functions/reconcile-connected-money-entitlements/index.ts`
- Add: `supabase/functions/reconcile-connected-money-entitlements/config.toml`
- Modify: `supabase/functions/pro-codes/index.ts`
- Modify: `src/capabilities/money/data/moneyRepository.ts`
- Modify: `src/capabilities/money/data/moneyRepository.test.ts`
- Modify connected-Money presentation screens and tests.

- [ ] Create the migration through the CLI. Extend existing deployed connection state rather than recreating Money tables: support `paused` and `disconnected`, `last_successful_sync_at`, `disconnected_at`, and `disconnect_reason`. Add a private, service-only RPC that deletes the Plaid access token after provider removal while preserving public account/transaction rows.

- [ ] If the checked-in migrations do not contain the live Money tables/RPCs, run `npx supabase db pull` into a reviewed migration first. Inspect the diff and split unrelated hosted drift before continuing.

- [ ] Implement a service-secret-only reconciliation function that finds connected items whose trusted entitlement is confirmed expired/refunded, calls Plaid `/item/remove`, deletes the private token after a successful or provider-already-removed result, and marks the connection disconnected. Retry transient Plaid failures idempotently.

- [ ] Cancellation with future expiration and active billing grace do not enqueue cleanup. Webhook expiration may enqueue/reconcile immediately; a scheduled hourly backstop must find missed work. Use an explicit internal secret for the cron call and `verify_jwt = false` only because the function verifies that secret itself.

- [ ] Do not delete `budget_financial_accounts`, `budget_transactions`, categorization, corrections, plans, or exports. Client projection shows `Connection paused`, last successful refresh, and `Reconnect with Pro`; stale data remains editable and readable.

- [ ] Releasing provider cost is irreversible from the app's perspective and may require Link again. Before enabling the scheduled job in production, reconcile the known production subscriber and record evidence in the rollout matrix.

- [ ] Test active, cancelled-active, grace-active, expired, refunded, already-removed, transient Plaid failure, duplicate cleanup, and resubscribe/relink cases.

- [ ] Run local DB reset, focused Deno/Jest tests, Supabase lint, and `npm run verify:changed -- --run` once. Commit lifecycle behavior before any hosted deployment.

## Project 6 — Gate Cook Mode and family Screen Time without harming downgrade safety

### Task 6.1: Gate every Cook Mode entry while allowing an active session to finish

**Files:**
- Add: `src/capabilities/recipes/domain/cookModeAccess.ts`
- Add: `src/capabilities/recipes/domain/cookModeAccess.test.ts`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`
- Modify relevant Recipe Home tests.
- Modify: `src/capabilities/recipes/screens/RecipeReadinessScreen.tsx`
- Add or modify its test.
- Modify: `src/capabilities/recipes/screens/RecipeCookModeScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeCookModeScreen.test.tsx`
- Modify: `src/capabilities/recipes/runtime/useRecipeCookSession.ts`
- Add its focused hook test.

- [ ] Write the pure downgrade policy first:

```ts
export type CookModeAccess =
  | 'full'
  | 'finish_active_session'
  | 'paywall';

export function decideCookModeAccess(input: {
  isPro: boolean;
  hasMatchingActiveSession: boolean;
}): CookModeAccess;
```

- [ ] A Pro user can start/resume. A downgraded user may open only the matching `active` or `paused` cached session and complete/save/exit it. A completed session does not grant a new resume. A Free user with no matching active session gets `pro_only_cook_mode`.

- [ ] Apply the decision at `RecipeHomeScreen.openCook`, the Readiness `Start cooking` action, direct/deep-linked `RecipeCookModeScreen`, and immediately before `useRecipeCookSession.start()` creates/persists a new session.

- [ ] Recipe details, ingredients, full written method, scaling, Meal Plan, Groceries, sharing, history, and editing remain free. Do not gate the Food navigator or Recipe Home.

- [ ] Tests must cover normal start, active resume, downgrade finish, completed-session denial, mismatched-recipe denial, readiness bypass, and deep link.

- [ ] Run focused tests, record Simulator behavior, and commit.

### Task 6.2: Keep personal Screen Time free and gate family administration at mutation boundaries

**Files:**
- Add: `src/features/household/screenTime/familyScreenTimeAccess.ts`
- Add: `src/features/household/screenTime/familyScreenTimeAccess.test.ts`
- Modify: `src/features/household/HouseholdSettingsScreen.tsx`
- Modify: `src/features/household/HouseholdSettingsScreen.test.tsx`
- Modify: `src/features/household/screenTime/FamilyScreenTimeLearningScreen.tsx`
- Modify: `src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx`
- Modify: `src/features/household/screenTime/familyScreenTimeCommands.ts`
- Modify: `src/features/household/screenTime/familyScreenTimeCommands.test.ts`
- Create with CLI: migration `family_screen_time_pro_enforcement`
- Modify: `src/features/household/screenTime/data/familyScreenTimeMigration.test.ts`
- Verify unchanged personal path: `src/features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderScreen.tsx`
- Modify its test only to add a Free-access regression.

- [ ] Define actions as `read`, `release`, `disable`, `create`, `tighten`, `extend`, and `temporary_override`. The policy allows `read`, `release`, and `disable` for everyone with caregiver authority; the remaining family-admin actions require Pro.

- [ ] Gate before navigating from Household settings and again in `FamilyScreenTimeLearningScreen` so restored navigation/deep links cannot initialize setup as Free. Use `pro_only_family_screen_time`.

- [ ] Create the migration with a private entitlement helper based on `auth.uid()` plus the trusted RevenueCat/internal union. Add Pro assertions to creation/tightening RPCs, including selection, agreement activation/change, prerequisite agreement, allow/block override, and access-request approval that extends control.

- [ ] Do not add the assertion to snapshot/read, override cancellation, agreement deactivation, device release, or other safety-reducing RPCs. Preserve existing caregiver/membership authorization independently of payment.

- [ ] Add a regression proving `PersonalScreenTimeRuleBuilderScreen` works for a Free identity and never opens the family paywall.

- [ ] Reset local DB and test direct RPC attempts as Pro, Free, expired, cancelled-active, and grace-active caregivers. Run focused Jest, migration-contract tests, Supabase lint, then commit.

## Project 7 — Update paywall value, analytics, and downgrade presentation

### Task 7.1: Replace the old unlimited-structure sales story

**Files:**
- Modify: `src/features/account/ManageSubscriptionScreen.tsx`
- Modify: `src/features/account/ManageSubscriptionScreen.test.tsx`
- Modify: `src/features/paywall/PaywallDrawer.tsx`
- Modify: `src/features/paywall/PaywallContent.test.tsx`
- Modify any onboarding/account copy snapshots that still promise paid Arcs/Goals/views.

- [ ] Replace `Unlimited arcs + goals` and other retired-gate bullets with the paid bundle: connected Money, Cook Mode, family Screen Time, advanced AI, Live/background intelligence, and 1,000 cloud actions.

- [ ] Explain the Individual/Family distinction only as Apple Family Sharing. Do not imply Family unlocks different Kwilt features or limits household membership.

- [ ] Contextual paywalls lead with the intent that opened them, then say the trial unlocks all Pro. Always expose Restore Purchases and Manage Subscription.

- [ ] Add snapshot/copy-contract assertions that free features are absent from the paid-value list.

### Task 7.2: Add lifecycle and unit-economics analytics without double counting

**Files:**
- Modify: `src/services/analytics/events.ts`
- Modify purchase/paywall analytics tests.
- Modify: `supabase/functions/_shared/founderAlerts.ts`
- Modify: `supabase/functions/_shared/__tests__/founderAlerts.test.ts`
- Modify Money and AI analytics call sites from Projects 4 and 5.

- [ ] Add or normalize these events: `trial_converted`, `trial_expired`, `subscription_renewed`, `subscription_cancelled`, `subscription_expired`, `billing_issue_started`, `billing_grace_recovered`, `money_connection_paused`, `money_connection_disconnected`, and `ai_job_completed`.

- [ ] RevenueCat webhook identity owns lifecycle-event deduplication. Client purchase events own immediate UX funnel telemetry. Never emit `subscription_expired` from a stale client cache.

- [ ] Every paywall/purchase event includes reason, source, product, cadence, family-sharing selection, and intro eligibility. Every AI completion includes job, route, provider, billing class, fallback reason, entitlement state, and user-credit cost; never include prompt or financial content.

- [ ] Alert on webhook authorization failure, repeated event-processing failure, mirror/provider mismatch, Plaid cleanup terminal failure, and quota-ledger invariant violation. Do not page on ordinary cancellation.

- [ ] Run focused tests and commit.

## Project 8 — Reconcile, validate, and release without a percentage rollout

### Task 8.1: Prove the known production subscriber before enabling teardown

**Files:**
- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] In RevenueCat, locate the known production subscriber by approved app-user identifier and confirm product, entitlement, environment, purchase date, paid-through date, will-renew state, and current StoreKit ownership. Do not copy email, receipt, or transaction secrets into the repo.

- [ ] Replay or trigger an authenticated RevenueCat customer-state event into the webhook, then confirm exactly one event-ledger row, the expected subscription mirror row, and `isPro === true` in a signed production-config app.

- [ ] Confirm no cleanup candidate is created for the active subscriber. Only after this proof may the scheduled Plaid reconciliation job be enabled.

### Task 8.2: Run the full lifecycle matrix in Sandbox/TestFlight

**Files:**
- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] Verify these account states using distinct Sandbox identities where necessary: trial eligible, trial ineligible, active trial, paid renewal, cancellation before expiry, billing issue/grace, grace recovery, expiration, refund, restore, resubscribe, and Family Sharing recipient.

- [ ] For each state, verify client `isPro`, RevenueCat dashboard, event ledger, subscription mirror, contextual CTA, provider authorization, and downgrade behavior.

- [ ] Verify the Free corpus: unlimited Arcs/Goals/To-dos/views; attachments; Focus; banners; streak; calendar export; Food/Chores/Games/Explore; Manual Money; personal Screen Time; 50 successful standard cloud actions; unlimited locally completed AI.

- [ ] Verify the Pro corpus: first and additional Plaid links; sync/relink; Cook start/resume; family Screen Time creation/tightening; advanced AI; Live; 1,000-credit state.

- [ ] Verify direct boundary bypasses: deep links to Cook/family Screen Time, forged client Pro header, direct Plaid Edge calls, direct family RPCs, duplicate AI request ID, and duplicate/out-of-order RevenueCat webhook.

### Task 8.3: Final repository and release gates

**Files:**
- Modify: `docs/release/kwilt-pro-monetization-rollout.md`
- Modify: `docs/job-flows/job-flow-maya-move-family-life-forward.md` only if shipped behavior changes its delivery score/gaps.

- [ ] Run focused checks after each repaired failure, then one final diff-aware completion gate because the integration diff changed:

```bash
npm run product:lint
npm run architecture:lint
npm run lint
npm run lint:tests
npm run test:supabase-functions
npm run lint:supabase-functions
npm run verify:changed -- --run
git diff --check
```

- [ ] Review every migration for RLS enabled, anon/authenticated grants revoked unless deliberately required, service-only tables protected, and SECURITY DEFINER functions using an explicit safe `search_path`.

- [ ] Review the full diff for secrets, receipt/customer data, hardcoded trial eligibility, client-authoritative entitlement, deleted downgrade data, and accidental changes from the pre-existing dirty checkout.

- [ ] Update the relevant job-flow score/gaps only after signed-runtime and backend proof shows the new boundary is actually delivered.

- [ ] Commit and push only after all intended changes and evidence are reviewed. No percentage rollout is required, but deploy backend compatibility first, verify it, then ship the app binary. Do not enable Plaid cleanup until the server can safely serve both the current public app and the new build.

## Suggested deployment order

1. Deploy additive migrations, event ledger, subscription mirror fields, and backwards-compatible entitlement resolution.
2. Deploy the hardened RevenueCat webhook; reconcile the known production subscriber.
3. Deploy server AI metering while accepting the old app protocol as Free/legacy-safe telemetry, then verify new protocol in TestFlight.
4. Deploy Plaid server gates only when the public App Store build cannot accidentally call a newly paid path without contextual handling; otherwise ship the compatible app first and activate enforcement through a server flag after adoption.
5. Deploy family Screen Time mutation enforcement with safety-reducing exceptions.
6. Ship the iOS app that removes retired gates and adds new contextual gates.
7. Verify production purchase/restore and Free behavior.
8. Enable the scheduled Plaid expiration reconciler after subscriber reconciliation and webhook health proof.

## Definition of done

- Every acceptance criterion in `docs/feature-briefs/monetization-paywall-revenuecat.md` has a test or named runtime proof.
- The retired-gate architecture ratchet passes and production source contains no old structural/convenience paywall reason.
- `isPro` is unchanged as the client access signal; `pro_tools_trial` grants nothing.
- Client and server boundaries agree for connected Money, Cook Mode, family Screen Time, and advanced cloud AI.
- AI charging is successful-result, server-authoritative, idempotent, and route-aware.
- RevenueCat cancellation/grace/expiry semantics are correct under duplicate and out-of-order delivery.
- The known production subscriber is reconciled before any provider teardown is active.
- Free and Pro lifecycle matrices pass in Sandbox/TestFlight with signed binary and backend provenance recorded.
- Repository checks pass, and release evidence distinguishes source, local backend, Simulator, signed device, TestFlight, submission, and public release.
