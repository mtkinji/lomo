# Account Deletion Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute sequentially in the current checkout; do not create a worktree or dispatch subagents without Andrew's explicit approval.

**Goal:** Make Kwilt account deletion authenticated, deletion-safe, provider-complete, retryable, observable, locally complete, and provable on the exact App Store candidate so `ASR-002` can move from `OPEN` to `VERIFIED`.

**Architecture:** Keep `account-delete` as the single public deletion boundary, but split it into a dependency-injected staged orchestrator with durable, service-role-only receipts. Revoke provider access and remove user-owned Storage before a transactional database preparation RPC transfers surviving shared stewardship or removes private data; revoke Supabase sessions and delete the Auth user last. The mobile client supplies one persisted idempotency key and, after server confirmation, runs one centralized account-scoped device purge.

**Tech Stack:** React Native/Expo SDK 55, TypeScript, Jest, Deno tests, Supabase Auth/Postgres/Storage/Edge Functions, Plaid, Google OAuth, Microsoft OAuth, Kroger, RevenueCat, Sign in with Apple REST API.

---

## Contract and scope

The canonical contract is `docs/legal/mega-app-data-disclosure-matrix.md:61-74`:

- delete personal records and provider credentials;
- preserve shared state only when another authenticated participant needs it, with departing authorship de-identified;
- transfer a surviving Household only to another authenticated adult;
- never make a dependent the owner by deletion side effect;
- explain that deleting Kwilt does not cancel an Apple subscription;
- retain narrow operational records only for a disclosed schedule.

This plan closes `ASR-002`. Privacy-policy publication and analytics consent remain `ASR-004` and `ASR-003`. Do not introduce a cooling-off period, require support contact, or require subscription cancellation. Keep the existing two-step confirmation and Apple subscription-management affordance.

Authoritative external references to recheck during implementation:

- Apple account deletion: `https://developer.apple.com/support/offering-account-deletion-in-your-app/`
- Apple token revocation: `https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple`
- Supabase Admin sign-out: `https://supabase.com/docs/reference/javascript/auth-admin-signout`
- Plaid Item removal: `https://plaid.com/docs/api/items/#itemremove`
- RevenueCat customer deletion: `https://www.revenuecat.com/docs/api-v1/customers`

## Fixed deletion semantics

1. Require an authenticated JWT and `{ confirm: true, operationId }`, with a UUID operation ID generated and persisted by the client.
2. Reusing that ID resumes or returns its terminal result. A different ID while one is active returns `409 deletion_in_progress`.
3. Revoke providers while their tokens exist. Plaid, Calendar OAuth, Kroger, connected tools, Phone Agent, RevenueCat, Apple identity, and push cleanup each receive a bounded receipt without secrets or personal content.
4. Treat documented already-gone provider responses as success. Timeouts, rate limits, authentication failures, and unknown responses stop deletion with a retryable failure.
5. Remove all owned Storage through a paginated manifest. Any list/remove error stops deletion.
6. In one database transaction, choose a successor from active adults with active Auth bindings, ordered by `joined_at` then membership ID. Transfer shared stewardship when one exists; otherwise delete the Household and dependent graph.
7. Revoke all Supabase refresh sessions immediately before Auth deletion. Continue to authorize sensitive requests with server-side `auth.getUser(jwt)` because access JWTs remain valid until expiry.
8. Delete the Auth user last, then clear raw user ID from the receipt and retain only a salted subject hash plus bounded operational status for 30 days.
9. After confirmed server completion, purge account-scoped caches, SecureStore credentials, notifications, background work, RevenueCat/PostHog identity, Realtime channels, and in-memory state.
10. Never return success until every required stage is confirmed.

## Execution gates

The plan was authored against clean `main` at `8bcca392`; recheck before implementation.

