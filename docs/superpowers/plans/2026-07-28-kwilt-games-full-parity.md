# Kwilt Games Full-Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the complete committed Kwilt Games experience into the Kwilt app beneath the Fun section without reducing its catalog or replacing its established game design.

**Architecture:** Keep Games as one capability-owned React Navigation stack. Preserve the committed Games domain, screen, player, audio, remote, and nearby behavior inside `src/capabilities/games/`, while replacing only standalone Expo Router, standalone auth, and standalone Supabase ownership with small adapters to Kwilt's host services. Copy database migrations and Edge Functions into Kwilt's existing Supabase project with their original authorization boundaries.

**Tech Stack:** Expo SDK 54, React Native 0.81, React Navigation 7, TypeScript, Jest, Supabase/Postgres/Realtime, Deno Edge Functions, Expo native modules.

---

### Task 1: Freeze and import the complete source surface

**Files:**
- Modify: `docs/integration/kwilt-games-source-manifest.md`
- Create: `src/capabilities/games/audio/**`
- Create: `src/capabilities/games/domain/**`
- Create: `src/capabilities/games/features/**`
- Create: `src/capabilities/games/players/**`
- Create: `src/capabilities/games/remote/**`
- Create: `src/capabilities/games/nearby/**`
- Create: `src/capabilities/games/ui/**`
- Create: `assets/games/**`

- [x] Record source commit `7b3e209587d2489ae297f0e265aa2e56481821fb`; include the four uncommitted standalone refinements as a documented overlay without modifying their source checkout.
- [x] Mechanically copy the committed source directories and audio assets into the Games capability namespace.
- [x] Rewrite source-root imports to `@/src/capabilities/games/...`; do not change game behavior during the copy.
- [x] Replace the provisional Bank/Farkle domain and screens only after their source equivalents are present.
- [x] Run `git diff --check` and verify the imported catalog still enumerates Bank, Farkle, Show of Hands, Common Thread, Object Quest, Story Relay, Family Forecast, Pass the Pattern, Doodle Bridge, Clue Circle, Slanguage, and Basic Dice Roller.

### Task 2: Add host navigation and session adapters

**Files:**
- Create: `src/capabilities/games/navigation/gamesRouter.tsx`
- Create: `src/capabilities/games/platform/gamesSupabase.ts`
- Create: `src/capabilities/games/platform/gamesAuth.ts`
- Create: `src/capabilities/games/platform/GamesAuthProvider.tsx`
- Modify: `src/capabilities/games/navigation/types.ts`
- Modify: `src/capabilities/games/navigation/GamesNavigator.tsx`
- Test: `src/capabilities/games/navigation/gamesRouter.test.tsx`

- [x] Write a failing adapter test proving `router.push`, `router.replace`, `router.back`, and route params map to the Games native stack.
- [x] Run the adapter test and confirm it fails before implementation.
- [x] Implement a scoped router contract:

```ts
export type GamesHref =
  | '/'
  | '/join'
  | { pathname: '/tumble'; params: { mode: 'bank' | 'farkle' | 'roller' } }
  | { pathname: '/play/[gameId]'; params: { gameId: string } }
  | { pathname: '/room/[sessionId]'; params: Record<string, string> };
```

- [x] Map Games auth to `getSupabaseClient()` and the host's hydrated session; do not create a second client or storage key.
- [x] Wrap the Games navigator in the scoped router/auth providers and register shelf, tumble, connection-game, join, and remote-room routes.
- [x] Run the adapter and navigation tests until green.

### Task 3: Restore the full local catalog and established screens

**Files:**
- Modify: `src/capabilities/games/features/home/GameShelfScreen.tsx`
- Modify: `src/capabilities/games/features/tumble/TumbleScreen.tsx`
- Modify: `src/capabilities/games/features/connection-games/ConnectionGameScreen.tsx`
- Modify: `src/capabilities/games/features/setup/GamePlayerSetup.tsx`
- Test: `src/capabilities/games/domain/__tests__/**`
- Test: `src/capabilities/games/features/**/__tests__/**`

- [x] Port the committed catalog test first and confirm the reduced shelf fails it.
- [x] Restore all ten accepted games, Slanguage's existing learning-release condition, and Basic Dice Roller.
- [x] Preserve the existing Games shelf/card/table visual grammar; change only the account/menu entry point required by the Kwilt host.
- [x] Restore local setup and play loops for all catalog games, Farkle practice, celebration, audio, orientation, saved players, identities, and personal bests.
- [x] Run every imported domain and local-screen test and resolve only host-adaptation failures.

### Task 4: Restore remote play, joining, and nearby discovery

**Files:**
- Modify: `src/capabilities/games/features/remote/**`
- Modify: `src/capabilities/games/features/tumble/OpenBankTableLobby.tsx`
- Modify: `src/capabilities/games/features/connection-games/OpenSlanguageTableLobby.tsx`
- Modify: `src/capabilities/games/remote/**`
- Create: `modules/kwilt-nearby-table/**`
- Modify: `app.config.ts`
- Modify: `src/navigation/linkingConfig.ts`
- Test: `src/capabilities/games/remote/__tests__/**`

- [x] Port the remote command/client/hook tests before changing their implementations.
- [x] Restore Bank, Pass the Pattern, and Slanguage remote clients and room screens using Kwilt's shared Supabase session.
- [x] Restore join-by-code, QR/share URLs, reconnect, server-version convergence, and host start flows.
- [x] Copy the Bonjour Expo module and add the iOS local-network/Bonjour declarations to Kwilt's app configuration.
- [x] Map `kwilt://games/join/:token` and `https://games.kwilt.app/join/:token` to the Games join route.
- [x] Run remote, navigation, and linking tests until green.

### Task 5: Merge Games backend ownership into Kwilt Supabase

**Files:**
- Create: `supabase/migrations/*_kwilt_games_full_parity.sql`
- Create: `supabase/functions/remote-bank-command/**`
- Create: `supabase/functions/remote-pass-pattern-command/**`
- Create: `supabase/functions/remote-slanguage-command/**`
- Create: `supabase/functions/_shared/games-bank.ts`
- Create: `supabase/functions/_shared/games-pass-pattern.ts`
- Create: `supabase/functions/_shared/games-slanguage.ts`

- [x] Inspect the source migrations against Kwilt's existing `game_saved_players` table and create one ordered, idempotent migration through `supabase migration new`.
- [x] Preserve permanent-user checks, ownership predicates, RLS, grants, invite expiry, and server-authoritative command versioning.
- [x] Port the three Edge Functions and namespace shared modules to avoid collisions.
- [x] Run Deno typechecks and the source server-rule tests.
- [x] Record local Supabase reset and authenticated flow proof as pending because Docker is unavailable; do not imply deployment.

### Task 6: Align dependencies, documentation, and completion proof

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `docs/feature-briefs/kwilt-games-capability-integration.md`
- Modify: `docs/integration/kwilt-games-source-manifest.md`
- Modify: `src/capabilities/games/FEATURE.md`

- [x] Add only the source dependencies absent from Kwilt and pin them through npm's lockfile.
- [x] Rewrite the brief and manifests so full committed catalog parity is in scope and remaining boundaries are deployment/device proof, not missing games.
- [x] Run all imported Games tests, `npm run lint`, and `npm run lint:tests`.
- [x] Run `npm run verify:changed -- --run` and then the broader Jest suite because shared navigation, native configuration, and backend surfaces changed.
- [x] Record visual/device verification as pending because the active Simulator/Metro runtime belongs to another worktree.
