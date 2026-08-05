# Shared Content Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Shared Home into a feed-first receiving surface and prove the generalized envelope with real shared Goal check-ins.

**Architecture:** Extend the existing recipient-only `kwilt_shared_deliveries` projection with an `available` Goal-check-in item. An authenticated Edge Function validates the check-in and active Goal audience before idempotent service-role fan-out. The client retains its repository, cache, realtime, and typed destinations while presenting pending actions separately from sender-led shared content.

**Tech Stack:** React Native, TypeScript, Jest, Supabase Postgres/RLS, Supabase Edge Functions, Deno tests.

**Workspace:** Reuse `/Users/andrewwatanabe/Kwilt` on `codex/kwilt-2-family-sharing-maturity`; do not create a worktree. Preserve unrelated dirty Focus, Money, Activities, navigation, Arc, and soundscape work.

---

## File map

- `src/features/shared-home/sharedHomeTypes.ts` — closed client item and destination union.
- `src/features/shared-home/sharedHomePresentation.ts` — untrusted row parsing, effective state, deterministic grouping.
- `src/features/shared-home/sharedHomeDestination.ts` — capability-owned navigation targets.
- `src/features/shared-home/SharedHomeScreen.tsx` — centered states and feed-first cards.
- `supabase/functions/_shared/sharedHomeDelivery.ts` — bounded, idempotent Goal-check-in item builder.
- `supabase/functions/shared-home-publish-goal-checkin/index.ts` — authenticated source/audience verification and fan-out.
- `src/services/checkins.ts` — best-effort projection request after authoritative check-in creation.
- `supabase/migrations/20260805143622_shared_home_goal_checkin_items.sql` — additive closed-contract expansion.
- Existing focused test files plus a new publisher Deno test provide regression coverage.

### Task 1: Extend the shared-item contract

**Files:**

- Modify: `src/features/shared-home/sharedHomeTypes.ts`
- Modify: `src/features/shared-home/sharedHomePresentation.test.ts`
- Modify: `src/features/shared-home/sharedHomePresentation.ts`
- Modify: `src/features/shared-home/sharedHomeDestination.test.ts`
- Modify: `src/features/shared-home/sharedHomeDestination.ts`

- [ ] Add a failing parser test for a row with `event_kind: 'goal_checkin'`, `source_capability: 'goals'`, `source_entity_type: 'goal_checkin'`, `state: 'available'`, and destination `{ kind: 'goal', goalId: 'goal-1' }`.
- [ ] Add a failing grouping test proving only `pending` items enter `needsYou` and an available check-in enters the chronological content group.
- [ ] Add a failing destination test expecting a Goal check-in to navigate to `MainTabs > GoalsTab > GoalDetail` with `{ goalId, entryPoint: 'goalsTab' }`.
- [ ] Run:

  ```bash
  npm test -- --runInBand src/features/shared-home/sharedHomePresentation.test.ts src/features/shared-home/sharedHomeDestination.test.ts
  ```

  Expected: failures for the new closed-contract values.

- [ ] Extend the unions exactly:

  ```ts
  type SharedHomeDestination =
    | { kind: 'goal_invite'; inviteCode: string }
    | { kind: 'goal'; goalId: string }
    | { kind: 'game_room'; sessionId: string };

  type SharedHomeState = 'pending' | 'available' | 'settled' | 'expired' | 'unavailable';
  ```

  Add `goal_checkin`, `goal_checkin`, and the typed destination to the matching item unions and parser combination checks. Rename the non-action group to `sharedWithYou`.

- [ ] Implement the Goal detail destination using the existing nested-navigation grammar.
- [ ] Re-run the focused tests and expect all to pass.

### Task 2: Make Home feed-first and center page states

**Files:**

- Modify: `src/features/shared-home/SharedHomeScreen.test.tsx`
- Modify: `src/features/shared-home/SharedHomeScreen.tsx`

- [ ] Add component tests proving:

  - an available Goal check-in appears under **Shared with you**;
  - its sender name, Goal label, content, and **Open Goal** action render;
  - the empty state is wrapped by `sharedHome.empty` with centered flex layout;
  - existing pending Game and unavailable-item behavior remains.

- [ ] Run the screen test and observe the new expectations fail.
- [ ] Extract presentation helpers with these contracts:

  ```ts
  function capabilityLabel(item: SharedHomeDelivery): string;
  function actionLabel(item: SharedHomeDelivery): string;
  function initials(name: string | null): string;
  ```

- [ ] Render sender identity first, a bounded content card, and a single capability-owned action. Show **Needs you** only for pending items and **Shared with you** for all other retained items.
- [ ] Wrap loading, signed-out, blocking error, and empty states in a flex child with `justifyContent: 'center'`; suppress the `EmptyState` screen variant's top margin through `style`.
- [ ] Re-run `SharedHomeScreen.test.tsx` and expect pass.

### Task 3: Expand the database contract safely

**Files:**

- Modify: `supabase/migrations/20260805143622_shared_home_goal_checkin_items.sql`
- Modify: `src/features/shared-home/sharedHomeMigration.test.ts`
- Modify: `supabase/tests/shared_home_deliveries.sql`

