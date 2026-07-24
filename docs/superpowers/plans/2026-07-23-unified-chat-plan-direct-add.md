# Unified Chat Plan Direct Add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user select one or more Chat recommendations and add them to tomorrow's authoritative Plan with recoverable calendar writes, per-item receipts, and exact native return.

**Architecture:** Represent each recommended Activity as one atomic `plan.schedule_activity` proposal; “Add selected” composes those atoms instead of introducing a batch database object. Native Kwilt owns calendar execution and receipts, while the credential-free hosted workbench owns selection presentation and emits a versioned batch-decision command. Partial batch outcomes remain visible per proposal and receipt.

**Tech Stack:** TypeScript, React Native/Expo, Zustand, Supabase/Postgres durable agent tables, Jest, Next.js 14, React 18, CSS modules.

---

### Task 1: Extend the native durable proposal contract for Plan scheduling

**Files:**
- Modify: `src/features/unifiedChat/types.ts`
- Modify: `src/features/unifiedChat/threadRepository.ts`
- Test: `src/features/unifiedChat/threadRepository.test.ts`

- [ ] Add a failing repository test that loads and creates a `capabilityId: 'plan'`, `type: 'schedule_activity'` proposal with `activityId`, `expectedUpdatedAt`, `startDate`, `endDate`, and full `writeCalendarRef` fields.
- [ ] Run `npm test -- --runInBand src/features/unifiedChat/threadRepository.test.ts`; expect the Plan row to be rejected by the current To-do-only mapper.
- [ ] Change the proposal, operation, receipt, create-input, and decision types into discriminated To-do/Plan unions. Extend mappers and inserts without changing the free-form Postgres schema.
- [ ] Run the focused test and `npm run lint:tests`; expect both to pass.

### Task 2: Load authoritative calendar context and persist atomic Plan proposals

**Files:**
- Create: `src/services/plan/loadPlanAgentContext.ts`
- Test: `src/services/plan/loadPlanAgentContext.test.ts`
- Modify: `src/features/unifiedChat/planRecommendationTool.ts`
- Modify: `src/features/unifiedChat/planRecommendationTool.test.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.test.ts`

- [ ] Write failing tests for authenticated preferences, target-day busy intervals, Kwilt blocks, provider errors, and recommendation records that carry the source Activity's optimistic `expectedUpdatedAt`.
- [ ] Run the two focused suites and confirm failures.
- [ ] Implement an injected context loader using `getOrInitCalendarPreferences`, `listCalendarEvents`, `listBusyIntervals`, `getBlockingPlanBusyIntervals`, and `getKwiltCalendarBlocksForDay`; return a limitation rather than throwing when calendar access is missing.
- [ ] Persist one `schedule_activity` proposal for each placed recommendation after the assistant message exists. Keep unplaced recommendations as evidence only. Use `unified-chat:<runId>:plan:<activityId>` idempotency keys.
- [ ] Run the focused suites and confirm the exact prompt creates several atomic Plan proposals without claiming they are already applied.

### Task 3: Execute and reconcile one Plan proposal

