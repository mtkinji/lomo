# Transparent Automatic Living Plan Implementation Plan

> Status: build-ready design plan. Execute in small verified slices; do not treat completion of one slice as authorization to expose automatic promotion broadly.

## Goal

Turn the onboarding living percentage into an account-backed, deterministic set of monthly category budgets that Kwilt safely maintains as account evidence changes, while keeping fixed commitments and user overrides stable and making every active change visible.

## Architecture

Keep classification, projection, comparison, and materiality as pure TypeScript domain modules. Persist normalized evidence and immutable plan versions in Supabase. Perform promotion/reversal through ownership-checked atomic RPCs. Existing product surfaces consume the active plan through a repository; they never compute a competing plan locally.

## Verification posture

Logic is test-first. Each domain slice begins with failing cases added to the existing smoke-test harness or a dedicated Node-executable allocator harness. Schema changes receive SQL security/atomicity checks. UI follows only after pure and persistence contracts pass.

## Slice 1 — Living target migration

**Files:**

- Modify `src/platform/onboarding.ts`
- Modify `src/features/onboarding/BudgetOnboardingFlow.tsx`
- Modify consumers in `app/(tabs)/index.tsx` and `app/app-control/[budgetId].tsx`
- Add focused cases to the relevant script under `scripts/`

**Contract:** Replace `IncomePlanTarget` with `LivingTargetIntent { livingPercent, provenance, updatedAtIso }`. Normalize legacy objects by retaining only `livingPercent`; never require or regenerate giving/saving fields. Keep 50–100 and 5-point increments.

**Proof:** legacy state migrates; arbitrary or corrupt values normalize safely; no UI or persisted type refers to an inverse percentage.

## Slice 2 — Canonical cashflow and source classification

**Files:**

- Extend `src/domain/budget-matching.ts` only for transaction-level canonical meaning
- Add `src/domain/planning-income.ts`
- Add `scripts/living-plan-smoke.mjs` and fixtures under `scripts/fixtures/living-plan/`
- Integrate normalized facts from `supabase/functions/_shared/plaid-sync.ts`

**Contract:** Produce independent `cashflowMeaning` and `planningRole` receipts. Implement precedence for user rules, canonical relationships, account context, counterparty, recurrence, and outliers. Source clusters carry evidence, confidence band, cadence, completed-period range, and policy version.

**Required red tests first:** payroll; commission; sparse gig income; stock liquidation into checking; brokerage withdrawal; repeated asset withdrawal; bonus outlier; gift; inheritance; loan; paired/unmatched transfer; matched refund; reimbursement; ambiguous deposit; conflicting provider label; remembered correction.

**Proof:** only eligible recurring/irregular receipts enter the resource basis; exceptional inflows remain excluded unless explicitly chosen.

## Slice 3 — Pure allocation candidate projector

**Files:**

- Add `src/domain/living-plan.ts`
- Add `src/domain/living-plan-categories.ts`
- Extend `scripts/living-plan-smoke.mjs`

**Contract:** Given normalized evidence, target, period, overrides, existing categories, freshness, and allocator policy, return stable candidate facts and a canonical hash. Allocate fixed -> override -> supported flexible -> exposure -> unassigned. Represent mixed components, annual due-period exposure, missing resource, over-target, and blocked conditions.

**Required red tests first:** same-input idempotency; fixed over target; override preservation; mixed utilities; annual cost; sparse/bursty category; strong variable month; missing/stale resource; category reuse/merge; unassigned capacity; nonnegative invariants.

**Proof:** deterministic output, no fixed/override reduction, target reconciliation, canonical category identity, and inspectable provenance.

## Slice 4 — Version comparison, materiality, and reversal projection

**Files:**

- Add `src/domain/living-plan-changes.ts`
- Extend `scripts/living-plan-smoke.mjs`

**Contract:** Compare candidate and active facts to return `no_op | routine | material | blocked`, material reason codes, notice facts, and reversal eligibility. Thresholds live in a versioned policy object. Undo projects a new version; it never deletes history.

**Proof:** boundary tests at 5%, 20%+$25, and $100; account/resource/category/fixed changes are material; no-op events produce no receipt; stale/failed inputs block.