1. **Contract/inventory:** Tasks 0-2 produce reviewed matrices and red tests; no remote mutation.
2. **Source-complete:** Tasks 3-8 pass focused SQL, Deno, and Jest checks; this is not deployment proof.
3. **Backend proof:** Task 9 applies to a non-production project first and runs destructive fixtures.
4. **Candidate proof:** Task 10 uses a disposable production account on the exact signed candidate before changing the ledger.

Commit commands are checkpoint recipes, not authorization to absorb unrelated work. Stage only task-owned paths/hunks and inspect the cached diff.

## File map

- Create via `npx supabase migration new account_deletion_integrity`: use the exact generated migration path printed by the CLI — receipts, deletion-safe foreign keys, and shared-ownership preparation RPC.
- Create `scripts/account-deletion/account-deletion-schema.test.mjs` — regression inventory for every `auth.users` foreign key.
- Create `supabase/functions/account-delete/accountDeletion.ts` — staged orchestrator and errors.
- Create `supabase/functions/account-delete/accountDeletionProviders.ts` — provider inventory/adapters.
- Create `supabase/functions/account-delete/accountDeletionStorage.ts` — paginated Storage cleanup.
- Create three matching Deno tests under `supabase/functions/account-delete/__tests__/`.
- Modify `supabase/functions/account-delete/index.ts` — thin HTTP/auth adapter.
- Modify `package.json` — focused account-deletion verification command.
- Create `src/services/accountDeletionLocalCleanup.ts` and `.test.ts` — centralized device purge.
- Modify `src/services/accountDeletion.ts` and `.test.ts` — idempotency and uncertain-response handling.
- Modify `src/features/account/ProfileSettingsScreen.tsx` and `.test.tsx` — truthful states and retry.
- Create `scripts/account-deletion/account-deletion-fixture.mjs` — guarded destructive verifier.
- Create `docs/testing/account-deletion-runbook.md` and `docs/delivery-evidence/account-deletion/.gitkeep`.
- Modify `docs/app-store/submission-readiness-ledger.md` only after proof exists.

### Task 0: Re-establish baseline and freeze the contract

**Files:**
- Inspect all File map paths
- Inspect `docs/legal/mega-app-data-disclosure-matrix.md:61-74`
- Inspect `ASR-002` in `docs/app-store/submission-readiness-ledger.md`

- [ ] **Step 1: Record checkout provenance**

```bash
git branch --show-current
git rev-parse HEAD
git status --short
git diff -- supabase/functions/account-delete src/services/accountDeletion.ts src/features/account/ProfileSettingsScreen.tsx docs/legal/mega-app-data-disclosure-matrix.md docs/app-store/submission-readiness-ledger.md
```

Expected: actual branch, commit, dirty state, and overlapping hunks are recorded; do not assume `8bcca392` remains current.

- [ ] **Step 2: Record focused baseline**

```bash
npm test -- --runInBand src/services/accountDeletion.test.ts src/features/account/ProfileSettingsScreen.test.tsx
```

Expected baseline: PASS, while proving only client wiring and confirmation UI.

- [ ] **Step 3: Record policy ownership**

In implementation notes, record that the disclosure matrix owns deletion semantics and the ledger owns submission closure. Do not create a competing product contract.

### Task 1: Expose every unsafe Auth relationship with a regression test

**Files:**
- Create `scripts/account-deletion/account-deletion-schema.test.mjs`
- Modify `package.json`

- [ ] **Step 1: Write the failing schema test**

Read every migration, extract direct references to `auth.users(id)`, and compare them with an explicit matrix. Seed the matrix with the six current defects:

```js
const approved = new Map([
  ['public.kwilt_people.created_by_user_id', 'set null'],
  ['public.kwilt_households.created_by_user_id', 'set null'],
  ['public.kwilt_friendships.initiated_by', 'set null'],
  ['public.kwilt_friendships.blocked_by', 'set null'],
  ['public.kwilt_family_screen_time_access_requests.requested_by_user_id', 'set null'],
  ['public.kwilt_family_screen_time_operations.actor_user_id', 'set null'],
]);
```

