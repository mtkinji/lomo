# Code Quality Refinement Backlog

This queue keeps the daily code-quality pass focused on one small, high-leverage refinement at a time.

Prioritize by compounding leverage per unit of risk:

- Prefer high-change, high-context files.
- Prefer pure contracts before UI reshaping.
- Add focused tests for extracted behavior.
- Reduce future AI navigation cost.
- Preserve behavior; do not compress code just to reduce line count.

## Queue

- [x] Extract Activity detail date picker defaults
  - Area: `src/features/activities/ActivityDetailScreen.tsx`
  - Why: reminder/due-date picker initialization is scheduling behavior that should be testable outside the large detail screen.
  - Result: `src/features/activities/activityDatePickerDefaults.ts` with focused tests for existing timestamps, next-hour reminder defaults, valid due dates, and invalid due-date fallback.
  - Risk: low

- [x] Extract AI service error parsing
  - Area: `src/services/ai.ts`
  - Why: OpenAI/proxy error classification is a high-risk contract inside a large service.
  - Result: `src/services/aiErrorParsing.ts` with focused tests.

- [ ] Extract Activity detail location-trigger editor rules
  - Area: `src/features/activities/ActivityDetailScreen.tsx`
  - Why: P1 high-change screen; location-trigger behavior should be testable outside JSX.
  - Ideal test: `src/features/activities/activityLocationTriggers.test.ts`
  - Risk: medium

- [ ] Extract AI chat suggestion request/adoption flow helpers
  - Area: `src/features/ai/AiChatScreen.tsx`
  - Why: AI-native high-change surface; remaining suggestion orchestration still increases context radius.
  - Ideal test: focused helper tests around request state and adoption decisions.
  - Risk: medium

- [ ] Extract onboarding Arc generation prompt assembly
  - Area: `src/features/onboarding/IdentityAspirationFlow.tsx`
  - Why: prompt construction is a high-risk AI contract and the screen remains one of the largest files.
  - Ideal test: prompt-builder tests for required rules and identity-signal inclusion.
  - Risk: medium

- [ ] Extract Chapter generation prompt/data assembly
  - Area: `supabase/functions/chapters-generate/index.ts`
  - Why: prompt and data assembly are still coupled to request orchestration in a dense Edge Function.
  - Ideal test: Deno tests around prompt/data helper outputs.
  - Risk: medium

- [ ] Extract store UI preference slice helpers
  - Area: `src/store/useAppStore.ts`
  - Why: central store remains high-blast-radius; UI preferences are lower-risk than domain mutations.
  - Ideal test: existing store lifecycle/export tests plus focused helper tests if logic emerges.
  - Risk: low to medium
