# Family Screen Time Chat Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authorized caregiver read, propose, confirm, and follow standing agreements, access exceptions, and direct temporary controls from Unified Chat while reusing the same Household policy commands, native-only handoffs, and device receipts as the native UI.

**Architecture:** Add an authoritative child-scoped family Screen Time service and command layer before enabling Chat writes. The control plane keeps standing agreements and temporary overrides distinct; a child request is provenance for an allow override rather than a parallel enforcement type. All active claims compile into one monotonic desired child-device policy. Extend the canonical agent-runtime manifest with precise read, agreement, override, request, setup, and release operations; mobile Chat resolves authorized Household evidence, stages typed proposals or native handoffs, and never conflates a saved policy receipt with child-device application.

**Tech Stack:** TypeScript, React Native, Unified Chat runtime, `@kwilt/agent-runtime`, Supabase Postgres/RPC, Jest, React Native Testing Library.

**Dependency:** Execute Tasks 1–3 of `2026-07-30-family-screen-time-native-simplification.md` first so native and Chat share presentation and setup vocabulary. Do not enable Chat mutations against the development-only local learning store.

**Plan correction — direct controls:** The accepted direct-control use cases include **“Turn off Brawl Stars for Charlie and Grant for the next three hours”** and **“Enable Brawl Stars for Charlie for the next 30 minutes.”** Apple selections are opaque, so first use may require a child-specific native picker handoff; subsequent requests resolve a caregiver-defined saved selection label. Multi-child requests validate all targets before application, stage one explicit proposal, apply through one idempotent batch command, and report per-device receipts. Wall-clock block and allow ship together; foreground-usage allowances remain behind signed-device threshold proof. See `docs/design-explorations/family-screen-time-direct-controls/`.

---

### Task 1: Add the authoritative family agreement and receipt schema

**Files:**
- Create: `supabase/migrations/20260730220000_family_screen_time_control_plane.sql`
- Create: `src/features/household/screenTime/data/familyScreenTimeMigration.test.ts`

- [ ] **Step 1: Write the failing migration contract test**

Read the migration as text and assert additive child-scoped tables, child-owned policy versions, agreement/directive/exception separation, caregiver authorization on every RPC, idempotent operation ids, bounded expiry, and desired/applied separation.

```ts
expect(migration).toContain('kwilt_family_screen_time_agreements');
expect(migration).toContain('unique (household_id, child_membership_id)');
expect(migration).toContain('kwilt_family_screen_time_device_receipts');
expect(migration).toContain('p_expected_version');
expect(migration).toContain('p_operation_id');
expect(migration).toContain('household_caregiver_required');
```

- [ ] **Step 2: Run the test and confirm failure**

Run: `npm test -- --runInBand src/features/household/screenTime/data/familyScreenTimeMigration.test.ts`

Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Create the additive schema and RPCs**

Add:

- `kwilt_family_screen_time_subjects`: one monotonic desired policy version per household child, independent of whether a standing agreement exists.
- `kwilt_family_screen_time_agreements`: child-scoped recurring rule JSON, active state, and optimistic version. Do not assume one agreement forever merely because the first UI shows one.
- `kwilt_family_screen_time_selections`: caregiver-defined child-scoped label plus opaque native `selection_ref`; never an installed-app inventory or Apple token payload.
- `kwilt_family_screen_time_overrides`: selection, `block | allow`, exact start/expiry, `wall_clock | foreground_usage` basis, optional usage minutes, provenance, status, actor, optimistic version, and batch operation id. The first release enables wall-clock block and allow.
- `kwilt_family_screen_time_devices`: child membership id, install id, readiness, authorization status, last seen, released timestamp.
- `kwilt_family_screen_time_device_receipts`: policy version, outcome, occurred timestamp, device id, idempotent operation id.
- `kwilt_family_screen_time_exceptions`: child, agreement, fixed kind/duration, expiry, decision caregiver, version.

Add security-definer RPCs:

- `get_kwilt_family_screen_time_snapshot(p_child_membership_id)`
- `set_kwilt_family_screen_time_agreement(p_child_membership_id, p_expected_version, p_rule, p_active, p_operation_id)`
- `apply_kwilt_family_screen_time_override_batch(p_items, p_operation_id)`
- `cancel_kwilt_family_screen_time_override(p_override_id, p_expected_version, p_operation_id)`
- `create_kwilt_family_screen_time_exception(p_child_membership_id, p_expected_version, p_kind, p_operation_id)`
- `record_kwilt_family_screen_time_device_receipt(...)`