Report migration path, table, column, and observed action. Also fail if an approved entry disappears without a reviewed matrix change.

- [ ] **Step 2: Prove RED**

```bash
node --test scripts/account-deletion/account-deletion-schema.test.mjs
```

Expected: FAIL listing all six unsafe relationships.

- [ ] **Step 3: Add focused verification command**

```json
"test:account-deletion": "node --test scripts/account-deletion/account-deletion-schema.test.mjs && deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/account-delete/__tests__/*_deno_test.ts && jest --runInBand src/services/accountDeletion.test.ts src/services/accountDeletionLocalCleanup.test.ts src/features/account/ProfileSettingsScreen.test.tsx"
```

- [ ] **Step 4: Commit the red regression**

```bash
git add scripts/account-deletion/account-deletion-schema.test.mjs package.json
git diff --cached --check
git commit -m "test: expose account deletion schema blockers"
```

### Task 2: Add the reviewed database transition

**Files:**
- Create via CLI: use the exact migration path printed by `npx supabase migration new account_deletion_integrity`
- Test `scripts/account-deletion/account-deletion-schema.test.mjs`

- [ ] **Step 1: Create the migration with the installed CLI**

```bash
npx supabase --version
npx supabase migration new account_deletion_integrity
```

Expected: the CLI prints the exact path. Use that generated path throughout execution; never invent a timestamped migration name.

- [ ] **Step 2: Add a service-role-only receipt**

```sql
create table public.kwilt_account_deletion_operations (
  operation_id uuid primary key,
  user_id uuid,
  subject_hash text not null,
  status text not null check (status in ('running','retryable_failure','complete')),
  completed_stages text[] not null default '{}',
  last_error_code text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days')
);
alter table public.kwilt_account_deletion_operations enable row level security;
revoke all on public.kwilt_account_deletion_operations from public, anon, authenticated;
grant select, insert, update, delete on public.kwilt_account_deletion_operations to service_role;
```

Never store provider payloads/tokens, Storage paths, email, phone, financial values, or content. Clear `user_id` when marking complete.

- [ ] **Step 3: Fix all six foreign keys explicitly**

Drop their actual discovered constraint names, make creator/audit columns nullable, and recreate each with `ON DELETE SET NULL`. Preserve existing cascades for strictly user-owned tables; do not generate blanket dynamic DDL.

- [ ] **Step 4: Add `prepare_kwilt_account_deletion`**

Create `public.prepare_kwilt_account_deletion(p_user_id uuid, p_operation_id uuid)` as `SECURITY DEFINER SET search_path = ''`, revoke execute from `PUBLIC`, `anon`, and `authenticated`, and grant only `service_role`. Its transaction must:

```sql
-- validate input and receipt ownership; advisory-lock p_user_id
-- for each affected Household, select another active authenticated adult
-- ordered by joined_at then membership id
-- transfer owner role, Household creator, and retained dependent creators when found
-- otherwise delete the Household and dependent/shared graph
-- delete friendships involving the user; null retained audit actor references
-- delete the departing private person graph and auth binding after transfers
-- assert no reviewed non-null direct reference to p_user_id remains
-- return count-only JSON for transferred/deleted/deidentified records
```

- [ ] **Step 5: Add rollback-only database fixtures**

Create two adults, one dependent, a Household, Screen Time requests/operations, friendships, and private rows. Assert owner deletion transfers to the surviving adult, non-owner deletion preserves the owner, a sole-adult Household deletes, private rows disappear, audit authorship is null, and Auth deletion succeeds. Roll back each fixture.

- [ ] **Step 6: Verify**

```bash
node --test scripts/account-deletion/account-deletion-schema.test.mjs
npx supabase db reset
npx supabase db lint --level warning
npx supabase migration list --local
```

