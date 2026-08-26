# Mobile Chat Background Continuity Implementation Plan

> **For Codex:** Execute this plan in the current `feature/chat-enhancements` checkout. Preserve unrelated live-conversation edits already present in the worktree.

**Goal:** Keep eligible mobile Chat follow-up responses running when iOS backgrounds Kwilt, then reconcile the durable result when Kwilt becomes active again.

**Architecture:** Reuse the canonical server-owned agent run and its idempotent `(trigger_kind, trigger_id)` enqueue contract. For eligible mobile turns, the Edge Function durably enqueues first, returns `202 Accepted`, and uses `EdgeRuntime.waitUntil` to finish the run after the HTTP response. The mobile screen polls while active and reloads the durable thread on foreground. Rich turns that still depend on device-only context or execution remain on `runUnifiedChatTurn`.

**Tech Stack:** React Native / Expo, TypeScript, Supabase Edge Functions, Postgres RPCs, Jest.

---

### Task 1: Separate durable enqueue from canonical execution

**Files:**
- Modify: `supabase/functions/_shared/agentRunCoordinator.ts`
- Test: `supabase/functions/_shared/__tests__/agentRunCoordinator.test.ts`

1. Add a regression test proving a caller can enqueue a run, retain the durable identifiers, and execute that exact run without a second enqueue.
2. Extract helpers for enqueue/replay inspection and execution of an already-enqueued run.
3. Preserve the synchronous `executeCanonicalAgentRun` contract used by phone and scheduled channel workers.
4. Run the focused coordinator test.

### Task 2: Return mobile acceptance before generation completes

**Files:**
- Add: `supabase/functions/_shared/mobileAgentRunBackground.ts`
- Add: `supabase/functions/_shared/__tests__/mobileAgentRunBackground.test.ts`
- Modify: `supabase/functions/agent-run/index.ts`

1. Add regression tests for a new mobile enqueue, an in-flight idempotent replay, and a terminal replay.
2. Implement acceptance orchestration that schedules only newly enqueued work.
3. In `agent-run`, use `EdgeRuntime.waitUntil` for `channel: mobile`; keep other channels synchronous.
4. Return the durable thread/run/message identifiers with `202` while work continues.
5. Run focused shared-function tests and Deno typechecking for the function.

### Task 3: Route only server-safe mobile follow-ups

**Files:**
- Add: `src/features/unifiedChat/durableMobileChatTurn.ts`
- Add: `src/features/unifiedChat/durableMobileChatTurn.test.ts`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.tsx`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.test.tsx`

1. Add regression tests defining eligibility: established text follow-up, no attachments, no active attached context, no pending review/action, and not a retry.
2. Add a client that invokes `agent-run`, exposes the accepted run immediately, and polls the canonical thread to a terminal state.
3. Route eligible sends through the durable client and keep every excluded case on `runUnifiedChatTurn`.
4. Preserve stop and steer by transitioning server-owned runs before aborting local polling.
5. Refresh any non-terminal server-owned thread on `AppState` becoming active.
6. Run focused Chat tests.

### Task 4: Verify, deploy, and reproduce

**Files:**
- Verification only.

1. Run `npm run verify:changed -- --run` once after the slice is complete.
2. Deploy the updated `agent-run` Edge Function to the linked Supabase project.
3. Prove authenticated enqueue and terminal persistence without relying on the mobile client remaining connected.
4. Confirm Metro provenance for `/Users/andrewwatanabe/Kwilt`, rebuild/install if native provenance is stale, and reproduce the swipe-up/app-switcher scenario in Simulator or on the connected physical device.
5. Report source, backend, and runtime proof separately, including any physical-device limitation.
