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

- [x] Extract AI chat suggestion selection rules
  - Area: `src/features/ai/AiChatScreen.tsx`
  - Why: AI-native high-change surface; model-output filtering and identity repair should not be buried in request orchestration.
  - Result: `activitySuggestionSelection.ts` owns rejected-title filtering, response deduplication, collision-safe IDs, and bounded regeneration merges with focused tests.

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

- [ ] Integrate the existing Quick Add AI preference helper
  - Area: `src/store/useAppStore.ts`
  - Why: `codex/code-quality-refinement-2026-07-01` already contains `uiPreferences.ts`; reconcile that tested normalization contract with the current store instead of reimplementing it.
  - Ideal test: preserve its Quick Add AI preference normalization tests plus store lifecycle/export coverage.
  - Risk: low to medium
