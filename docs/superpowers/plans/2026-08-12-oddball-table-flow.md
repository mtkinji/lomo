# Oddball Table Flow Implementation Plan

> **For agentic workers:** Execute inline in the current checkout. Do not create a worktree or dispatch subagents unless Andrew explicitly requests parallel implementation.

**Goal:** Make Oddball scoring direct and trustworthy, give the reveal a visible and spoken countdown, add bounded music and rules access, and finish every game after six questions.

**Architecture:** Keep deterministic scoring and end conditions in `domain/onePlan.ts`. Keep temporary host-entry and countdown presentation in `OnePlanGame.tsx`, reusing the existing Games music runtime, Expo Speech, Games theme, and modal precedent. Update the existing Games maturity artifacts because this is table-play evidence against earlier accepted assumptions.

**Tech Stack:** TypeScript, React Native, Expo Speech, Expo Audio through `useGameMusic`, Jest, React Native Testing Library.

---

### Task 1: Lock the corrected game contract with failing domain tests

**Files:**
- Modify: `src/capabilities/games/domain/__tests__/onePlan.test.ts`
- Modify: `src/capabilities/games/domain/onePlan.ts`

- [ ] Add regression coverage proving the sixth scored or tied question ends the game.
- [ ] Add coverage proving the highest unmarked score wins and tied eligible leaders are preserved as shared winners.
- [ ] Run `npm test -- --runInBand src/capabilities/games/domain/__tests__/onePlan.test.ts` and confirm the new assertions fail against the eight-point engine.
- [ ] Replace the open-ended winning-score check with a six-question finalization rule and `winnerIds`.
- [ ] Re-run the focused domain test.

### Task 2: Lock the corrected host-entry and countdown behavior with failing component tests

**Files:**
- Modify: `src/capabilities/games/features/connection-games/__tests__/OnePlanGame.test.tsx`
- Modify: `src/capabilities/games/features/connection-games/OnePlanGame.tsx`

- [ ] Add a regression asserting every scoring-player button begins unselected after the host chooses the largest answer.
- [ ] Add a test that selects the winning group directly and confirms only those players score.
- [ ] Add timer assertions for visible `3`, `2`, and `1` states and Expo Speech calls for each number.
- [ ] Add an in-game rules-modal test and a music-hook assertion.
- [ ] Run the focused component test and confirm the new assertions fail against the preselected/static reveal.
- [ ] Implement empty scorer selection, retain the optional sole-unique step only when multiple outsiders remain, and record a single outsider automatically.
- [ ] Replace the static cue with a three-second countdown; stop/pause the music track during speech and resume it during play.
- [ ] Add the 44-point rules affordance and modal using the established Games modal anatomy.
- [ ] Re-run the focused component test.

### Task 3: Align shelf expectations and durable product records

**Files:**
- Modify: `src/capabilities/games/domain/catalog.ts`
- Modify: `src/capabilities/games/domain/__tests__/catalog.test.ts`
- Modify: `src/capabilities/games/features/home/GameShelfScreen.tsx`
- Modify: `docs/design-explorations/kwilt-2-games-maturity/04-learning-release.md`
- Modify: `docs/design-explorations/kwilt-2-games-maturity/05-evaluate-learning.md`
- Modify: `docs/design-explorations/kwilt-2-games-maturity/06-ui-contract.md`
- Create: `docs/design-explorations/kwilt-2-games-maturity/07-reflect.md`
- Modify: `docs/feature-briefs/kwilt-2-games-maturity.md`

- [ ] Change Oddball's honest shelf duration from 10–15 minutes to 5–10 minutes and cover it in the catalog test.
- [ ] Record the observed negative evidence and supersede the earlier preselection/no-rules/no-music/open-ended contracts.
- [ ] Run product lint through the repository completion command.

### Task 4: Verify behavior and rendered quality

**Files:**
- Review all changed paths.

- [ ] Run the two focused Oddball suites and catalog suite together.
- [ ] Run `npm run verify:changed -- --run`.
- [ ] Start the current checkout's native runtime only after checking no other checkout owns Metro/Simulator.
- [ ] In the iPhone 17 Pro Simulator, reach Oddball through Play, inspect teaching/rules, visible countdown, empty selection, singleton and multi-outsider entry, sixth-question ending, replay, landscape layout, and sound-off behavior.
- [ ] Record Simulator visual proof separately from physical-device audio and couch-play proof.
- [ ] Run `git diff --check`, inspect the final diff, and report remaining table-play evidence honestly.
