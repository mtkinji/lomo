---
id: brief-places-system
title: Places System
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [todo-action-contexts, geolocation-activity-offers, kwilt-phone-agent, kwilt-text-coach]
owner: andrew
last_updated: 2026-06-23
---

# Places System

## Context

Kwilt already has several place-shaped ideas: explicit Activity location triggers, Quick Add location offers, contextual Recommended, learned-place concepts, and Phone Agent capture such as "remind me when I am at Trader Joe's." These should not evolve as separate one-off features. Places should become a shared system that helps Kwilt understand where an Activity can become relevant, while keeping capture first, permission explicit, and location memory inspectable.

## Target audience

Primary audience: `audience-aspirational-family-organizers`. Maya needs family and personal to-dos to surface when they are actually doable: while leaving the house, at school, at a store, at church, at the library, or wherever ordinary life happens.

Secondary audience: `audience-ai-native-life-operators`. Nina will trust a place-aware agent only if place capture, memory, reminders, and recommendations are permissioned, auditable, and reversible.

## Representative persona

Maya has errands, pickups, returns, school logistics, household chores, and "when I am there" intentions scattered across Activities. She does not want to maintain a place database, but she does want Kwilt to notice when a place makes a to-do relevant.

Nina uses AI and phone surfaces to capture instructions in the moment. She expects a phone agent to understand place-bearing requests, but she will reject any system that silently tracks, stores, or acts on location without a clear user-approved reason.

## Aspirational design challenge

How might we help Maya and Nina turn place-related intentions into timely, trustworthy action, while preserving capture-first behavior, explicit permission, user-approved memory, and calm recommendations?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - Places matter because many Activities become doable only in a practical real-world context. A place-aware Kwilt can help the user move the few things that matter without scanning a pile or setting up a productivity system.

## Job flow step

`job-flow-maya-move-family-life-forward`, step 4: Know the next doable action. Current delivery score is 2. Kwilt can capture Activities and has Recommended, grouping, and explicit location-trigger capability, but it does not yet have a coherent Places system that connects place references, place intent, place events, place memory, and recommendation relevance.

## JTBD framing

When an intention depends on a place, I want Kwilt to remember the place relationship and use it at the right moment, so that errands, pickups, returns, and place-specific follow-through do not disappear into a generic to-do pile. This serves `jtbd-carry-intentions-into-action` by making place-specific work actionable, `jtbd-capture-and-find-meaning` by allowing messy place-bearing capture without setup, and `jtbd-trust-this-app-with-my-life` by making place memory permissioned and inspectable.

## Design

### One sentence

Places is Kwilt's shared system for representing, learning, and using place relevance across Recommended, Location Triggers, Quick Add, Phone Agent, reminders, and future automation.

### Core model

The Places system should separate five concepts:

| Concept | Meaning | Examples |
| --- | --- | --- |
| Place reference | A place mentioned or attached to an Activity or message. | "Trader Joe's", "school", "library", coordinates from geocoding. |
| Place intent | Why the place matters. | Remind on arrive, remind on leave, doable there, pick up there, return there, created there, completed there. |
| Place evidence | Observations that support a place relationship. | User attached location, AI suggested a location offer and user accepted, location trigger fired, task completed near a place. |
| Place context | Whether a place is relevant now. | Recent arrive/leave trigger, current confirmed place, schedule/reminder plus explicit place, future learned place context. |
| Place memory | Durable user-approved understanding of recurring places. | Saved grocery place, school, church, gym, "not this place", rejected suggestion, edited label. |

This split prevents the system from treating "has coordinates" as "important now." A place reference is only one piece of evidence. Recommendation lift should come from place relevance, actionability, and current place confidence together.

```text
place reference + place intent + place evidence + actionability + current place context
  -> place-aware recommendation, reminder, phone-agent action, or saved-place suggestion
```

### Product surfaces

Places should support several surfaces without becoming a top-level tab by default:

- **Recommended**: highlight place-relevant Activities when place evidence makes them more likely to be doable now.
- **Location Triggers / Location Offers**: explicit user-approved arrive/leave delivery for a specific Activity.
- **Quick Add**: create the to-do first, then suggest a location trigger when AI or text contains a useful place.
- **Activity Detail**: inspect and edit the Activity's place reference and trigger intent.
- **Phone Agent / Text Coach**: parse place-bearing capture such as "remind me to return the library books when I am near the library" and create a permissioned Activity/place proposal.
- **Future learned places**: suggest durable place memory only after repeated task-place evidence and user confirmation.
- **Future smarter reminders / automation**: use confirmed place memory to propose reminder timing or scoped automation after trust is earned.