Every caregiver mutation must check active Household membership, child scope, and the Screen Time capability grant. Device receipt writes validate the bound install rather than caregiver role.

- [ ] **Step 4: Run the migration contract test and confirm pass**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit the schema**

```bash
git add supabase/migrations/20260730220000_family_screen_time_control_plane.sql src/features/household/screenTime/data/familyScreenTimeMigration.test.ts
git commit -m "feat(screen-time): add authoritative family policy schema"
```

### Task 2: Build one typed command service for native and Chat

**Files:**
- Create: `src/features/household/screenTime/data/familyScreenTime.ts`
- Create: `src/features/household/screenTime/data/familyScreenTime.test.ts`
- Create: `src/features/household/screenTime/familyScreenTimeCommands.ts`
- Create: `src/features/household/screenTime/familyScreenTimeCommands.test.ts`

- [ ] **Step 1: Write failing normalization and command tests**

Cover malformed RPC data, child isolation, expected-version mismatch, duplicate operation id, create/update/deactivate, fixed exceptions, saved selection resolution, atomic multi-child direct blocks, cancellation, and separate saved/applied/expired status.

```ts
await expect(updateFamilyScreenTimeAgreement(client, {
  childMembershipId: 'child-1', expectedVersion: 3,
  rule: starterRule, active: true, operationId: 'chat:run-1:1',
})).resolves.toEqual(expect.objectContaining({ version: 4, deliveryState: 'applying' }));
```

- [ ] **Step 2: Run the tests and confirm failure**

Run: `npm test -- --runInBand src/features/household/screenTime/data/familyScreenTime.test.ts src/features/household/screenTime/familyScreenTimeCommands.test.ts`

- [ ] **Step 3: Implement RPC adapters and commands**

Keep RPC shape parsing in `data/familyScreenTime.ts`. Keep user-meaningful commands, stale checks, rule validation, and result vocabulary in `familyScreenTimeCommands.ts`.

```ts
export type FamilyScreenTimeCommandResult = {
  agreement: FamilyScreenTimeAgreement;
  policyReceipt: { operationId: string; savedVersion: number; desiredPolicyVersion: number };
  deviceReceipt: FamilyScreenTimeDeviceReceipt | null;
};
```

The native UI and Chat executor must import these commands rather than call RPCs independently. Add user-meaningful commands for `blockSelectionUntil`, `allowSelectionUntil`, batched equivalents, `cancelTemporaryOverride`, and `listActiveOverrides`. Batch validation must finish before any child mutation is committed.

- [ ] **Step 4: Run the tests and confirm pass**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit the shared command layer**

```bash
git add src/features/household/screenTime/data/familyScreenTime.ts src/features/household/screenTime/data/familyScreenTime.test.ts src/features/household/screenTime/familyScreenTimeCommands.ts src/features/household/screenTime/familyScreenTimeCommands.test.ts
git commit -m "feat(screen-time): add shared family policy commands"
```

### Task 3: Register precise Screen Time operations in the canonical agent runtime

**Files:**
- Modify: `packages/kwilt-agent-runtime/src/kwiltToolContracts.ts`
- Modify: `packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.ts`
- Modify: `packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.test.ts`
- Modify: `src/capabilities/operations.test.ts`
- Modify: `src/features/unifiedChat/chatCapabilityCoverage.test.ts`

- [ ] **Step 1: Extend manifest tests first**

Assert every registered operation, caregiver consequence level, confirmation mode, provider, and channel boundary. Screen Time writes are never auto-apply and remain excluded from Phone.

```ts
expect(operation('screen_time.read')).toMatchObject({ consequence: 'low', confirmation: 'none' });
expect(operation('screen_time.agreement.update')).toMatchObject({ consequence: 'consequential', confirmation: 'explicit' });
expect(operation('screen_time.device.release.open')).toMatchObject({ confirmation: 'native' });
```

- [ ] **Step 2: Run package and coverage tests and confirm failure**

