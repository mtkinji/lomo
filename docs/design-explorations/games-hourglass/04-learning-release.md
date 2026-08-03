# Learning Release: Games Hourglass

## Concept To Build
A fixed 60-second table timer with Physical, Classic, and Simple faces; Physical starts by turning the phone end-over-end, while touch remains available everywhere.

## Capability Delta
Today, the user cannot:
- replace a missing one-minute game timer inside Kwilt Games.

After this release, the user can:
- open Hourglass from Utilities, choose a remembered timer face, turn or tap to start, watch an accurate countdown, optionally hear music, receive a completion cue, and repeat.

Still intentionally not supported:
- other durations, pause/resume, player turns, scorekeeping, remote synchronization, or background notifications.

## User Experience
The Games shelf gains an Hourglass utility card beside Basic Dice Roller. It opens directly to the last-used Physical, Classic, or Simple face. Physical arms after the phone is held steadily and starts when it reaches the opposite end; concise state copy guides the gesture and touch always works as fallback. Classic keeps the animated tap-to-flip glass. Simple presents oversized digits and tap-to-start. Music is an optional session control, off by default. At zero, all faces clearly read **Time!** and use the same completion policy.

## Existing Product Relationship
This extends the established Utilities section and reuses the Games stack, theme, haptics, sound policy, and music runtime. It does not alter the multiplayer catalog.

## Buildable Slice
Must be real:
- absolute-deadline-based 60-second logic;
- foreground lifecycle reconciliation;
- animated hourglass state with reduced-motion fallback;
- filtered device-motion arming and opposite-end flip detection;
- Physical, Classic, and Simple faces over one timer state;
- locally remembered style choice;
- optional in-session music;
- completion haptic/audio and accessible controls;
- native Games navigation and shelf entry.

Can be thin or temporary:
- reuse an existing light-suspense Games music bed until Hourglass earns its own track.

Intentionally excluded:
- backend state, analytics, notifications, and duration settings.

## Release Channel
Local build for Andrew’s immediate table-use and visual evaluation. A later normal app release can make it production-default after runtime proof.

## Brand-Goodwill Guardrails
- No ad, prompt, onboarding, sign-in, or analytics requirement.
- Music remains off until explicitly enabled.
- The displayed time is derived from an absolute deadline rather than accumulated intervals.

## Reversibility
One utility route, one shelf card, and no migrated or persisted data make the release removable without debt.

## Permanent Product Threshold
The utility feels immediately understandable and dependable in real play; Physical turns work without false starts on a signed phone; and the three faces solve real table contexts without creating duration or settings pressure.