### Recommendation relationship

Places enhance Recommended by adding a grounded answer to:

> Is this Activity more relevant because of a place relationship?

The recommendation engine should distinguish:

- **Weak place signal**: Activity has a place reference or coordinates. This can help context fit but should not dominate.
- **Medium place signal**: Activity has an explicit arrive/leave trigger, user-confirmed place intent, or a schedule/reminder aligned with a place.
- **Strong place signal**: a relevant location trigger fired recently, the user is in a confirmed place context, or a learned place match is active in a future phase.

Examples:

- "Pick up prescription" with a Walgreens trigger rises when the arrive trigger has recently fired.
- "Return library books" with a library place attached does not beat urgent due work when the user is not in a library context.
- Several grocery-related Activities can be considered together if Kwilt has a confirmed grocery place context, but the engine should still choose the most actionable one to three.

### Phone Agent relationship

Phone Agent makes Places more important because users naturally express place intent in text and voice:

- "Remind me to grab eggs next time I'm at Trader Joe's."
- "When I leave church, remind me to call Mom."
- "I need to return this library book."
- "Add school pickup forms for when I'm at the office."

The Phone Agent should not silently write durable place memory. It should convert place-bearing language into explicit proposals:

1. Capture the Activity or pending Activity.
2. Extract the place reference and intended trigger/doable context.
3. Geocode or match a place only when needed for the requested behavior.
4. Ask for confirmation before enabling a trigger or saving durable place memory.
5. Write an audit entry showing what place relationship was created.

This lets Phone Agent, Quick Add, and in-app Activity editing share the same Places primitives instead of each inventing their own location handling.

### Trust and permission posture

Places must preserve the existing review-safe location posture:

- Capture first; never block Activity creation on a place decision.
- Request OS location permission only after the user accepts a place-trigger behavior that needs it.
- Do not infer/read current location while location triggers are disabled.
- Use generic fallback copy such as "this location" when the exact place name is uncertain.
- Treat location events as signals or offers, not automatic completion.
- Make saved/learned places user-approved, editable, and deleteable.

### Phase sequence

1. **P1: Explicit place evidence feeds smarter Recommended**
   - Use existing Activity location metadata, explicit trigger state, and location-offer acceptance as structured place evidence.
   - Add scenario tests and telemetry so place relevance improves recommendation quality without static location boosts.

2. **P1B: Location Triggers / Offers audit and polish**
   - Verify arrive/leave trigger registration, permission rationale, notification copy, caps, fallback, and fatigue behavior.
   - Align copy with contextual action and Places language.

3. **P2: Task-event place evidence**
   - Record task-created and task-completed place evidence only with a clear consent, retention, and deletion model.

4. **P3: Saved and learned places**
   - Suggest durable places from repeated evidence.
   - Require user confirmation before a place becomes memory.
   - Provide edit/delete/reject controls.

5. **P4: Smarter place reminders**
   - Suggest "remind me when I am there" from confirmed or learned place context.
   - Keep approval per task unless repeated trust justifies a stronger shortcut.

6. **P5: Scoped place automation**
   - Offer narrow automation only after repeated approvals.
   - Keep undo, audit trail, and off switches visible.

### Data shape to define later

The eventual implementation should define typed objects for:

- `PlaceReference`
- `PlaceIntent`
- `PlaceEvidence`
- `PlaceContext`
- `PlaceMemory`
- `PlaceSuggestion`

P1 does not need the full durable model, but it should avoid ad hoc fields that make saved/learned places harder later.

## Success signal

Qualitatively, users say Kwilt helped them remember the right thing in the right place without feeling tracked or forced into setup.

Behaviorally:

- Place-aware Recommended selections are opened or completed more often than generic place-bearing tasks.
- Location-trigger offers are accepted when they are timely and rejected when they are not useful without causing permission distrust.
- Phone Agent can capture place-bearing requests and turn them into clear, confirmable Activity/place proposals.
- Saved-place suggestions, when eventually shipped, are accepted because they feel earned and unsurprising.

Trust guardrails:

- Users can inspect and remove place relationships.
- Location permission prompts occur only after explicit user intent.
- Place memory does not become a hidden surveillance layer.

## Open questions

- What is the minimum P1 typed shape for place evidence without overbuilding saved places?
- Should recent location-trigger events be stored only locally, synced, or represented as server-side action/audit events?
- How should Phone Agent phrase place proposals over SMS so the user understands what will be saved versus what will only be used once?
- What evidence threshold is required before suggesting a saved place?
- Should "home" be a first-class place kind, or should it wait until the privacy model is clearer?