Run: `npm test -- --runInBand packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.test.ts src/capabilities/operations.test.ts src/features/unifiedChat/chatCapabilityCoverage.test.ts`

- [ ] **Step 3: Add versioned tool schemas and manifest rows**

Define tools for:

- `screen_time.read`
- `screen_time.agreement.create`
- `screen_time.agreement.update`
- `screen_time.agreement.deactivate`
- `screen_time.exception.create`
- `screen_time.directive.block`
- `screen_time.directive.allow`
- `screen_time.directive.cancel`
- `screen_time.device.setup.open`
- `screen_time.device.release.open`

Mutation schemas take stable child membership ids and expected versions; display names are presentation only. Agreement fields use numeric weekdays/minutes and a selection reference, never Apple token content. Exceptions accept only `ten_minutes` or `current_window`. Direct blocks take one or more `{ childMembershipId, selectionId }` targets and one exact `expiresAt`; free-form app names and durations must be resolved before proposal staging.

Keep `screen_time.configure` as a deprecated bounded alias until Task 9 removes its routing and eval coverage.

- [ ] **Step 4: Run the tests and confirm pass**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit the operation contract**

```bash
git add packages/kwilt-agent-runtime/src/kwiltToolContracts.ts packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.ts packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.test.ts src/capabilities/operations.test.ts src/features/unifiedChat/chatCapabilityCoverage.test.ts
git commit -m "feat(chat): register family screen time operations"
```

### Task 4: Add authorized Screen Time evidence to Chat

**Files:**
- Modify: `src/features/unifiedChat/capabilityAdapters.ts`
- Modify: `src/features/unifiedChat/capabilityAdapters.test.ts`
- Modify: `src/features/unifiedChat/buildRunContext.test.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.test.ts`

- [ ] **Step 1: Write failing snapshot and evidence tests**

Prove Chat receives only children the current user may manage, resolves duplicate display names by asking, and exposes agreement/device state without opaque selection tokens.

```ts
expect(screenTimeChatAdapter.evidence.list(snapshot)[0]).toMatchObject({
  capabilityId: 'screenTime',
  object: { type: 'family_screen_time_agreement', id: 'agreement-1', label: "Charlie's Screen Time" },
  authority: 'authoritative',
});
expect(JSON.stringify(evidence)).not.toContain('opaqueToken');
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npm test -- --runInBand src/features/unifiedChat/capabilityAdapters.test.ts src/features/unifiedChat/buildRunContext.test.ts src/features/unifiedChat/runUnifiedChatTurn.test.ts`

- [ ] **Step 3: Add `ScreenTimeChatSnapshot` and adapter**

```ts
export type ScreenTimeChatSnapshot = {
  children: readonly Array<{
    membershipId: string; displayName: string; canManage: boolean;
    agreement: FamilyScreenTimeAgreement | null;
    delivery: FamilyScreenTimeDeliveryProjection;
  }>;
};
```

Load snapshots through the typed service using authenticated Household context. `screen_time.read` may return the compact summary and current reason; it must not return detailed usage history.

- [ ] **Step 4: Run the tests and confirm pass**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit Chat evidence**

```bash
git add src/features/unifiedChat/capabilityAdapters.ts src/features/unifiedChat/capabilityAdapters.test.ts src/features/unifiedChat/buildRunContext.test.ts src/features/unifiedChat/runUnifiedChatTurn.ts src/features/unifiedChat/runUnifiedChatTurn.test.ts
git commit -m "feat(chat): add authorized family screen time evidence"
```

### Task 5: Add typed agreement and exception proposals

**Files:**
- Create: `src/features/unifiedChat/screenTimeProposal.ts`
- Create: `src/features/unifiedChat/screenTimeProposal.test.ts`
- Modify: `src/features/unifiedChat/unifiedChatToolProvider.ts`
- Modify: `src/features/unifiedChat/unifiedChatToolProvider.test.ts`
- Modify: `src/features/unifiedChat/types.ts`

- [ ] **Step 1: Write failing parser/provider tests**

Cover create, update, deactivate, 10-minute exception, current-window exception, multi-child temporary block, directive cancellation, ambiguous child, missing saved selection, invalid duration/schedule, and stale expected version. Assert a compact field diff rather than prose.

