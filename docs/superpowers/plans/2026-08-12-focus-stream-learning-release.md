# Focus Stream Learning Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Andrew choose Canyon Spring and run a real portrait-or-landscape Focus session using the existing stream recording, separately owned original-speed audio, and an immutable CDN video URL without spending money on generated media.

**Architecture:** Treat `canyonSpring` as one Focus environment selection in the existing soundscape catalog so current persistence and session audio ownership remain intact. A capability-local backdrop owns muted foreground video and a bundled poster fallback; the existing soundscape service owns a separately mastered audio bed. The first code revision points at a content-addressed Supabase Storage URL, while the publish step remains separately verifiable because current local Storage credentials are unauthorized.

**Tech Stack:** React Native, Expo SDK 55, Expo Video, Expo Audio, Expo Screen Orientation, Supabase Storage, Jest, ffmpeg-static.

---

## UI contract

- Job: When Focus starts with Canyon Spring selected, the user needs the phone to become a quiet place around the work, so the session feels easier to enter without becoming content to watch.
- Authority chain: accepted Canyon Spring brief -> iOS/Android accessibility and orientation -> Kwilt UI constitution/tokens -> existing Focus composition -> Portal as a task-scoped behavioral exemplar only.
- Three-second read: remaining time, then the Activity title or `Focus`, within a living stream landscape.
- Primary action: Start Focus in setup; no dominant in-session action.
- Primary information: time remaining and title.
- Secondary information: end, pause/resume, and audio controls.
- Reveal later: existing long-press soundscape chooser.
- Scan order: landscape -> timer -> title -> controls.
- Must not add: scene browser, promotional copy, download UI, quality selector, generation claims, or copied Portal expression.
- Reuse map: `FocusSetupContent`, `ActivityFocusExperience`, `StandaloneFocusExperience`, `HeaderActionPill`, existing Focus audio runtime.
- Nearest precedent: existing full-screen Focus overlay; preserve its content/control hierarchy and replace only the decorative color plane when Canyon Spring is selected.
- External exemplar ledger: Portal App Store listing, observed August 12, 2026; preserve coordinated audiovisual place and restrained timer; translate through Kwilt-owned media and controls; reject Portal assets, names, layout, and claims.
- Behavior sources: muted/independent media and fallback from `focus-canyon-spring.md`; session behavior from existing production Focus; direct-cut prototype accepted by Andrew for this test.
- Unresolved decision: CDN publication depends on restoring an authorized Supabase Storage credential; app/runtime implementation must not silently fall back to bundling the video.
- Required states: loading, playing, paused, backgrounded, Reduce Motion poster, playback error/color fallback, portrait, landscape, ended.
- Proof path: standalone Focus and Activity Focus on the iOS Simulator, followed by physical-iPhone audio/orientation/thermal acceptance.

### Task 1: Prepare the existing media as replaceable prototype assets

**Files:**
- Create: `assets/images/focus/canyon-spring-poster.jpg`
- Create: `assets/audio/soundscapes/canyon-spring-stream.mp3`
- Create: `artifacts/focus-video-environments/canyon-spring-stream-b0d1f2c83a2a.mp4`
- Create: `supabase/migrations/<generated>_focus_environment_assets_bucket.sql`

- [ ] Extract a calm poster from the stabilized long stream loop.
- [ ] Create a multi-minute, original-speed stream bed with a measured crossfaded audio boundary.
- [ ] Create a fast-start 720p progressive MP4 from the accepted 18.57-second stabilized direct-cut loop and give it a content-addressed filename.
- [ ] Add an idempotent public-read, server-write-only Storage bucket migration for MP4 Focus assets.
- [ ] Audit codecs, duration, loudness, seam, file size, and content hashes.

### Task 2: Add typed Canyon Spring catalog ownership

**Files:**
- Modify: `src/services/soundscapeCatalog.ts`
- Modify: `src/services/soundscapeCatalog.test.ts`
- Modify: `src/services/soundscape.ts`
- Create: `src/features/activities/focusEnvironmentCatalog.ts`
- Create: `src/features/activities/focusEnvironmentCatalog.test.ts`

- [ ] Write failing catalog tests for Canyon Spring identity, remote video source, and bundled poster/audio ownership.
- [ ] Add `canyonSpring` to the existing selection catalog and map its audio to the separately mastered bundled source.
- [ ] Define one immutable remote video source with caching enabled and no generated-media dependency.
- [ ] Run the focused catalog tests.

### Task 3: Implement the shared muted video backdrop and orientation lifecycle

**Files:**
- Create: `src/features/activities/FocusEnvironmentBackdrop.tsx`
- Create: `src/features/activities/FocusEnvironmentBackdrop.test.tsx`
- Create: `src/features/activities/useActiveFocusOrientation.ts`
- Create: `src/features/activities/useActiveFocusOrientation.test.tsx`

- [ ] Write failing tests for muted looping video, paused-session behavior, Reduce Motion poster behavior, and portrait restoration.
- [ ] Implement a poster-first backdrop that starts Focus immediately and fades in video only after the first frame.
- [ ] Pause visual decoding while the session is paused/backgrounded; never change the audio lifecycle.
- [ ] Unlock rotation only while a video-backed Focus environment is active and restore portrait afterward.
- [ ] Run the focused component and hook tests.

### Task 4: Integrate Canyon Spring into both Focus paths without adding chrome

**Files:**
- Modify: `src/features/activities/FocusSetupContent.tsx`
- Modify: `src/features/activities/FocusSetupContent.test.tsx`
- Modify: `src/features/activities/ActivityFocusExperience.tsx`
- Modify: `src/features/activities/ActivityFocusExperience.test.tsx`
- Modify: `src/features/activities/StandaloneFocusExperience.tsx`
- Modify: `src/features/activities/StandaloneFocusScreen.tsx`
- Modify: `src/features/activities/FocusSessionRuntimeHost.test.tsx`

- [ ] Rename the setup choice from Soundscape to Environment and expose Canyon Spring in the existing flat chooser.
- [ ] Render the same backdrop behind Activity and standalone Focus while preserving the existing timer/title/control hierarchy.
- [ ] Make background color shifting inert while the video environment is active.
- [ ] Verify Canyon Spring audio still enters through `FocusSessionRuntimeHost`, never through Expo Video.
- [ ] Run focused Focus tests.

### Task 5: Link, verify, and publish what credentials allow

**Files:**
- Modify: `src/features/activities/FEATURE.md`
- Modify: `docs/feature-briefs/focus-canyon-spring.md`

- [ ] Link the accepted brief from the Activities feature manifest and mark the existing-stream learning-release deviation clearly.
- [ ] Run product lint and diff-aware verification.
- [ ] Publish the immutable MP4 to the configured public Storage path if an authorized credential is available; otherwise verify the exact URL is absent and report CDN publication as the sole delivery blocker.
- [ ] Exercise the real Focus path in the iOS Simulator and capture portrait/landscape evidence; keep physical-device audio, heat, battery, lock-screen, and TestFlight as distinct gates.
