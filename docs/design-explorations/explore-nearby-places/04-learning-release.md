# Learning Release: Explore Nearby Places

## Concept to build

While Explore is open, the user can request a small set of Apple Maps places around the current map center, inspect them as synchronized pins and list rows, and switch back to their own Places without changing tracking state.

## Buildable slice

Must be real:

- Native iOS MapKit POI search within 0.25, 0.5, or 1 mile.
- A deterministic, tested ranking and deduplication policy.
- Nearby/My Places drawer switching.
- Loading, empty, unavailable, refresh-this-area, selection, and accessibility states.
- Recommendation pins that do not clear fog or enter history.

Can be thin:

- Distance is straight-line for the first slice; walking ETA and Look Around may follow.
- Android shows an honest unavailable state until a provider is selected.
- Personalization uses only coarse affinity from the kinds of Places already in local Explore history.

Intentionally excluded:

- Missions, saving possibilities, route cataloging, notifications, and server persistence.

## Release channel

Local build, followed by TestFlight and signed-device use in both dense city and sparse outdoor contexts.

## Reversibility

The native module is optional, recommendation state is in-memory, and the prior My Places behavior remains available in the same drawer.
