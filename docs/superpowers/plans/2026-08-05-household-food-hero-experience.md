# Household Food Hero Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete Household Food hero scenario: begin with meals, a real spending boundary, food already on hand, or a worthwhile store opportunity; capture and trust a Recipe; collaboratively finalize a flexible meal horizon; compile and economically review groceries; reach an honest purchase handoff; and cook through a visually compelling, resumable, hands-free session that makes the next cycle easier.

**Architecture:** Recipes, Meal Planning, Groceries, and Money remain independent capability owners joined by immutable snapshots and purpose-limited projections. Money owns durable budget truth; Groceries owns trip targets, confidence-aware stock observations, store opportunities, basket scenarios, price/offer evidence, and receipts; Meal Planning owns reviewed meal changes. Food Home, Activities, Shared Home, Chat, and voice are entry or operating surfaces, never alternate owners. A new deterministic Recipe Cook Session state machine owns cooking progress and timers; AI resolves bounded operations and recipe-grounded questions through the existing capability-operation and proposal/receipt architecture. Server authority uses account-scoped Supabase tables/RLS/RPCs, while user-keyed caches preserve useful read and active-cook behavior offline. Retailer integrations stay behind server adapters with evidence states, idempotency, remote disablement, and permanent plain-list fallback.

**Tech Stack:** Expo SDK 55, React Native 0.83, React Navigation 7, Zustand 5, Expo Audio, Expo Keep Awake, Expo Notifications, Supabase Postgres/RLS/Realtime/Storage/Edge Functions, Deno TypeScript, `packages/food-core`, Kwilt agent runtime, Jest/RNTL, pgTAP, PostHog feature flags and analytics, Instacart Developer Platform, and Kroger Public APIs.

---

## Implementation status — 2026-08-06

The private-loop source implementation and automated verification pass are
complete enough for an integrated dogfood build, but the program is not release
complete. Six Food migrations, four Edge Functions, capability repositories,
screens, deterministic domains, AI operation contracts, privacy-safe analytics
contracts, and permanent fallbacks now exist. The full diff-aware gate passes:
the full Jest suite, 48 Deno tests, app and test typechecks, Edge Function
checks, product lint, Chat contracts, and architecture lint.

Open proof and integration gates are maintained in
[`release-readiness.md`](../../verification/household-food/release-readiness.md)
and the [15-step playthrough ledger](../../verification/household-food/hero-playthrough.md).
Most importantly: G0 is blocked because no authorized Supabase project is
linked; G3/G4/G6/G8 require physical device, separate account, provider, visual,
and TestFlight evidence; and cross-capability scenario acceptance now atomically
preserves a private, durable `partially_applied` recovery receipt containing the
baseline and pending owner diffs instead of pretending a cross-capability rewrite
occurred. Unchecked task boxes below therefore remain release evidence
requirements even where the corresponding source path exists.

---

## Source of truth and relationship to earlier plans

Implement against these product contracts in order:

1. [`Maya: feed the household with less work`](../../job-flows/maya-feed-household-with-less-work.md)
2. [`Household Food Hero Experience`](../../design-explorations/meals-recipes-groceries/06-hero-experience.md)
3. [`Thrift, Budget, and Pantry Workback`](../../design-explorations/meals-recipes-groceries/07-thrift-budget-pantry-workback.md)
4. [`Household Food Loop`](../../feature-briefs/household-food-loop.md)
5. [`Food object models`](../../design-explorations/meals-recipes-groceries/object-models.md)
6. [`Food AI operating layer`](../../design-explorations/food-ai-operating-layer/03-converge.md)

This plan supersedes `2026-08-05-household-food-program.md` when sequencing or
acceptance differs. The earlier preflight and phase 0–5 plans remain detailed
references for existing schema, provider, sharing, and discovery decisions; do
not redo completed work merely because it appears in those documents. At the
start of each task, compare current source, migration state, and verification
evidence with the task exit gate and mark already-proven steps complete.

The current Food worktree contains source and tests across Recipes, Meal
Planning, Groceries, Cook Sessions, thrift/stock/scenarios, and Savings, plus
migrations dated `20260806010000` through `20260806060000`. The configured
backend has not yet proven those migrations or RPCs. No implementation task may
infer backend readiness from files on disk.

## Release spine

```text
Foundation truth
      ↓
Recipe trust ──→ Recipe Home ──→ Cook Session ──→ foreground voice
      ↓                │
Money envelope + stock observations + store opportunity
      ↓                         ↓
Next meals ←────────────────────┘
      ↓
Household choice → final plan version
      ↓
Grocery compilation → review → savings → retailer/plain handoff
      ↓
Post-cook learning → prepared next cycle
```

The first release candidate must complete the vertical spine with fallbacks.
Public recipe discovery, automatic coupon activation, and additional retailer
depth cannot delay a complete private loop.

## Program gates

| Gate | Required evidence | If it fails |
| --- | --- | --- |
| G0 Backend target | Intended project ref, migration ledger, remote schema/RPC inventory, and redacted evidence artifact | Stop server-backed implementation; local fixtures may continue but cannot be called integrated |
| G1 Private Recipe | Real URL and photo imports, review, storage/RLS, offline read, edit/version, export, delete | Keep manual capture and local fixtures behind internal flag |
| G2 Cook core | Deterministic state tests plus physical-device resume, screen awake, timer notification, and touch completion | Ship Recipe Home without voice; do not call existing scroll view Cook Mode |
| G3 Voice feasibility | Physical-device latency, interruption, noise, privacy, battery, and fallback evidence | Ship push-to-talk or touch-only; do not promise continuous hands-free or wake word |
| G4 Household | Two separate signed accounts/devices prove exact invitation, private response, organizer finalization, revoke/expiry | Release organizer-only planning first |
| G5 Grocery truth | Finalized plan version compiles reproducibly; corrections and provenance survive relaunch | Preserve manual list creation and export; do not hand off suspect quantities |
| G5A Thrift truth | Money projection, trip target, stock confidence, basket range/coverage, store opportunity, scenario diff, and receipt outcome remain distinguishable | Keep budget/stock/sale inputs optional; do not market adaptive thrift claims |
| G6 Provider | Development credentials, Utah coverage, idempotency, ambiguous-write behavior, disable switch | Keep plain list as primary; provider remains experimental |
| G7 Savings | Current store/product evidence and optimizer output can be explained item by item | Hide Savings Autopilot; never fabricate a coupon or price |
| G8 Release | Uncut hero playthrough, accessibility/device gates, analytics/database agreement, TestFlight dogfood | Do not advance feature flag beyond internal cohort |

