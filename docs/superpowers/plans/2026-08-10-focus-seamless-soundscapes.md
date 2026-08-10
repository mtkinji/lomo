# Focus Seamless Soundscapes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the six remote Focus music loops, add five continuous nature soundscapes, integrate one grouped picker, and establish repeat-boundary acceptance.

**Architecture:** Authoring stays outside the app bundle. A tested FFmpeg-based loop tool creates rotated crossfade or bridge masters and repeat auditions; the existing immutable Supabase catalog continues to own remote delivery. The persisted `SoundscapeId`, Focus playback owner, bundled fallback, and one-choice interaction remain unchanged.

**Tech Stack:** Node.js ESM, `ffmpeg-static`, `music-metadata`, Jest/Node test runner, React Native/Expo Audio, Supabase Storage, TypeScript.

---

### Task 1: Add regression-first loop seam analysis

**Files:**
- Create: `scripts/audio/loop-seam-lib.mjs`
- Create: `scripts/audio/loop-seam-lib.test.mjs`
- Create: `scripts/audio/audit-loop-seams.mjs`
- Modify: `package.json`

- [x] Write failing pure tests for boundary energy delta, trailing/leading silence rejection, endpoint derivative discontinuity, and pass/fail policy.
- [x] Run `node --test scripts/audio/loop-seam-lib.test.mjs`; expect failures because the module does not exist.
- [x] Implement finite-input validation and a loop policy with no more than 30 ms boundary silence, no more than 3 dB first/last-window RMS delta, and a reported derivative jump for review.
- [x] Add a CLI that decodes the first and last windows through `ffmpeg-static`, emits JSON when requested, and exits nonzero under `--enforce`.
- [x] Run the focused test and the CLI against the six published source downloads.

### Task 2: Add deterministic loop mastering and audition rendering

**Files:**
- Create: `scripts/audio/master-loop.mjs`
- Create: `scripts/audio/master-loop.test.mjs`
- Modify: `package.json`

- [x] Write a failing integration test that generates a synthetic WAV with mismatched head/tail and requires a rotated equal-power crossfade master plus a three-repeat audition.
- [x] Implement `--input`, `--output`, `--crossfade-seconds`, `--audition`, `--repeat-count`, and `--category` arguments; never overwrite the input.
- [x] Build the master as `middle + acrossfade(tail, head)` so the exported boundary continues from the end of the consumed head into the same point at file start.
- [x] Normalize the accepted output to the existing `focus.music` policy with lossy-codec peak headroom and encode 48 kHz stereo WAV or 192 kbps MP3 according to extension.
- [x] Verify the synthetic red-green test, then create candidate masters for each existing music track outside the repository.

### Task 3: Accept six corrected music masters

**Files:**
- Modify: `assets/audio/AUDIO_MANIFEST.md`

- [x] Create at least two crossfade/bridge durations for each published music source.
- [x] Produce three-repeat auditions and run `audio:audit` plus `audio:audit:loops` on every candidate.
- [ ] Listen across both repeat boundaries at fixed volume; retain only candidates whose tempo, harmony, texture, and gain remain continuous.
- [ ] If no deterministic candidate is musically acceptable, upload the source to ElevenLabs Music v2 and generate a glue bridge conditioned on matching source slices, then repeat the deterministic acceptance steps.
- [x] Record source object, transform, duration, sample rate, loudness, true peak, silence, seam measurements, and listening status in the manifest.

### Task 4: Generate and accept five nature masters

**Files:**
- Modify: `assets/audio/AUDIO_MANIFEST.md`

- [x] Generate multiple loop-enabled ElevenLabs Sound Effects v2 candidates for Quiet Rain, Forest Stream, Ocean Waves, Fireplace, and Night Meadow.
- [x] Exclude speech, thunder, close animals, sirens, alarms, bells, music, and singular foreground events in every prompt.
- [x] Download WAV when available, preserve generation ids/prompts/credit use, and create longer assembled masters if a 30-second pattern is recognizable.
- [ ] Normalize and audit every accepted candidate under `focus.music`, render three repeats, and perform fixed-volume listening. (Automated audit and auditions complete; fixed-volume listening pending.)
- [x] Record rejected and accepted candidates without copying rejected assets into production.