```ts
expect(parseScreenTimeAgreementPatch({ startMinute: 17 * 60 }, current)).toEqual({
  changedFields: [{ field: 'schedule', before: 'Weekdays, 4–7 PM', after: 'Weekdays, 5–7 PM' }],
  nextRule: expect.objectContaining({ startMinute: 17 * 60 }),
});
```

- [ ] **Step 2: Run the tests and confirm failure**

Run: `npm test -- --runInBand src/features/unifiedChat/screenTimeProposal.test.ts src/features/unifiedChat/unifiedChatToolProvider.test.ts`

- [ ] **Step 3: Implement `ScreenTimeProposalOperation` and provider staging**

```ts
export type ScreenTimeProposalOperation =
  | { type: 'create_family_screen_time_agreement'; childMembershipId: string; payload: FamilyScreenTimeRule }
  | { type: 'update_family_screen_time_agreement'; childMembershipId: string; expectedVersion: number; payload: FamilyScreenTimeRulePatch }
  | { type: 'deactivate_family_screen_time_agreement'; childMembershipId: string; expectedVersion: number }
  | { type: 'create_family_screen_time_exception'; childMembershipId: string; expectedVersion: number; payload: { kind: 'ten_minutes' | 'current_window' } }
  | { type: 'block_family_screen_time_selection'; targets: Array<{ childMembershipId: string; selectionId: string }>; expiresAt: string }
  | { type: 'allow_family_screen_time_selection'; targets: Array<{ childMembershipId: string; selectionId: string }>; expiresAt: string; timeBasis: 'wall_clock' }
  | { type: 'cancel_family_screen_time_override'; overrideId: string; expectedVersion: number };
```

Extend `StagedUnifiedChatToolProposal` and mutation receipt capability unions with `screenTime`. Never stage a mutation from a child display name alone.

- [ ] **Step 4: Run the tests and confirm pass**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit proposal staging**

```bash
git add src/features/unifiedChat/screenTimeProposal.ts src/features/unifiedChat/screenTimeProposal.test.ts src/features/unifiedChat/unifiedChatToolProvider.ts src/features/unifiedChat/unifiedChatToolProvider.test.ts src/features/unifiedChat/types.ts
git commit -m "feat(chat): stage family screen time proposals"
```

### Task 6: Apply proposals through the shared command layer

**Files:**
- Create: `src/features/unifiedChat/screenTimeProposalExecutor.ts`
- Create: `src/features/unifiedChat/screenTimeProposalExecutor.test.ts`
- Create: `src/features/unifiedChat/executeScreenTimeProposalDecision.ts`
- Create: `src/features/unifiedChat/executeScreenTimeProposalDecision.test.ts`
- Modify: `src/features/unifiedChat/executeProposalDecision.ts`
- Modify: `src/features/unifiedChat/executeProposalDecision.test.ts`
- Modify: `src/features/unifiedChat/threadRepository.ts`
- Modify: `src/features/unifiedChat/threadRepository.test.ts`

- [ ] **Step 1: Write failing executor tests**

Cover authorization failure, stale version, duplicate idempotency key, reserved receipt, applied policy receipt with pending device state, device acknowledgement, failed command, and deactivation awaiting cleanup.

```ts
expect(result.receipt).toMatchObject({
  capabilityId: 'screenTime', status: 'applied',
  resultState: { policyState: 'saved', deviceState: 'applying', desiredPolicyVersion: 4 },
  canUndo: false,
});
```

- [ ] **Step 2: Run the tests and confirm failure**

Run: `npm test -- --runInBand src/features/unifiedChat/screenTimeProposalExecutor.test.ts src/features/unifiedChat/executeScreenTimeProposalDecision.test.ts src/features/unifiedChat/executeProposalDecision.test.ts src/features/unifiedChat/threadRepository.test.ts`

- [ ] **Step 3: Implement executor and decision routing**

Reserve the Chat mutation receipt before the command. Call only `familyScreenTimeCommands`. Finalize with the authoritative saved version and delivery state. Do not mark a Screen Time receipt undoable until cleanup semantics can be guaranteed; corrections use a new explicit proposal.

Persist `screenTime` in generic capability ids without adding a parallel Screen Time receipt table inside Chat.

- [ ] **Step 4: Run the tests and confirm pass**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit execution**

