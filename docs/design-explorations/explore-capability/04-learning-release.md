# Learning Release: Explore capability

## Concept To Build

A feature-flagged Kwilt map that turns an explicitly recorded outing into persistent explored territory and an altitude-colored personal path.

## Capability Delta

Today, the user cannot preserve real-world exploration in Kwilt.

After this release, the user can start, observe, stop, and revisit a local adventure map.

Still intentionally not supported: automatic background tracking and authoritative family delivery.

## User Experience

Explore appears in the global left navigation when enabled. The map opens on the last recorded area or current position. Start Exploring requests foreground permission in context, begins high-accuracy sampling, and changes to Stop. A quiet status line reports recording or errors. The layer control exposes My Path and the designed family visibility model.

## Existing Product Relationship

Explore is a named capability that reuses the global capability shell, MapKit integration, location permission posture, and the evolving Places model. It does not replace Activities or create a second Place entity.

## Buildable Slice

Must be real:

- navigation and flag gating;
- location permission and foreground sampling;
- persisted accepted points, cells, and sessions;
- fog and altitude rendering;
- local privacy/layer settings;
- canonical Place plus person-Place visit relationship model.

Can be thin or temporary:

- coarse circle-hole fog rather than raster tiles;
- manually confirmed Place visits without Apple POI lookup;
- family layers represented by real empty states until sync exists.

Intentionally excluded:

- background location capability mutation;
- server migrations and remote live location;
- push notifications and gamified rewards.

## Release Channel

Local build on the implementation branch. The flag defaults on only in development and remains off without a production PostHog grant.

## Brand-Goodwill Guardrails

- Explicit start and persistent recording indication.
- Private default and plain visibility copy.
- No inferred family access or fake shared data.
- Clear delete/reset control for local exploration history.

## Reversibility

Disable the feature flag to remove the navigation entry. Explore state is isolated in its own versioned local store and can be cleared without touching core Kwilt objects.

## Permanent Product Threshold

The local map is understandable, visually rewarding on a real walk, reliable across relaunch, and users ask for ambient recording or family contribution after understanding the privacy model.
