---
id: brief-audio-learning-release
title: Audio learning release
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-help-us-enjoy-being-together
job_flow: job-flow-maya-start-playing-together
serves: [jtbd-help-us-enjoy-being-together, jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]
related_briefs: [focus-mode-education]
owner: andrew
last_updated: 2026-07-31
---

# Audio learning release

## Context

Andrew reviewed an ElevenLabs candidate library outside the app. The next useful evidence is contextual: approved learning candidates must play during real Focus and Games moments before weak families are regenerated. Long tracks must not materially grow the initial install.

## Target audience

Aspirational family organizers want shared play and ordinary focus to feel more alive without adding setup, administration, or an attention-seeking reward system.

## Representative persona

Maya wants to begin Focus or a family game immediately. Audio should feel as though it was already waiting, even when an optional track was not packaged in the app.

## Aspirational design challenge

How might we help Maya feel that Kwilt's audio was already waiting for the family, while preserving immediate play, calm volume, offline grace, and a small initial install?

## Hero JTBD

`jtbd-help-us-enjoy-being-together` — the primary product value is a more memorable, responsive shared-play moment.

## Job flow step

`job-flow-maya-start-playing-together`, steps 7–8: responsive play, celebration, and replay. The flow's old host-integration scores require later refresh; this release changes experiential quality, not joining or rules.

## JTBD framing

When Maya begins Focus or a game, she wants sound to start naturally and fit the moment so the app feels alive without making her wait, manage files, or adjust volume.

## Design

Keep Deep Work Drift bundled. Move every other continuous Focus track and all game music to a public, versioned Supabase Storage catalog with immutable cache headers. Cached files play locally; uncached files stream immediately while a silent background cache operation runs. Short effects remain bundled.

Integrate the learning set defined in `docs/design-explorations/audio-learning-release/00-frame.md`. Preserve ids, the existing Focus picker, the Games sound toggle, and To-do sounds. An unavailable uncached Focus selection falls back for the session without overwriting the saved preference.

The initial learning build includes approved Pattern notes, Pattern Miss 1, Cartoon Splat 1, the three approved new Focus tracks, the existing non-default Focus tracks through remote delivery, one approved Story Relay default, Clue Circle 2, Slanguage 1, and temporary Bank full mixes. Qualitatively rejected or undersized victory and Bank-effect families remain excluded.

## Success signal

Audio starts without a visible download step, repeated playback uses cache when available, cleanup and fallback remain reliable, volume remains balanced, and family use identifies which tracks improve the real moment.

## Open questions

None blocking implementation. Permanent candidate acceptance remains intentionally deferred to contextual evidence.

## Spec refinement

- Remote assets use content-versioned paths; catalog updates are code-reviewed rather than fetched from mutable runtime JSON.
- Cache files live in purgeable app cache, so only Deep Work Drift is guaranteed offline.
- First-play stream plus cache may duplicate a transfer; this is measured and accepted for the learning release.
- Story Relay's initial default is chosen by loop quality, loudness compliance, and speech masking because both reviewed variants received `Love it`.
- The app must not expose Supabase service credentials; public audio reads require no client key.
- Completion requires source tests, audio audit, bundle-size comparison, public-URL verification, Simulator functional playback, and separate signed-device background/route proof.
