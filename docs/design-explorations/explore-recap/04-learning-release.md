# Learning Release: Exploration Recap

## Concept To Build

A manually started or ambient Explore outing can continue with the screen locked and return as one quiet recap of newly discovered Places.

## Capability Delta

Today, the user cannot keep the phone away and receive a batched Place story afterward.

After this release, the user can stop one outing, let Kwilt resolve a bounded set of named placemarks, and review all new Places together.

Still intentionally not supported: ambient all-day tracking, remote family delivery, or guaranteed recognition of every real-world POI.

## User Experience

Explore offers one recording-mode choice: `Always Exploring` or `Only when I start`. Both continue through screen lock; the main action becomes Pause in ambient mode and Start/Stop in manual mode. One separate recap-notification preference remains. If no credible named Places are found, the route still persists and no empty celebration is forced.

## Buildable Slice

Must be real:

- versioned session discovery and recap state;
- confidence, dedupe, sampling, copy, and notification policy tests;
- foreground Apple placemark resolution over a bounded route sample;
- adaptive background location task and explicit permission path;
- automatic outing boundaries and combined unseen recaps;
- one recap drawer and privacy-safe notification deep link;
- deterministic preview data for multi-place runtime proof.

Can be thin:

- keyword-based Place-kind classification;
- best-effort background stillness closure;
- local-only Place relationships.

Intentionally excluded:

- server writes, family sync, analytics containing location, and per-place notifications.

## Release Channel

Local isolated build, still behind `explore-capability`. Native background proof requires a fresh build because the Info.plist background mode changes.

## Brand-Goodwill Guardrails

- No background permission before the user starts manually or chooses Always Exploring.
- Always Exploring never implies family sharing.
- No names in notification copy by default.
- At most one notification per completed session.
- Route and Place identities remain out of analytics.

## Reversibility

Disable the feature flag or return recording to `Only when I start`. State remains in the versioned Explore store and can be cleared independently.

## Permanent Product Threshold

A signed-device outing records through screen lock, produces a useful multi-place recap, avoids false drive-by collections, and sends no duplicate notification.
