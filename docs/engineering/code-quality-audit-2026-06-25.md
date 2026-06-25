# Code quality and AI-coding audit

Date: 2026-06-25

Branch: `codex/code-quality-audit`

## Executive recommendation

Kwilt is not collapsing under complexity. The repo has strong product guardrails, strict TypeScript, a useful agent code map, feature manifests, diff-aware verification, 100 Jest test files, and green local checks. The main risk is different: several high-change surfaces have become too large for fast, reliable AI-assisted editing.

The highest-leverage improvement is a "context radius reduction" program:

1. Keep the existing architecture and verification stack.
2. Add lightweight health ratchets that make future growth visible.
3. Gradually extract pure helpers, hooks, reducers, and typed service modules from the largest files.
4. Put tests around those extracted seams instead of trying to render-test 5,000-line screens.

I would not recommend a broad rewrite. The codebase is healthy enough that targeted gardening will compound faster than a reset.

## Evidence gathered

Local verification on this branch:

- `npm run lint -- --pretty false`: passed.
- `npm run lint:tests -- --pretty false`: passed.
- `npm run lint:supabase-functions`: passed.
- `npm run product:lint`: passed with 0 errors and 0 warnings.
- `npm run architecture:lint`: passed with 11 warnings.
- `npm test -- --runInBand`: 100 suites passed, 853 tests passed.

Tracked code shape:

- 1,030 tracked repo files.
- 621 tracked code files (`ts`, `tsx`, `js`, `jsx`, `mjs`).
- 188,906 tracked code lines in those files.
- 44 tracked code files are 800+ lines.
- 14 tracked code files are 1,500+ lines.

Largest files:

| File | Lines | Why it matters |
| --- | ---: | --- |
| `src/features/activities/ActivityDetailScreen.tsx` | 6,239 | Biggest UI/editing hotspot; imports 109 modules and has 31 `useState`, 38 `useEffect`, 45 `useMemo`, 34 `useCallback` calls. |
| `src/features/arcs/GoalDetailScreen.tsx` | 6,084 | Dense goal canvas, AI enrichment, attachments, sharing, navigation, and editing behaviors in one file. |
| `src/features/ai/AiChatScreen.tsx` | 5,922 | Chat UI, workflow plumbing, handoff parsing, draft persistence, suggestions, and composer behavior are coupled. |
| `src/features/onboarding/IdentityAspirationFlow.tsx` | 5,288 | Tap-first onboarding, AI generation, scoring, retries, visuals, and persistence sit together. |
| `src/store/useAppStore.ts` | 4,063 | Central store mixes domain data, UI prefs, migrations, lifecycle, credits, search, notifications, and cleanup. |
| `src/services/ai.ts` | 3,943 | Prompt construction, proxy calls, quota behavior, parsing, fallback, and debug logging share one service. |
| `supabase/functions/chapters-generate/index.ts` | 3,133 | Data reads, metrics, prompt generation, validation, and persistence are packed into one Edge Function. |
| `src/features/activities/ActivitiesScreen.tsx` | 3,801 | Primary list surface plus view state, grouping, chrome behavior, and quick actions. |
| `src/services/NotificationService.ts` | 2,571 | Many notification domains in one service. |

Test coverage shape:

- There are 100 test files and roughly 829 explicit `it`/`test` calls.
- Services, domain, store, and activities have meaningful focused tests.
- The `ai` feature folder has 9,292 TS/TSX lines and 0 colocated tests.
- The largest feature screens are mostly excluded from Jest coverage accounting in `jest.config.js`.
- Current coverage thresholds are intentionally low: statements 15, branches 12, functions 14, lines 16.

Guardrail shape:

- `tsconfig.json` has `"strict": true`.
- No `@ts-ignore` instances were found in tracked app/package/function/script code.
- The repo has an agent code map and feature manifests that orient future agents.
- `architecture:lint` already blocks direct `components/ui/*` imports and warns on feature files importing raw React Native `Text`.
- Current architecture warnings are concentrated in 11 feature files, mostly activities and arcs.

Softness indicators:

- 910 `as any` occurrences and 477 explicit `any`-style matches across tracked source/function/script/plugin code.
- The largest concentrations are in `supabase/functions/chapters-generate/index.ts`, `src/store/useAppStore.ts`, `supabase/functions/pro-codes/index.ts`, `src/features/ai/AiChatScreen.tsx`, and `src/features/activities/ActivityDetailScreen.tsx`.
- 336 `console.*` calls were found, including app/service code. Some are useful diagnostics, but production/runtime logging does not appear centrally governed.

CI and automation gaps:

