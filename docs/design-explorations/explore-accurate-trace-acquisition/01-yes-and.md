# Yes-and: Deliberate Adventure elevation

Original idea: A manually recorded Adventure preserves an accurate route and shows its altitude changes in a chart afterward.

## Adjacencies

**Yes, and what if it could...** turn the completed Adventure into one durable route-and-elevation memory in the existing recap.

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: the outing becomes something recognizable to revisit, not merely a recording that ended.
- New value: the path explains where the outing went while the profile recalls how it felt to move through the terrain.
- Cost delta vs. original: low
- Anti-pattern check: pass; one calm recap artifact, not a dashboard or new permanent navigation surface.

**Yes, and what if it could...** plot elevation against distance traveled so the shape of the terrain corresponds naturally to progress along the route.

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: climbs and descents become legible in the same order they were experienced.
- New value: a meaningful profile rather than a generic altitude-over-clock-time diagnostic.
- Cost delta vs. original: low
- Anti-pattern check: pass; the chart communicates the outing without turning it into a performance score.

**Yes, and what if it could...** let a later tap or scrub on the profile locate the corresponding point on the map.

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: a remembered hill, overlook, or descent can be situated in the actual outing.
- New value: the chart and route become one explorable memory rather than two disconnected graphics.
- Cost delta vs. original: medium
- Anti-pattern check: pass if this remains an optional recap interaction; defer it if it makes the first slice visually or technically heavy.

**Yes, and what if it could...** make uncertain elevation evidence visibly honest instead of smoothing every gap into false precision.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Maya can trust that the profile reflects recorded evidence rather than invented terrain.
- New value: low-quality or missing altitude samples can be omitted, softened, or marked without discarding otherwise valid route coordinates.
- Cost delta vs. original: medium
- Anti-pattern check: pass; quality is communicated quietly, without exposing a technical diagnostics panel.

**Yes, and what if it could...** place only meaningful named discoveries on the profile, such as a saved overlook or destination.

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: elevation changes connect to places Maya cared enough to preserve.
- New value: a peak or valley becomes part of the outing story rather than an anonymous number.
- Cost delta vs. original: medium
- Anti-pattern check: pass if markers are sparse and Place-owned; failure if every placemark becomes chart clutter.

**Yes, and what if it could...** offer a restrained start, high, low, and finish reading only when the underlying altitude quality supports it.

- Serves: `jtbd-capture-and-find-meaning`, `jtbd-trust-this-app-with-my-life`
- Job elevation: the user can orient to the profile without interpreting an unlabeled shape.
- New value: enough context to understand the terrain without building a workout statistics grid.
- Cost delta vs. original: low
- Anti-pattern check: pass with a few contextual labels; total ascent, pace, calories, rankings, and goal comparisons remain out of scope until they serve a demonstrated job and can be computed truthfully.

**Yes, and what if it could...** replay one Adventure by growing its route and fog reveal while a cursor moves through the elevation profile.

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: the recap recalls the sequence of the outing, not only its final shape.
- New value: route, terrain, and discovery become one time-based memory derived from already retained session points.
- Cost delta vs. original: medium
- Anti-pattern check: pass when playback is user-invoked, calm, pausable, and skippable; failure if every recap forces an attention-seeking animation.

**Yes, and what if it could...** eventually replay the map becoming known across many Adventures and ambient outings.

- Serves: `jtbd-make-sense-of-the-season`, `jtbd-capture-and-find-meaning`
- Job elevation: Maya can see a season of movement accumulate into familiar territory.
- New value: Explore becomes a private retrospective of how her lived world expanded over time.
- Cost delta vs. original: high
- Anti-pattern check: pass only as a private, deliberate lookback; historical gaps, legacy fog, and Place creation must be labeled honestly rather than reconstructed as false certainty.

## Frame recommendation

**Run design-thinking-loop with an expanded frame.** A deliberate Adventure should earn a richer promise than ambient history: an accurate route plus a compact, distance-based elevation profile inside its recap, with playback available from the same retained evidence. The first slice should remain a private reflection artifact, not a fitness dashboard. Honest handling of weak altitude samples belongs in the initial contract; all-time playback is a later retrospective surface that requires stronger provenance than a single-session replay.