## Phase A — Establish truthful foundations

### Task 1: Reconcile the worktree with the intended backend

**Files:**

- Inspect: `supabase/config.toml`
- Inspect: `supabase/migrations/20260806010000_private_recipes.sql`
- Inspect: `supabase/migrations/20260806020000_meal_planning.sql`
- Inspect: `supabase/migrations/20260806030000_groceries.sql`
- Create: `docs/verification/household-food/backend-preflight.md`
- Modify only if drift is found: the three Food migrations above

- [x] Record branch, HEAD, dirty state, Supabase project ref, CLI version, and
  migration hashes before any remote action.
- [ ] Read the remote migration ledger and schema/RPC inventory without applying
  migrations. Redact secrets and person data in the artifact.
- [x] Compare migration dependencies, grants, RLS policies, realtime publication,
  storage policies, and RPC signatures with the TypeScript repositories.
- [ ] Run migrations against a disposable local Supabase database and prove the
  happy path and cross-account denial path with pgTAP.
- [x] If the configured remote is not explicitly authorized for Food changes,
  stop at a copy-pasteable apply command and record G0 as blocked. Never deploy
  merely because local migration tests passed.

> 2026-08-05 proof boundary: remote inventory is unavailable because this
> worktree has no linked project ref; local migration/pgTAP proof is unavailable
> because Docker is not running. Both boxes remain open. Repository contract
> tests pass, no remote action was attempted, and G0 is recorded as
> `blocked_external` in `docs/verification/household-food/backend-preflight.md`.

Run:

```bash
supabase db reset
supabase test db
npm test -- --runInBand src/capabilities/recipes/data/recipeRepository.test.ts src/capabilities/meal-planning/data/mealPlanningRepository.test.ts src/capabilities/groceries/data/groceryRepository.test.ts
```

Expected: migrations apply locally; pgTAP and repository tests pass; the evidence
artifact states exactly which backend, if any, has the Food schema.

**Commit:** `docs(food): record backend preflight evidence`

### Task 2: Close cross-capability snapshots and idempotency

**Files:**

- Modify: `src/capabilities/recipes/domain/recipeContracts.ts`
- Modify: `src/capabilities/meal-planning/domain/mealPlanContracts.ts`
- Modify: `src/capabilities/groceries/domain/groceryContracts.ts`
- Modify: `packages/food-core/src/index.ts`
- Test: corresponding `*.test.ts` files and `packages/food-core/src/compiler.test.ts`

- [x] Write failing tests proving a plan entry pins `recipeVersionId`, servings,
  title/media display snapshot, and source type without embedding mutable Recipe
  authority.
- [x] Write failing tests proving a GroceryList pins one finalized plan version
  and each generated quantity retains meal-entry and ingredient-line provenance.
- [x] Add explicit idempotency keys and content hashes for plan finalization,
  grocery compilation, and provider handoff. Reject same key/different payload.
- [x] Add version-mismatch errors that can be rendered as recovery choices rather
  than generic failures.
- [x] Implement the smallest contract/compiler changes that pass the tests.

Run:

```bash
npm test -- --runInBand src/capabilities/recipes/domain/recipeContracts.test.ts src/capabilities/meal-planning/domain/mealPlanContracts.test.ts src/capabilities/groceries/domain/groceryContracts.test.ts packages/food-core/src/compiler.test.ts
```

Expected: PASS, including stale-version and same-key/different-payload cases.

**Commit:** `feat(food): close immutable cross-capability snapshots`

## Phase B — Make Recipes trustworthy and desirable

### Task 3: Finish evidence-backed photo and URL import

**Files:**

- Modify: `src/capabilities/recipes/domain/recipeImportContracts.ts`
- Modify: `src/capabilities/recipes/data/recipeImportRepository.ts`
- Modify: `src/capabilities/recipes/screens/RecipeImportReviewScreen.tsx`
- Create: `src/capabilities/recipes/components/ImportEvidenceViewer.tsx`
- Create/modify: `supabase/functions/recipe-import/index.ts`
- Tests: `recipeImportContracts.test.ts`, `RecipeImportReviewScreen.test.tsx`, and
  `supabase/functions/recipe-import/index.test.ts`
- Evidence: `docs/verification/household-food/import-corpus.md`

- [ ] Assemble a rights-respecting 50-source corpus covering JSON-LD, prose-only,
  paywall/error, multi-recipe page, long family post, fractions/ranges, sections,
  and adversarial page instructions. Store URLs and expected structure, not
  copied publisher expression.
- [ ] Write failing parser tests for strict output, evidence ranges, confidence,
  unit normalization, instruction order, source attribution, prompt injection,
  size/time limits, and partial extraction.
- [ ] Add signed upload/photo capture and URL input paths that create temporary
  import artifacts, never canonical Recipes.
- [ ] Render each uncertain field with its source crop/text and let the user
  correct, remove, or retry that field without losing other corrections.
- [ ] Require explicit source/rights choice and approval before one idempotent
  canonical save.
- [ ] Prove artifact expiry, private storage policy, retry, offline interruption,
  and complete deletion.

Run:

```bash
npm test -- --runInBand src/capabilities/recipes/domain/recipeImportContracts.test.ts src/capabilities/recipes/screens/RecipeImportReviewScreen.test.tsx
deno test supabase/functions/recipe-import/index.test.ts
```

Expected: PASS; corpus report includes field accuracy, unsafe-instruction
resistance, failure categories, median/P95 latency, and retention behavior.

**Commit:** `feat(recipes): complete evidence-backed import review`

### Task 4: Build the visual Recipe Home

**Files:**

- Create: `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`
- Create: `src/capabilities/recipes/components/RecipeHero.tsx`
- Create: `src/capabilities/recipes/components/RecipeSummaryBar.tsx`
- Create: `src/capabilities/recipes/components/RecipeIngredientList.tsx`
- Create: `src/capabilities/recipes/components/RecipeMethodPreview.tsx`
- Create: `src/capabilities/recipes/components/RecipeActionsMenu.tsx`
- Modify: `src/features/household-food/FoodNavigator.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeLibraryScreen.tsx`
- Retire after migration: `src/capabilities/recipes/screens/RecipeCookingScreen.tsx`
- Tests: `RecipeHomeScreen.test.tsx`, `RecipeLibraryScreen.test.tsx`

