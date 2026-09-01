# Unified Chat Money Review Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make broad Money-category reviews reliably use bounded system evidence, preserve complete public prose, and reject answers whose factual observations are not linked to retrieved evidence.

**Architecture:** Keep routing, evidence shaping, and answer validation separate. The turn contract owns a deterministic broad-review fallback; the Money capability emits one derived category-review digest; the generic context builder substitutes that digest plus category/plan records for raw transaction walls; and the grounded-answer contract uses short internal evidence references that are validated and never rendered to the user.

**Tech Stack:** TypeScript, Jest, React Native Unified Chat runtime, strict JSON-schema model responses.

---

### Task 1: Preserve public first-person openings

**Files:**
- Modify: `src/features/unifiedChat/visibleAssistantText.ts`
- Test: `src/features/unifiedChat/visibleAssistantText.test.ts`

- [ ] **Step 1: Write the failing regression**

Add a multi-paragraph response beginning `I can help with that request.` and assert that the complete public response survives sanitization.

- [ ] **Step 2: Run the focused test and confirm the opening is removed**

Run: `npx jest src/features/unifiedChat/visibleAssistantText.test.ts --runInBand`

Expected: FAIL because the current heuristic treats `request` as internal planning.

- [ ] **Step 3: Narrow internal-paragraph detection**

Retain explicit hidden tags, internal headings, object-id removal, and unmistakable third-person planning such as `I need to decide what the user wants.` Do not classify public first-person language merely because it mentions a request or prompt.

- [ ] **Step 4: Rerun the focused test**

Expected: PASS for both internal-planning removal and public-opening preservation.

### Task 2: Make Money structure reviews broad without semantic planning

**Files:**
- Modify: `src/features/unifiedChat/turnContract.ts`
- Test: `src/features/unifiedChat/turnContract.test.ts`

- [ ] **Step 1: Write the failing fallback-contract test**

Build a turn contract for the reported category-review prompt with a Money capability question and `agentJudgment: null`. Assert `evidenceScope: 'broad'`, `responseContract: 'evidence_linked'`, and `authorization: 'none'`.

- [ ] **Step 2: Run the focused test and confirm fallback scope is focused**

Run: `npx jest src/features/unifiedChat/turnContract.test.ts --runInBand`

Expected: FAIL with received scope `focused`.

- [ ] **Step 3: Add a bounded deterministic review classifier**

Implement a pure helper that returns `broad` only for read-only system/pattern comparisons, including Money category or budget structure questions with review language such as right, better, simpler, merge, split, add, remove, change, or “what do you think.” Preserve focused scope for one category, transaction, or ordinary balance question.

- [ ] **Step 4: Rerun routing tests**

Expected: the reported prompt is broad while focused Money questions remain focused.

### Task 3: Bind grounded facts to retrieved evidence

**Files:**
- Modify: `src/features/unifiedChat/groundedAnswer.ts`
- Modify: `src/features/unifiedChat/turnExecutionPhase.ts`
- Test: `src/features/unifiedChat/groundedAnswer.test.ts`
- Test: `src/features/unifiedChat/turnExecutionPhase.agentJudgment.test.ts`

- [ ] **Step 1: Write failing structured-answer tests**

Require each fact to use `{ text, evidence: ['E1'] }`. Assert that unknown references, missing references when evidence exists, and generic legacy string facts are rejected; assert that validated references do not appear in formatted user-visible text.

- [ ] **Step 2: Run the focused tests and confirm legacy parsing accepts unlinked facts**

Run: `npx jest src/features/unifiedChat/groundedAnswer.test.ts src/features/unifiedChat/turnExecutionPhase.agentJudgment.test.ts --runInBand`

Expected: FAIL until the schema, parser, prompt grounding, and call sites agree.

- [ ] **Step 3: Implement short evidence references**

Number context evidence as `E1`, `E2`, and so on in the model-only grounding. Update the strict response schema so every fact contains text plus evidence references. Validate references against the current context before accepting the response; allow an empty reference list only when no Kwilt evidence was retrieved. Render only fact text.

- [ ] **Step 4: Rerun grounded-answer and execution tests**

Expected: PASS with malformed or ungrounded structured answers routed through the existing repair boundary.

### Task 4: Replace raw transaction walls with a Money review digest

**Files:**
- Modify: `src/features/unifiedChat/capabilityAdapters.ts`
- Modify: `src/features/unifiedChat/buildRunContext.ts`
- Test: `src/features/unifiedChat/capabilityAdapters.test.ts`
- Test: `src/features/unifiedChat/buildRunContext.test.ts`
- Test: `src/features/unifiedChat/turnContextPhase.test.ts`

- [ ] **Step 1: Write failing digest and selection tests**

Assert that Money emits one derived `money_category_review` record summarizing period, freshness, unresolved/outside-plan counts, reserve-style irregular funds, projected risk, low/no activity, and repeated current-period merchants. For a broad category-structure review, assert that context includes the digest plus plan/category records but not individual transactions, and records those transactions as summarized omissions.

- [ ] **Step 2: Run focused evidence tests and confirm raw transactions are attached**

Run: `npx jest src/features/unifiedChat/capabilityAdapters.test.ts src/features/unifiedChat/buildRunContext.test.ts src/features/unifiedChat/turnContextPhase.test.ts --runInBand`

Expected: FAIL because current broad review includes every raw transaction and has no digest.

- [ ] **Step 3: Implement the derived digest and bounded substitution**

Build the digest from existing Money snapshot fields without inventing profitability, cash-safe-until-payday, or long-term recurrence claims. In generic context selection, activate substitution only for broad Money category/budget structure review prompts. Keep raw transactions for focused transaction questions and other requests.

- [ ] **Step 4: Rerun focused evidence tests**

Expected: PASS with honest coverage notes and individual transaction omissions marked `Summarized into the Money category review digest.`

### Task 5: Completion verification

**Files:**
- Verify all files above and generated `docs/agent-code-map.md` if the completion gate refreshes it.

- [ ] **Step 1: Run the combined focused regression suite**

Run: `npx jest src/features/unifiedChat/visibleAssistantText.test.ts src/features/unifiedChat/turnContract.test.ts src/features/unifiedChat/groundedAnswer.test.ts src/features/unifiedChat/turnExecutionPhase.agentJudgment.test.ts src/features/unifiedChat/capabilityAdapters.test.ts src/features/unifiedChat/buildRunContext.test.ts src/features/unifiedChat/turnContextPhase.test.ts src/features/unifiedChat/requestPolicy.test.ts src/features/unifiedChat/unifiedChatBehaviorEvalCases.test.ts --runInBand`

Expected: all non-live tests pass; live model evaluation remains opt-in.

- [ ] **Step 2: Run the task-completion gate once**

Run: `npm run verify:changed -- --run`

Expected: exit 0. Keep focused proof distinct if unrelated dirty-checkout work causes a broader failure.

- [ ] **Step 3: Record the verified Kwilt receipt**

Complete the matching implementation Activity only after source and automated verification pass. Leave live model/device retest as an explicit runtime proof boundary.