```bash
git add src/features/unifiedChat/screenTimeProposalExecutor.ts src/features/unifiedChat/screenTimeProposalExecutor.test.ts src/features/unifiedChat/executeScreenTimeProposalDecision.ts src/features/unifiedChat/executeScreenTimeProposalDecision.test.ts src/features/unifiedChat/executeProposalDecision.ts src/features/unifiedChat/executeProposalDecision.test.ts src/features/unifiedChat/threadRepository.ts src/features/unifiedChat/threadRepository.test.ts
git commit -m "feat(chat): apply family screen time proposals safely"
```

### Task 7: Add exact native setup and release handoffs

**Files:**
- Modify: `src/features/unifiedChat/deviceToolProvider.ts`
- Modify: `src/features/unifiedChat/deviceToolProvider.test.ts`
- Modify: `src/features/unifiedChat/clientActionNavigation.ts`
- Modify: `src/features/unifiedChat/clientActionNavigation.test.ts`
- Modify: `src/features/unifiedChat/prepareClientActionNativeReview.ts`
- Modify: `src/features/unifiedChat/prepareClientActionNativeReview.test.ts`
- Modify: `src/navigation/RootNavigator.tsx`

- [ ] **Step 1: Write failing handoff tests**

Prove setup opens `SettingsFamilyScreenTime` with the exact child membership and setup step. Prove release opens the caregiver-authenticated release step. A handoff receipt may say the native surface opened; it may not say authorization, selection, or release completed.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npm test -- --runInBand src/features/unifiedChat/deviceToolProvider.test.ts src/features/unifiedChat/clientActionNavigation.test.ts src/features/unifiedChat/prepareClientActionNativeReview.test.ts`

- [ ] **Step 3: Implement typed client actions**

```ts
case 'open_family_screen_time_setup':
  return { kind: 'navigate', name: 'Settings', params: {
    screen: 'SettingsFamilyScreenTime',
    params: { childMembershipId: action.targetId, childDisplayName: action.payload.childDisplayName, setupStep: action.payload.setupStep },
  } };
