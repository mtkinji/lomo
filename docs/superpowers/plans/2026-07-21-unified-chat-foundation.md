# Unified Chat Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate, TestFlight-ready Unified Chat capability with multiple server-persisted conversations and a Kwilt-owned workbench derived from Giraffed, without changing any existing Kwilt workflow chat.

**Architecture:** Keep `AiChatScreen`, `AgentWorkspace`, and `AiChatPane` as the complete owner of existing contextual workflows. Add `src/features/unifiedChat/` as a sibling system: Supabase owns authenticated thread/message/run records, native Kwilt owns AI and persistence, and a restricted WebView renders the versioned credential-free workbench from a Kwilt-owned route. A feature gate and independent `UnifiedChat` route make the slice reversible; Giraffed is never a runtime dependency.

**Tech Stack:** Expo SDK 54, React Native, React Navigation, `react-native-webview`, Supabase Postgres/RLS, `@supabase/supabase-js`, Jest, the existing Kwilt AI proxy, and the Kwilt-hosted workbench protocol v1.

---

## Non-negotiable boundaries

- Do not modify the behavior, prompt assembly, persistence, navigation, or UI of `AiChatScreen`, `AgentWorkspace`, `AiChatPane`, onboarding, Arc creation, Goal creation, or To-do management chat.
- Do not migrate old drafts or transcripts.
- Do not send Supabase sessions, publishable keys, AI credentials, or long-lived tokens into WebView JavaScript.
- Persist only visible user/assistant content; never persist hidden reasoning.
- Do not add capability mutations, evidence retrieval, proposals, attachments, or voice in the first TestFlight slice.
- Keep Giraffed and Kwilt data planes and production deployments independent.

## File map

### Create

- `supabase/migrations/<generated>_kwilt_unified_chat_foundation.sql` — owned thread, message, and run tables with grants and RLS.
- `src/features/unifiedChat/types.ts` — durable Kwilt records and repository inputs.
- `src/features/unifiedChat/threadRepository.ts` — authenticated CRUD and ordered transcript access.
- `src/features/unifiedChat/threadRepository.test.ts` — repository mapping and failure behavior.
- `src/features/unifiedChat/workbenchProtocol.ts` — protocol-v1 snapshot/command types and runtime message validation.
- `src/features/unifiedChat/workbenchProtocol.test.ts` — reject malformed, stale, and unknown bridge messages.
- `src/features/unifiedChat/buildWorkbenchSnapshot.ts` — pure records-to-snapshot projection.
- `src/features/unifiedChat/buildWorkbenchSnapshot.test.ts` — ordering, active/failed run, and empty-thread projection.
- `src/features/unifiedChat/runUnifiedChatTurn.ts` — durable send lifecycle around `sendCoachChat`.
- `src/features/unifiedChat/runUnifiedChatTurn.test.ts` — user-message-first, success, and durable failure tests.
- `src/features/unifiedChat/UnifiedChatScreen.tsx` — thread picker, restricted WebView, bridge, loading, retry, and empty states.
- `src/features/unifiedChat/UnifiedChatScreen.test.tsx` — create/switch/archive and bridge-source contracts.
- `src/features/unifiedChat/FEATURE.md` — ownership and boundary manifest.

### Modify

- `app.config.ts` — expose only the configured workbench URL and feature flag.
- `eas.json` — enable the new capability in preview/TestFlight with the deployed workbench URL.
- `src/navigation/RootNavigator.tsx` — add an independent `UnifiedChat` route without touching `Agent`.
- `src/navigation/linkingConfig.ts` and test — add an internal `kwilt://chat` route.
- `src/features/dev/DevToolsScreen.tsx` — optional local gate/entry if the capability menu is not yet available.
- `docs/feature-briefs/unified-chat-foundation.md` — accepted scope and device acceptance criteria.

## Task 1: Prove existing workflow chat remains outside the new capability

**Files:**
- Test: `src/features/unifiedChat/UnifiedChatScreen.test.tsx`
- Reference: `src/navigation/RootNavigator.tsx`

- [ ] **Step 1: Write the route-separation test**

