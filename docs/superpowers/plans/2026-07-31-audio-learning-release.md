# Audio Learning Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the approved audio learning set into real Focus and Games contexts while reducing the native long-form audio payload through immediate remote playback and silent caching.

**Architecture:** A typed immutable catalog separates track identity from delivery. Deep Work Drift and short effects remain bundled; every other continuous track uses a public versioned Supabase Storage URL, plays from cache when present, and otherwise streams immediately while a deduplicated background download populates purgeable cache. Focus and Games retain separate playback owners but share catalog/cache resolution and gain policy.

**Tech Stack:** React Native, Expo SDK 54, `expo-audio`, `expo-file-system/legacy`, Supabase Storage CDN, TypeScript, Jest, FFmpeg/FFprobe audit scripts.

---

### Task 1: Publish immutable learning assets

**Files:**
- Create: `supabase/migrations/<generated>_kwilt_public_audio_assets_bucket.sql`
- Modify: `assets/audio/AUDIO_MANIFEST.md`

- [ ] Create a migration with `npx supabase migration new kwilt_public_audio_assets_bucket`.
- [ ] Define an idempotent public `audio_assets` bucket limited to `audio/mpeg`, with no client upload policy.
- [ ] Apply and verify the bucket on project `sqxwjtorodqjdfnuvprf`.
- [ ] Upload versioned MP3 objects with `Cache-Control: public, max-age=31536000, immutable`.
- [ ] Verify every public URL with `HEAD`, `Content-Type: audio/mpeg`, byte length, range support, and a partial GET.
- [ ] Record source file, final object path, byte size, LUFS, and provenance in the manifest.

### Task 2: Add tested catalog and cache resolution

**Files:**
- Create: `src/services/audioAssetCatalog.ts`
- Create: `src/services/audioAssetDelivery.ts`
- Create: `src/services/audioAssetDelivery.test.ts`

- [ ] Write failing tests for stable catalog ids, cache hit, remote-first miss, byte-size rejection, atomic temp-file move, download deduplication, and fallback preservation.
- [ ] Run `npm test -- --runInBand src/services/audioAssetDelivery.test.ts` and confirm failure before implementation.
- [ ] Implement catalog entries containing immutable public URL, cache filename, expected bytes, category, and gain.
- [ ] Implement `resolveAudioAsset`, `cacheAudioAsset`, and `prefetchAudioAsset` using a temp file and atomic move.
- [ ] Run the focused suite and require all tests to pass.

### Task 3: Migrate Focus playback without changing its interaction model

**Files:**
- Modify: `src/services/soundscape.ts`
- Create: `src/services/soundscape.test.ts`
- Modify: `src/features/activities/useActivityFocusController.test.tsx`
- Modify: `src/features/activities/ActivityFocusExperience.tsx`

- [ ] Write failing tests proving Deep Work Drift resolves bundled, existing ids remain valid, remote tracks prefetch, a remote failure falls back for the session without changing the requested id, and stop/unload removes the player.
- [ ] Replace the imperative `expo-av` player with `createAudioPlayer` while preserving fade, looping, background audio mode, resume intent, and cleanup.
- [ ] Add Open Road Focus, Cedar Workshop, and Rainlit Library to the existing picker; preserve existing titles and ids.
- [ ] Surface one quiet inline availability message only after fallback occurs.
- [ ] Run Focus service/controller/component suites.

### Task 4: Bundle the approved short learning set

**Files:**
- Add: `assets/games/pattern-coral.mp3`
- Add: `assets/games/pattern-gold.mp3`
- Add: `assets/games/pattern-pine.mp3`
- Add: `assets/games/pattern-rose.mp3`
- Add: `assets/games/pattern-sky.mp3`
- Add: `assets/games/pattern-violet.mp3`
- Add: `assets/games/pattern-miss.mp3`
- Add: `assets/games/failure-cartoon-splat.mp3`
- Modify: `src/capabilities/games/audio/usePatternAudio.ts`
- Modify: `src/capabilities/games/audio/__tests__/usePatternAudio.test.tsx`

- [ ] Select the strongest Love-it variant for tied Pattern families using frequency separation, attack/tail match, and randomized fixed-volume comparison.
- [ ] Write a failing test requiring seven distinct bundled Pattern source modules and no playback-rate mutation.
- [ ] Copy only the selected mastered assets into `assets/games/`.
- [ ] Replace pitch-shifted sparkle reuse with the seven distinct files while preserving timing and haptics.
- [ ] Run Pattern tests and `npm run audio:audit` against the shipped short set.

### Task 5: Add Cartoon Splat as a backward-compatible setback choice

**Files:**
- Modify: `src/capabilities/games/players/playerIdentity.ts`
- Modify: `src/capabilities/games/players/__tests__/playerIdentity.test.ts`
- Modify: `src/capabilities/games/audio/useGameFeedback.ts`
- Modify: `src/capabilities/games/audio/__tests__/useGameFeedback.test.tsx`

- [ ] Write failing tests proving `cartoon-splat` round-trips while all existing ids remain valid.
- [ ] Add the labeled choice and route it through the shared `game.signature` gain.
- [ ] Verify preview and real outcome use the same file and gain.

### Task 6: Add shared continuous game music and contextual mappings

**Files:**
- Create: `src/capabilities/games/audio/gameMusicState.ts`
- Create: `src/capabilities/games/audio/gameMusicState.test.ts`
- Create: `src/capabilities/games/audio/useGameMusic.ts`
- Create: `src/capabilities/games/audio/__tests__/useGameMusic.test.tsx`
- Modify: `StoryRelayGame.tsx`, `ClueCircleGame.tsx`, `RemoteSlanguageScreen.tsx`, `TumbleScreen.tsx`, `RemoteBankScreen.tsx`

- [ ] Write failing pure tests for Story Relay turn-only music, Clue Circle playing-only music, Slanguage build/vote-only music, and reviewed Bank tier mapping.
- [ ] Write failing hook tests for remote/cached source start, mute, replacement fade, outcome duck, terminal stop, and unmount cleanup.
- [ ] Implement one shared player owner at `game.music` gain using `resolveAudioAsset`.
- [ ] Wire Story Relay 1, Clue Circle 2, Slanguage 1, and the temporary three-tier Bank mapping; stop music during spoken reveals and terminal outcomes.
- [ ] Run hook, state, local-game, and remote-game focused suites.

### Task 7: Remove remotely delivered bundled Focus files

**Files:**
- Delete: `assets/audio/soundscapes/Copacabana Focus.mp3`
- Delete: `assets/audio/soundscapes/Focus Flow State.mp3`
- Delete: `assets/audio/soundscapes/Midnight Study Session.mp3`
- Modify: `assets/audio/AUDIO_MANIFEST.md`

- [ ] Confirm no static `require(...)` references remain for the three files.
- [ ] Delete only the three migrated assets; retain Deep Work Drift.
- [ ] Compare tracked audio bytes before and after and record repository payload delta.

### Task 8: Verification and handoff

- [ ] Run `npm run audio:audit` and inspect every shipped short asset and all public long-form sources.
- [ ] Run all changed audio/Focus/Games suites.
- [ ] Run `npm run verify:changed -- --run` and `git diff --check`.
- [ ] Verify public URLs and cached second-play behavior.
- [ ] Verify Simulator functional playback and record that it does not prove speaker balance, lock-screen/background behavior, silent switch, Bluetooth, interruptions, or TestFlight.
- [ ] Perform signed-device proof before claiming the learning release is device-ready.
- [ ] Commit exact files and push only after Andrew's requested publication boundary.