```

Persist the source thread/run/action id in route params or navigation context so completion can transition the same client action and return to the thread.

- [ ] **Step 4: Run the tests and confirm pass**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit native handoffs**

```bash
git add src/features/unifiedChat/deviceToolProvider.ts src/features/unifiedChat/deviceToolProvider.test.ts src/features/unifiedChat/clientActionNavigation.ts src/features/unifiedChat/clientActionNavigation.test.ts src/features/unifiedChat/prepareClientActionNativeReview.ts src/features/unifiedChat/prepareClientActionNativeReview.test.ts src/navigation/RootNavigator.tsx
git commit -m "feat(chat): hand off family screen time native steps"
```

### Task 8: Render the shared compact proposal and receipt

**Files:**
- Modify: `src/features/unifiedChat/buildWorkbenchSnapshot.ts`
- Modify: `src/features/unifiedChat/buildWorkbenchSnapshot.test.ts`
- Modify: `src/features/unifiedChat/proposalReceiptSummary.test.ts`
- Modify: `src/features/unifiedChat/workbenchProtocol.ts`
- Modify: `src/features/unifiedChat/workbenchProtocol.test.ts`

- [ ] **Step 1: Write failing workbench tests**

Assert a proposal renders child, target, compact schedule/limit, only changed fields, and **Apply**. Assert the saved receipt says **Applying to Charlie's iPhone** until the matching device receipt arrives. Assert no duplicate prose restates the card.

- [ ] **Step 2: Run the tests and confirm failure**

Run: `npm test -- --runInBand src/features/unifiedChat/buildWorkbenchSnapshot.test.ts src/features/unifiedChat/proposalReceiptSummary.test.ts src/features/unifiedChat/workbenchProtocol.test.ts`

- [ ] **Step 3: Add Screen Time proposal/receipt projections**

Reuse `FamilyScreenTimeAgreementSummary` and a field-diff projection. Keep workbench protocol payloads credential-free and token-free. Device receipt updates append or refresh the same receipt presentation rather than creating a success-looking duplicate.

- [ ] **Step 4: Run the tests and confirm pass**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit workbench presentation**

```bash
git add src/features/unifiedChat/buildWorkbenchSnapshot.ts src/features/unifiedChat/buildWorkbenchSnapshot.test.ts src/features/unifiedChat/proposalReceiptSummary.test.ts src/features/unifiedChat/workbenchProtocol.ts src/features/unifiedChat/workbenchProtocol.test.ts
git commit -m "feat(chat): render compact screen time proposals and receipts"
```

### Task 9: Replace the coarse configure route with semantic coverage

**Files:**
- Modify: `src/features/unifiedChat/directAppControl.ts`
- Modify: `src/features/unifiedChat/directAppControl.test.ts`
- Modify: `src/features/unifiedChat/requestPolicy.ts`
- Modify: `src/features/unifiedChat/requestPolicy.test.ts`
- Modify: `src/features/unifiedChat/turnExecutionPhase.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.appControl.test.ts`
- Modify: `src/features/unifiedChat/agentCapabilityEvalCases.ts`
- Modify: `src/features/unifiedChat/agentCapabilityEvalCases.test.ts`
- Modify: `src/features/unifiedChat/requestRoutingEvalCases.ts`
- Modify: `src/features/unifiedChat/requestRoutingEvalCases.test.ts`

- [ ] **Step 1: Add the complete language matrix first**

Include:

- read: “What are Charlie's Screen Time rules?”
- reason: “Why can't Charlie play Games?”
- create: “Let Charlie use Games from 4 to 7 on school days for 30 minutes.”
- update: “Move Charlie's Games time to 5.”
- exception: “Give Charlie 10 more minutes today.”
- direct block: “Turn off Brawl Stars for Charlie and Grant for the next three hours.”
- direct allow: “Enable Brawl Stars for Charlie for the next 30 minutes.”
- usage ambiguity: “Give Charlie 30 minutes of Brawl Stars.”
- inspect: “Why is Brawl Stars blocked for Charlie?”
- cancel: “Turn Brawl Stars back on for Grant.”
- setup: “Set up Charlie's iPhone.”
- release: “Stop managing Charlie's old iPad.”
- ambiguity: duplicate child names, missing child, missing target, missing saved selection, unclear duration, and one missing target in a multi-child batch.
- adversarial: child attempting caregiver mutation, prompt asking Chat to bypass Apple or skip approval.

- [ ] **Step 2: Run routing and turn tests and confirm failure**

Run: `npm test -- --runInBand src/features/unifiedChat/directAppControl.test.ts src/features/unifiedChat/requestPolicy.test.ts src/features/unifiedChat/runUnifiedChatTurn.appControl.test.ts src/features/unifiedChat/agentCapabilityEvalCases.test.ts src/features/unifiedChat/requestRoutingEvalCases.test.ts`

- [ ] **Step 3: Route Screen Time through the semantic tool loop**

Remove the brittle allow/block-only fast path after the new tools pass the matrix. Keep deterministic classification for native-control risk, but let typed tools interpret complete rule intent. Retire `screen_time.configure` from the manifest only after no eval case depends on it.

- [ ] **Step 4: Run the tests and confirm pass**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit routing coverage**

```bash
git add src/features/unifiedChat/directAppControl.ts src/features/unifiedChat/directAppControl.test.ts src/features/unifiedChat/requestPolicy.ts src/features/unifiedChat/requestPolicy.test.ts src/features/unifiedChat/turnExecutionPhase.ts src/features/unifiedChat/runUnifiedChatTurn.appControl.test.ts src/features/unifiedChat/agentCapabilityEvalCases.ts src/features/unifiedChat/agentCapabilityEvalCases.test.ts src/features/unifiedChat/requestRoutingEvalCases.ts src/features/unifiedChat/requestRoutingEvalCases.test.ts
git commit -m "feat(chat): route family screen time through typed tools"
```

### Task 10: Add Screen Time Chat analytics and privacy assertions

**Files:**
- Modify: `src/features/unifiedChat/unifiedChatTelemetry.ts`
- Modify: `src/features/unifiedChat/unifiedChatTelemetry.test.ts`
- Modify: `src/services/analytics/events.ts`
- Create: `src/features/unifiedChat/screenTimePrivacy.test.ts`

- [ ] **Step 1: Write failing telemetry/privacy tests**

Track operation id, child membership id, proposal outcome, handoff outcome, saved/applied latency class, and failure code. Assert no app token, content, browsing, message, location, or child behavior score enters evidence, analytics, run events, proposals, or receipts.

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- --runInBand src/features/unifiedChat/unifiedChatTelemetry.test.ts src/features/unifiedChat/screenTimePrivacy.test.ts`