Expected: schema test PASS, reset applies all migrations, no new lint warning, migration listed once.

- [ ] **Step 7: Commit**

```bash
git add scripts/account-deletion/account-deletion-schema.test.mjs supabase/migrations/*_account_deletion_integrity.sql
git diff --cached --check
git commit -m "fix: make account deletion graph safe"
```

### Task 3: Extract a failure-closed orchestrator

**Files:**
- Create `supabase/functions/account-delete/accountDeletion.ts`
- Create `supabase/functions/account-delete/__tests__/accountDeletion_deno_test.ts`
- Modify `supabase/functions/account-delete/index.ts`

- [ ] **Step 1: Write failing orchestration tests**

Use this boundary:

```ts
export type AccountDeletionStage = 'providers' | 'storage' | 'database' | 'sessions' | 'auth_user';
export type AccountDeletionDependencies = {
  beginOrResume(input: { userId: string; operationId: string }): Promise<{ completed: AccountDeletionStage[] }>;
  removeProviders(userId: string): Promise<void>;
  removeStorage(userId: string): Promise<void>;
  prepareDatabase(userId: string, operationId: string): Promise<void>;
  revokeSessions(jwt: string): Promise<void>;
  deleteAuthUser(userId: string): Promise<void>;
  recordStage(operationId: string, stage: AccountDeletionStage): Promise<void>;
  recordFailure(operationId: string, code: string): Promise<void>;
  complete(operationId: string): Promise<void>;
};
```

Prove exact stage order, resume skipping, failure before Auth deletion, duplicate operation behavior, competing-operation conflict, redacted errors, and identity removal on completion.

- [ ] **Step 2: Run RED**

```bash
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/account-delete/__tests__/accountDeletion_deno_test.ts
```

- [ ] **Step 3: Implement minimal orchestrator and HTTP adapter**

Export `deleteKwiltAccount()` and `AccountDeletionError(code, status, retryable)`. Keep method/CORS/bearer/environment checks and `admin.auth.getUser(token)` in `index.ts`. Accept `{ confirm, operationId }`; return only stable codes and:

```ts
{ ok: true, operationId, status: 'complete' }
```

or a bounded `retryable_failure`. Never return raw provider/database errors.

- [ ] **Step 4: Verify and commit**

```bash
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/account-delete/__tests__/accountDeletion_deno_test.ts
deno check --no-lock --config supabase/functions/tsconfig.json supabase/functions/account-delete/index.ts
git add supabase/functions/account-delete
git diff --cached --check
git commit -m "refactor: stage account deletion safely"
```

### Task 4: Implement provider cleanup before credentials disappear

**Files:**
- Create `supabase/functions/account-delete/accountDeletionProviders.ts`
- Create `supabase/functions/account-delete/__tests__/accountDeletionProviders_deno_test.ts`
- Modify `supabase/functions/account-delete/index.ts`

- [ ] **Step 1: Write failing provider-matrix tests**

```ts
type ProviderDeletionTarget =
  | { kind: 'plaid'; connectionId: string }
  | { kind: 'calendar_google'; accountId: string }
  | { kind: 'calendar_microsoft'; accountId: string }
  | { kind: 'kroger'; accountId: string }
  | { kind: 'external_oauth'; clientId: string }
  | { kind: 'phone_agent'; linkId: string }
  | { kind: 'revenuecat'; appUserId: string }
  | { kind: 'apple_identity'; identityId: string };
```

Prove targets are enumerated before credential deletion; Plaid calls `/item/remove`; Google calls `https://oauth2.googleapis.com/revoke`; RevenueCat calls `DELETE /v1/subscribers/{app_user_id}`; Apple calls `/auth/revoke` when a server-held revocable token exists; local tokens disappear only after confirmation; Kroger/Microsoft follow their supported behavior or record local credential removal; MCP tokens revoke; Phone Agent delivery stops; retryable failure blocks later stages; receipts/logs contain no secrets.

