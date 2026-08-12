---
id: brief-focus-canyon-spring
title: Canyon Spring Focus environment
status: accepted
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-focus-seamless-soundscapes, brief-focus-widget]
owner: andrew
last_updated: 2026-08-12
---

# Canyon Spring Focus environment

## Context

Kwilt Focus currently combines a timer, flat color, and optional audio. Andrew wants Focus to feel like entering a landscape rather than merely starting a soundscape. Portal demonstrates a mature version of this job through coordinated natural motion, location audio, and a simple timer. Andrew repeatedly used Portal's Bluebell Woods, showing the value of a sheltered place, but a Utah-inspired slot canyon offers a more distinctive landscape for Kwilt. This brief creates one original canyon spring and explicitly avoids copying Portal's footage, sound, composition, naming, or interface.

Evidence for nature-based audiovisual restoration is mixed. Natural sound and congruent audiovisual environments show promising mood, restoration, and some cognitive outcomes, while a preregistered experiment found no executive-attention benefit from nature video alone. Canyon Spring therefore makes no therapeutic or productivity claim. It tests whether one personally resonant and original landscape helps the transition into Focus feel calmer and more inhabitable.

Research and reference sources:

- [Portal - Escape Into Nature, App Store](https://apps.apple.com/us/app/portal-escape-into-nature/id1436994560)
- [Nature-video attention restoration preregistration](https://doi.org/10.1027/1618-3169/a000578)
- [Forest soundscape randomized and crossover experiments](https://pmc.ncbi.nlm.nih.gov/articles/PMC12484580/)
- [Audiovisual hydrodynamic landscape restoration study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11860883/)

## Target audience

Burned-out productivity power users need fewer steps between choosing meaningful work and staying with it. A Focus environment should reduce the felt noise around one action without becoming another media system to manage.

## Representative persona

Marcus has already chosen what matters. He wants a reliable boundary around the next 25 minutes, not another dashboard, playlist, or configuration task. A sheltered canyon may help him cross into the work if it stays quiet enough to stop being content.

## Aspirational design challenge

How might we help Marcus feel that starting Focus means entering one calm place, while preserving immediate action, optional media, orientation freedom, and trustworthy fallback?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — the landscape supports the transition from deciding what matters to remaining with it.

## Job flow step

`job-flow-marcus-move-the-few-things-that-matter`, step 5, “Decide what to do next,” currently scores 3. Focus is the existing handoff from decision to action. Canyon Spring does not improve prioritization; it tests whether the handoff into sustained action can feel stronger without adding maintenance.

## JTBD framing

When Marcus begins Focus, he wants the phone to become a quiet place around the chosen work, so the intention has a better chance of becoming follow-through. The environment must start reliably, disappear when unwanted, and never make media delivery more important than the Focus session.

## Design

### Existing-stream learning release

Before any generated-video spend, use Andrew's existing stream recording as the replaceable Canyon Spring prototype. The learning release uses the accepted 18.57-second stabilized direct-cut visual at original speed, a separately mastered multi-minute original-speed stream bed, and a bundled poster fallback. The prototype does not claim to depict the final Utah-inspired slot canyon; it tests the environment selection, independent audio/video ownership, CDN playback, orientation, fallback, battery, thermal behavior, and whether a moving landscape belongs in ordinary Focus sessions.

Keep the stable environment identity `canyonSpring`. Replacing the stream prototype with an accepted generated or captured slot-canyon master changes immutable media paths, not user preferences or Focus-session data.

### One environment

Add one original `Canyon Spring` environment. The visual is a photoreal Utah-inspired slot-canyon chamber with stable red sandstone walls, a small natural arch or bridge, a shallow stream, a thin continuous waterfall, and sparse spring-fed desert plants such as maidenhair fern and moss. Stable indirect light reveals the stone without moving across it. Only water texture and a few plant fronds move. There are no people, paths, signs, animals, sky changes, falling debris, weather events, foreground crossings, camera movement, focus breathing, or exposure breathing.

This is one composed place, not a montage of arches, waterfalls, streams, plants, and scenic events. The arch and rock provide identity and stable geometry. The water and plants provide restrained continuous life.

Rename the Focus setup field from `Soundscape` to `Environment`. Existing audio-only choices remain environments. `Quiet` means no audio and no moving video. Canyon Spring appears as one option with a still preview; it never autoplays before Start.

### Active Focus experience

After Start, the canyon fills the active Focus surface in portrait or landscape. The timer, Activity title or `Focus`, and end/pause/audio controls float over a restrained adaptive scrim. No scene title, description, carousel, quality selector, download affordance, or promotional copy appears in-session.

The scene is available to both Activity Focus and standalone Focus through one shared runtime. It does not create a new Focus object or media destination.

### Independent visual and audio ownership

The video is always muted. Expo Video owns only foreground visual playback. The current Focus audio service owns the separately mastered canyon bed, including background, lock-screen, interruption, mute, pause/resume, and cleanup behavior. Slowing or replacing the visual can never time-stretch or degrade the audio.

When the app backgrounds, pause video decoding and allow audio to continue. When the user returns, restart or resume the visual without altering the session timer. Reduce Motion and Low Power Mode use the poster frame with audio. Video loading or failure falls back to the poster/current color treatment without blocking Focus or changing the selected environment.

### Orientation

Unlock orientation only while the active video environment is visible. Restore portrait when Focus ends or the active surface closes. Publish separately accepted landscape and portrait renditions; do not rely on one uncontrolled `cover` crop for permanent acceptance.

### Generation

Use the OpenAI Videos API as an offline content-authoring tool only. It is not a runtime product dependency.

Initial batch:

- Three 12-second `sora-2` landscape candidates at 1280x720.
- One approved original reference image and one locked prompt describing an invented canyon rather than a named real-world location.
- Approximate documented cost: $3.60 total, requiring explicit approval before submission.
- Score static geometry, frame boundary, motion continuity, focus/exposure drift, and singular events before Andrew auditions candidates.
- Permit one revised three-candidate batch. Stop after six standard candidates if none passes.

After landscape acceptance, generate or derive a portrait candidate under a separately approved spend and run the same acceptance process. Record model, snapshot when available, prompt, generation job id, date, cost, reference-asset provenance, transforms, and accepted/rejected rationale. Sora's current deprecated-model status is acceptable for offline prototype authoring because the shipped product consumes ordinary immutable media assets rather than calling Sora at runtime.

### Loop acceptance

“Perfect loop” means the boundary is perceptually absent and measurably no more disruptive than ordinary adjacent motion:

- Direct cut; no visible dissolve, morph, freeze, reverse playback, or speed ramp.
- Static-geometry boundary transform at 720p: translation at or below 0.25 px, rotation at or below 0.01 degrees, and scale drift at or below 0.02%.
- Static-region boundary similarity at or above 0.995 SSIM after excluding intentionally moving water and plants.
- Moving-region seam difference no greater than 1.5 times the median adjacent-frame difference from the clip.
- Water volume, direction, and apparent flow rate remain constant across the boundary; no distinct splash, drop, surge, reflection flash, or ripple reveals the restart.
- No singular visual or audible event whose repetition can be learned.
- Five-cycle audition at normal speed and delivery speed reveals no boundary.
- Three ordinary 25-minute Focus sessions on a physical iPhone reveal no noticed visual or audio restart.

If a 12-second candidate passes visual quality but repetition becomes recognizable, assemble a longer nonrepeating master from compatible generations or use an extension/edit workflow. Do not hide a failed seam with a decorative transition.

### Audio

Create a separately mastered multi-minute canyon bed with soft air moving through stone, a continuous close-water layer, and restrained natural canyon reflections. The first release excludes distinct drips, splashes, gusts, echoes, and bird calls because memorable events make repetition obvious. Target the existing `focus.music` policy: 48 kHz stereo, -24 LUFS, -2 dBTP ceiling, no leading/trailing silence, and content-addressed immutable delivery. Require automated seam audits, repeated listening, and fixed-volume physical-iPhone acceptance.

### CDN delivery

Publish content-addressed progressive MP4 and audio objects to a public-read, server-write-only Supabase Storage path. Keep a poster frame in the app or a small reliable cache. Prefer progressive MP4 for the learning release because Expo Video can cache it on iOS; HLS video cannot use that cache path. Focus starts before the video is ready and never exposes a download workflow.

The catalog separates stable environment identity from asset version:

```ts
type FocusEnvironment = {
  id: 'canyonSpring';
  title: 'Canyon Spring';
  kind: 'video';
  audioAssetId: RemoteAudioAssetId;
  poster: ImageSource;
  landscapeVideo: RemoteVideoAsset;
  portraitVideo: RemoteVideoAsset;
};
```

Replacing a prototype requires new immutable asset paths, not a new environment id or session migration.

### Accessibility and system behavior

- `Reduce Motion`: poster plus audio.
- VoiceOver: announce the environment selection and controls; do not describe decorative motion during the session.
- Dynamic Type: timer and title remain legible in both orientations.
- Audio mute: mutes the environment without pausing Focus.
- Offline uncached state: poster/current color plus bundled audio fallback; keep the saved selection.
- App interruption: preserve the Focus session and follow the existing audio interruption policy.

## Success signal

In six alternating dogfood sessions—three Canyon Spring and three comparable audio-only sessions—Andrew voluntarily chooses Canyon Spring again, does not notice a visual or audio boundary, does not feel pulled into watching it, and keeps the phone visible for a meaningful portion of the work without material heat or battery concern.

This is evidence that the landscape improves the felt Focus handoff for Andrew. It is not evidence of improved executive function, ADHD treatment, stress reduction, or universal productivity.

## Open questions

- Whether a separate portrait generation is necessary after the accepted landscape composition is seen on-device.
- Whether Low Power Mode should always force the poster or merely offer it after battery observation.
- Whether rare non-looping bird events add presence after the base environment proves valuable.
- Whether the thin waterfall remains calm over 25 minutes or should be simplified to a quiet seep and pool.

## Spec refinement

- The first approved implementation contains one video-backed environment only.
- Environment identity, visual delivery, and audio delivery are separate typed concerns.
- Video never owns background audio and never gates the Focus timer.
- Pure catalog/orientation/fallback logic and media acceptance tooling require tests first. Visual layout may be implemented directly with focused component coverage.
- Generation spend, CDN publication, and persistent bucket/policy changes require explicit approval.
- Andrew approved proceeding with the existing stream prototype on 2026-08-12; this authorized the scoped Focus implementation and CDN publication without generated-video spend. The production bucket migration is `20260812220619_focus_environment_assets_bucket.sql`; the content-addressed video is live at `v1/focus/canyon-spring-stream-b0d1f2c83a2a.mp4`, and its CDN bytes match the local SHA-256. The stale local CLI token remains unauthorized, but the authenticated Supabase management and dashboard paths completed and verified publication.
- Simulator portrait playback from the production CDN is observed. A regression test now prevents the app-wide navigation orientation owner from re-locking an active video Focus session to portrait; physical landscape playback remains the next interaction proof gate.
- Acceptance evidence remains distinct: generated candidate, local measurements, repeated desktop audition, Simulator behavior, physical-device playback, TestFlight, and production CDN availability.
- The related exploration artifacts are `docs/design-explorations/focus-video-environments/00-frame.md` through `05-evaluate-learning.md`.