- `.github/workflows/ci.yml` runs typecheck, test typecheck, product lint, architecture lint, and Jest coverage, but does not run `npm run lint:supabase-functions`.
- `.github/workflows/e2e-maestro.yml` has a `maestro-smoke` job guarded with `if: github.event_name == 'pull_request'`, but the workflow trigger currently only includes `workflow_dispatch` and `schedule`. As written, the PR smoke job cannot run on pull requests.
- Visual and Maestro infrastructure exists, which is good, but it needs the trigger wiring to match the documented testing strategy.

## The core problem

The repo's quality risk is not a missing framework or bad foundations. It is a context-radius problem.

An AI coding pass becomes slower and riskier when the relevant behavior is distributed across one 5,000-line screen with dozens of hooks, native integrations, store actions, network calls, and UI variants. Even with green tests, the agent has to hold too much in working context to make a small change confidently.

The best optimization for vibe coding is therefore not "more comments" or "more docs" by itself. It is smaller, named, tested units that match the jobs agents actually perform:

- "change Activity scheduling behavior"
- "change AI handoff parsing"
- "change onboarding Arc quality scoring"
- "change domain persistence"
- "change Chapter prompt validation"

Each should have an obvious file, a small test target, and a documented owner boundary.

## Prioritized recommendations

### 1. Add a code-health ratchet

Add a script like `npm run code:health` that reports and optionally fails on:

- files above 800, 1,500, and 3,000 lines;
- growth in already-large files compared with `main`;
- `as any` / explicit `any` counts;
- raw `Text` architecture warnings;
- missing tests for new pure helpers;
- coverage ignore list growth.

Start warning-only for legacy debt. Fail only on new regressions, for example:

- new file above 800 lines;
- existing 1,500+ line file grows by more than 100 lines without an allowlist note;
- new `@ts-ignore`;
- new direct `components/ui/*` import;
- new `console.log` in `src` outside an approved logger.

Why this helps AI coding: it gives every agent a numeric "do not make the burden worse" contract without forcing a painful legacy cleanup first.

### 2. Fix verification wiring before adding more feature work

Low-risk, high-confidence fixes:

- Add `npm run lint:supabase-functions` to CI.
- Add `pull_request` to `.github/workflows/e2e-maestro.yml` or remove the impossible PR-only job condition.
- Keep `npm run verify:changed -- --run` as the local handoff gate.
- Add a short CI note to `docs/agent-code-map.md` once wiring changes.

Why this helps AI coding: agents trust automation. If the documented smoke lane is not actually running, future agents will overestimate coverage.

### 3. Put budgets around the largest files, then extract gradually

Do not start by splitting everything. Start with the files that create the most agent drag:

| Priority | File | First extraction targets |
| --- | --- | --- |
| P1 | `ActivityDetailScreen.tsx` | Scheduling drawer/controller, attachments controller, location-trigger editor, cover-image flow, focus-session native effects. |
| P1 | `AiChatScreen.tsx` | JSON handoff parsers, draft persistence, timeline controller types, composer state, suggestion request flow. |
| P1 | `useAppStore.ts` | Domain reducers/actions, persisted migration/normalization helpers, UI preference slices. |
| P2 | `GoalDetailScreen.tsx` | Activity enrichment/adoption flow, Arc selector, cover image upload, partner/check-in panels. |
| P2 | `IdentityAspirationFlow.tsx` | Arc candidate generation, quality scoring, retry policy, banner query generation. |
| P2 | `services/ai.ts` | Proxy client, prompt builders, response parsers, quota/paywall policy, debug logging. |
| P2 | `chapters-generate/index.ts` | Data loading, metrics assembly, prompt builder, output validator, persistence. |

Extraction rule:

- Extract pure logic first.
- Add focused tests to the extracted unit.
- Keep UI behavior unchanged.
- Avoid moving styles and JSX just to reduce line count unless a component boundary is obvious.

### 4. Make AI contracts first-class and testable

The AI area is the least locally tested relative to its importance. The key is not to snapshot-test conversational UI. The key is to test contracts:

- parse `ARC_PROPOSAL_JSON`, `ACTIVITY_SUGGESTIONS_JSON`, `ACTIVITY_PROPOSAL_JSON`, `GOAL_PROPOSAL_JSON`, and `AGENT_OFFERS_JSON`;
- validate workflow step transitions;
- test prompt builders and truncation rules;
- test quota/paywall routing;
- test fallback behavior when proxy/env is missing.

Suggested first files:

- `src/features/ai/agentHandoffParsers.ts`
- `src/features/ai/agentHandoffParsers.test.ts`
- `src/features/ai/chatDraftStorage.ts`
- `src/features/ai/chatDraftStorage.test.ts`

Why this helps AI coding: future feature work can edit AI behavior without rereading the entire chat screen.

