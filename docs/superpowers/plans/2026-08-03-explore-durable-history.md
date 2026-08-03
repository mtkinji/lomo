# Explore Durable History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve signed-in Explore sessions and Places through phone replacement without changing local capture or location sampling.

**Architecture:** Keep Zustand/AsyncStorage as the offline rendering authority. Add one owner-RLS Supabase record table and a capability-owned sync service that incrementally exchanges session, Place, relationship, and reset records, then rebuilds derived territory locally. Project instructions require reuse of the current checkout; no worktree will be created.

**Tech Stack:** React Native, Zustand, Supabase JS/PostgREST, Postgres 17, Jest.

---

### Task 1: Owner-only schema

**Files:**
- Create: `supabase/migrations/<generated>_add_explore_records.sql`

- [ ] Generate the migration with `supabase migration new add_explore_records`.
- [ ] Create `explore_records` with `(user_id, record_type, record_id)` primary key, JSON payload, client/server timestamps, and deletion timestamp.
- [ ] Add record-type and timestamp checks plus an owner/update index.
- [ ] Explicitly grant only `select, insert, update, delete` to `authenticated`.
- [ ] Enable RLS and add owner policies using `(select auth.uid()) = user_id`, including `WITH CHECK` on inserts and updates.
- [ ] Add SQL contract tests that assert grants, RLS, policy predicates, constraints, and indexes before deployment.

### Task 2: Versioned local sync metadata

**Files:**
- Modify: `src/capabilities/explore/domain/types.ts`
- Modify: `src/capabilities/explore/domain/exploreState.ts`
- Modify: `src/capabilities/explore/runtime/useExploreStore.ts`
- Test: `src/capabilities/explore/runtime/useExploreStore.test.ts`

- [ ] Write failing migration and deletion tests for `historyResetAt`, Place tombstones, and `lastSyncedAt`.
- [ ] Bump Explore schema version and provide defaults/migration.
- [ ] Stamp reset and Place deletion metadata without blocking local operations.
- [ ] Add a store action that atomically applies a reconciled server projection.

### Task 3: Pure record reconciliation

**Files:**
- Create: `src/capabilities/explore/domain/exploreSync.ts`
- Test: `src/capabilities/explore/domain/exploreSync.test.ts`

- [ ] Write failing tests for initial backfill, clean-device restore, incremental selection, newest-record conflict resolution, reset filtering, Place tombstones, and territory rebuild.
- [ ] Implement typed record encoding/decoding with runtime validation.
- [ ] Implement deterministic merge that preserves local preferences/tracking and derives cells from canonical sessions.

### Task 4: Supabase repository and runtime

**Files:**
- Create: `src/capabilities/explore/runtime/exploreSyncRepository.ts`
- Create: `src/capabilities/explore/runtime/ExploreSyncRuntimeHost.tsx`
- Test: `src/capabilities/explore/runtime/exploreSyncRepository.test.ts`
- Test: `src/capabilities/explore/runtime/ExploreSyncRuntimeHost.test.tsx`
- Modify: `App.tsx`

- [ ] Write failing repository tests for owner-filtered incremental pulls, conflict-key upserts, deletion rows, and error truth.
- [ ] Implement pull, merge, push, read-back, and last-sync advancement using the authenticated client only.
- [ ] Write failing runtime tests for hydration, foreground return, meaningful-change debounce, and single-flight behavior.
- [ ] Register the host only for authenticated users and never await sync in capture actions.

### Task 5: Deploy and prove security

- [ ] Apply the reviewed migration to project `sqxwjtorodqjdfnuvprf`.
- [ ] Inspect columns, constraints, grants, RLS, policies, and indexes remotely.
- [ ] Run Supabase security and performance advisors.
- [ ] Perform a real signed-in app write/read/restore/delete round trip without exposing raw coordinates in logs.

### Task 6: Completion verification

- [ ] Run targeted Explore sync/store/runtime tests.
- [ ] Run `npm run verify:changed -- --run`.
- [ ] Rebuild/install the iOS app from `/Users/andrewwatanabe/Kwilt` and verify Metro ownership.
- [ ] Keep signed-device battery/thermal and multi-device concurrency as explicit post-local proof gates.
