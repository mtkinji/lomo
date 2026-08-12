# Learning Release: Canyon Spring

## Concept To Build

Canyon Spring turns an active Focus session into one sheltered slot-canyon spring, with restrained water and plant motion plus natural audio that continue without announcing a loop.

## Capability Delta

Today, the user cannot:

- Choose a coordinated audiovisual Focus environment.
- Rotate an active Focus experience between portrait and landscape.

After this release, the user can:

- Choose Canyon Spring from the same place they currently choose Focus audio.
- Start Focus immediately and see the canyon fill the screen in either orientation.
- Keep hearing the environment when the screen locks or the app backgrounds.
- Continue Focus through video buffering or failure using a poster/color fallback and the audio bed.

Still intentionally not supported:

- More generated scenes, a landscape browser, smart-light integration, spatial head tracking, or automatic downloads.

## User Experience

The setup surface labels the current choice `Environment`. `Canyon Spring` appears alongside the existing audio-only environments and `Quiet`. A small still preview confirms the choice without autoplay.

After Start, the scene fills the active Focus surface. The timer and title remain legible over a restrained adaptive scrim. End, pause/resume, and audio remain the only controls. Rotation is unlocked only while the active scene is visible and returns to portrait after Focus ends.

When Reduce Motion is enabled, use the poster frame with audio instead of moving video. When Low Power Mode is active, default to the poster frame for the learning release. When the app backgrounds, pause video decoding and continue the audio lifecycle. Returning to the app may restart the ambient visual; it must not restart the Focus session.

## Existing Product Relationship

This extends the existing Focus environment selection and active overlay. It does not create a new capability destination or a new domain object. Activity Focus and standalone Focus use the same environment runtime.

## Buildable Slice

Must be real:

- One accepted Canyon Spring visual master and one multi-minute audio master.
- Landscape and portrait CDN objects with immutable content-addressed paths.
- Remote progressive MP4 playback through Expo Video with app-managed or native caching enabled where supported.
- Existing Focus audio lifecycle remains the background/lock-screen owner.
- Poster, loading, offline, playback-error, Reduce Motion, Low Power Mode, portrait, landscape, paused, and ended states.
- Video failure never blocks Focus or rewrites the saved environment choice.

Can be thin or temporary:

- Andrew-only feature flag.
- One manually approved poster frame.
- Manual generation ledger and acceptance notes.

Intentionally excluded:

- HLS adaptation, because iOS Expo Video caching does not apply to HLS sources.
- A download manager, storage meter, video quality setting, scene descriptions, or usage claims.
- Distinct bird, drip, gust, splash, or echo-event orchestration in V1.

## Release Channel

`Local build`, followed by `TestFlight build` only after loop, power, orientation, background-audio, and fallback behavior pass on a physical iPhone.

## Brand-Goodwill Guardrails

- Hidden behind an internal flag until the asset and runtime feel intentional.
- No health, ADHD, therapeutic, or productivity-improvement claims.
- No Portal trademarks, copied scene names, captured assets, or imitated UI.
- The environment is optional and never starts before the user starts Focus.

## Reversibility

The environment is one versioned catalog entry behind a feature flag. Removing the entry returns the user to `Quiet` or the current audio fallback without migrating Focus sessions. New immutable media objects can replace the prototype without changing the environment id or session model.

## Permanent Product Threshold

Promote immersive environments only if Canyon Spring is repeatedly chosen, the loop is not noticed in ordinary sessions, video does not meaningfully harm battery/thermal behavior, and the added visual improves the felt transition into Focus rather than becoming ambient entertainment.