### 5. Split the central store by responsibility

`useAppStore.ts` is currently a high-value but high-blast-radius file. It has tests, which is good, but it also has a large share of loose typing and migration complexity.

Recommended shape:

- `src/store/domainStoreActions.ts` for Arc/Goal/Activity mutations.
- `src/store/domainPersistence.ts` for user-scoped persistence and hydration.
- `src/store/domainMigrations.ts` for legacy normalization and cleanup.
- `src/store/uiPreferencesSlice.ts` for local UI settings.
- Keep `useAppStore.ts` as the assembly point until the split is proven.

Do this incrementally. Every extracted helper should be pure or mostly pure and covered by focused tests.

### 6. Modularize Supabase functions by use case

The Supabase function tree has many small functions, but `chapters-generate` and `pro-codes` are too dense. `chapters-generate` is especially important because it combines business logic, prompt rules, model output validation, and persistence.

Recommended shape for `supabase/functions/chapters-generate/`:

- `index.ts`: request/auth orchestration only.
- `data.ts`: database reads and row normalization.
- `metrics.ts`: Chapter metrics assembly.
- `prompt.ts`: prompt construction.
- `validateOutput.ts`: output parsing and validation.
- `persist.ts`: upsert/writeback.
- `__tests__/`: Deno tests or shared tests for prompt and validation logic.

Also consider generated Supabase row types or Zod-style validators so function code stops leaning on `any`.

### 7. Turn architecture warnings into a migration plan

`architecture:lint` currently warns on 11 raw `Text` imports in feature files. Keep it warning-only for legacy files, but add a plan:

- When editing a warned file, convert nearby on-canvas copy to `src/ui` typography.
- Make `architecture:lint` report counts by feature.
- Fail on new raw `Text` imports in feature files that are not already on the allowlist.

This preserves momentum while preventing visual-system drift.

### 8. Normalize runtime logging

Several app and service files use `console.*` directly. Some logs are dev diagnostics; some can leak noisy production output or hide signal in tests.

Recommendation:

- Add `src/services/logger.ts` with `debug`, `info`, `warn`, `error`.
- Gate debug/info logs behind `__DEV__` or app environment.
- Allow `console.*` in scripts, tests, and Supabase functions where appropriate.
- Add a code-health warning for new direct `console.log` in `src`.

### 9. Raise coverage through extracted seams, not screen rendering

The current coverage config intentionally ignores large feature surfaces. That is reasonable for where the repo is, but it should not stay static.

Recommended ratchet:

- Every extraction from a large screen includes tests.
- Coverage thresholds rise only after measured improvement.
- Feature folders can graduate out of `coveragePathIgnorePatterns` one slice at a time.
- Start with AI parsers, Activity scheduling helpers, store migrations, and Chapter validators.

## Suggested implementation sequence

### First branch: guardrails and wiring

Goal: make the repo harder to accidentally worsen.

- Add `code:health` script in warning mode.
- Add CI `lint:supabase-functions`.
- Fix the Maestro PR trigger.
- Add architecture-lint allowlist behavior for legacy raw `Text` warnings.
- Update `docs/agent-code-map.md` with the new commands.

Expected risk: low.

### Second branch: AI chat contracts

Goal: reduce risk around the most AI-native surface.

- Extract handoff parsers from `AiChatScreen.tsx`.
- Add parser tests.
- Extract chat draft storage.
- Add draft storage tests.
- Keep UI unchanged.

Expected risk: low to medium.

### Third branch: Activity detail context-radius reduction

Goal: make the most frequently edited screen easier to change.

- Pick one bounded subdomain, preferably scheduling or attachments.
- Extract a controller/helper with tests.
- Avoid broad JSX reshaping.
- Update the `activities` feature manifest notes if the ownership boundary changes.

Expected risk: medium because Activity detail is native/integration-heavy.

### Fourth branch: store and Chapter function modularization

Goal: reduce blast radius in persistence and generated retrospectives.

- Extract store migration/normalization helpers first.
- Split `chapters-generate` into prompt/metrics/validation/data modules.
- Add focused tests around the extracted functions.

Expected risk: medium.

## Definition of success

This audit should be considered successful when:

- New work rarely needs to edit a 5,000-line file directly.
- Future agents can identify the right owner file in under a minute.
- `verify:changed` and CI agree on the relevant gates.
- Large-file counts stop growing.
- `as any` counts decline in the top hotspots.
- AI behavior changes have parser/prompt/workflow tests instead of relying on manual transcript inspection.
- Supabase function changes get Deno-checked in CI.

The short version: Kwilt already has good bones. The next quality move is to make the bones more visible to agents and to stop the biggest muscles from absorbing every new feature.
