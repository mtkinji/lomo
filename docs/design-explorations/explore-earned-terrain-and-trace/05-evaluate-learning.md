# Evaluate Learning: Explore earned terrain and trustworthy trace

## Learning questions

- Does the exact path remain visible throughout a long hike and after relaunch?
- Does the three-times-radius Place bloom feel like recognition rather than a claim of exact presence?
- Can Andrew and Charlie explain the difference between the line and the lighter terrain without a legend?
- Is the reveal still coherent at trail switchbacks, session boundaries, and GPS gaps?
- Do routes and automatically discovered Places remain appropriately narrow until the user creates a Place?

## Evidence plan

Supporting evidence:

- a signed-device hike shows the line continuously while Silver Mist updates;
- the route survives backgrounding and relaunch;
- the Place bloom is noticed as generous but not mistaken for the route;
- no visual bridge appears across a known recording gap.

Disconfirming evidence:

- the line still vanishes, flickers, or blends into the map;
- the Place bloom looks fully clear or reads as "I walked everywhere here";
- the radius overwhelms small parks or looks trivial in open terrain;
- automatic map Places or Adventure sessions receive a bloom without a user-created Place.

## Instrumentation

- Use deterministic tests for segment count, continuity, user-created Place selection, and renderer contracts.
- Use a manually named Place in Simulator for visual shape/contrast inspection.
- Use a signed iPhone for actual backgrounding, long-session rendering, relaunch, battery, and thermal evidence.
- Record a short qualitative note after a real hike; do not add location analytics or upload precise traces for this learning release.

## Decision rule

After naming Places on at least one signed-device hike and one urban walk, keep the concept if the route is continuously legible and the bloom feels like recognition without explanation. Reduce or reshape the radius if it overclaims; retire the bloom if it pressures Place creation; investigate native composition if the route remains unreliable.

## Expected next action

Tune the Place bloom from device evidence, or draft a separate privacy and data-source decision for authoritative landscape boundaries.
