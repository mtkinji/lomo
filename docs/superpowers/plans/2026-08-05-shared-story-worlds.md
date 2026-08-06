# Shared Story Worlds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Story Relay with a local/cast-first, three-scene cooperative adventure that is mechanically deterministic, AI-responsive when connected, and complete offline.

**Architecture:** A pure `storyAdventure` domain owns characters, commitments, Trouble, resources, and outcomes. A capability-owned AI module owns schemas, prompt construction, parsing, and best-effort generation through a small proxy transport; generated text can skin but never mutate the domain. `StoryRelayGame` composes the flow and reuses the Games frame, settings, music, feedback, and canonical player setup.

**Tech Stack:** React Native, Expo SDK 54, TypeScript, Jest, Testing Library, Supabase AI proxy.

---

### Task 1: Deterministic adventure domain

**Files:**
- Create: `src/capabilities/games/domain/storyAdventure.ts`
- Create: `src/capabilities/games/domain/__tests__/storyAdventure.test.ts`

- [x] **Step 1: Write failing domain tests**

Cover bundled plan selection, 2–6 deterministic characters, three scene templates, all-three/two/one commitment coverage, one Power covering a missing approach, one Keepsake absorbing one Trouble, resource exhaustion, Trouble clamping, and bright/costly/heroic endings.

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --runInBand src/capabilities/games/domain/__tests__/storyAdventure.test.ts`

Expected: FAIL because `storyAdventure` does not exist.

- [x] **Step 3: Implement the minimum pure domain**

Export typed `StoryAdventurePlan`, `StoryCharacter`, `StoryCommitment`, `StorySceneResult`, `StoryOutcome`, `createIncludedStoryPlan`, `createStoryCharacters`, `resolveStoryScene`, `applyStoryKeepsake`, and `getStoryOutcome`. Keep all mechanics independent from generated prose.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --runInBand src/capabilities/games/domain/__tests__/storyAdventure.test.ts`

Expected: PASS.

### Task 2: Bounded AI contract and proxy transport

**Files:**
- Create: `src/capabilities/games/ai/storyAdventureAI.ts`
- Create: `src/capabilities/games/ai/storyGameTransport.ts`
- Create: `src/capabilities/games/ai/__tests__/storyAdventureAI.test.ts`
- Modify: `supabase/functions/_shared/aiModelRouting.ts`
- Modify: `supabase/functions/_shared/__tests__/aiModelRouting.test.ts`

- [x] **Step 1: Write failing prompt, parser, and fallback tests**

Assert that the prompt forbids mechanical changes and family profiling, the schema permits only bounded fiction fields, valid JSON overlays the included plan, invalid/oversized values return `null`, and transport failure returns the included plan without throwing.

- [x] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- --runInBand src/capabilities/games/ai/__tests__/storyAdventureAI.test.ts supabase/functions/_shared/__tests__/aiModelRouting.test.ts`

Expected: FAIL because the AI modules and `story_game` routing job do not exist.

- [x] **Step 3: Implement schema-bound generation**

Use three best-effort entry points: `generateStoryPlan`, `generateStoryTwist`, and `generateStoryEnding`. Each accepts a transport parameter for deterministic tests, uses a three-second runtime ceiling, returns `null` on any failure, and exposes no raw provider response to UI code. Add `story_game` to the server-authoritative small-model route.

- [x] **Step 4: Run the focused tests and verify GREEN**

Run the command from Step 2 and expect both suites to pass.

### Task 3: Cooperative Story Relay UI

**Files:**
- Replace: `src/capabilities/games/features/connection-games/StoryRelayGame.tsx`
- Modify: `src/capabilities/games/features/connection-games/PromptConnectionGames.tsx`
- Modify: `src/capabilities/games/features/connection-games/ConnectionGameScreen.tsx`
- Modify: `src/capabilities/games/features/connection-games/__tests__/ConnectionGameScreen.test.tsx`

- [x] **Step 1: Replace the old component expectations with the new player flow**

Test flavor selection, immediate included content, character reveal, physical reveal instruction, each player's recorded commitment, result and Trouble explanation, resource use, all three scenes, final outcome, replay, and the header sound toggle.

- [x] **Step 2: Run the component test and verify RED**

Run: `npm test -- --runInBand src/capabilities/games/features/connection-games/__tests__/ConnectionGameScreen.test.tsx`

Expected: FAIL against the sentence-composition UI.

- [x] **Step 3: Implement the screen state machine**

Compose `flavor -> characters -> scene -> countdown -> record -> result/cost -> ending`. Keep public copy short, rotate the spotlight, keep Goal/Promise/Trouble visible during play, invoke generation in the background, and discard any result that arrives after its story boundary.

- [x] **Step 4: Add sensory feedback**

Reuse `useGameMusic('game.story-relay')`, `useGameFeedback`, and semantic `HapticsService` events. Expose the existing header sound toggle for Story Relay. Audio failure never gates progression.

- [x] **Step 5: Run the component and focused Games tests**

Run: `npm test -- --runInBand src/capabilities/games/features/connection-games/__tests__/ConnectionGameScreen.test.tsx src/capabilities/games/domain/__tests__/storyAdventure.test.ts src/capabilities/games/ai/__tests__/storyAdventureAI.test.ts`

Expected: PASS.

### Task 4: Capability docs and verification

**Files:**
- Modify: `src/capabilities/games/features/connection-games/FEATURE.md`
- Modify: `docs/agent-code-map.md` through the repository generator

- [x] **Step 1: Update the feature manifest**

Describe Story Relay as a local/cast-first deterministic cooperative adventure with bounded connected AI and included fallback. Preserve joined-phone and remote exclusions.

- [x] **Step 2: Run diff-aware verification**

Run: `npm run verify:changed -- --run`

Expected: app TypeScript, test TypeScript, code-health ratchet, related Jest suites, product lint, and agent map complete with no errors.

- [ ] **Step 3: Review runtime presentation**

Launch the current checkout in one simulator runtime, confirm branch/commit/Metro provenance, and inspect portrait plus landscape Story Relay at flavor, commitment, result, and ending states. Record any missing physical-device evidence for haptics, sound balance, AirPlay, weak network, and family fun.

- [x] **Step 4: Review the final diff**

Confirm no unrelated dirty file was staged or overwritten, no generated story text enters analytics, no AI path can block progression, and no implementation claim exceeds source/Simulator proof.
