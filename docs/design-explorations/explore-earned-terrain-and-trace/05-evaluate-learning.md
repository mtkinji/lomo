# Evaluate Learning: Explore earned terrain and trustworthy trace

## Learning questions

- Does the exact path remain visible throughout a long hike and after relaunch?
- Does the 120-meter soft corridor feel like earned landscape rather than a claim of exact presence?
- Can Andrew and Charlie explain the difference between the line and the lighter terrain without a legend?
- Is the reveal still coherent at trail switchbacks, session boundaries, and GPS gaps?
- Does ambient driving or passive recording remain appropriately narrow?

## Evidence plan

Supporting evidence:

- a signed-device hike shows the line continuously while Silver Mist updates;
- the route survives backgrounding and relaunch;
- the broader corridor is noticed as generous but not mistaken for the route;
- no visual bridge appears across a known recording gap.

Disconfirming evidence:

- the line still vanishes, flickers, or blends into the map;
- the wider corridor looks fully clear or reads as "I walked everywhere here";
- the radius overwhelms small parks or looks trivial in open terrain;
- migrated or automatic sessions receive the Adventure treatment.

## Instrumentation

- Use deterministic domain tests for segment count, continuity, policy migration, and renderer contracts.
- Use preview Adventure and Simulator for visual shape/contrast inspection.
- Use a signed iPhone for actual backgrounding, long-session rendering, relaunch, battery, and thermal evidence.
- Record a short qualitative note after a real hike; do not add location analytics or upload precise traces for this learning release.

## Decision rule

After at least one long signed-device hike and one shorter urban Adventure, keep the concept if the route is continuously legible and the wider treatment is understood without explanation. Reduce or reshape the radius if it overclaims; investigate native composition if the route remains unreliable; pursue park boundaries only if the corridor clearly proves the desire for stronger landscape semantics.

## Expected next action

Tune the terrain radius/treatment from device evidence, or draft a separate privacy and data-source decision for authoritative park-boundary reveal.