Assert that the root route type and navigator contain both `Agent` and `UnifiedChat`, that they point to different components, and that no unified-chat source imports `AiChatScreen`, `AgentWorkspace`, or `AiChatPane`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/features/unifiedChat/UnifiedChatScreen.test.tsx --runInBand`

Expected: FAIL because the unified Chat feature does not exist.

- [ ] **Step 3: Keep the test as the architectural safety net**

The test should read targeted sources and use stable import/route assertions rather than snapshots of the entire navigator.

## Task 2: Add owned durable records

**Files:**
- Create: `supabase/migrations/<generated>_kwilt_unified_chat_foundation.sql`

- [ ] **Step 1: Generate the migration file**

Run: `npx supabase migration new kwilt_unified_chat_foundation`

Expected: one timestamped empty SQL file appears in `supabase/migrations/`.

- [ ] **Step 2: Define the schema**

Create `kwilt_agent_threads`, `kwilt_agent_messages`, and `kwilt_agent_runs` with UUID primary keys, `user_id uuid not null references auth.users(id) on delete cascade`, thread foreign keys with cascade deletion, constrained roles/statuses, and indexed user/thread timestamps. Include `created_at` and `updated_at`; threads also include `archived_at`.

- [ ] **Step 3: Add explicit grants and ownership policies**

Grant `select, insert, update, delete` only to `authenticated`. Enable RLS on all three tables. Add owner-select/insert/update/delete policies using `to authenticated`, `(select auth.uid()) = user_id`, and both `using` and `with check` for updates.

- [ ] **Step 4: Verify the migration**

Run: `npx supabase db lint --local --level warning` when the local stack is available, then `npx supabase migration list --local` and `npm run verify:changed -- --run`.

Expected: the new migration is ordered, linted, and selected by changed-file verification.

## Task 3: Implement the thread repository with TDD

**Files:**
- Create: `src/features/unifiedChat/types.ts`
- Create: `src/features/unifiedChat/threadRepository.ts`
- Test: `src/features/unifiedChat/threadRepository.test.ts`

- [ ] **Step 1: Write failing repository tests**

Cover `createThread`, `listThreads`, `loadThread`, `renameThread`, `archiveThread`, `insertMessage`, `createRun`, and `updateRun`. Assert user ownership is taken from `supabase.auth.getUser()`, list ordering is `updated_at desc`, messages are `created_at asc`, and missing authentication throws `UnifiedChatAuthError`.

- [ ] **Step 2: Run the focused test**

Run: `npx jest src/features/unifiedChat/threadRepository.test.ts --runInBand`

Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement explicit row mapping**

Use `getSupabaseClient()` and explicit column lists. Do not expose raw Supabase rows to UI code. Touch the parent thread's `updated_at` after a durable message insert so recency order is stable.

- [ ] **Step 4: Run focused tests**

Run: `npx jest src/features/unifiedChat/threadRepository.test.ts --runInBand`

Expected: PASS.

## Task 4: Mirror and validate workbench protocol v1

**Files:**
- Create: `src/features/unifiedChat/workbenchProtocol.ts`
- Test: `src/features/unifiedChat/workbenchProtocol.test.ts`

- [ ] **Step 1: Write failing validator tests**

Accept `surface.ready` and supported `surface.command` messages at protocol version `1`. Reject malformed JSON, missing request IDs, different protocol versions, unknown commands, and commands with missing required fields.

- [ ] **Step 2: Implement the smallest Kwilt protocol boundary**

Define only the snapshot fields and commands used in this slice: `composer.change`, `run.send`, `run.stop`, `run.steer`, `message.feedback`, `object.open`, and `thread.create`. Preserve unknown snapshot arrays as empty until later features are enabled.

- [ ] **Step 3: Verify against the Giraffed fixture**

Run the Kwilt validator test and Giraffed's `contracts.test.ts`. Both must agree on protocol version and the accepted TestFlight fixture.

## Task 5: Project durable records into the workbench

**Files:**
- Create: `src/features/unifiedChat/buildWorkbenchSnapshot.ts`
- Test: `src/features/unifiedChat/buildWorkbenchSnapshot.test.ts`

- [ ] **Step 1: Write failing projection tests**

Cover empty thread, ordered transcript, active run with a restrained `Working` event, failed run, and Kwilt product configuration with expert controls, attachments, mentions, voice, and web-search controls disabled.

- [ ] **Step 2: Implement a pure projector**

Map durable messages and runs into `AgentWorkbenchSnapshot`. Composer state is `working` only while the current run is queued/active and otherwise `ready`. Never project an internal error stack or hidden model content.

- [ ] **Step 3: Run the tests**

Run: `npx jest src/features/unifiedChat/buildWorkbenchSnapshot.test.ts --runInBand`

Expected: PASS.

## Task 6: Add a durable text-turn coordinator

**Files:**
- Create: `src/features/unifiedChat/runUnifiedChatTurn.ts`
- Test: `src/features/unifiedChat/runUnifiedChatTurn.test.ts`

- [ ] **Step 1: Write failing lifecycle tests**

Assert this order: persist user message, create active run, call `sendCoachChat` with the full visible transcript and `aiJob: 'default_chat'`, persist assistant message, mark run complete. On transport failure, mark the run failed and preserve the user message.

- [ ] **Step 2: Implement dependency-injected orchestration**

Accept repository and sender dependencies so tests do not touch Supabase or the network. Disallow a second send while a thread has an active run. Return the refreshed thread aggregate for one authoritative UI update.

- [ ] **Step 3: Run focused tests**

Run: `npx jest src/features/unifiedChat/runUnifiedChatTurn.test.ts --runInBand`

Expected: PASS.

## Task 7: Add the independent native host

**Files:**
- Create: `src/features/unifiedChat/UnifiedChatScreen.tsx`
- Test: `src/features/unifiedChat/UnifiedChatScreen.test.tsx`
- Create: `src/features/unifiedChat/FEATURE.md`
- Modify: `app.config.ts`

- [ ] **Step 1: Implement contained loading and configuration states**

Read `extra.unifiedChatWorkbenchUrl`. If absent, show a calm internal-unavailable state. Render only HTTPS URLs outside development.

- [ ] **Step 2: Restrict the WebView**

Allow navigation only to the configured origin, disable multiple windows, disallow arbitrary redirects, set `sharedCookiesEnabled={false}`, and send snapshots only through `postMessage`. Never include auth or API keys in a snapshot.

- [ ] **Step 3: Implement thread selection**

Provide a native, accessible thread list and `New chat` action outside the WebView. Support rename and archive without adding a general-purpose dashboard. Opening a thread loads its ordered aggregate and posts `host.initialize`; later changes post `host.snapshot`.

- [ ] **Step 4: Handle supported commands**

Route `run.send` through the durable turn coordinator, `thread.create` through the repository, and unsupported commands to a contained host error. `run.stop` is best-effort in v1 and must not claim cancellation after a request already completed.

- [ ] **Step 5: Run component and protocol tests**

Run: `npx jest src/features/unifiedChat --runInBand`

Expected: PASS.

## Task 8: Add independent navigation and TestFlight configuration

**Files:**
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/navigation/linkingConfig.ts`
- Modify: `src/navigation/linkingConfig.test.ts`
- Modify: `eas.json`

