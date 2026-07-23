# Code Quality Refinement Backlog

This queue keeps the daily code-quality pass focused on one small, high-leverage refinement at a time.

Prioritize by compounding leverage per unit of risk:

- Prefer high-change, high-context files.
- Prefer pure contracts before UI reshaping.
- Add focused tests for extracted behavior.
- Reduce future AI navigation cost.
- Preserve behavior; do not compress code just to reduce line count.

## Queue

- [x] Extract AI service error parsing
  - Area: `src/services/ai.ts`
  - Why: OpenAI/proxy error classification is a high-risk contract inside a large service.
  - Result: `src/services/aiErrorParsing.ts` with focused tests.

- [x] Extract Activity detail location-trigger editor rules
  - Area: `src/features/activities/ActivityDetailScreen.tsx`
  - Why: P1 high-change screen; location-trigger behavior should be testable outside JSX.
  - Result: `activityLocationTriggers.ts`, `useActivityLocationEditor.ts`, and focused tests now own the location contract outside the screen.

- [x] Extract AI chat suggestion rail rules
  - Area: `src/features/ai/AiChatScreen.tsx`
  - Why: AI-native high-change surface; model-output filtering and identity repair should not be buried in request orchestration.
  - Result: `activitySuggestionRail.ts` owns rejected-title filtering, response deduplication, collision-safe IDs, and bounded regeneration merges with focused tests.

- [x] Extract AI chat suggestion request state transitions
  - Area: `src/features/ai/AiChatScreen.tsx`
  - Why: suggestion request success, quota, and transport-error transitions remain coupled inside the screen.
  - Result: `activitySuggestionRequestState.ts` now owns bootstrap, regeneration, quota, and transport-error outcomes with focused tests.

- [x] Integrate the existing onboarding Arc prompt extraction
  - Area: `src/features/onboarding/IdentityAspirationFlow.tsx`
  - Why: `codex/code-quality-refinement-2026-06-29` already contains the tested `identityArcPrompt.ts` extraction; reuse and reconcile that work instead of reimplementing it.
  - Result: `identityArcPrompt.ts` now owns the prompt contract with focused tests, including current FTUX Goal+Arc guidance and reviewer-feedback retries.

- [x] Integrate the existing Chapter OpenAI request builder
  - Area: `supabase/functions/chapters-generate/index.ts`
  - Why: `codex/code-quality-refinement-2026-06-30` already contains `chapterOpenAiRequest.ts`; reconcile that tested request-body policy with the current generation function instead of reimplementing it.
  - Result: `chapterOpenAiRequest.ts` owns token, temperature, strict-retry, and JSON response-format policy with Deno tests; the test script now discovers all Chapter Deno tests.

- [x] Integrate the existing Quick Add AI preference helper
  - Area: `src/store/useAppStore.ts`
  - Why: `codex/code-quality-refinement-2026-07-01` already contains `uiPreferences.ts`; reconcile that tested normalization contract with the current store instead of reimplementing it.
  - Result: `uiPreferences.ts` owns legacy fallback, intentional empty selections, validation, deduplication, and canonical ordering with focused tests.

- [x] Integrate the existing Activities quick-add filter defaults
  - Area: `src/features/activities/ActivitiesScreen.tsx`
  - Why: `codex/code-quality-refinement-2026-07-02` already contains `activityQuickAddDefaults.ts`; reuse its tested filter-default contract instead of re-reading the 4,000-line screen.
  - Result: `activityQuickAddDefaults.ts` now owns AND/OR filter inheritance, relative date normalization, conservative defaults, and active-tag fallback with focused tests.

- [x] Integrate the existing Goal progress-signal summaries
  - Area: `src/features/arcs/GoalDetailScreen.tsx`
  - Why: `codex/code-quality-refinement-2026-07-03` already contains a tested `goalProgressSignals.ts` extraction for the largest remaining feature screen.
  - Result: `goalProgressSignals.ts` now owns completion counts, weekly momentum, target-date labels and colors, and next-scheduled labels with focused tests.

- [x] Integrate the existing Activity date-picker defaults
  - Area: `src/features/activities/ActivityDetailScreen.tsx`
  - Why: `codex/code-quality-refinement-2026-07-05` already contains a tested `activityDatePickerDefaults.ts` extraction for reminder and due-date initialization.
  - Result: `activityDatePickerDefaults.ts` now owns existing-value reuse, next-hour reminder defaults, valid due dates, and invalid due-date fallback with focused tests.

- [x] Reuse Activity picker defaults in Goal quick add
  - Area: `src/features/arcs/GoalDetailScreen.tsx`
  - Why: the Goal quick-add dock independently implements the same reminder and due-date initialization contract.
  - Result: Goal quick add now delegates existing-value reuse, next-hour reminder defaults, and safe due-date fallback to `activityDatePickerDefaults.ts`.

- [x] Extract Goal target-date picker defaults
  - Area: `src/features/arcs/GoalDetailScreen.tsx`
  - Why: valid-date reuse plus the 14-day end-of-day fallback is a scheduling rule embedded in the largest screen.
  - Result: `goalTargetDatePickerDefaults.ts` now owns valid-date reuse and the 14-day local end-of-day fallback with focused tests.

- [x] Extract Goal first-plan-activity selection
  - Area: `src/features/arcs/GoalDetailScreen.tsx`
  - Why: active-first selection, manual ordering, creation-time tie-breaking, and all-complete fallback are embedded in screen composition.
  - Result: `goalFirstPlanActivity.ts` now owns active selection, manual ordering, creation-time tie-breaking, and completed-only fallback with focused tests.

- [x] Extract AI Goal proposal merge policy
  - Area: `src/features/arcs/GoalDetailScreen.tsx`
  - Why: generated title, description, target date, metrics, priority, and quality-state merging is a high-risk model-output contract embedded in UI orchestration.
  - Result: `goalProposalMerge.ts` now owns partial proposal normalization, field preservation, explicit metric clearing, priority updates, and ready/draft transitions with focused tests.

- [x] Extract AI Goal refinement prompt builder
  - Area: `src/features/arcs/GoalDetailScreen.tsx`
  - Why: the focused-goal snapshot, metric summary, and refinement instructions form a prompt contract embedded in screen orchestration.
  - Result: `goalRefinementPrompt.ts` now owns target context, capped metric summaries, and required refinement instructions without unchecked casts, with focused tests.

- [ ] Extract Goal share-preview URL policy
  - Area: `src/features/arcs/GoalDetailScreen.tsx`
  - Why: external share previews must reject blank, malformed, and device-local image URLs while retaining public HTTP(S) images.
  - Ideal test: pin blank, malformed, local-scheme, HTTP, and HTTPS values.
  - Risk: low