- [ ] Add a `RecipeHome` route and change library navigation to it. Keep an
  interim alias for `RecipeCooking` deep links until callers and tests migrate.
- [ ] Implement rights-aware hero media, title/description, prep/cook/total time,
  yield, credits/provenance, and missing-media treatment from the visual contract.
- [ ] Put **Add to Next meals** and **Start cooking** in the first action region;
  move edit, export, sharing, history, and delete to a clearly labeled menu.
- [ ] Reuse deterministic scaling, but render one coherent ingredient line. For
  safely parsed lines, replace the displayed quantity while preserving preparation
  text; for unsafe lines, show original text only.
- [ ] Add ingredient check state that is local to the viewing/cooking context and
  never mutates the canonical Recipe version.
- [ ] Add source, family attribution, notes, access state, and version disclosure
  below the cooking content without turning the screen into an audit log.
- [ ] Capture screenshots for user photo, catalog image, missing media, long title,
  incomplete times, four serving scales, dark mode, and large Dynamic Type.

Run:

```bash
npm test -- --runInBand src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx src/capabilities/recipes/domain/recipeScaling.test.ts
npm run lint
```

Expected: PASS; visual review shows no contradictory quantities, clipped actions,
or publisher media outside its rights state.

**Commit:** `feat(recipes): add appetite-first recipe home`

### Task 5: Connect Recipe Home to the active plan

**Files:**

- Create: `src/capabilities/recipes/components/AddToMealPlanSheet.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`
- Modify: `src/capabilities/meal-planning/data/mealPlanningRepository.ts`
- Modify: `src/capabilities/meal-planning/domain/mealPlanLifecycle.ts`
- Tests: `AddToMealPlanSheet.test.tsx`, `mealPlanLifecycle.test.ts`

- [ ] Write tests for adding the current immutable Recipe version and selected
  servings to an existing draft plan.
- [ ] Write tests for the four horizon choices: next shop, meal count, date range,
  and open collecting.
- [ ] Implement the sheet with one decision at a time and an idempotent add.
- [ ] On success, show **Added to Next 4 dinners** with **View plan** and undo.
- [ ] If the plan was finalized or changed on another device, preserve the user’s
  intent and offer **Start a new plan** or **Add to draft copy**.

Run:

```bash
npm test -- --runInBand src/capabilities/recipes/components/AddToMealPlanSheet.test.tsx src/capabilities/meal-planning/domain/mealPlanLifecycle.test.ts
```

Expected: PASS, including duplicate tap and stale-plan recovery.

**Commit:** `feat(food): connect recipe home to next meals`

## Phase C — Build stateful Cook Mode

### Task 6: Add Cook Session domain and persistence

**Files:**

- Create: `src/capabilities/recipes/domain/recipeCookContracts.ts`
- Create: `src/capabilities/recipes/domain/recipeCookStateMachine.ts`
- Create: `src/capabilities/recipes/domain/recipeCookCueBuilder.ts`
- Create: `src/capabilities/recipes/domain/recipeCookContracts.test.ts`
- Create: `src/capabilities/recipes/domain/recipeCookStateMachine.test.ts`
- Create: `src/capabilities/recipes/domain/recipeCookCueBuilder.test.ts`
- Create: `src/capabilities/recipes/data/recipeCookCache.ts`
- Create: `src/capabilities/recipes/data/recipeCookRepository.ts`
- Create: `supabase/migrations/20260806040000_recipe_cook_sessions.sql`
- Add pgTAP tests beside existing Food database tests.

- [ ] Define `RecipeCookSession` with owner, exact Recipe/version, serving scale,
  status, current cue, cue count, started/paused/completed timestamps, revision,
  and last-device metadata. Limit one active session per person/Recipe unless a
  later design explicitly supports multiple.
- [ ] Define `CookCue` as derived presentation: instruction reference, display
  text, structured ingredient references, detected timer suggestions, section,
  and accessibility label. Do not store generated prose as authority.
- [ ] Define `CookTimer` with deterministic local ID, cue origin, duration,
  started/paused/fire timestamps, status, notification ID, and sync state.
- [ ] Define `RecipeCookRecord` as completed-session evidence and optional private
  note/feedback; it never mutates a Recipe version implicitly.
- [ ] Write transition-table tests for start, resume, next, back, repeat/read,
  pause, timer actions, finish, abandon, stale revision, relaunch, offline change,
  and Recipe-version change.
- [ ] Build cues deterministically from structured instructions and ingredient
  references. Low-confidence matches omit inline quantity rather than hallucinate.
- [ ] Persist active state user-keyed locally first, then synchronize validated
  state with owner-only RLS and optimistic revision checks.

Run:

```bash
npm test -- --runInBand src/capabilities/recipes/domain/recipeCookContracts.test.ts src/capabilities/recipes/domain/recipeCookStateMachine.test.ts src/capabilities/recipes/domain/recipeCookCueBuilder.test.ts
supabase db reset && supabase test db
```

Expected: PASS; transition coverage includes every event/state pair and cross-user
reads/writes are denied.

**Commit:** `feat(recipes): add deterministic cook sessions`

### Task 7: Add Before You Begin and Cook Mode UI

**Files:**

- Create: `src/capabilities/recipes/screens/RecipeReadinessScreen.tsx`
- Create: `src/capabilities/recipes/screens/RecipeCookModeScreen.tsx`
- Create: `src/capabilities/recipes/components/CookCueCard.tsx`
- Create: `src/capabilities/recipes/components/CookProgress.tsx`
- Create: `src/capabilities/recipes/components/CookTimerControl.tsx`
- Create: `src/capabilities/recipes/runtime/useRecipeCookSession.ts`
- Modify: `src/features/household-food/FoodNavigator.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`
- Tests: screen/component/hook tests beside each source file.

- [ ] Derive a short readiness list for serving lock, preheat, equipment, prep,
  and inspectable missing/Already-have items. Label inferred items and allow skip.
- [ ] Create or resume a session only after the user starts cooking; opening Recipe
  Home must not keep the device awake or create progress.
