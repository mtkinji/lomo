# Diverge: Places System

## Axis Of Variation

The meaningful design axis is where place intelligence lives:

- attached to each Activity,
- represented as an evidence layer underneath surfaces,
- user-managed as Settings places,
- or mediated primarily through the Phone Agent.

All alternatives preserve the four-object model. Places are not a fifth top-level life object in the main app canvas; durable Places can be supporting Settings-managed objects that explain and control place memory.

## Alternative A: Activity-Attached Places

Each Activity owns its place relationship directly. Quick Add, Activity Detail, and Phone Agent write to Activity `location`; Recommended reads that field as one bounded context signal; Location Offers register geofences from the same Activity data.

Maya fit: good for immediate clarity. A place relationship lives on the to-do where she expects it, and she does not need a new concept.

Design-challenge answer: helps place-related intentions become actionable while preserving capture-first behavior.

System-fit note: strongest fit with current code because Activity already has location metadata. Lowest migration risk.

Best when: the goal is to make existing Activity place behavior coherent quickly.

Fails when: Phone Agent, saved places, repeated evidence, and audits need semantics beyond one Activity's current location field.

Primer anti-pattern check: pass. It does not create dashboards, force setup, or auto-anchor identity objects.

## Alternative B: Evidence-Gated Places

Places become a shared interpretation layer with five concepts: place reference, place intent, place evidence, place context, and place memory. Existing Activity location behavior becomes one projection of that layer. Recommended, Location Offers, Activity Detail, Quick Add, and Phone Agent all consume the same place interpretation.

Maya fit: strong. She sees the practical result in existing surfaces, not a new place manager.

Design-challenge answer: makes place help only when evidence supports actionability, while keeping memory permissioned and inspectable.

System-fit note: extends the system with a small domain model, but keeps UI delivery in existing surfaces.

Best when: Kwilt needs a durable substrate that can support current Activity locations and future saved places without treating all coordinates as meaning.

Fails when: the first implementation tries to build every concept fully before delivering visible value.

Primer anti-pattern check: pass. This keeps capture first and avoids fake certainty, productivity voice, and hidden AI mutation.

## Alternative C: Settings-Managed Places

Kwilt provides a Settings area for durable Places such as school, church, grocery, office, gym, or library. The user can inspect, rename, delete, or forget confirmed place memory there. Activity capture still comes first; Settings is for managing memory, not for initial setup.

Maya fit: medium-strong if it is management after value, weak if it becomes setup before value.

Design-challenge answer: supports user-approved memory and reversibility without cluttering the main Activity surface.

System-fit note: requires a supporting PlaceMemory domain and a Settings management surface, but does not require primary navigation.

Best when: users already have confirmed place memory or repeated place behavior and need control over what Kwilt remembers.

Fails when: the user has to create "Library" before capturing "return library books."

Primer anti-pattern check: pass if optional and Settings-scoped; fails if it becomes required setup.

## Alternative D: Phone-Agent-First Places

The Phone Agent becomes the main place-intent parser. Users text or say place-bearing requests; Kwilt converts them into Activity/place proposals with preview, confirmation, and audit. In-app Activity location remains secondary.

Maya fit: medium. It fits capture-in-motion well, but not all place work starts through phone/text.

Nina fit: strong. This directly serves AI-native trust if proposal, approval, and undo are excellent.

Design-challenge answer: strong for place-bearing capture, weaker for in-app inspection and Recommendation behavior unless the shared model exists underneath.

System-fit note: depends on Phone Agent maturity and a mutation contract that is broader than Places.

Best when: voice/SMS capture is the fastest route to place-aware value.

Fails when: it makes in-app Activity behavior a second-class path.

Primer anti-pattern check: pass only with preview and confirmation; fails if AI silently writes triggers or saved places.

## Alternative E: Location-Offer-First Places

Places are framed around explicit arrive/leave prompts. The system focuses on letting the user attach a place to an Activity, configure enter/exit, and receive a completion offer when the trigger fires.

Maya fit: medium-strong for concrete errands and pickup/dropoff reminders.

Design-challenge answer: narrow but useful. It solves one class of place-bound action well.

System-fit note: maps to existing LocationOfferService and Activity Detail work.

Best when: the immediate product goal is reliable, permissioned arrive/leave prompts.

Fails when: the user wants place relevance without a trigger, notification, or OS permission.

Primer anti-pattern check: pass if events remain offers, not automatic completions.

## Divergence Takeaway

Activity-Attached Places is the lowest-risk slice, Location-Offer-First is the most concrete shipped behavior, Phone-Agent-First is strategically important, and Settings-Managed Places is the right durable memory control surface. All four become cleaner if Evidence-Gated Places is the underlying concept. Settings management should be included as the place memory model matures, but rejected as the first value moment.