- [ ] **Step 2: Run RED**

```bash
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/account-delete/__tests__/accountDeletionProviders_deno_test.ts
```

- [ ] **Step 3: Implement adapters**

Reuse `plaidPost('/item/remove', ...)` and existing encrypted-token queries. Extract Calendar/Kroger helpers only where required. Add bounded timeouts and documented already-gone classifications. Keep RevenueCat and Apple secrets server-side.

For legacy Apple users lacking a stored revocable token, record `manual_apple_revocation_required`, continue deletion, and return post-deletion Apple access-removal guidance. For new Apple sign-ins, add server-side authorization-code exchange/encrypted refresh-token retention before claiming automated revocation; never block legacy account deletion because the token is unavailable.

- [ ] **Step 4: Verify and commit**

```bash
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/account-delete/__tests__/accountDeletionProviders_deno_test.ts
rg -n "console\.(log|error)|access_token|refresh_token|token_payload" supabase/functions/account-delete
git add supabase/functions/account-delete
git diff --cached --check
git commit -m "fix: revoke account providers before deletion"
```

### Task 5: Make Storage cleanup exhaustive

**Files:**
- Create `supabase/functions/account-delete/accountDeletionStorage.ts`
- Create `supabase/functions/account-delete/__tests__/accountDeletionStorage_deno_test.ts`
- Modify `supabase/functions/account-delete/index.ts`

- [ ] **Step 1: Write failing Storage tests**

Cover more than 1,000 objects, nested paths, all user-owned buckets, 100-object removal batches, list/remove failure, stale metadata, and zero matches. Build the manifest from owned metadata plus reviewed user/person prefixes for Activity attachments, hero images, Household avatars, recipe imports, and chore evidence; explicitly classify editorial/audio buckets as non-user-owned.

- [ ] **Step 2: Run RED**

```bash
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/account-delete/__tests__/accountDeletionStorage_deno_test.ts
```

- [ ] **Step 3: Implement checked pagination**

Use `list(prefix, { limit: 1000, offset })` until a short page, remove in batches of 100, propagate every error, then rebuild the manifest and require zero owned objects before recording the stage.

- [ ] **Step 4: Verify and commit**

```bash
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/account-delete/__tests__/accountDeletionStorage_deno_test.ts
deno check --no-lock --config supabase/functions/tsconfig.json supabase/functions/account-delete/index.ts
git add supabase/functions/account-delete
git diff --cached --check
git commit -m "fix: verify account storage deletion"
```

### Task 6: Revoke sessions and delete Auth last

**Files:**
- Modify `supabase/functions/account-delete/index.ts`
- Modify `supabase/functions/account-delete/__tests__/accountDeletion_deno_test.ts`

- [ ] **Step 1: Add failing session/Auth tests**

Prove `admin.auth.admin.signOut(jwt, 'global')` occurs immediately before `deleteUser(userId)`, unknown sign-out failure blocks deletion, already-missing Auth completes only the same recorded operation, and completion clears raw user ID.

- [ ] **Step 2: Run RED, implement, and verify**

```bash
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/account-delete/__tests__/accountDeletion_deno_test.ts
npm run test:account-deletion
deno check --no-lock --config supabase/functions/tsconfig.json supabase/functions/account-delete/index.ts
```