- [ ] Render one cue as the visual center with step progress, inline ingredient
  amount, timer suggestion, Back/Repeat/Next, exit, and voice state.
- [ ] Keep awake only while the session is active and the app is foregrounded.
- [ ] Add system notification scheduling/cancel/recovery for local timers; resolve
  permission denial without losing the in-app timer.
- [ ] Persist on every meaningful transition and restore before rendering a
  default step. Show **Resume step X of Y** on Recipe Home.
- [ ] Add landscape two-pane layout and large Dynamic Type pagination without
  shrinking the cue below the visual acceptance threshold.

Run:

```bash
npm test -- --runInBand src/capabilities/recipes/screens/RecipeReadinessScreen.test.tsx src/capabilities/recipes/screens/RecipeCookModeScreen.test.tsx src/capabilities/recipes/runtime/useRecipeCookSession.test.ts
npm run lint
```

Expected: PASS; Simulator proves layout and relaunch; physical device remains the
required gate for keep-awake and timer notification claims.

**Commit:** `feat(recipes): build resumable cook mode`

### Task 8: Prove and implement command-first cooking voice

**Files:**

- Create: `docs/verification/household-food/cook-voice-spike.md`
- Create: `src/capabilities/recipes/voice/cookVoiceContracts.ts`
- Create: `src/capabilities/recipes/voice/cookVoiceCommandParser.ts`
- Create: `src/capabilities/recipes/voice/cookVoiceController.ts`
- Create: `src/capabilities/recipes/voice/cookVoiceTransport.ts`
- Create: tests beside each voice source file
- Reuse deliberately: `src/features/unifiedChat/unifiedChatVoice.ts`
- Modify: `app.config.ts` only if the chosen, proven transport needs a native
  permission or plugin not already present.

- [ ] First run a physical-device spike comparing: explicit push-to-talk with the
  existing audio upload path; session VAD/realtime transport; and an available
  on-device speech recognizer. Measure median/P95 response, interruption,
  kitchen-noise false activations, 20-minute battery, offline behavior, privacy,
  native build cost, and provider/session limits.
- [ ] Choose the smallest transport that clears the experience threshold. If no
  continuous option clears it, implement push-to-talk plus touch and record G3 as
  deferred. Do not hold the rest of Cook Mode hostage.
- [ ] Define typed intents: `advance`, `go_back`, `repeat_current`,
  `read_position`, `read_ingredient`, `start_timer`, `pause_timer`,
  `resume_timer`, `cancel_timer`, `pause_session`, `resume_session`, `finish`,
  and `answer_recipe_question`.
- [ ] Write tests for synonyms, ordinals, quantities, multiple timers, negation,
  low confidence, out-of-scope requests, prompt injection, duplicate transcript,
  interruption, and no-active-session.
- [ ] Route deterministic intents directly into the Cook Session state machine.
  Only recipe-grounded open questions use the conversational path.
- [ ] Render and speak an acknowledgement only when useful. “Next” should advance
  quickly; it should not produce a paragraph. Let the user interrupt TTS.
- [ ] Keep visible Listening/Thinking/Speaking/Paused/Voice off state, explicit
  mute, stop-on-exit, and no raw-audio retention by default.
- [ ] Degrade to touch/local timers on network loss. Initial scope is foreground
  session voice; no background custom wake phrase.

Run:

```bash
npm test -- --runInBand src/capabilities/recipes/voice
npm run lint
```

Expected: PASS plus signed-device evidence for every voice claim enabled by the
feature flag. The spike report names the installed binary, branch/commit, Metro
owner/port, device, OS, provider, and unresolved gate.

**Commit:** `feat(recipes): add bounded hands-free cooking controls`

### Task 9: Finish, learn, and resume next time

**Files:**

