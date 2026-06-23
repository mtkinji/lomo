# Frame: Contextual Recommended P1A Contract

## What the user said

> I like the idea of using recommended as the delivery vehicle for the contextual to-dos. That, to me, is phase one. We already have the surface. We could simply make it smarter. We should make it smarter by implementing actual context, an actual context system. That actual context system should include all the signals we have discussed and planned that would allow the context to be functionally good. So the UI layer doesn't need to change much. It's just that the context that we deliver to the recommendations engine should be enhanced.

## Restated in user voice

Recommended should become smarter because Kwilt understands the user's current moment better, not because Kwilt adds a mode selector or starts globally preferring certain task categories.

## Target audience

`audience-aspirational-family-organizers` - Aspirational family organizers.

## Representative persona

Maya is trying to keep ordinary family and personal commitments moving without adopting a power-user productivity system.

- Current situation: she opens Kwilt with a crowded Activity list and wants to know what is doable in the moment.
- What she's trying to become/do: a steadier family organizer who can act without re-sorting her whole life.
- Emotional state or tension: overloaded by the pile, skeptical of setup work, but open to help that feels quietly accurate.
- What would make this feel wrong to her: another manual view, broad taxonomy, or a recommendation that claims context without actually knowing anything about the moment.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want to grow.

## Job flow step

`job-flow-maya-move-family-life-forward`, step 4: Know the next doable action.

Current delivery score: 2. Kwilt has Activities, views, grouping, and a Recommended surface, but it does not yet unify actionability and current context well enough to reduce Maya's first scan.

## Active anchors

- `jtbd-carry-intentions-into-action` - Contextual recommendations should turn captured intentions into an immediately doable next move.
- `jtbd-capture-and-find-meaning` - The system must not make capture depend on context labeling.
- `jtbd-trust-this-app-with-my-life` - The context system must stay humble when evidence is weak.

## Friction we're addressing

The current P1A conversation collapsed "context" into either UI chips or static task-category boosts. Neither is sufficient. The missing layer is a richer recommendation model that uses context fit as one bounded ingredient alongside urgency, importance, readiness, effort/shape, and confidence.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Activities already has a `Recommended` section with up to three active, non-closed Activities.
- Existing show/hide rules: Recommended appears only when the user has not reshaped the list with Kanban, filters, or grouping.
- Existing scoring: `activityPriority.ts` scores priority, Goal priority, due/scheduled/reminder timing, started state, steps, Goal anchoring, and recency.
- Existing Activity model: title, notes, tags, type, schedule/reminder fields, priority/actionability state, and optional explicit location metadata.
- Existing location capability: explicit per-task Location Triggers / Location Offers already exist, but learned places and task-event location evidence do not.
- Existing UX convention: grouping is a scan lens, not the contextual engine.

Constraints to preserve:

- Recommended remains the P1A delivery vehicle.
- P1A should not add a new context grouping, saved places, widgets, notifications, learned-place storage, or new geolocation persistence.
- P1A should not require the user to declare a mode when they open the app.
- Context must not become a user-maintained taxonomy.

Constraints we may challenge:

- Recommended may need a richer input than just `activities`, `goals`, and `now`.
- The priority scorer may need to separate normal actionability score from context hypothesis and context fit.

Design implication:

P1A should make Recommended smarter underneath the existing surface. Task metadata can help decide whether an Activity fits a real-world context, but it should not overpower urgency, importance, readiness, or confidence.

## Aspirational design challenge

How might we help Maya see one to three Activities that are genuinely likely doable in her current moment, while keeping Recommended as the delivery surface and refusing new setup, mode switching, or fake context?

## Out of scope

- User-facing mode chips as the default P1A path.
- Category-only global boosts.
- Context grouping.
- Saved or learned places.
- New location persistence.
- Widgets or notifications.
- Automation.

## Open question

Which P1A context hypotheses can be responsibly inferred from existing signals today, and which must wait for P2/P3 evidence?
