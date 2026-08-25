# Learning Release: Contextual Recipe Recommendations

## Concept To Build

Recommended and **Get ideas from Kwilt** use one stable local-time context to
prepare a meal-period-aware short list.

## User Experience

The surface does not change. The user simply sees more plausible choices. At
and after 9:00, breakfast disappears from recommendations; dinner is represented
twice as often as lunch when enough recipes exist.

## Buildable Slice

Must be real:

- deterministic time-context and meal-bucket logic;
- shared use by the Recipes shelf and Plan Ideas action;
- fixed-time tests around the 9:00 boundary and sparse-bucket fallback;
- stable context during a mounted Recipes session.

Intentionally excluded: recommendation settings, telemetry-derived taste,
pantry, recency, family reactions, cost, and server-side personalization.

## Release Channel

Local build, followed by ordinary TestFlight dogfood. The change is reversible
by removing the context argument and has no migration or persistent user state.

## Permanent Product Threshold

Keep the rule if repeated morning/afternoon dogfood produces plausible short
lists without users needing to browse past irrelevant meal periods.