**Files:**
- Create: `src/features/unifiedChat/planProposalExecutor.ts`
- Test: `src/features/unifiedChat/planProposalExecutor.test.ts`
- Create: `src/features/unifiedChat/executePlanProposalDecision.ts`
- Test: `src/features/unifiedChat/executePlanProposalDecision.test.ts`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.tsx`

- [ ] Write failing tests for existing-event idempotency, create-and-link success, provider timeout recovery, unconfirmed/unlinked failure, stale Activity conflict, local Plan commitment, receipt reservation/finalization, and proposal failure transition.
- [ ] Run the focused tests and confirm the executor modules are absent.
- [ ] Implement calendar execution through `resolveCalendarEventRefBeforeCreate`, `createCalendarEvent`, and `resolveCalendarEventRefAfterCreate`. Update `scheduledAt`, provider binding, and `dailyPlanCommitments` only after a bindable event reference exists.
- [ ] Implement decision orchestration with reserved/applied/failed receipt states. Never render a completed receipt for unconfirmed calendar state.
- [ ] Route single Plan approvals from `UnifiedChatScreen` to this executor and reload the durable aggregate after every outcome.
- [ ] Run focused tests and typechecks.

### Task 4: Add protocol-v2 multi-selection without a batch persistence object

**Files:**
- Modify: `src/features/unifiedChat/workbenchProtocol.ts`
- Modify: `src/features/unifiedChat/workbenchProtocol.test.ts`
- Modify: `src/features/unifiedChat/buildWorkbenchSnapshot.ts`
- Modify: `src/features/unifiedChat/buildWorkbenchSnapshot.test.ts`
- Modify: `protocol-fixtures/kwilt-unified-chat-v2.json`
- Modify: `/Users/andrewwatanabe/kwilt-site/.worktrees/unified-chat-run-plan/lib/unifiedChatProtocol.ts`
- Test: `/Users/andrewwatanabe/kwilt-site/.worktrees/unified-chat-run-plan/lib/unifiedChatProtocol.test.ts`

- [ ] Add failing native and hosted protocol tests for Plan proposal projection and `proposal.decide_many` items containing only `proposalId`, `expectedVersion`, and `approve`.
- [ ] Reject empty lists, duplicate ids, invalid versions, patches, and non-approve batch actions.
- [ ] Add the Plan discriminated union and batch command to both protocol implementations and update the canonical fixture.
- [ ] Run native protocol conformance and hosted protocol tests.

### Task 5: Execute selected proposals sequentially with honest partial outcomes

**Files:**
- Create: `src/features/unifiedChat/executePlanProposalBatch.ts`
- Test: `src/features/unifiedChat/executePlanProposalBatch.test.ts`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.tsx`

- [ ] Write a failing test where proposals one and three apply while proposal two fails; assert all three are attempted exactly once and the result reports two applied and one failed.
- [ ] Implement sequential execution to avoid concurrent calendar duplication and Zustand update races. Reject stale/missing ids before starting and refresh the aggregate after completion.
- [ ] Handle `proposal.decide_many` in the native bridge and present one concise error only when any item failed; durable cards remain the detailed truth.
- [ ] Run focused tests.

### Task 6: Render a compact Plan recommendation selector in the hosted workbench

**Files:**
- Modify: `/Users/andrewwatanabe/kwilt-site/.worktrees/unified-chat-run-plan/components/unified-chat/KwiltChatWorkbench.tsx`
- Modify: `/Users/andrewwatanabe/kwilt-site/.worktrees/unified-chat-run-plan/components/unified-chat/KwiltChatWorkbench.module.css`
- Create: `/Users/andrewwatanabe/kwilt-site/.worktrees/unified-chat-run-plan/components/unified-chat/KwiltChatWorkbench.test.tsx`

- [ ] Add a failing component test: same-run pending Plan proposals render one group, default selected, can be toggled independently, and **Add selected** emits one `proposal.decide_many` command. Applied/failed rows show status and are not selectable.
- [ ] Implement the grouped selector while retaining existing To-do cards and causal timeline order. Keep the assistant explanation outside the selection card.
- [ ] Add accessible checkbox labels, disabled/busy state, concise timing/Goal metadata, and **Review in Plan** only after authoritative receipts exist.
- [ ] Run hosted component, protocol, Markdown, and production-build checks.

### Task 7: Verify cross-repo behavior and document the remaining server boundary

**Files:**
- Modify: `docs/feature-briefs/unified-chat.md`
- Modify: `src/features/unifiedChat/FEATURE.md`
- Verify: `/Users/andrewwatanabe/kwilt-site/.worktrees/unified-chat-run-plan/`

- [ ] Run `npm run verify:changed -- --run` in Kwilt.
- [ ] Run the hosted workbench's test and build scripts in `kwilt-site/.worktrees/unified-chat-run-plan`.
- [ ] Run `npm run chat:protocol:conformance` with the companion checkout available.
- [ ] In the signed-in iOS simulator, ask “What should I add to my plan tomorrow?”, deselect one item, add the rest, verify per-item receipts, open tomorrow in Plan, and repeat the batch command to prove no duplicate calendar blocks.
- [ ] Record that coordination still runs in the authenticated app session; durable server coordination and Phone Agent adoption remain the next architectural release.
