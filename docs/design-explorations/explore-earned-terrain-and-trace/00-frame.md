# Frame: Explore earned terrain and trustworthy trace

## What the user said

> In the backcountry, it feels like a broader swath of terrain should be earned even though the exact line should remain the truthful record of where we went. Fog clears, albeit spottily, while the route line often does not render.

## Restated in user voice

When I am exploring a park or the backcountry with my family, I want the map to recognize the landscape I meaningfully experienced while still showing the exact route Kwilt observed, so the result feels generous without becoming fictional.

## Target audience

`audience-aspirational-family-organizers` — families who want ordinary outings to become meaningful shared memory without another system to administer.

## Representative persona

Maya is outside with her family and wants the map to preserve the feeling of the outing, not merely a narrow GPS artifact.

- Current situation: moving through terrain where many nearby acres are experienced but not literally traversed.
- What she is trying to become/do: make family time feel memorable and worth returning to.
- Emotional state or tension: delight in discovery, paired with skepticism when the map contradicts what just happened.
- What would make this feel wrong: a fabricated route, a surveillance signal, a noisy achievement system, or unreliable drawing.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — embodied family experiences are part of the life Maya is trying to move forward.

## Job flow step

`job-flow-maya-move-family-life-forward`, step 7: let family members participate without turning life into admin. Delivery score: 2. Explore can make a family outing legible, but the current map does not reliably preserve the route or the broader experience of terrain.

## Active anchors

- `jtbd-capture-and-find-meaning` — preserve what the family actually did without manual journaling.
- `jtbd-trust-this-app-with-my-life` — distinguish observed route evidence from interpretive territory and render both reliably.
- `jtbd-invite-the-right-people-in` — keep the eventual family layer meaningful without implying live or exact location sharing.

## Friction we're addressing

The narrow clear corridor under-represents a backcountry outing, while the route line can disappear even as fog geometry continues to render. The two layers currently communicate different truths but do not have equally reliable presentation contracts.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: the full-screen Explore map already owns fog, route, Places, recaps, and layer controls.
- Existing user flow: automatic recording or an explicit Adventure produces sessions, canonical points, explored cells, and a recap.
- Existing domain/data model: sessions preserve ordered evidence; explored cells are a derived territory projection; recording policy exists in tracking state but is not retained on sessions.
- Existing technical affordances: Silver Mist receives bounded explicit segments, while My Path currently creates one MapKit polyline per accepted point pair.
- Existing UX/copy conventions: exact personal paths and coarse territory are separate projections; no dashboard, streak, setup, or public claim.

Constraints to preserve:

- Never draw a route across sessions or an evidence gap greater than 60 meters.
- Never use an inferred or provider-generated line to establish visited territory.
- Keep precise route evidence private by default and visually distinct from broader earned terrain.
- Avoid a park-boundary claim until Kwilt has a trustworthy boundary source and privacy decision.

Constraints we may challenge:

- The current 65-foot clear-core treatment is too literal as the only expression of a landscape the person chose to remember as a Place.
- The altitude line may use fewer render primitives and a contrast casing if that is required for dependable visibility.

Design implication:

Use the same bounded, topology-preserving geometry for fog and route presentation. Let the explicit act of creating a Place produce a wider, partial familiarity bloom, while leaving the observed route line as the sole precise claim.

## Aspirational design challenge

How might we help Maya recognize a landscape that mattered enough to name, while preserving an unmistakable and trustworthy record of where she actually traveled?

## Out of scope

- Claiming or downloading legal park boundaries.
- Automatically classifying every outdoor location as backcountry.
- Gamified acreage, completion percentages, badges, streaks, or public comparisons.
- Road or trail matching that overwrites canonical observations.

## Open question

Does a three-times-radius soft bloom around a user-created Place feel meaningful without reading as exact traversal?
