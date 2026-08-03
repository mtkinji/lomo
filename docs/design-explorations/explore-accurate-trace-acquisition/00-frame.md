# Frame: Explore accurate trace acquisition

## What the user said

> My simple goal is accurate lines without gaps. We can get clever about battery management, but if accurate automatic lines drain the battery, we should rethink lines as deliberate manual tracking sessions instead.

> Manual sessions could record altitude changes and show them in a chart.

## Restated in user voice

When I choose to preserve a route, I want the line to accurately and continuously show where I traveled, and I want its climbs and descents to remain visible afterward. If that fidelity is too expensive to collect all day, I would rather make the richer route memory deliberate than fictional.

## Target audience

`audience-aspirational-family-organizers` — families who want movement and outings remembered without administering a tracking system or sacrificing trust.

## Representative persona

Maya wants Explore to quietly remember ordinary life, but an exact route is valuable only when it is dependable.

- Current situation: automatic tracking and Silver Mist can retain a broad sense of movement while My Path still shows gaps.
- What she is trying to become/do: preserve family outings as recognizable, accurate memories.
- Emotional state or tension: she wants effortless history, but prefers an explicit recording action over a misleading line or excessive battery cost.
- What would make this feel wrong: inferred paths, hidden battery drain, an “exact” line with routine gaps, or a manual mode that still fails to record densely.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — family outings are embodied expressions of the life Maya wants to move forward.

## Job flow step

`job-flow-maya-move-family-life-forward`, step 8: keep using the system because it feels helpful, not fussy. Delivery score: 3. Automatic history is convenient, but unreliable exact paths weaken trust; deliberate sessions are acceptable if they make the promise clearer and more dependable.

## Active anchors

- `jtbd-capture-and-find-meaning` — preserve what actually happened without requiring reconstruction or route repair.
- `jtbd-trust-this-app-with-my-life` — make the relationship between recording intent, location fidelity, battery cost, fog, and exact lines truthful.

## Friction we're addressing

The current discussion mixed acquisition failure with presentation repair. The product requirement is narrower: My Path should render actual retained observations as a continuous, accurate line. If automatic acquisition cannot provide those observations within an acceptable battery envelope, automatic mode should not promise the same exact-path artifact as a deliberate Adventure.

## System alignment

Constraint posture: `Question the system`

Current system facts:

- Existing surface: Explore already has automatic recording, deliberate Start/Stop Adventures, Silver Mist, Places, and My Path.
- Existing domain/data model: sessions retain ordered points, tracking policy, timestamp, accuracy, speed, course, altitude, and altitude accuracy; no inferred route model is needed.
- Existing playback affordance: those timestamps can drive a route cursor, elevation cursor, and progressive fog reveal without recording video or persisting a fog snapshot for every point.
- Existing automatic profile: iOS begins around a 30-meter distance interval and moves to approximately 22 meters for detected vehicle travel, with deferred delivery and stationary deep sleep.
- Existing deliberate profile: foreground manual recording requests approximately 6-meter updates; deliberate vehicle background tracking also targets the denser profile after movement classification.
- Platform constraint: Expo marks `timeInterval` as Android-only, so iOS fidelity is governed mainly by distance, accuracy, Core Location scheduling, permission, and runtime state rather than a guaranteed 1- or 2-second callback.
- Battery affordances: deferred delivery can batch collected locations and reduce JavaScript wakeups; stationary deep sleep can power down continuous tracking. Neither makes active high-accuracy GPS costless.

Constraints to preserve:

- Draw only from actual recorded observations; no road matching, inferred bridges, or manual route repair.
- Never connect across separate sessions or a genuinely missing evidence interval.
- Treat an elevation profile as a reflection on a deliberate outing, not a live fitness dashboard, competition, or score.
- Keep measurement truth distinct from presentation smoothing: the map may blend route colors, while a chart must not silently present an untrusted or invented altitude as an observation.
- Session playback may derive visual state from retained evidence, but an all-time playback must not imply exact historical reconstruction for legacy fog or Place blooms whose originating event cannot be proven.
- Fog may remain a softer, broader projection than My Path.
- Battery and line-fidelity claims require signed-device comparison, not configuration inspection alone.
- Preserve automatic Explore if it remains useful for fog and Place history even when it does not own exact lines.

Constraints we may challenge:

- Automatic and deliberate sessions currently both feed the same My Path presentation contract.
- “Always Exploring” may not be the right owner of an exact route if the required active GPS spend is disproportionate.

Design implication:

First test acquisition rather than inventing geometry. Compare the same representative routes in automatic and deliberate modes, capturing raw sample spacing, accepted-point spacing, discontinuities, horizontal and altitude accuracy, runtime state, and battery/thermal evidence. Keep automatic exact lines only if they meet the same user-visible continuity bar at acceptable cost; otherwise, reserve the exact path and its compact elevation profile for deliberate sessions and let automatic mode continue building fog and Place familiarity.

## Aspirational design challenge

How might we give Maya a deliberate outing record whose exact path and climbs she can depend on, while spending continuous high-accuracy location energy only when that richer memory is worth making?

## Out of scope

- Provider road matching, inferred curves, or gap-filling presentation geometry.
- A continuity slider, battery dashboard, or manual route editor.
- Fitness scoring, leaderboards, elevation goals, or a dense workout-statistics surface.
- Treating overlapping fog as proof that exact route observations exist.
- Removing automatic fog or Place history before testing their independent value.

## Open question

Does automatic tracking meet the exact-line acceptance bar on a signed iPhone at acceptable battery cost, or should the exact path and elevation profile belong only to deliberate Start/Stop Adventures?