- [ ] Add migration-contract expectations for the new event, source, state, typed Goal destination, and bounded body length.
- [ ] Run the migration-contract test and observe failure.
- [ ] In the generated migration, drop and recreate only the existing check constraints:

  ```sql
  event_kind in ('goal_invitation', 'game_turn', 'goal_checkin')
  source_capability in ('goals', 'games')
  source_entity_type in ('goal_invite', 'game_session', 'goal_checkin')
  state in ('pending', 'available', 'settled', 'expired', 'unavailable')
  ```

  Extend the destination constraint with the exact `goal_checkin`/`goals`/`goal_checkin`/`goalId` combination and raise only the bounded body ceiling needed for authored check-in previews.

- [ ] Extend SQL proof with an inserted available check-in row and confirm recipient-only reads plus client write denial remain unchanged.
- [ ] Re-run the migration-contract test and expect pass.

### Task 4: Build and test the server item builder

**Files:**

- Modify: `supabase/functions/_shared/__tests__/sharedHomeDelivery_deno_test.ts`
- Modify: `supabase/functions/_shared/sharedHomeDelivery.ts`

- [ ] Add failing Deno tests for `buildGoalCheckinDelivery` covering deterministic recipient idempotency, `available` state, typed Goal destination, preset fallback, bounded authored text, and retention.
- [ ] Run:

  ```bash
  deno test --allow-env supabase/functions/_shared/__tests__/sharedHomeDelivery_deno_test.ts
  ```

- [ ] Implement:

  ```ts
  buildGoalCheckinDelivery({
    checkinId,
    goalId,
    recipientUserId,
    actorUserId,
    actorDisplayName,
    goalTitle,
    preset,
    text,
    nowIso,
  }): SharedDeliveryInsert
  ```

  Use `goal_checkin:${checkinId}:${recipientUserId}`, `state: 'available'`, no expiry, a 30-day retention boundary, and server-bounded presentation.

- [ ] Re-run the Deno test and expect pass.

### Task 5: Add the authenticated Goal-check-in publisher

**Files:**

- Create: `supabase/functions/shared-home-publish-goal-checkin/config.toml`
- Create: `supabase/functions/shared-home-publish-goal-checkin/publishGoalCheckin.ts`
- Create: `supabase/functions/shared-home-publish-goal-checkin/publishGoalCheckin_deno_test.ts`
- Create: `supabase/functions/shared-home-publish-goal-checkin/index.ts`

- [ ] Write Deno unit tests against an injected repository boundary proving rejection for a missing check-in, caller/author mismatch, and inactive membership; exact exclusion of the actor; allowlist filtering; and idempotent inserts.
- [ ] Run the new Deno test and observe missing implementation failure.
- [ ] Implement a pure orchestration function that accepts the verified caller id, check-in id, repository methods, and allowlist predicate. It must query the authoritative check-in, verify active membership, enumerate other active members, obtain bounded profile/Goal context, build items, insert them, and push only newly created rows.
- [ ] Implement the HTTP handler with `verify_jwt = true`, explicit bearer validation through `admin.auth.getUser(token)`, POST/OPTIONS-only handling, and a body containing only `checkinId`.
- [ ] Re-run the new and shared-helper Deno tests and expect pass.

### Task 6: Publish after the authoritative check-in

**Files:**

- Modify: `src/services/checkins.test.ts`
- Modify: `src/services/checkins.ts`

- [ ] Add a Jest test proving a successful check-in invokes `shared-home-publish-goal-checkin` with its id after feed creation.
- [ ] Add a Jest test proving a publisher failure is best-effort and does not reject or alter the returned authoritative check-in.
- [ ] Run the focused test and observe failure.
- [ ] Add one private helper:

  ```ts
  async function publishCheckinToSharedHome(checkinId: string): Promise<void> {
    const { error } = await getSupabaseClient().functions.invoke(
      'shared-home-publish-goal-checkin',
      { body: { checkinId } },
    );
    if (error) throw error;
  }
  ```

  Invoke it best-effort only after the check-in and Goal feed event attempts.

- [ ] Re-run the focused Jest test and expect pass.

### Task 7: Documentation links and verification

**Files:**

- Modify: `src/features/shared-home/FEATURE.md`
- Modify: `docs/job-flows/maya-move-family-life-forward.md`
- Modify: `docs/agent-code-map.md` only if it is not overlapping unrelated user changes; otherwise leave it untouched.

- [ ] Keep the feature manifest linked to `shared-home`; describe the feed-first surface and Goal-check-in adapter.
- [ ] Update the job-flow current state and gap without claiming separate-account or TestFlight proof.
- [ ] Run:

  ```bash
  npm run product:lint
  npm test -- --runInBand src/features/shared-home src/services/checkins.test.ts
  deno test --allow-env supabase/functions/_shared/__tests__/sharedHomeDelivery_deno_test.ts supabase/functions/shared-home-publish-goal-checkin/publishGoalCheckin_deno_test.ts
  npm run verify:changed -- --run
  ```

- [ ] Apply the migration and deploy the function only after focused local verification. Confirm the project ref before mutation and keep emission inert unless `SHARED_HOME_RECIPIENT_IDS` contains the recipient.
- [ ] Run the SQL recipient/wrong-account/anonymous/client-write proof in a rollback transaction and confirm zero probe rows remain.
- [ ] Launch the current branch through its own Metro server, inspect empty and populated Home states in the iPhone Simulator, and record that Simulator proof does not substitute for two signed physical accounts.
- [ ] Review `git diff --check`, the exact diff, and `git status`; stage and commit only files belonging to this plan.
