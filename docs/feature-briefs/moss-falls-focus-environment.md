---
id: brief-moss-falls-focus-environment
title: Moss Falls Focus environment
status: accepted
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-bishop-lakes-focus-environment, brief-focus-seamless-soundscapes]
owner: andrew
last_updated: 2026-10-15
---

# Moss Falls Focus environment

Andrew requested another Focus video background, confirmed the name **Moss Falls**, and asked to retain the original audio while shortening the source to a loop that feels continuous.

## Existing experience and scope

Fit the existing system: extend the accepted Focus video environment design with one catalog entry, poster, streaming video, and bundled original ambience. Marcus encounters it in the current Focus picker and starts a session with the same controls, mute behavior, portrait/landscape support, and fallback. This supports staying with meaningful work without adding setup. Reuse the framing and chosen design in `bishop-lakes-focus-environment.md` and the focus-video-environments exploration; no new surface or product divergence is needed for this bounded content addition.

## Media preparation

- Source: Andrew's `IMG_0759.MOV`, downloaded from the supplied iCloud share on October 15, 2026. Original remains in Downloads; no source footage or location metadata is published with this brief.
- Source duration: 350.89 seconds; 1920×1080 HEVC with a default stereo AAC recording.
- Chosen video: source 92.5–110 seconds, 17.5 seconds / 525 frames, 1280×720 H.264 at 30 fps; original speed, direct visual cut, no dissolve or reverse playback.
- Selection: compared low-resolution static-moss framing in the first two minutes for candidate 15–45 second loops. The selected endpoints had the closest sampled match. Exported first/last frames were visually inspected; this is not proof of imperceptible motion on a device.
- Original stereo audio: extract 90.5–110 seconds and master through the existing `scripts/audio/master-loop.mjs` with a two-second rotated crossfade, producing a 17.5-second 48 kHz stereo AAC loop. The body starts at source 92.5 seconds; its final two seconds blend back into the pre-start audio. No replacement sounds, pitch shift, or time stretch.
- Video SHA-256: `c3adcabe28c46cb6b87a219520a26b5064e7de9a180050007a4029bae44e88d1` (3,089,857 bytes).
- Audio SHA-256: `f798358a4ae5379a51dcc94761765dd6aadaf60f7cc935dbae67ff28f1a63085` (425,550 bytes).
- Exports strip source metadata. Video remains muted in the UI; the existing audio engine owns the sound.

## Spec refinement and acceptance

No new settings, playback infrastructure, permissions, or defaults. The saved `mossFalls` identity must survive normalization and map to both the video and its original ambience. Every visible environment must retain a complete immutable loop admission and local poster.

The bet is that this short excerpt feels like a continuous place. Inspect the three-cycle preview, then verify several loops on iPhone speakers and headphones, portrait/landscape crops, mute/unmute, pause/resume, and unavailable-network fallback. If the visual cut or sound blend draws attention, revise the media before release. Local code tests and endpoint measurements cannot establish perceptual acceptance.

## Delivery boundary

Local integration is prepared; the CDN upload and device acceptance remain pending. The catalog's intended video path is `focus_environment_assets/v1/focus/moss-falls-loop-c3adcabe28c4.mp4`. Until uploaded, the new entry displays its poster with bundled ambience. Do not release this candidate before the upload and a public-path fetch are verified.

Prepared media and three-loop preview are in `/Users/andrewwatanabe/.codex/visualizations/2026/10/15/01a13ff9-5631-74d2-a4ac-ba105f3db57e/moss-falls/`. The source checkout is `/Users/andrewwatanabe/Kwilt`, branch `main`; HEAD advanced from `b789ddb` to `b002052` during unrelated Money work before these edits. No simulator or development server was started for this addition.