- [ ] **Step 1: Add `UnifiedChat` without changing `Agent`**

Register a separate hidden drawer route backed by `UnifiedChatScreen`. Keep the existing `Agent` route and all callers untouched.

- [ ] **Step 2: Add internal discovery**

Add `kwilt://chat` and, if the Option G capability menu is available on the integration branch, make its Chat action target `UnifiedChat`. Otherwise expose the route through DevTools for the learning release.

- [ ] **Step 3: Configure the hosted surface**

Expose `UNIFIED_CHAT_WORKBENCH_URL` through `app.config.ts` and use the stable Kwilt-owned URL `https://www.kwilt.app/embed/chat`. Never point a released Kwilt build at a Giraffed or protected preview deployment.

- [ ] **Step 4: Verify navigation compatibility**

Run: `npx jest src/navigation/linkingConfig.test.ts src/features/unifiedChat --runInBand` and `npm run lint`.

Expected: both chat routes compile and existing deep links still pass.

## Task 9: Complete Kwilt hosting and deploy the credential-free route

**Files:**
- Implement: `/Users/andrewwatanabe/kwilt-site/app/(embed)/embed/chat/page.tsx`
- Implement: `/Users/andrewwatanabe/kwilt-site/components/unified-chat/KwiltChatWorkbench.tsx`
- Reference only: `/Users/andrewwatanabe/Documents/Orchard-worktrees/shared-agent-workbench-extraction/src/components/agent-workbench/embedded-agent-workbench-host.tsx`

- [ ] **Step 1: Finish extraction verification**

Run the Kwilt site's bridge tests, full site tests, and `npm run build` on `codex/unified-chat-host`.

- [ ] **Step 2: Publish only the credential-free Kwilt embed route**

Deploy the static route through the Kwilt site. Confirm the page contains no product data, auth session, or mutation service and bypasses only the exact embed path when the marketing site lock is active.

- [ ] **Step 3: Verify from a real WebView origin**

Load `https://www.kwilt.app/embed/chat`, confirm `surface.ready`, send the Kwilt fixture snapshot, and verify a `run.send` command returns without any credential or Giraffed authoring vocabulary.

## Task 10: Verify the TestFlight learning release

**Files:**
- Modify: `docs/feature-briefs/unified-chat-foundation.md` only if observed behavior changes the accepted contract.

- [ ] **Step 1: Run repository gates**

Run: `npm run verify:changed -- --run`, `npm test -- --runInBand`, and `npx expo export --platform ios --output-dir /tmp/kwilt-unified-chat-export --clear`.

Expected: all automated gates pass and the iOS bundle exports.

- [ ] **Step 2: Run coexistence checks on device**

Complete onboarding, Arc creation, Goal creation, and one To-do management chat before and after enabling Unified Chat. Record any behavioral difference as a blocker.

- [ ] **Step 3: Run durable-thread checks on device**

Create three chats, send at least two turns in each, rename one, archive one, terminate and relaunch the app, and reopen the remaining chats. Sign into a second install if available and confirm server continuity.

- [ ] **Step 4: Build and submit the intended TestFlight profile**

Use the established production/TestFlight EAS profile only after the migration and workbench deployment are live. Record the build number and App Store Connect processing result.

## Self-review

- Spec coverage: coexistence, multiple durable chats, hosted workbench, credential boundary, TestFlight gating, and rollback each map to a task.
- TDD coverage: repository, protocol validation, projection, run orchestration, and navigation logic are test-first; presentational composition may be implementation-first.
- Deferred intentionally: convergence with workflow chat, retrieval/evidence, proposals, capability mutations, voice, attachments, and public rollout.
