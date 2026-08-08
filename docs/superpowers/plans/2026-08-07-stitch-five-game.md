# Stitch Five Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a development-gated local two-to-four-player five-dice quilt game with familiar scoring, clear pinning, live score previews, a completed quilt result, and text sharing.

**Architecture:** A pure `stitch-five.ts` domain owns scoring and state transitions. A feature-owned React Native screen composes existing Games setup, feedback, buttons, theme, and navigation with feature-local fabric dice and quilt-board presentation. Catalog, deep-link, and persistence registrations remain additive; no backend or durable game state is introduced.

**Tech Stack:** React Native, Expo SDK 54, TypeScript, React Navigation, Jest, React Native Testing Library.

---

### Task 1: Pure rules and game state

**Files:**
- Create: `src/capabilities/games/domain/stitch-five.ts`
- Create: `src/capabilities/games/domain/stitch-five.test.ts`

- [ ] Write failing table tests for all thirteen scoring categories, including invalid matches and zero scores.
- [ ] Run `npm test -- --runInBand src/capabilities/games/domain/stitch-five.test.ts` and confirm the missing-module failure.
- [ ] Implement category metadata, exact scoring, face-region subtotal, Seam Bonus, and total calculation.
- [ ] Add failing transition tests for initial state, three-roll limit, preserved pinned dice, unused-category enforcement, player rotation, thirteen-stitch finish, winners, and ties.
- [ ] Implement immutable state transitions and share-text rendering with validation at the domain boundary.
- [ ] Rerun the focused domain suite and confirm every case passes.

### Task 2: Native game surface

**Files:**
- Create: `src/capabilities/games/features/stitch-five/FabricDie.tsx`
- Create: `src/capabilities/games/features/stitch-five/QuiltBoard.tsx`
- Create: `src/capabilities/games/features/stitch-five/StitchFiveScreen.tsx`
- Create: `src/capabilities/games/features/stitch-five/StitchFiveScreen.test.tsx`

- [ ] Build a feature-local die with button semantics, selected state, value label, non-color pin treatment, 44-point minimum target, and reduced-motion roll treatment.
- [ ] Build the single quilt-board scorecard with literal labels, used/open states, live previews including zero, Seam Bonus state, and accessibility labels.
- [ ] Compose setup using `GamePlayerSetup` with two-to-four local seats, optional names, saved-player integration, existing sound feedback, and no remote action.
- [ ] Compose active play with back, rules, sound, player/roll state, five dice, the board, and one roll action region.
- [ ] Compose final win/tie, totals, completed boards, `Share.share` text output, and rematch.
- [ ] Add component tests that reach setup, start a game, roll, expose previews, pin a die, and invoke sharing from a deterministic finished state seam where practical.

### Task 3: Catalog and navigation

**Files:**
- Modify: `src/capabilities/games/domain/catalog.ts`
- Modify: `src/capabilities/games/features/home/GameShelfScreen.tsx`
- Modify: `src/capabilities/games/features/home/GameShelfScreen.test.tsx`
- Modify: `src/capabilities/games/navigation/types.ts`
- Modify: `src/capabilities/games/navigation/GamesNavigator.tsx`
- Modify: `src/capabilities/games/navigation/gamesRouter.ts`
- Modify: `src/capabilities/games/navigation/gamesRouter.test.ts`
- Modify: `src/navigation/linkingConfig.ts`
- Modify: `src/navigation/linkingConfig.test.ts`
- Modify: `src/navigation/navigationPersistence.ts`
- Modify: `src/navigation/navigationPersistence.test.ts`

- [ ] Add a `stitch-five` route kind and learning-gated catalog definition with 2–4 players, 15–30 minutes, warm energy, and Workshop status.
- [ ] Route the shelf card to `/stitch-five` and register `GamesStitchFive` in the native stack.
- [ ] Add `/stitch-five` adapter, `games/stitch-five` deep link, and persisted-stack allowlist coverage.
- [ ] Update focused shelf, router, linking, and persistence expectations.

### Task 4: Product linkage and verification

**Files:**
- Verify: `docs/design-explorations/stitch-five/*`
- Verify: `docs/feature-briefs/stitch-five-game.md`
- Verify: `src/capabilities/games/features/stitch-five/FEATURE.md`

- [ ] Run focused Stitch Five, catalog, router, linking, and persistence tests.
- [ ] Run `npm run product:lint` and `npm run architecture:lint`.
- [ ] Run `npm run verify:changed -- --run` and address every applicable failure.
- [ ] Start the actual native runtime from this checkout, navigate Games → Workshop → Stitch Five, and exercise setup, roll/pin/reroll, zero score, final result, share sheet, rematch, reduced motion, and a larger text size.
- [ ] Record Simulator source checkout, branch, commit, dirty state, installed-build/Metro provenance, viewport, observed states, and any physical-device or assistive-technology proof gaps.

## Self-review

- Spec coverage: Every acceptance criterion maps to Tasks 1–4.
- Placeholder scan: No deferred implementation placeholders are present; excluded capabilities remain explicit product boundaries.
- Type consistency: The route is `GamesStitchFive`, the catalog kind is `stitch-five`, and the domain owns `StitchFiveGame`, category metadata, score previews, state transitions, winners, and share text.