## Slice 5 — Additive Supabase plan schema

**Files:**

- Add a timestamped migration under `supabase/migrations/`
- Extend `scripts/security-hardening-smoke.mjs`

**Tables:** living target intents, planning-income source profiles, immutable living-plan versions, allocation components, user overrides, plan-change receipts, active-plan pointers, and notice visibility/reversal lineage.

**Contract:** owner writes; current household posture remains read-only; immutable history; unique evidence/policy hash constraints; active receipt integrity; no allocator mutation of raw transactions. Add a promotion-enabled configuration switch.

**Proof:** RLS cross-user denial, household read behavior, immutable version enforcement, referential integrity, and additive compatibility.

## Slice 6 — Atomic promotion and repository

**Files:**

- Add promotion/reversal RPCs in a migration
- Add `src/platform/living-plan-repository.ts`
- Integrate trigger facts from `supabase/functions/sync-plaid-transactions/index.ts` after a successful complete sync

**Contract:** RPC checks ownership, freshness/evidence hash, expected active version, promotion switch, and candidate invariants; then inserts version/components/receipt and moves the pointer in one transaction. Reversal applies the same precondition discipline. Repository reads only the committed active version.

**Proof:** concurrent expected-version conflict; injected write failure rolls back everything; stale candidate cannot promote; second-account backfill creates one coherent version; kill switch preserves reads.

## Slice 7 — Initial onboarding activation

**Files:**

- Modify `src/features/onboarding/BudgetOnboardingFlow.tsx`
- Modify account-link completion orchestration in the existing Plaid flow

**Contract:** save the living target, wait for sufficiently complete first sync, request candidate/promotion, then show `Your budgets are ready`. If no trustworthy resource exists, show one focused resource question. Do not add allocation review, numeric input, preset control, or remainder copy.

**Proof:** simulator happy path, sparse-resource path, sync failure holding state, VoiceOver labels, 5-point slider increments, and no keyboard invocation.

## Slice 8 — Summary notice and focused receipt

**Files:**

- Modify `app/(tabs)/index.tsx`
- Add a focused receipt route/component under `app/` and `src/features/`

**Contract:** Summary renders active budgets and at most one notice. Receipt renders cause, changed categories, before/after values, and optional safe undo. Hide internal confidence, candidate state, and classifier enums.

**Proof:** routine/material/blocked/refresh-failed/seen states; receipt points to active version; undo creates and renders a new version; ordinary Summary works with no notice.

## Slice 9 — Category provenance and durable overrides

**Files:**

- Modify `app/budgets/[budgetId].tsx`
- Modify `app/app-control/[budgetId].tsx`
- Use `src/platform/living-plan-repository.ts`

**Contract:** Category Detail shows one compact source line. Saving an amount creates/updates an override and triggers recomputation. Remove the ordinary target-impact explainer; show a conflict only if fixed plus overrides genuinely exceed target.

**Proof:** override survives account addition, sync, policy recompute, and period rollover; removing it restores allocator control; source line matches component provenance.

## Slice 10 — Full-story proof and release gate

**Commands/evidence:**

1. `npm run lint`
2. `npm run test:forecast`
3. `node scripts/living-plan-smoke.mjs`
4. `npm run test:security`
5. `npm run job-delivery:check`
6. historical replay report using privacy-safe aggregate facts
7. Plaid Sandbox: onboarding -> Summary -> add account -> notice -> receipt -> override -> resync -> exceptional inflow -> undo
8. iPhone simulator accessibility and reductive-UI proof
9. installed Andrew-only TestFlight proof across two account changes and two period transitions

Stop before TestFlight for nondeterminism, excluded-inflow promotion, fixed/override corruption, transfer/duplicate double count, non-atomic writes, failed rollback, stale overwrite, or planner chrome in the normal path.

## Rollout

Ship additive schema and compatibility reads first. Keep automatic promotion disabled until pure, SQL, Sandbox, and simulator gates pass. Enable only for Andrew/internal TestFlight. Preserve the last active version and turn promotion off—not data removal—if the learning release is withdrawn.
