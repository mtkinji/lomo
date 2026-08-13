# Chat Cross-Capability Control Intent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Unified Chat distinguish self from managed children and coordinate Money-owned conditions with Screen Time-owned effects through a typed native-review handoff.

**Architecture:** Add explicit self authority to the Screen Time snapshot, then introduce a Money-owned tool whose input contract requires `subject`, `condition`, and `effect`. The device provider validates the Money category and stages the existing Money App controls editor; it never chooses opaque Apple apps or saves a policy in Chat. Keep child Screen Time tools separate and advance failure diagnostics immediately after context authorization.

**Tech Stack:** TypeScript, React Native/React Navigation, Kwilt agent runtime tool contracts, Jest.

---

### Task 1: Reproduce subject and compound-routing failures

**Files:**
- Modify: `src/features/unifiedChat/requestPolicy.test.ts`
- Modify: `src/features/unifiedChat/capabilityAdapters.test.ts`

- [ ] Add regression cases proving self-directed Money app controls retain both `money` and `screenTime`, while personal Screen Time setup exposes a self subject rather than substituting a child.
- [ ] Run the focused tests and confirm they fail for the missing behavior.

### Task 2: Define the typed cross-capability operation

**Files:**
- Modify: `packages/kwilt-agent-runtime/src/kwiltToolContracts.ts`
- Modify: `packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.ts`
- Modify: `packages/kwilt-agent-runtime/src/familyScreenTimeContracts.test.ts`

- [ ] Add `money.app_control.review` with required nested `subject`, `condition`, and `effect` objects.
- [ ] Constrain the subject to `self`, the condition owner to `money`, and the effect owner to `screenTime`.
- [ ] Mark it as a native-confirmation handoff, not an applied Chat mutation.

### Task 3: Project self authority and stage the native Money editor

**Files:**
- Modify: `src/features/unifiedChat/capabilityAdapters.ts`
- Modify: `src/features/unifiedChat/loadFamilyScreenTimeChatSnapshot.ts`
- Modify: `src/features/unifiedChat/deviceToolProvider.ts`
- Modify: `src/features/unifiedChat/deviceToolProvider.test.ts`

- [ ] Add authoritative current-device/self setup status alongside managed children.
- [ ] Validate the typed Money category and stage a `review_money_app_control` client action.
- [ ] Preserve suggested app labels only as native-picker guidance; never convert labels into Apple tokens.

### Task 4: Route and open the canonical editor

**Files:**
- Modify: `src/features/unifiedChat/requestPolicy.ts`
- Modify: `src/features/unifiedChat/clientActionNavigation.ts`
- Modify: `src/features/unifiedChat/clientActionNavigation.test.ts`
- Modify: `src/capabilities/money/navigation/types.ts`
- Modify: `src/capabilities/money/screens/MoneyAppControlScreen.tsx`

- [ ] Recognize self-directed, budget-conditioned app restriction as a compound Money/Screen Time action.
- [ ] Navigate the staged action to `MoneyAppControl` with the exact category and suggested preset.
- [ ] Present the suggestion in the editor without persisting until native review.

### Task 5: Preserve the real failure phase

**Files:**
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts`

- [ ] Advance the failure code to `model_response_failed` immediately after context authorization and before local execution construction.
- [ ] Prove a local handoff failure can no longer be mislabeled as context selection.

### Task 6: Verify the complete slice

- [ ] Run focused Unified Chat, runtime-contract, navigation, and Money App control tests.
- [ ] Run `npm run verify:changed -- --run`.
- [ ] Inspect `git diff --check` and the exact scoped diff while preserving unrelated worktree changes.