Document that global sign-out revokes refresh sessions but access JWTs live until `exp`; verify sensitive Edge Functions use server-side `getUser(jwt)`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/account-delete package.json
git diff --cached --check
git commit -m "fix: revoke sessions before auth deletion"
```

### Task 7: Centralize account-scoped device purge

**Files:**
- Create `src/services/accountDeletionLocalCleanup.ts`
- Create `src/services/accountDeletionLocalCleanup.test.ts`
- Modify `src/services/accountDeletion.ts`
- Modify `src/services/accountDeletion.test.ts`

- [ ] **Step 1: Write failing cleanup tests**

```ts
export type AccountDeletionLocalCleanupDependencies = {
  removeAsyncStorageKeys(keys: string[]): Promise<void>;
  removeSecureStoreKeys(keys: string[]): Promise<void>;
  cancelAccountNotifications(): Promise<void>;
  stopAccountBackgroundWork(): Promise<void>;
  clearRevenueCatIdentity(): Promise<void>;
  clearAnalyticsIdentity(): Promise<void>;
  closeRealtimeChannels(): Promise<void>;
  resetStores(): void;
};
```

Enumerate domain data, AI drafts/cache, Explore, Money, Grocery, meal/cook, feedback, Chapters, games, entitlements, notification ledgers, navigation, and managed-child SecureStore. Prove device-wide appearance/preferences survive, background work stops, auth secrets always clear, all cleanup actions are attempted, and a failure prevents a false local-purge success claim.

- [ ] **Step 2: Run RED**

```bash
npm test -- --runInBand src/services/accountDeletionLocalCleanup.test.ts
```

- [ ] **Step 3: Implement cleanup and operation persistence**

Export `purgeDeletedAccountFromDevice({ userId })`. Filter `AsyncStorage.getAllKeys()` through exact reviewed prefixes rather than calling `clear()`. Remove managed-child SecureStore access, unregister account-specific notification/Health/Explore work, close Realtime, log out RevenueCat when non-anonymous, reset PostHog identity without changing consent choice, then reset stores/auth storage.

Persist `kwilt:account-deletion:operation:v1:<userId>` before the request and reuse it. After an uncertain response, perform an authoritative Auth check: existing user means retry; user-not-found means purge and complete; unavailable check means indeterminate, never success.

- [ ] **Step 4: Verify and commit**

```bash
npm test -- --runInBand src/services/accountDeletion.test.ts src/services/accountDeletionLocalCleanup.test.ts
npm run lint:tests
git add src/services/accountDeletion.ts src/services/accountDeletion.test.ts src/services/accountDeletionLocalCleanup.ts src/services/accountDeletionLocalCleanup.test.ts
git diff --cached --check
git commit -m "fix: purge deleted account data from device"
```

### Task 8: Make UI states truthful and retry-safe

**Files:**
- Modify `src/features/account/ProfileSettingsScreen.tsx`
- Modify `src/features/account/ProfileSettingsScreen.test.tsx`

- [ ] **Step 1: Add failing behavior tests**

Cover success, retryable provider failure, in-progress operation, indeterminate response, local-cleanup warning, legacy Apple manual-revocation guidance, Apple subscription management, and double-tap reuse of one operation ID.

- [ ] **Step 2: Run RED and implement minimal copy**

```bash
npm test -- --runInBand src/features/account/ProfileSettingsScreen.test.tsx
```

Keep the two confirmations. Use `Deleting account…`; on retryable failure say `Your account was not deleted. Try again.`; on indeterminate state say `We couldn't confirm deletion. Reconnect and try again; Kwilt will safely resume.` Claim `Account deleted` only after server completion or authoritative missing-user reconciliation.

- [ ] **Step 3: Verify and commit**

```bash
npm test -- --runInBand src/features/account/ProfileSettingsScreen.test.tsx src/services/accountDeletion.test.ts src/services/accountDeletionLocalCleanup.test.ts
git add src/features/account/ProfileSettingsScreen.tsx src/features/account/ProfileSettingsScreen.test.tsx
git diff --cached --check
git commit -m "fix: report account deletion truthfully"
```

### Task 9: Build and run destructive backend verification

**Files:**
- Create `scripts/account-deletion/account-deletion-fixture.mjs`
- Create `docs/testing/account-deletion-runbook.md`
- Create `docs/delivery-evidence/account-deletion/.gitkeep`

- [ ] **Step 1: Guard the fixture script**

