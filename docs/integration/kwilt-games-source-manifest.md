# Kwilt Games Source Manifest

## Frozen source

- Repository: `/Users/andrewwatanabe/Kwilt Games`
- Remote: `https://github.com/mtkinji/kwilt-games.git`
- Imported commit: `7b3e209587d2489ae297f0e265aa2e56481821fb`
- Import date: 2026-07-28

This commit is the accepted merged modern-games tranche. The source checkout also had uncommitted edits in `ConnectionGameFrame.tsx`, `ConnectionGameScreen.tsx`, its test, and `src/features/setup/FEATURE.md` when this lane began. At Andrew's direction to bring everything over, those four current-working-copy refinements are included as a documented overlay. They remain untouched and uncommitted in the standalone checkout.

## Ownership after integration

Kwilt owns the binary, React Navigation root, authentication/session, global settings, analytics, deep links, release train, and capability switching. Games owns its shelf, tables, game rules, local seats, game-specific motion/audio/haptics, room semantics, and session-scoped consent.

## Imported committed surface

- Capability definition and one `Games` row under `Fun`.
- Complete Games-owned shelf and catalog: Bank, Farkle, Show of Hands, Common Thread, Object Quest, Story Relay, Family Forecast, Pass the Pattern, Doodle Bridge, Clue Circle, and development/flagged Slanguage.
- Basic Dice Roller, Farkle practice, setup, local seats, celebration, sound, orientation, saved players, identities, personal bests, and cloud synchronization.
- Remote Bank, Pass the Pattern, and Slanguage clients, room views, command rules, join-by-code, QR/share invites, reconnect, and nearby-table discovery.
- Games audio assets, Bonjour Expo module, database migration, and three Edge Functions.

## Host adaptations

- Expo Router calls map through `navigation/gamesRouter.ts` into the Games React Navigation stack.
- Games reads Kwilt's existing Supabase client/session; no second auth storage or client is created.
- Games buttons use Kwilt's haptics preference owner.
- Invite fallbacks use `kwilt://games`; legacy `kwiltgames://` and `games.kwilt.app` join links are normalized at the host boundary.
- The standalone app icon, bundle identifier, release config, and duplicate shell remain outside the capability.

## Current proof

- The Games migrations and three Edge Functions are deployed in Kwilt's current
  Supabase project; remote game session and participant tables are published for
  authoritative Realtime invalidation.
- A native iOS Simulator build from `codex/kwilt-2-family-sharing-maturity`
  linked the Bonjour and audio/orientation modules successfully.
- Two isolated simulator accounts proved Bank foreground discovery, join,
  capacity/identity display, cold reconnect to the same active table, clean
  start, and live authoritative moves in both directions.
- Focused lifecycle tests cover unavailable invites, already-joined return,
  completion presentation, and same-group rematch.

## Proof still required

- Publish and verify the `games.kwilt.app` Apple App Site Association and Android asset-links files before claiming universal/app-link ownership outside the custom scheme.
- Exercise a complete remote finish-to-rematch loop, foreground nearby radio,
  interruption/background recovery, expiry, QR/share handoff, audio, and
  orientation on signed physical devices.
- Verify every local game family and drawing/motion behavior on the signed
  release candidate; the focused remote proof does not establish catalog-wide
  native parity.
