---
id: brief-focus-seamless-soundscapes
title: Seamless Focus soundscapes
status: accepted
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-audio-learning-release, brief-focus-mode-education]
owner: andrew
last_updated: 2026-08-10
---

# Seamless Focus soundscapes

## Context

The six recently added remote Focus music tracks are ordinary four-minute masters whose endings and beginnings do not meet continuously. Focus also lacks familiar non-musical environments such as rain, flowing water, and ocean waves.

## Target audience

Burned-out productivity power users need Focus to lower activation energy and then get out of the way. Audio must support attention without becoming another library to curate.

## Representative persona

Marcus has chosen one Activity and a duration. He wants a stable environment that does not announce its own repetition or require more setup.

## Aspirational design challenge

How might we help Marcus enter a continuous, non-demanding Focus environment, while preserving one calm choice, immediate playback, and honest reliability?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — soundscape continuity supports the transition from choosing the next action to staying with it.

## Job flow step

`job-flow-marcus-move-the-few-things-that-matter`, step 5, “Decide what to do next,” currently scores 3. This work improves the existing Focus handoff after that decision rather than creating another planning layer.

## JTBD framing

When Marcus starts Focus, he wants the selected environment to continue without demanding attention, so a fragile intention becomes sustained follow-through. Reliability and a small interaction model also serve `jtbd-trust-this-app-with-my-life`.

## Design

Create new content-addressed loop masters for Copacabana, Focus Tunnel, Midnight Study, Open Road, Cedar Workshop, and Rainlit Library. Use ElevenLabs Music v2 inpainting when a generated bridge improves musical continuity, but establish acceptance through deterministic mastering, repeat-boundary measurement, and listening—not the generation label.

Add five nature environments: Quiet Rain, Forest Stream, Ocean Waves, Fireplace, and Night Meadow. Generate loop-aware candidates without speech, thunder, prominent animals, alarms, bells, or singular foreground events. Assemble a longer master when a short loop reveals repetition.

Keep one Soundscape selection. Group the existing choices into Music and Nature in both setup and in-session selection. Preserve the bundled fallback, remote-first cache delivery, stable ids, optional audio behavior, and category gain.

## Success signal

All eleven remote tracks pass the audio and seam audits, public-object checks, catalog/cache tests, and three-repeat listening. The picker remains a quick choice. Signed physical-iPhone testing across foreground, locked, background, and Bluetooth playback reveals no restart or cleanup regression.

## Open questions

None blocking implementation. A native transport change is intentionally conditional on residual signed-device evidence after source repair.

## Spec refinement

- Working WAV masters and rejected generations stay out of the app bundle and Git history; provenance and measurements remain in `assets/audio/AUDIO_MANIFEST.md`.
- Every accepted MP3 uses 48 kHz stereo, 192 kbps, -24 LUFS target, -2 dBTP ceiling, no boundary silence, and a content-addressed immutable path.
- A three-repeat audition is mandatory because single-file measurements do not prove perceived musical continuity.
- Pure seam analysis/mastering logic and catalog changes are regression-first; the small picker grouping receives focused component coverage plus rendered runtime review.
- Source, Simulator, signed-device, TestFlight, and production availability remain separate proof levels.