- [ ] **Step 3: Implement typed events and redaction checks**

Use operation ids rather than free-form prompts for outcome analytics. Keep user message content under existing Chat retention policy; do not duplicate it into Screen Time analytics.

- [ ] **Step 4: Run tests and confirm pass**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit analytics and privacy proof**

```bash
git add src/features/unifiedChat/unifiedChatTelemetry.ts src/features/unifiedChat/unifiedChatTelemetry.test.ts src/services/analytics/events.ts src/features/unifiedChat/screenTimePrivacy.test.ts
git commit -m "feat(chat): instrument family screen time control safely"
```

### Task 11: Verify local native/Chat parity

**Files:**
- Regenerate: `docs/agent-code-map.md`
- Update: `docs/delivery-evidence/unified-chat.yml`
- Create: `docs/delivery-evidence/unified-chat/2026-07-30-family-screen-time-local-boundary.md`
- Update: `docs/design-explorations/family-screen-time-simplification/05-evaluate-learning.md`

- [ ] **Step 1: Run focused Screen Time and Chat tests**

Run: `npm test -- --runInBand src/features/household/screenTime src/features/unifiedChat packages/kwilt-agent-runtime/src`

Expected: PASS.

- [ ] **Step 2: Run full repository verification**

Run: `npm run verify:changed -- --run`

Expected: PASS, including app/test typechecks, product lint, architecture lint, code health, and full Jest when selected.

- [ ] **Step 3: Exercise the Simulator matrix**

In mobile Chat, test every Task 9 utterance. Confirm reads match the native card, proposals show one compact diff, decline has no effect, apply produces saved/applying truth, and native handoffs open Charlie's exact route. Repeat one request after reload to prove durable causality and idempotency.

- [ ] **Step 4: Record the local proof boundary**

Mark source/test/Simulator evidence separately from undeployed migration/function state and signed-device enforcement. Do not raise delivery scores for Apple authorization, cross-device application, shields, offline expiry, exceptions, or cleanup.

- [ ] **Step 5: Commit evidence**

```bash
git add docs/agent-code-map.md docs/delivery-evidence/unified-chat.yml docs/delivery-evidence/unified-chat/2026-07-30-family-screen-time-local-boundary.md docs/design-explorations/family-screen-time-simplification/05-evaluate-learning.md
git commit -m "docs(chat): record family screen time control boundary"
```

### Task 12: Prove signed-device behavior before enabling the paid unit

**Files:**
- Update: `docs/design-explorations/family-screen-time-simplification/05-evaluate-learning.md`
- Create: `docs/delivery-evidence/screen-time/2026-07-30-family-chat-testflight-proof.md`

- [ ] **Step 1: Deploy additive backend changes to the approved environment**

Apply the migration and RPCs only after explicit deployment authorization. Record project/environment, migration id, and function/RPC smoke results without credentials.

- [ ] **Step 2: Build and install the signed TestFlight bundle**

Record source commit, EAS build id, bundle version, entitlements, installed device/build provenance, and the caregiver/child device roles.

- [ ] **Step 3: Run the two-device matrix**

Prove create, edit, exception, stale proposal, offline child, delayed receipt, missed push/reconcile, reboot, deactivation, cleanup, and Chat/native parity. Verify either caregiver can decide an exception and the first valid decision closes it.

- [ ] **Step 4: Run the seven-day family learning test**

Record setup friction, comprehension, Chat usage, routine unlock requests, exceptions, failures, and whether schedule-only access is valuable enough before responsibilities.

- [ ] **Step 5: Update the decision artifact**

Promote, simplify, or hold using the decision rule in `05-evaluate-learning.md`. Do not claim the monetizable unit shipped until entitlement, authority, device application, and cleanup are all proven separately.

- [ ] **Step 6: Commit signed proof**

```bash
git add docs/design-explorations/family-screen-time-simplification/05-evaluate-learning.md docs/delivery-evidence/screen-time/2026-07-30-family-chat-testflight-proof.md
git commit -m "docs(screen-time): record family chat TestFlight proof"
```
