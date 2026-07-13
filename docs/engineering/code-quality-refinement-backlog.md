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

- [ ] Integrate the existing Chapter OpenAI request builder
  - Area: `supabase/functions/chapters-generate/index.ts`
  - Why: `codex/code-quality-refinement-2026-06-30` already contains `chapterOpenAiRequest.ts`; reconcile that tested request-body policy with the current generation function instead of reimplementing it.
  - Ideal test: preserve its Deno request-body policy tests and current function lint.
  - Risk: medium

- [ ] Extract store UI preference slice helpers
  - Area: `src/store/useAppStore.ts`
  - Why: central store remains high-blast-radius; UI preferences are lower-risk than domain mutations.
  - Ideal test: existing store lifecycle/export tests plus focused helper tests if logic emerges.
  - Risk: low to medium
