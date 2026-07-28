# Converge: Explore capability

## Chosen alternative

**Explicit adventures with family-ready layers.** Explore is a full-screen map capability. Starting an adventure requests foreground location, clears approximately 30.48 meters around accepted points, colors route segments by elevation, and persists the result locally. A layers control distinguishes My Path, Family Territory, and individual member visibility; unavailable family data is explained rather than simulated.

## Capability delta

Today, the user cannot turn movement into a durable explored map inside Kwilt.

After this release, the user can:

- open Explore from the global capability menu;
- explicitly start and stop an adventure;
- see accepted GPS points clear a 100-foot fog radius;
- see route color reflect altitude;
- reopen the app and retain explored territory and completed adventures;
- inspect recording, sharing, and viewing controls without conflating them;
- retain confirmed visits as metadata on a canonical Place relationship.

Still intentionally unsupported:

- automatic/background collection;
- remote family and live location delivery;
- automatic POI lookup and collection;
- public or competitive sharing.

## Reductive design decisions

- One map, one primary Start/Stop action, one layer drawer.
- No dashboard, percent-cleared KPI, leaderboard, streak, or setup wizard.
- Permission follows Start Exploring.
- Exact personal paths and coarse territory remain separate data projections.
- Place visits extend the Places model; there is no separate Discovery entity.

## Activation path

Explore is visible only when the `explore-capability` feature flag is enabled; development builds default it on for proof. The first permission prompt occurs only after the user taps Start Exploring.

## Stated bet

We are betting that seeing nearby fog clear around a real altitude-colored route creates enough delight and meaning to justify later investment in background recording and family sync. If the local session feels administrative or visually weak, we revisit the rendering and activation before expanding the data surface.

## Success signal

A user can start a short walk, understand that recording is active, observe the map reveal, stop, reopen Explore, and immediately recognize the retained territory and route without wondering who else can see it.
