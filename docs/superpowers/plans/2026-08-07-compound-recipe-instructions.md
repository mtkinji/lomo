# Compound Recipe Instructions Implementation Plan

> **For agentic workers:** Execute inline in the current checkout. Do not create a worktree or dispatch subagents without Andrew's explicit approval. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Represent one Recipe instruction structure as coherent phases on Recipe Home and atomic, contextual cues in Cook Mode.

**Architecture:** Extend `RecipeInstructionStep` with optional ordered cue records, then normalize both explicit and legacy instructions through one pure domain helper. The starter compiler emits stable explicit cues. Recipe Home renders normalized phases; the Cook cue builder flattens the same phases and carries phase/action metadata through existing session navigation.

**Tech Stack:** TypeScript, React Native, Expo SDK 54, Jest, React Native Testing Library.

---

### Task 1: Normalize instruction phases and cues

**Files:**
- Create: `src/capabilities/recipes/domain/recipeInstructionPhases.ts`
- Create: `src/capabilities/recipes/domain/recipeInstructionPhases.test.ts`
- Modify: `src/capabilities/recipes/domain/recipeContracts.ts`
- Modify: `src/capabilities/recipes/domain/recipeContracts.test.ts`

- [ ] Write failing tests proving explicit cues win, legacy instructions remain one cue, sentence segmentation creates stable non-empty catalog cues, and invalid cue positions fail parsing.
- [ ] Run `npx jest src/capabilities/recipes/domain/recipeInstructionPhases.test.ts src/capabilities/recipes/domain/recipeContracts.test.ts --runInBand`; expect the new assertions to fail.
- [ ] Add `RecipeInstructionCue`, optional `cues`, strict cue parsing, `segmentEditorialInstructionCues(text)`, and `buildRecipeInstructionPhases(steps)`.
- [ ] Rerun the focused tests; expect PASS.

### Task 2: Compile stable starter-catalog cues

**Files:**
- Modify: `src/capabilities/recipes/data/compileEditorialRecipe.ts`
- Modify: `src/capabilities/recipes/data/compileEditorialRecipe.test.ts`

- [ ] Write a failing pancake assertion that phase 2 contains two stable cues and all compiled cues preserve order and non-empty text.
- [ ] Run `npx jest src/capabilities/recipes/data/compileEditorialRecipe.test.ts --runInBand`; expect FAIL.
- [ ] Compile every editorial instruction with `cues: segmentEditorialInstructionCues(text).map((cueText, cuePosition) => ({ id: \`${versionId}-step-${position + 1}-cue-${cuePosition + 1}\`, position: cuePosition, text: cueText }))` and remove the generic `Cook` label.
- [ ] Rerun the compiler test and a 500-recipe structural audit; expect every phase and cue to be ordered and non-empty.

### Task 3: Flatten shared phases for Cook Mode and reconcile sessions

**Files:**
- Modify: `src/capabilities/recipes/domain/recipeCookContracts.ts`
- Modify: `src/capabilities/recipes/domain/recipeCookCueBuilder.ts`
- Modify: `src/capabilities/recipes/domain/recipeCookCueBuilder.test.ts`
- Create: `src/capabilities/recipes/domain/recipeCookSessionCueMigration.ts`
- Create: `src/capabilities/recipes/domain/recipeCookSessionCueMigration.test.ts`
- Modify: `src/capabilities/recipes/runtime/useRecipeCookSession.ts`

- [ ] Write failing tests proving pancake phase 2 becomes two Cook cues with `phasePosition`, `phaseCount`, `cuePositionInPhase`, and `cueCountInPhase`; ingredient/timer/readiness derivation uses only current cue text; and an old five-cue session maps phase 2 to the first matching cue in the expanded sequence.
- [ ] Run the focused domain tests; expect FAIL.
- [ ] Refactor `buildRecipeCookCues` to flat-map normalized phases, preserve first-cue IDs as `cue:<phase-id>`, and compute cue-specific presentation data.
- [ ] Reconcile a cached phase-only session before exposing it to the screen, preserving current phase and first-cue timer identity.
- [ ] Rerun focused domain/runtime tests; expect PASS.

### Task 4: Render the two projections

**Files:**
- Modify: `src/capabilities/recipes/components/RecipeMethodPreview.tsx`
- Modify: `src/capabilities/recipes/components/RecipeMethodPreview.test.tsx`
- Modify: `src/capabilities/recipes/components/CookCueCard.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeCookModeScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeCookModeScreen.test.tsx`

- [ ] Add failing component tests for one phase circle with two action lines and a grouped accessibility label, plus Cook Mode `Phase 2 of 5 · Action 1 of 2` context.
- [ ] Run focused component/screen tests; expect FAIL.
- [ ] Render normalized cue lines beneath one phase number on Recipe Home; keep the existing neutral token treatment and meaningful-label behavior.
- [ ] Use Cook cue phase metadata in the card, transport, voice position response, and accessible label while keeping the current action dominant.
- [ ] Rerun focused tests; expect PASS.

### Task 5: Reduce, render, and verify

**Files:**
- Modify only files required by observed defects.

- [ ] Run `git diff --check` and focused Recipe tests.
- [ ] Start from the existing Metro owner on port 8081 and navigate the real iPhone 17 Pro Simulator path to Buttermilk pancakes.
- [ ] Capture Recipe Home and Cook Mode portrait/landscape screenshots. Confirm one numbered phase with two action lines on detail and one dominant action with compact phase context in Cook Mode.
- [ ] Check long text, next/back, phase transition, voice position, timer suggestions, ingredient references, exit/resume, and accessibility labels.
- [ ] Run `npm run verify:changed -- --run`; expect exit 0. Do not commit, push, or open a PR unless Andrew requests it.
