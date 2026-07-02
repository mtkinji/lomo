# Code Quality Refinement Backlog

This queue keeps the daily code-quality pass focused on one small, high-leverage refinement at a time.

Prioritize by compounding leverage per unit of risk:

- Prefer high-change, high-context files.
- Prefer pure contracts before UI reshaping.
- Add focused tests for extracted behavior.
- Reduce future AI navigation cost.
- Preserve behavior; do not compress code just to reduce line count.

## Queue

- [x] Extract Activities quick-add defaults from filter state
  - Area: `src/features/activities/ActivitiesScreen.tsx`
  - Why: creating an Activity while a view/filter is active depends on branchy inheritance rules that were buried inside a large screen.
  - Result: `src/features/activities/activityQuickAddDefaults.ts` with focused tests for AND filters, OR filters, relative date normalization, and tag defaults.
  - Risk: low to medium

- [x] Extract AI service error parsing
  - Area: `src/services/ai.ts`
  - Why: OpenAI/proxy error classification is a high-risk contract inside a large service.
  - Result: `src/services/aiErrorParsing.ts` with focused tests.

- [x] Extract Activity detail location-trigger editor rules
  - Area: `src/features/activities/ActivityDetailScreen.tsx`
  - Why: P1 high-change screen; location-trigger behavior should be testable outside JSX.
  - Result: `src/features/activities/activityLocationTriggers.ts` with focused draft-rule tests.

- [x] Extract AI chat suggestion request/adoption flow helpers
  - Area: `src/features/ai/AiChatScreen.tsx`
  - Why: AI-native high-change surface; remaining suggestion orchestration still increases context radius.
  - Result: `src/features/ai/activitySuggestionRail.ts` with focused suggestion filtering/merge tests.

- [x] Extract onboarding Arc generation prompt assembly
  - Area: `src/features/onboarding/IdentityAspirationFlow.tsx`
  - Why: prompt construction is a high-risk AI contract and the screen remains one of the largest files.
  - Ideal test: prompt-builder tests for required rules and identity-signal inclusion.
  - Result: `src/features/onboarding/identityArcPrompt.ts` with focused prompt-builder tests.
  - Risk: medium

- [x] Extract Chapter generation prompt/data assembly
  - Area: `supabase/functions/chapters-generate/index.ts`
  - Why: prompt and data assembly are still coupled to request orchestration in a dense Edge Function.
  - Ideal test: Deno tests around prompt/data helper outputs.
  - Result: `supabase/functions/chapters-generate/chapterOpenAiRequest.ts` with Deno tests for request-body policy.
  - Risk: medium

- [x] Extract store UI preference slice helpers
  - Area: `src/store/useAppStore.ts`
  - Why: central store remains high-blast-radius; UI preferences are lower-risk than domain mutations.
  - Ideal test: existing store lifecycle/export tests plus focused helper tests if logic emerges.
  - Result: `src/store/uiPreferences.ts` with focused tests for Quick Add AI action preference normalization.
  - Risk: low to medium