```js
if (process.env.KWILT_ALLOW_DESTRUCTIVE_ACCOUNT_DELETION_TEST !== '1') {
  throw new Error('destructive_account_deletion_test_not_authorized');
}
if (!process.env.KWILT_ACCOUNT_DELETION_TEST_USER_ID?.trim()) {
  throw new Error('missing_disposable_test_user');
}
```

Also reject known production/reviewer/founder IDs. Emit only counts/statuses, deployment/build IDs, timestamps, and salted hashes—never credentials, user IDs, emails, phones, tokens, financial values, paths, or content.

- [ ] **Step 2: Write the runbook**

Cover personal Planning/Chat/attachments; owner/non-owner/sole-adult Households; dependents; Friends/shared data; Plaid; both Calendar providers; Kroger; connected tools; Phone Agent; push; RevenueCat; Apple identity; Storage; second-device sessions; local caches; duplicate request; injected provider failure; exact candidate.

- [ ] **Step 3: Verify locally**

```bash
npm run test:account-deletion
npm run lint:supabase-functions
npx supabase db reset
npx supabase db lint --level warning
```

- [ ] **Step 4: Apply to non-production first**

Discover live CLI syntax with `--help`, then apply the generated migration and deploy `account-delete` only to the intended non-production project. Run database advisors and the destructive fixture matrix. Production deployment requires separate release authorization.

- [ ] **Step 5: Commit harness/runbook**

```bash
git add scripts/account-deletion docs/testing/account-deletion-runbook.md docs/delivery-evidence/account-deletion/.gitkeep
git diff --cached --check
git commit -m "test: verify complete account deletion"
```

### Task 10: Capture exact-candidate proof and close ASR-002

**Files:**
- Create dated evidence under `docs/delivery-evidence/account-deletion/`
- Modify `docs/app-store/submission-readiness-ledger.md`

- [ ] **Step 1: Run stable-diff completion verification**

```bash
npm run verify:changed -- --run
git diff --check
```

Repeat only after failure, lost output, later diff change, or changed integration base; record why.

- [ ] **Step 2: Record candidate provenance**

Capture exact commit, dirty state, EAS build/profile, version/build, backend deployment, migration, provider environments, signed device/OS, and test date. Upload/processing is not device proof.

- [ ] **Step 3: Delete a fully used disposable production account**

Exercise every enabled provider/capability, both Household ownership cases, every user-owned Storage class, notifications, and a second session. Confirm Auth/personal rows are absent; shared stewardship/de-identification is correct; providers are revoked; Storage is empty; sessions/push/local/SecureStore/background work are cleared; repetition is safe; and receipts contain no prohibited data.

- [ ] **Step 4: Record redacted evidence and ledger state**

Create the dated evidence file with immutable IDs, counts, results, and screenshot/log references only. Move `ASR-002` to `VERIFIED` only after source (`S`), automated (`A`), deployed backend (`B`), and signed-device (`D`) proof are all linked. Otherwise use `READY FOR VERIFICATION` or `EXTERNAL GATE` and state the missing layer.

- [ ] **Step 5: Commit evidence**

```bash
git add docs/delivery-evidence/account-deletion docs/app-store/submission-readiness-ledger.md
git diff --cached --check
git diff --cached --stat
git commit -m "docs: record account deletion release proof"
```

## Self-review checklist

- [ ] Every disclosure-matrix deletion requirement maps to a task.
- [ ] Every `ASR-002` remediation/closure criterion maps to `S`, `A`, `B`, and `D` proof.
- [ ] Backend/reconciliation changes begin with failing tests under pragmatic TDD.
- [ ] No credential row disappears before its provider cleanup attempt.
- [ ] No Household transfers to a dependent or unauthenticated person.
- [ ] No source test, Simulator run, deployment, or TestFlight upload is called App Review proof.
- [ ] No credential, token, personal identifier, financial value, Storage path, or user content enters logs/evidence.
- [ ] No worktree or subagent is used without explicit approval.