### Task 5: Publish new immutable objects

**Files:**
- Modify: `src/services/audioAssetCatalog.ts`
- Modify: `assets/audio/AUDIO_MANIFEST.md`

- [x] Hash each accepted MP3 and use a new `focus/<slug>-<12-char-sha>.mp3` object path.
- [ ] Upload with `audio/mpeg`, `cacheControl: 31536000`, and no upsert to project `sqxwjtorodqjdfnuvprf`. (Immutable Dashboard upload complete without upsert. The public response is `no-cache`; changing only `storage.objects.metadata.cacheControl` did not affect it and was reverted, so a supported Storage API/S3 re-upload remains.)
- [x] Verify HEAD, byte length, MIME type, range GET, decoded duration, and checksum for all eleven objects.
- [x] Update catalog paths and expected byte sizes only after remote verification.
- [x] Keep the old immutable objects; do not overwrite or delete them during the learning release.

### Task 6: Extend the typed soundscape catalog regression-first

**Files:**
- Modify: `src/services/soundscapeCatalog.ts`
- Modify: `src/services/audioAssetCatalog.ts`
- Modify: `src/services/soundscape.ts`
- Modify: `src/services/soundscape.test.ts`
- Modify: `src/store/useAppStore.ts`

- [x] Extend the failing catalog test to require stable existing ids plus `quietRain`, `forestStream`, `oceanWaves`, `fireplace`, and `nightMeadow` with `music` or `nature` groups.
- [x] Add remote asset ids and mappings without changing the `default` fallback.
- [x] Verify existing persisted values remain valid and new ids round-trip through store persistence.
- [x] Run `npm test -- --runInBand src/services/soundscape.test.ts src/store/useAppStore.lifecycle.test.ts`.

### Task 7: Group the existing Focus choice surface

**Files:**
- Modify: `src/features/activities/FocusSetupContent.tsx`
- Modify: `src/features/activities/FocusSetupContent.test.tsx`
- Modify: `src/features/activities/ActivityFocusExperience.tsx`
- Test: `src/features/activities/FocusSetupContent.test.tsx`

- [x] Add focused expectations for Music and Nature labels, one selected state, all stable titles, and No audio when allowed.
- [x] Render group labels within the existing `DropdownMenuContent`; preserve the current trigger, immediate selection, and Start footer.
- [x] Use the same grouped projection in the in-session menu without adding icons, previews, or another route.
- [x] Run the Focus component/controller/runtime suites.
- [x] Render the actual Focus setup and active-session menu in Simulator; verify scan order, scrolling, long content, selection, persistence, and one dominant Start action.

### Task 8: Completion verification

**Files:**
- Modify: `assets/audio/AUDIO_MANIFEST.md`
- Modify: `docs/feature-briefs/focus-seamless-soundscapes.md`

- [x] Run `npm run audio:audit`, `npm run audio:audit:loops -- --enforce <accepted files>`, focused Jest, `npm run product:lint`, and `npm run verify:changed -- --base main --run` when the unrelated working set makes that comparison safe. (Focus-scoped gates pass. The repository-wide verifier reaches Jest and stops on the unrelated dirty Grocery cart test recorded in the handoff.)
- [x] Run `git diff --check` and inventory exact touched paths without staging unrelated work.
- [x] Record Simulator proof separately from signed physical-device proof.
- [ ] On a signed iPhone, cross two boundaries foregrounded, locked, and backgrounded; check speaker, Bluetooth, silent switch, interruption, and cleanup behavior. (Paired iPhone 16/iOS 26.5.2 is reachable, but it was locked and CoreDevice could not mount the developer disk image.)
- [ ] If a shared residual transport gap remains across corrected masters, open a bounded native gapless-player follow-up rather than claiming completion.
