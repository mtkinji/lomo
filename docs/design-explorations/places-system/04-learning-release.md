# Learning Release: Places System

## Concept To Build

Build Evidence-Gated Places as a shared interpretation layer that lets existing Activity, Quick Add, Recommended, Location Offer, and Phone Agent surfaces understand why a place matters, with durable Places managed from Settings rather than introduced as a primary app tab.

## Capability Delta

Today, the user cannot:

- distinguish a one-time place reference from a durable Settings-managed Place;
- distinguish an Activity-place assignment from a geofence notification trigger;
- see why a place should affect a recommendation or trigger;
- trust that Quick Add, Activity Detail, Location Offers, and Phone Agent use the same place semantics;
- inspect place behavior beyond the current Activity location field.

After this release, the user can:

- capture a place-bearing Activity without blocking creation;
- have obvious place references softly assigned from capture without manually creating a Place first;
- see or edit the Activity's place assignment in existing surfaces;
- accept explicit trigger behavior only when useful;
- receive place-aware recommendations only when evidence supports actionability;
- trust that place proposals are user-approved before becoming triggers or memory.

Still intentionally not supported:

- primary-canvas Places tab;
- silent learned places;
- continuous location history;
- cross-user place priors;
- place automation;
- automatic completion from arrive/leave events.

## User Experience

The user encounters Places through existing flows:

- In Quick Add, the Activity is created first. If AI or text suggests a useful place behavior, Kwilt proposes it after creation.
- In Activity Detail, the user can inspect, edit, or remove the place assignment and separately enable or disable a trigger.
- In Settings, the user can manage durable Places once they exist: rename, inspect usage, delete, or forget.
- In Recommended, place evidence can help an already-actionable Activity rise when the current context makes it more doable.
- In Location Offers, arrive/leave events produce a prompt or notification, not an automatic completion.
- In Phone Agent, place-bearing language becomes a previewable Activity/place proposal rather than a silent mutation.

## Existing Product Relationship

Places enhances:

- Activities as the atomic doing object;
- Quick Add as capture-first entry;
- Activity Detail as inspection/editing surface;
- Recommended as the next-action delivery surface;
- Location Offers as explicit arrive/leave delivery;
- Phone Agent as a place-bearing capture surface;
- Settings as the durable Place memory management surface.

Places does not replace To-Do Action Contexts. Contexts answer "what fits this mode?" Places answers "what does this place relationship mean, when is it trustworthy enough to matter, and what durable memory can the user manage later in Settings?"

Non-place assignments such as `Errands`, `Away from home`, `At computer`, `At office`, or `Calls/messages` belong to To-Do Action Contexts. They may combine with Places, but they should not be modeled as Places simply because they help decide contextual relevance.

## Buildable Slice

Must be real:

- A minimum typed model for place reference, assignment, intent, evidence, context, memory, and suggestion.
- A Settings-managed PlaceMemory representation for durable Places, even if the first UI is compact.
- A compatibility mapping from existing `Activity.location` behavior into the model.
- A confidence policy for soft-assigning clear place references from capture without interrupting the user.
- Recommended consumes place evidence through the shared model rather than a flat coordinate boost.
- Quick Add and Activity Detail use the same place proposal/edit semantics.
- Activity-place assignment works without OS location permission or geofence registration.
- Place resolution is lazy: brand/category candidates can exist without map search, while geofences or directions require a specific resolved place.
- Location-trigger events remain offers/evidence, not completions.
- Tests cover capture-first, disabled-location behavior, weak-vs-strong place signal, and permission sequencing.

Can be thin or temporary:

- The Settings management UI can be compact and focused on rename/delete/forget rather than full place organization.
- Phone Agent integration can be a contract/spec before full SMS behavior.
- Evidence storage can start local or Activity-adjacent while the audit strategy is decided.
- Place matching can begin with explicit text/AI references before any broader location intelligence.
- Map search can be deferred until a behavior requires a specific place candidate.
- Telemetry can begin with deterministic events rather than a full analytics funnel.

Intentionally excluded:

- primary-canvas Places tab;
- saved-place setup flow before Activity value exists;
- learned-place suggestions;
- server-side location processing;
- automation rules;
- cross-user place priors.

## Release Channel

`Local build` first, then `TestFlight build` if the local slice proves coherent.

The learning release needs real code because the core question is whether existing surfaces can share one place interpretation without creating UI clutter or hidden trust problems.

## Brand-Goodwill Guardrails

- Place behavior should appear at value moments, not in abstract onboarding.
- Copy should be proactive and clear: "Use location triggers" / "When I leave" / "this location" when exact place naming is uncertain.
- Never imply Kwilt knows the user's current place unless there is explicit evidence.
- Do not request OS location permission until the user accepts a trigger behavior.
- Do not require the user to create a named Place before Kwilt can use an obvious place reference from capture.
- Provide remove/edit affordances wherever durable place relationships are shown.

## Reversibility

The release stays reversible by:

- keeping the first model backward-compatible with Activity location metadata;
- avoiding required setup migrations for saved places;
- keeping saved/learned places absent until explicitly designed;
- guarding new recommendation behavior behind deterministic confidence policy;
- treating trigger events as offers rather than destructive state changes.

## Permanent Product Threshold

Evidence-Gated Places becomes accepted product capability if existing surfaces can share the model cleanly, place-aware recommendations feel more actionable without false certainty, and users understand the difference between a one-time place relationship, an explicit trigger, and a durable Settings-managed Place.