- Create: `src/capabilities/recipes/screens/RecipeCookCompleteScreen.tsx`
- Create: `src/capabilities/recipes/domain/recipeCookLearning.ts`
- Create: tests beside both files
- Modify: `src/capabilities/recipes/data/recipeCookRepository.ts`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`

- [ ] Add **We’d make this again**, **Add a note**, and **Done** without requiring
  a rating or public post.
- [ ] Let dictation create a reviewed transcript, then choose private cook note or
  proposed Recipe edit. A proposed edit goes through Recipe version review.
- [ ] Store exact Recipe/version, serving scale, completion, selected feedback,
  and provenance. Give the user inspect/correct/delete controls.
- [ ] Surface a prior learning only when relevant and explain its source: “You
  made this for eight and noted more sauce.”
- [ ] End the session, cancel only appropriate audio/listening resources, retain
  completed timers as records, and release keep-awake.

Run:

```bash
npm test -- --runInBand src/capabilities/recipes/domain/recipeCookLearning.test.ts src/capabilities/recipes/screens/RecipeCookCompleteScreen.test.tsx
```

Expected: PASS; no feedback mutates or publishes the Recipe without review.

**Commit:** `feat(recipes): retain private cooking learnings`

## Phase D — Complete collaborative Next meals

### Task 10: Refine horizon and candidate preparation

**Files:**

- Modify: `src/capabilities/meal-planning/screens/NextMealsScreen.tsx`
- Modify: `src/capabilities/meal-planning/screens/MealPlanEditorScreen.tsx`
- Create: `src/capabilities/meal-planning/components/MealCandidateCard.tsx`
- Create: `src/capabilities/meal-planning/domain/mealCandidatePreparation.ts`
- Tests: screen/component/domain tests beside sources
- Modify: `packages/kwilt-agent-runtime/src/foodOperationContracts.ts`
- Modify: `src/capabilities/food-ai/foodAuthorityPolicy.ts`
- Modify: `src/capabilities/food-ai/foodOperationIds.ts`
- Tests: `packages/kwilt-agent-runtime/src/foodCapabilityManifest.test.ts` and
  `src/capabilities/food-ai/foodAuthorityPolicy.test.ts`

- [ ] Make next shop, meal count, date range, and open collecting first-class,
  reversible horizon choices.
- [ ] Support Recipe, leftovers, eat out, undecided, and plain meal note entries.
- [ ] Prepare an AI candidate proposal from only authorized, fresh context:
  Recipes, prior cook records, current constraints, recent meals, bounded Money
  evidence, stock observations, and current StoreOpportunities. Record why each
  suggestion appeared and which facts are merely likely.
- [ ] Support **Make now**, **Almost there**, **Use soon**, **Stay near target**,
  and **Best use of what we have** as explained query outcomes, not permanent
  modes. Ask for stock confirmation when a candidate depends on likely evidence.
- [ ] Present image-led candidate cards with one-line explanations and fast
  add/remove. Never auto-finalize or imply that all slots need calendar dates.
- [ ] Add freshness and empty/error states that leave manual planning complete.

Run:

```bash
npm test -- --runInBand src/capabilities/meal-planning/domain/mealCandidatePreparation.test.ts src/capabilities/meal-planning/screens/NextMealsScreen.test.tsx src/capabilities/meal-planning/screens/MealPlanEditorScreen.test.tsx
```

Expected: PASS; candidate operations create proposals/receipts and cannot read
unauthorized household or Money data.

**Commit:** `feat(meals): refine flexible next-meals planning`

### Task 10A: Add the budget and stock truth layer

**Files:**

- Create: `src/capabilities/money/domain/foodBudgetProjection.ts`
- Create: `src/capabilities/money/domain/foodBudgetProjection.test.ts`
- Create: `src/capabilities/groceries/domain/foodStockContracts.ts`
- Create: `src/capabilities/groceries/domain/foodStockContracts.test.ts`
- Create: `src/capabilities/groceries/data/foodStockRepository.ts`
- Create: `src/capabilities/groceries/data/foodStockRepository.test.ts`
- Create: `src/capabilities/groceries/screens/FoodStockReviewScreen.tsx`
- Create: `src/capabilities/groceries/screens/FoodStockReviewScreen.test.tsx`
- Create: `src/capabilities/meal-planning/components/FoodRealityStrip.tsx`
- Create: `src/capabilities/meal-planning/components/FoodRealityStrip.test.tsx`
- Create: `supabase/migrations/20260806050000_food_thrift_foundation.sql`

- [ ] Write failing Money tests that project only selected Food category ids,
  period, plan/spend/remaining cents, forecast range, source plan version,
  freshness, and observation time. Reject unauthorized, stale-as-current, and
  cash-safe-until-payday interpretations.
- [ ] Implement `FoodCycleSpendingConstraint` as a Groceries-owned target for one
  cycle. Keep manual targets complete without Money activation and preserve the
  accepted Money envelope reference/assumptions when assistance is used.
- [ ] Write stock contract tests for confirmed/likely/check-first/depleted,
  quantity ranges, source/time/confidence, supersession, correction, account
  isolation, and cautious decay. Age cannot assert food safety or consumption.
- [ ] Implement progressive observations from Already-have, manual/voice/photo
  review, and later receipt/order evidence. Receipt lines begin as likely unless
  the user explicitly confirms current stock.
- [ ] Build a fast review that asks only about ingredients material to current
  candidate ranking or Grocery gaps. Show **Confirmed today**, **Likely on hand**,
  and **Check first**; do not request a full pantry catalog.
- [ ] Render the optional reality strip with separate category remainder, trip
  target, relevant stock count, price source/freshness, and inspect/remove paths.
- [ ] Add repository/RLS tests proving household membership alone grants neither
  Money projection nor stock access.

Run:

```bash
npm test -- --runInBand src/capabilities/money/domain/foodBudgetProjection.test.ts src/capabilities/groceries/domain/foodStockContracts.test.ts src/capabilities/groceries/data/foodStockRepository.test.ts src/capabilities/groceries/screens/FoodStockReviewScreen.test.tsx src/capabilities/meal-planning/components/FoodRealityStrip.test.tsx
supabase db reset && supabase test db
```

Expected: PASS; fixtures cannot confuse monthly category room, Food trip target,
basket estimate, paid total, or cash-safe evidence, and likely stock cannot satisfy
a confirmation-required decision.

**Commit:** `feat(food): add budget and stock truth projections`

### Task 11: Complete bounded family choice and finalization

**Files:**

- Modify: `src/capabilities/meal-planning/screens/MealChoiceInviteScreen.tsx`
- Modify: `src/capabilities/meal-planning/screens/MealChoiceResponseScreen.tsx`
- Modify: `src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.tsx`
- Modify: `src/capabilities/meal-planning/domain/mealChoiceAggregate.ts`
- Modify: `src/capabilities/meal-planning/activity/mealPlanningActivityCardProvider.ts`
- Modify: Meal Planning repository/cache and Food migration/RPC files as proven by
  Task 1
- Tests: corresponding existing `*.test.ts` plus new screen tests

- [ ] Freeze candidates, selected participants, response limit, suggestion limit,
  close time, and organizer authority when the round opens.
- [ ] Give each participant only the exact round projection and their own mutable
  response. Verify child accounts cannot enumerate others’ responses.
- [ ] Build the small image-led response surface with neutral pass/non-response
  language, suggestion, Done, expiry, and revoke handling.
- [ ] Deliver exact deep links through Shared Home, notification, and a Food-owned
  Activity action card. Recurrence can invite, snooze, skip, and change cadence;
  it cannot finalize.
- [ ] Render calm aggregate groups rather than vote rankings. Let the organizer
  set servings, optional dates, and finalize one immutable version.
- [ ] Handle offline response, duplicate submit, close race, late response, and
  organizer revision with explicit receipts.

Run:

```bash
npm test -- --runInBand src/capabilities/meal-planning
supabase test db
```

Expected: PASS; G4 still requires two separate signed accounts/devices.

**Commit:** `feat(meals): complete private household choice round`

## Phase E — Turn the plan into a trustworthy basket

### Task 12: Complete deterministic Grocery compilation and review

**Files:**

- Modify: `packages/food-core/src/index.ts`
- Modify: `packages/food-core/src/compiler.test.ts`
- Modify: `src/capabilities/groceries/screens/GroceryListScreen.tsx`
- Modify: `src/capabilities/groceries/screens/AlreadyHaveReviewScreen.tsx`
- Modify: `src/capabilities/groceries/screens/GroceryItemEditScreen.tsx`
- Modify: `src/capabilities/groceries/data/groceryRepository.ts`
- Modify: `src/capabilities/groceries/data/groceryCache.ts`
- Create: `src/capabilities/groceries/components/GroceryItemProvenanceSheet.tsx`
- Tests: corresponding existing and new tests

- [ ] Extend compiler fixtures for serving scales, ranges, incompatible units,
  preparation differences, optional ingredients, ambiguous concepts, duplicates,
  staples, and plain meal notes.
- [ ] Keep uncertain lines separate. Every merged quantity must enumerate exact
  Recipe ingredient/MealPlan entry inputs.
- [ ] Compile atomically and idempotently from one finalized plan version.
- [ ] Group the screen for shopping speed while keeping provenance one tap away.
- [ ] Make Already-have a reversible review projection. Add household requests
  and manual staples with distinct provenance.
- [ ] Preserve manual corrections as deltas when the user elects to refresh after
  a plan change; never silently overwrite them.
- [ ] Cache the user-keyed reviewed list and queue only idempotent safe changes.

Run:

```bash
npm test -- --runInBand packages/food-core/src/compiler.test.ts src/capabilities/groceries
```

Expected: PASS; a saved fixture proves plan servings → grocery quantity → visible
provenance without direct database intervention.

**Commit:** `feat(groceries): complete provenance-first grocery review`

### Task 12A: Add adaptive basket scenarios and store opportunities

**Files:**

- Create: `src/capabilities/groceries/domain/foodScenarioContracts.ts`
- Create: `src/capabilities/groceries/domain/foodScenarioContracts.test.ts`
- Create: `src/capabilities/groceries/domain/foodScenarioOptimizer.ts`
- Create: `src/capabilities/groceries/domain/foodScenarioOptimizer.test.ts`
- Create: `src/capabilities/groceries/components/StoreOpportunityCaptureSheet.tsx`
- Create: `src/capabilities/groceries/components/StoreOpportunityCaptureSheet.test.tsx`
- Create: `src/capabilities/groceries/screens/FoodScenarioReviewScreen.tsx`
- Create: `src/capabilities/groceries/screens/FoodScenarioReviewScreen.test.tsx`
- Create: `src/capabilities/groceries/data/foodScenarioRepository.ts`
- Create: `src/capabilities/groceries/data/foodScenarioRepository.test.ts`
- Modify: `supabase/migrations/20260806050000_food_thrift_foundation.sql`

- [ ] Define `StoreOpportunity` with provider/barcode/photo/URL/voice evidence,
  retailer/location, package quantity, observed and comparable unit price,
  confidence, observed time, and expiry. Capture cannot mutate another object.
- [ ] Define one immutable baseline and a version-checked `FoodScenario` containing
  typed Meal Planning and Grocery diffs, constraint/opportunity refs, basket
  estimate range, current-price coverage, evidence time, and lifecycle.
- [ ] Write deterministic optimizer tests for use-what-we-have, stay-near-target,
  family-preference preservation, comparable quantity, storage, expected waste,
  extra trip/activation burden, and a valid **do not buy** result.
- [ ] Cap presented scenarios at three. Show changed meals, Grocery items, stock
  use, range, coverage, freshness, and assumptions without turning the screen
  into an optimization dashboard.
- [ ] Support low-connectivity in-store voice/manual capture. Low-confidence
  price or product evidence asks for review and cannot become “good deal.”
- [ ] Accept one scenario as a reviewed batch of capability-owned operations.
  Reject stale versions and record explicit recovery if one capability write
  cannot complete; never leave a silently half-rewritten plan.
- [ ] Support **I bought it** as purchase/likely-stock evidence while keeping meal
  substitution separately reviewable.

Run:

```bash
npm test -- --runInBand src/capabilities/groceries/domain/foodScenarioContracts.test.ts src/capabilities/groceries/domain/foodScenarioOptimizer.test.ts src/capabilities/groceries/components/StoreOpportunityCaptureSheet.test.tsx src/capabilities/groceries/screens/FoodScenarioReviewScreen.test.tsx src/capabilities/groceries/data/foodScenarioRepository.test.ts
supabase db reset && supabase test db
```

Expected: PASS; an accepted fixture updates exact plan/list versions, a rejected
opportunity changes nothing, and the preserved baseline remains available for
later receipt reconciliation.

**Commit:** `feat(food): adapt plans to worthwhile store opportunities`

### Task 13: Ship the permanent plain-list handoff and provider adapters

**Files:**

- Modify: `src/capabilities/groceries/screens/GroceryHandoffScreen.tsx`
- Modify: `src/capabilities/groceries/groceryExport.ts`
- Create: `src/capabilities/groceries/providers/groceryProviderContracts.ts`
- Create: `src/capabilities/groceries/providers/instacartProvider.ts`
- Create: `src/capabilities/groceries/providers/krogerProvider.ts`
- Create: `supabase/functions/grocery-handoff/index.ts`
- Create tests beside each source/function
- Evidence: `docs/verification/household-food/provider-feasibility.md`

- [ ] Make copy/share/print-friendly plain list complete before provider work.
- [ ] Define provider capability and evidence states: available stores, match,
  quote, offer, activation authority, cart-add, handoff, order evidence, and
  failure ambiguity.
- [ ] Implement server-only Instacart list creation with payload hash,
  idempotency, remote disable, redacted logs, matched/unmatched counts, and
  explicit remaining retailer review.
- [ ] Implement Kroger authorization-code + PKCE, scoped token storage, store
  selection, product proposals, explicit confirmation, idempotent cart-add, and
  **Check retailer cart** on ambiguous writes only after G6 is proven.
- [ ] Keep Walmart, Target, Harmons-direct, and universal checkout out of the
  no-negotiation path until a public documented integration proves otherwise.
- [ ] Make “ordered” unreachable without provider order evidence.

Run:

```bash
npm test -- --runInBand src/capabilities/groceries/groceryExport.test.ts src/capabilities/groceries/providers
deno test supabase/functions/grocery-handoff/index.test.ts
```

Expected: PASS; evidence report includes real development-account/store coverage
or records provider state as gated without weakening plain export.

**Commit:** `feat(groceries): add honest retailer handoffs`

### Task 14: Add evidence-backed Savings Autopilot

**Files:**

- Create: `src/capabilities/groceries/domain/savingsContracts.ts`
- Create: `src/capabilities/groceries/domain/savingsOptimizer.ts`
- Create: tests beside both files
- Create: `src/capabilities/groceries/screens/GrocerySavingsScreen.tsx`
- Create: `src/capabilities/groceries/components/SavingsOptionCard.tsx`
- Create: screen/component tests
- Create: `supabase/functions/grocery-savings/index.ts`
- Modify: Groceries migration/schema with provider-account, quote, offer,
  SavingsPlan, and SavingsOutcome records only after G0

- [ ] Model regular price, public promotion, member price, activation-required
  coupon, rebate, fee, estimate freshness, eligibility, provider acknowledgement,
  and realized receipt/order evidence as distinct fields/states.
- [ ] Write optimizer tests that compare equivalent quantities and net household
  outcome, cap results at three, reject stale/ineligible evidence, and penalize
  extra store/activation burden. Include existing stock, trip target, storage,
  likely use, expected waste, family constraints, and a no-purchase result.
- [ ] Render a quiet optional card and explain amount, product/quantity change,
  store/membership requirement, expiry, evidence time, and next action.
- [ ] Name actions truthfully: **Use this**, **Open coupon**, **Activate in retailer
  app**, or **Keep current**. Show **Applied** only after provider acknowledgement.
- [ ] Reconcile itemized receipt/order lines into realized outcomes. Otherwise
  retain “estimated” or explicitly user-reported state. A reviewed receipt emits
  separate Money transaction, Grocery price/purchase, likely-stock, and savings
  receipts; no capability mutates another capability's authority.
- [ ] Put automatic coupon activation behind an authorization gate that requires
  documented enumeration, eligibility, activation, and acknowledgement APIs. It
  is not a launch assumption.

Run:

```bash
npm test -- --runInBand src/capabilities/groceries/domain/savingsContracts.test.ts src/capabilities/groceries/domain/savingsOptimizer.test.ts src/capabilities/groceries/screens/GrocerySavingsScreen.test.tsx
deno test supabase/functions/grocery-savings/index.test.ts
```

Expected: PASS; every displayed economic claim resolves to inspectable evidence.

**Commit:** `feat(groceries): add evidence-backed savings review`

## Phase F — Make AI operate the whole loop safely

### Task 15: Register complete Food operations and receipts

**Files:**

- Modify: `packages/kwilt-agent-runtime/src/foodOperationContracts.ts`
- Modify: `packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.ts`
- Modify: `src/capabilities/food-ai/foodOperationIds.ts`
- Modify: `src/capabilities/food-ai/foodAuthorityPolicy.ts`
- Modify: `src/capabilities/food-ai/foodProposalContracts.ts`
- Create: `src/features/unifiedChat/foodCapabilityAdapters.ts`
- Create: `src/features/unifiedChat/foodCapabilityAdapters.test.ts`
- Modify: `src/features/unifiedChat/chatCapabilityCoverage.ts`
- Modify: `src/features/unifiedChat/agentCapabilityEvalCases.ts`
- Modify: `packages/kwilt-agent-runtime/src/foodCapabilityManifest.test.ts`
- Modify: `src/capabilities/food-ai/foodAuthorityPolicy.test.ts`
- Modify: `src/capabilities/food-ai/foodProposalContracts.test.ts`

- [ ] Inventory every meaningful user operation across Recipe import/edit/share,
  budget-envelope read, stock capture/confirmation/depletion, plan
  prepare/edit/invite/finalize, grocery compile/correct, StoreOpportunity
  capture, scenario preparation/acceptance, handoff/savings/receipt
  reconciliation, and Cook Session control. Mark read, prepare, reversible
  execute, confirm-required, and forbidden authority.
- [ ] Implement adapters that call the same capability repository/state-machine
  functions as native UI. Do not write Food state from Chat-specific code.
- [ ] Reuse proposal/receipt/undo behavior for reversible work; include target,
  before/after version, authority, provenance, freshness, and result.
- [ ] Require confirmation for invite, finalize, publication, consequential
  product or meal substitution, scenario acceptance, external handoff, and
  irreversible actions. AI cannot mutate a Money plan or promote likely stock to
  confirmed without user evidence.
- [ ] Add evaluation cases for “photograph this recipe,” “plan four cheap dinners
  everyone likes,” “what can I make with what I have?”, “keep this shop near
  $65,” “chicken is $1.49 a pound—should I buy it?”, “ask the kids,” “build my
  list,” “find savings,” “send this to Instacart,” “what’s next?”, and attempts
  to exceed authority.
- [ ] Ensure a contextual Activity or Chat card navigates to the canonical screen
  and carries only a typed reference/action—not a mini application payload.

Run:

```bash
npm test -- --runInBand packages/kwilt-agent-runtime src/features/unifiedChat/agentCapabilityEvalCases.test.ts src/features/unifiedChat/chatCapabilityCoverage.test.ts
```

Expected: PASS; coverage test fails if a supported native Food operation has no
declared AI posture or if an AI operation bypasses capability validation.

**Commit:** `feat(ai): operate household food through canonical actions`

## Phase G — Assemble the experience and prove it

### Task 16: Make Food Home the continuation layer

**Files:**

- Modify: `src/features/household-food/FoodHomeScreen.tsx`
- Modify: `src/features/household-food/FoodHomeScreen.test.tsx`
- Modify: `src/features/household-food/FoodNavigator.tsx`
- Create: `src/features/household-food/foodContinuationProjection.ts`
- Create: `src/features/household-food/foodContinuationProjection.test.ts`

- [ ] Derive one lead continuation from canonical state: plan next shop, review
  choices, finalize, build groceries, continue shopping, or cook/resume tonight.
- [ ] Add Recently cooked and Your recipes shelves with clear Add/All/Groceries
  escape routes. Avoid equal architecture tiles as the primary hierarchy.
- [ ] Deep link Activity, Shared Home, notification, widget-ready projection, and
  Chat actions to exact Food routes with permission re-check at open time.
- [ ] Add empty, offline, stale, partial-permission, and provider-disabled states.
- [ ] Keep projections cacheable and disposable; capability owners remain truth.

Run:

```bash
npm test -- --runInBand src/features/household-food
npm run lint
```

Expected: PASS; every lead card is derived from a tested canonical state and
routes to a complete fallback-capable flow.

**Commit:** `feat(food): make home continue the household food loop`

### Task 17: Add job-step analytics and privacy-safe diagnostics

**Files:**

- Modify: `src/services/analytics/events.ts`
- Modify: analytics capture at the exact capability screens/services above
- Create: `docs/analytics/household-food-funnel.md`
- Create: `src/services/analytics/foodAnalyticsContracts.test.ts`

- [ ] Name events by job transition and outcome: import started/reviewed/saved;
  Recipe Home viewed; plan horizon/candidate/round/finalize; grocery compiled and
  corrected; savings reviewed/accepted; handoff prepared/opened; cook
  started/resumed/cue/timer/voice fallback/completed; next-cycle learning used.
- [ ] Record IDs only where necessary and privacy reviewed. Never capture Recipe
  text, ingredient content, raw transcripts/audio, private responses, coupon
  tokens, or retailer credentials.
- [ ] Add duration and failure-reason fields that distinguish user cancellation,
  permission, connectivity, validation, provider, and ambiguous outcome.
- [ ] Define the hero funnel by job step and include proof-level dimensions:
  fixture, source test, Simulator, signed device, provider sandbox, TestFlight.

Run:

```bash
npm test -- --runInBand src/services/analytics
npm run product:lint
```

Expected: PASS; the analytics document can answer where household work remains
without reconstructing raw private content.

**Commit:** `feat(food): measure job progress without capturing content`

### Task 18: Accessibility, visual QA, and performance pass

**Files:**

- Modify only affected Food screens/components
- Create: `docs/verification/household-food/visual-acceptance.md`
- Create: `docs/verification/household-food/accessibility.md`
- Create: `docs/verification/household-food/performance.md`

- [ ] Capture consistent screenshots for every walkthrough scene on a small phone,
  large phone, landscape Cook Mode, tablet, dark mode, and large Dynamic Type.
- [ ] Verify media loading, skeletons, long titles, missing times/yield/images,
  50+ ingredients, long cues, offline state, partial responses, no savings,
  provider disabled, and low-confidence voice.
- [ ] Verify VoiceOver focus order/labels/actions, Switch Control, contrast, Reduce
  Motion, Bold Text, content-size changes during a session, and touch targets.
- [ ] Profile Recipe library/Home, 100-candidate plan, 200-item grocery list,
  Cook Mode transition, voice start, and relaunch restore. Record cold/warm times,
  dropped frames, memory, network, and battery—not adjectives.
- [ ] Have Andrew visually accept the user-visible hero path before polishing
  secondary public-sharing/discovery surfaces.

Expected: artifacts link each issue to a screenshot, device/runtime provenance,
severity, owner, and retest result.

**Commit:** `fix(food): complete visual accessibility and performance pass`

### Task 19: Full-story verification and staged release

**Files:**

- Create: `docs/verification/household-food/hero-playthrough.md`
- Create: `docs/verification/household-food/release-readiness.md`
- Update: [`Maya food job flow`](../../job-flows/maya-feed-household-with-less-work.md)
  only after evidence justifies delivery-score changes
- Update: [`Household Food Loop`](../../feature-briefs/household-food-loop.md)
  status only after the corresponding environment ships

- [ ] Run the repository completion ritual and full shared-suite checks.
- [ ] Record source checkout, branch, commit, dirty state, installed binary/build,
  Metro checkout/port, backend project/migration state, feature flags, accounts,
  devices, providers, and test data.
- [ ] Complete the 15-step acceptance walkthrough in
  `06-hero-experience.md` without direct database edits or fixture-only screens.
- [ ] Save screenshots/video, redacted database receipts, provider evidence,
  analytics events, failure/recovery evidence, and all unresolved gates.
- [ ] Prove one organizer-only/plain-list/touch path and one fully enhanced path.
  Integration failure must degrade, not strand.
- [ ] Roll out internal → invited dogfood households → TestFlight cohort using
  independent flags for Food entry, import, household rounds, voice, providers,
  savings, and public discovery.
- [ ] Monitor import correction, plan completion, response, list correction,
  handoff, Cook completion/resume, voice fallback, provider failure, deletion,
  and privacy incidents. Define rollback by capability, not one global switch.
- [ ] After three real cycles, run `reflect-after-ship`, update job-flow delivery
  scores from evidence, and decide whether public discovery, coupon activation,
  and deeper retailer coverage deserve the next investment.

Run:

```bash
npm run verify:changed -- --run
npm test -- --runInBand
npm run product:lint
npm run architecture:lint
```

Expected: all automated gates pass. The release artifact separately identifies
missing physical-device, separate-account, provider, accessibility, TestFlight,
and longitudinal evidence; none is collapsed into “tests passed.”

**Commit:** `docs(food): record household food release proof`

## Deferred lanes with explicit entry criteria

### Public recipe sharing and discovery

Begin only after the private Recipe → plan → grocery → cook loop is repeatedly
useful. Follow `2026-08-05-household-food-phase-5-sharing-discovery.md`: opt-in
public identity, immutable publication snapshot, rights attestation, licensed
catalog, moderation, reporting, takedown, child safety, and private-copy import.
Never make a visibility flag on a private Recipe the publication model.

### Automatic coupon activation

Begin only when a provider grants documented APIs/scopes for offer enumeration,
eligibility, activation, and acknowledgement in the target stores. Until then,
Kwilt may explain and deep-link to a coupon; it may not claim to clip it.

### Additional retailers

Add an adapter only after a reproducible no-negotiation feasibility run proves
public developer access, target-region coverage, acceptable terms, product
matching, idempotency, evidence, and operational disablement. Do not build
browser automation against consumer grocery sites as a substitute for authority.

### Advanced cooking intelligence

Multiple simultaneous recipe sessions, generated technique video, smart-appliance
control, vision-derived cooking progress, autonomous mid-cook substitutions, and
a background custom wake word require separate design and privacy review. The
first Cook Mode is stateful, foreground, command-first, recipe-grounded, and
fully usable by touch.

## Program completion definition

This program is complete when Maya can begin with a real paper recipe, an honest
spending boundary, relevant food on hand, or a worthwhile store opportunity;
complete the hero walkthrough across the intended backend and signed devices;
reach a truthful purchase surface or useful plain list; finish the meal through
a resumable Cook Session; and start the next cycle with correctable budget,
stock, receipt, and cooking learnings. Failures in Money authorization, stock
confidence, AI, voice, household participation, savings, or a retailer must not
break the underlying private loop.

“Comprehensive” does not mean every future adjacency is in the first release. It
means every promised transition has an owner, object contract, fallback,
authority rule, test, visual acceptance state, and proof gate.
