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
last_updated: 2026-06-25
---

# Places System

## Context

Kwilt already has several place-shaped ideas: explicit Activity location triggers, Quick Add location offers, contextual Recommended, learned-place concepts, and Phone Agent capture such as "remind me when I am at Trader Joe's." These should not evolve as separate one-off features. Places should become a shared system that helps Kwilt understand where an Activity can become relevant, while keeping capture first, permission explicit, and location memory inspectable.

Design-loop source artifacts live in [`docs/design-explorations/places-system/`](../design-explorations/places-system/). The converged direction is **Evidence-Gated Places**: a shared interpretation layer for place reference, intent, evidence, context, and memory across existing Kwilt surfaces. Durable Places can be Settings-managed supporting objects once the user has confirmed memory, but they should not become a fifth primary object in the main app canvas.

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

## Design Loop Artifacts

### Frame

Places is Kwilt's shared system for representing, learning, and using place relevance across Recommended, Location Triggers, Quick Add, Phone Agent, reminders, Settings-managed place memory, and future automation.

Constraint posture: `Extend the system`. Places should introduce a shared domain language and evidence model, but it should fit inside existing Activity, Recommended, Quick Add, Activity Detail, notification, Settings, and Phone Agent surfaces rather than becoming a new primary destination the user has to manage.

Current system facts:

- Existing surface: Activities already support Quick Add, Activity Detail, Recommended, and optional location triggers/offers.
- Existing user flow: users can capture a to-do first, then add or accept trigger behavior later.
- Existing domain model: Activities have lightweight `location` metadata with label, coordinates, arrive/leave trigger, and radius.
- Existing technical affordance: location-offer services can register geofences for eligible Activities and create offer notifications when arrive/leave events fire.
- Existing trust posture: OS location permission should be requested only after the user accepts behavior that needs it.

Design implication: Places should make Kwilt smarter about where an Activity can become doable without asking the user to maintain a place database up front. The shared model should explain when a place is merely referenced, when the user has expressed intent, when Kwilt has evidence, when the current context matters, and when a place has earned durable memory.

### Divergent Approaches

**Approach A: Activity-Attached Places**

Each Activity owns its place relationship directly. Quick Add, Activity Detail, and Phone Agent write to the Activity; Recommended reads the Activity's place reference and trigger intent. This is the smallest system extension and keeps the user experience concrete, but it risks repeating location logic across surfaces unless the underlying representation is shared.

**Approach B: Evidence-Gated Places**

Places are not just coordinates on an Activity. Kwilt records place references, intents, evidence, and context as separate concepts, then surfaces only the user-facing behavior that matters: a recommendation, a trigger offer, an editable place row, or a Phone Agent proposal. This best matches the trust problem because it prevents "has coordinates" from becoming "important now."

**Approach C: Saved Places First**

Kwilt asks the user to define meaningful places such as school, church, grocery, office, or gym, then uses those places across Activities and reminders. This could make the system legible, but it asks for setup before value and would feel too much like maintaining another productivity database for Maya.

### Converged Concept

Choose **Evidence-Gated Places**.

The core bet is that Kwilt can make place-related Activities feel timely and trustworthy if it treats place as an evidence-backed relationship, not a static field. A place-aware recommendation or trigger should come from a combination of place reference, place intent, place evidence, actionability, and current place context.

Before this concept, users can attach or receive some location behavior, but Kwilt cannot consistently explain why a place matters or reuse that understanding across Quick Add, Activity Detail, Recommended, and Phone Agent.

After this concept, users can say or create place-bearing intentions, inspect the place relationship on an Activity, accept explicit trigger behavior when useful, and see place-relevant Activities rise only when the evidence makes them more doable.

Reductive design decisions:

- No Places tab in the main app canvas by default.
- No user-maintained place database as the entry point.
- Durable Places can live as Settings-managed supporting objects once memory exists.
- No silent saved places.
- No background location inference when location triggers are disabled.
- No automatic completion from location events.
- No recommendation boost based only on a vague address or coordinate.

### System Model

The Places system should separate five concepts:

| Concept | Meaning | Examples |
| --- | --- | --- |
| Place reference | An internal evidence item extracted from an Activity or message. It should not be presented as a user-visible promise by itself. | "Trader Joe's", "school", "library", coordinates from geocoding. |
| Place assignment | A contextual link saying this Activity belongs with this Place, without necessarily creating a notification. | "Return library books" assigned to Library; "Buy snacks" assigned to Grocery. |
| Place intent | Why the place matters. | Doable there, pick up there, return there, created there, completed there, remind on arrive, remind on leave. |
| Place evidence | Observations that support a place relationship. | User attached location, AI suggested a location offer and user accepted, location trigger fired, task completed near a place. |
| Place context | Whether a place is relevant now. | Recent arrive/leave trigger, current confirmed place, schedule/reminder plus explicit place, future learned place context. |
| Place memory | Durable user-approved understanding of recurring places, managed from Settings. | Saved grocery place, school, church, gym, "not this place", rejected suggestion, edited label. |

This split prevents the system from treating "has coordinates" as "important now." A place reference is only internal evidence until it supports a visible behavior. A place assignment means the Activity is contextually linked to the Place; it does not mean Kwilt should notify the user. Recommendation lift should come from place relevance, actionability, and current place confidence together.

```text
place reference + optional place assignment + place intent + place evidence + actionability + current place context
  -> place-aware recommendation, reminder, phone-agent action, or saved-place suggestion
```

### Place Assignment Vs Location Trigger

A to-do can be assigned to a Place without enabling a geofence trigger.

- **Place assignment** answers: "Where is this Activity contextually relevant?" It can help Activity Detail, Recommended, search, Settings-managed Places, and future Phone Agent reasoning. It does not require OS location permission.
- **Location trigger** answers: "Should Kwilt notify me when I enter or leave this Place?" It is an explicit delivery rule layered on top of a place assignment and should request location permission only after the user accepts that behavior.

Examples:

- "Return library books" can be assigned to Library so it appears as place-relevant when the user is reviewing Library-related tasks. No notification is required.
- "Remind me when I get to the library" is the same contextual relationship plus an explicit arrive trigger.
- "Buy snacks" can be assigned to Grocery, while only the urgent grocery errand gets a geofence reminder.

### Visible Place Contract

If Kwilt exposes a place relationship to the user, it should also expose the outcome the user can expect. A visible place is not just metadata; it is a promise that the place will help the Activity in at least one named way.

Allowed visible contracts:

- **Linked context**: "This is linked to Walgreens." Kwilt may use this for Activity Detail organization, search, context grouping, and better prioritization when the place becomes relevant. It does not mean a notification will fire.
- **Place-aware recommendation**: "This may matter because you're near Walgreens / reviewing Walgreens-related errands." Kwilt may lift the Activity only when place evidence and actionability support it.
- **Location alert**: "Notify me when I arrive / leave." Kwilt will request permission if needed and send an explicit reminder, such as prompting the user to mark the thing done. It should not automatically complete the Activity from location alone.
- **Saved place memory**: "Remember this Walgreens." Kwilt may reuse the saved Place across future Activities, and the user can manage it from Settings.

Disallowed visible contracts:

- Showing a bare `Place: Walgreens` row with no behavior attached.
- Implying arrival will trigger a notification when only a linked context exists.
- Using a text mention as a recommendation boost without enough evidence that the Activity is more doable now.
- Saving or merging a durable Place without approval.

### Place Assignment Vs Action Context

A to-do can also be assigned to a non-place action context. That belongs to the related To-Do Action Contexts system, not the Places system.

- **Place assignment** links an Activity to a specific remembered or referenced Place: Library, Trader Joe's, Office, Church, School.
- **Action context assignment** links an Activity to a mode or circumstance: Errands, Away from home, At computer, Calls/messages, At office, Not at office.

These can overlap. A to-do might be assigned to `Errands` without any specific Place, or it might be assigned to both `Errands` and `Grocery`. The action context answers "what kind of situation makes this doable?" The Place answers "which specific place is this related to?"

Examples:

- "Drop off returns" can be assigned to `Errands` even before Kwilt knows which store.
- "Print forms" can be assigned to `At office` without being tied to a geofence.
- "Pick up prescription" can be assigned to `Errands` and to `Walgreens`; only if the user asks should it also get a geofence trigger.

### Learning Model

The Places system should learn from normal use, not from setup. The user should not have to create `Walgreens` in Settings or manually attach it to a to-do before Kwilt can be helpful. However, Kwilt should not expose a text-only reference as though it is a working location behavior.

Kwilt can collect place evidence from:

- **Captured language**: "pick up prescription at Walgreens", "return books to the library", "remind me when I'm near Trader Joe's".
- **AI enrichment**: a Quick Add or Phone Agent parse finds a likely place reference and intent.
- **Accepted suggestions**: the user accepts "Use Walgreens for this to-do" or "Use location triggers".
- **Corrections**: the user removes a place, changes Walgreens to CVS, rejects a suggestion, or chooses "not this place".
- **Task outcomes**: the user completes or repeatedly acts on similar Activities with the same explicit place relationship.
- **Location-trigger events**: if the user enabled a trigger, arrive/leave events become evidence that the place relationship was useful.

Learning should use a ladder:

1. **Extract** a candidate place reference from capture or AI enrichment. This is internal evidence only.
2. **Soft-assign** the to-do when confidence is high enough and the assignment is non-invasive. For example, "Pick up prescription at Walgreens" can carry a Walgreens assignment without interrupting capture.
3. **Use lightly** in Recommended, search, Activity Detail, and Action Context reasoning. This does not require OS location permission, and the UI must not imply that arrival will trigger anything.
4. **Ask only at the value moment** when the behavior becomes stronger: enabling a geofence trigger, saving durable Place memory, or merging repeated references into one Settings-managed Place.
5. **Remember only with approval** before creating or updating durable PlaceMemory.
6. **Learn from correction** so rejection, edits, and "not this place" reduce future suggestions.

This means Kwilt can handle Walgreens intelligently with minimal input:

- If the user types "pick up prescription at Walgreens", Kwilt may assign the to-do to a Walgreens place candidate.
- If the user later has several Walgreens-related to-dos, Kwilt can treat Walgreens as a stronger contextual signal.
- If the user accepts a trigger or confirms "Remember Walgreens", Kwilt can create a Settings-managed Place.
- If the user never confirms durable memory, Walgreens can remain a task-level place reference/assignment rather than a saved Place.

The trust boundary is: **Kwilt may infer and use lightweight task-level place assignments when evidence is clear; Kwilt should ask before location tracking, notifications, or durable Place memory.** Once a place is visible, the UI must make the contract legible: linked context, recommendation signal, enabled alert, or saved memory.

User-visible rule: **do not show raw text references as Places.** If Kwilt shows Walgreens, it should be clear whether Walgreens is only a linked context, a saved Place, or an enabled location alert. For example, Activity Detail should avoid a bare `Place: Walgreens` row when no behavior is attached; it should use clearer framing such as `Linked place: Walgreens` plus no alert state, or keep the reference internal until there is a useful recommendation, edit affordance, or trigger proposal.

### Place Candidates And Resolution

`Walgreens` is not automatically one precise map point. It can be a place reference with different resolution levels:

- **Text reference**: the captured phrase, such as `Walgreens`. This is internal evidence, not a user-facing feature.
- **Brand or chain candidate**: any Walgreens, useful for errands and search, but not enough for a geofence.
- **Category candidate**: pharmacy, grocery, library, school, office, useful when the specific place is unclear.
- **Context-scoped candidate**: Walgreens near home, near work, near the user's hotel, in the current city, or along an errand route.
- **Candidate set**: multiple possible Walgreens locations that all satisfy the task, such as "any Walgreens this week".
- **Specific place candidate**: a particular Walgreens store, usually with a map provider id and coordinates.
- **Settings-managed PlaceMemory**: a user-approved durable place, such as "My Walgreens" or "Walgreens near home".

The matching scope should follow the contract:

- **Linked context** can match a brand, category, context-scoped candidate, candidate set, or saved Place. It does not need latitude/longitude.
- **Place-aware prioritization** can use broad matches when the user is in a compatible context, such as errands, near a relevant area, traveling near a scoped city, or reviewing related tasks.
- **Location alert** needs a resolvable trigger boundary. Usually that means a specific place candidate with coordinates and a geofence. A broader "any Walgreens" alert should be treated as a separate advanced behavior that requires clear user approval and reliable provider support for matching multiple locations.
- **Saved place memory** can be broad or specific, but the saved label should reveal the scope: "Any Walgreens", "Walgreens near home", or "Walgreens on Broadway".

Kwilt should not run a map search just because a to-do mentions Walgreens. Map/place search should happen only when a behavior needs resolution:

- the user asks for a geofence trigger;
- the user asks for directions or "near me";
- the app needs to suggest a specific nearby place at a value moment;
- a travel context provides a city, hotel, address, or current-location permission that can scope the search;
- the user chooses to save or merge a durable Place.

This handles many-Walgreens cases:

- "Pick up prescription at Walgreens" can be assigned to a Walgreens brand candidate with no map search.
- "Do this at any Walgreens this week" keeps the assignment at the brand/chain level and can match whichever Walgreens is contextually relevant later.
- "Find a Walgreens near my hotel next week" uses the travel location as the search scope and may resolve to one or more specific place candidates.
- "Remind me when I get to Walgreens" needs a specific geofence region, so Kwilt should ask which Walgreens or use an explicit current/nearby context before enabling the trigger.
- "Remind me when I am near any Walgreens" should be offered only if Kwilt can reliably monitor a candidate set and explain the scope; otherwise it should become a prompt to choose a specific Walgreens.

Resolution should stay scoped and reversible. If Kwilt guesses the wrong Walgreens, the user should be able to change it, choose "any Walgreens", or mark "not this place".

### Feasibility Posture

Generic place context is workable for reasoning, but not as an always-on promise that Kwilt knows every matching real-world venue in the background.

The system should treat each matching strategy differently:

- **Text/category reasoning is cheap.** Kwilt can know that `Walgreens` implies pharmacy/errand context from the Activity text and use that while the app is active, in search, in Activity Detail, and in recommendation scoring.
- **User-declared context is cheap.** If the user is reviewing `Errands`, traveling, or working from a known home/work/hotel context, Kwilt can use broad place matches without touching GPS.
- **Specific geofences are OS-supported but limited.** A selected Walgreens, library, or hotel can become a monitored geofence after permission, but the app should keep the active set small.
- **Broad real-world detection is expensive and unreliable as a default.** "Tell me when I am at any Walgreens / any pharmacy / any hotel" requires either monitoring many candidate locations, waking periodically to check location and search nearby places, or relying on provider-specific place signals. That should not be the default contract.
- **Place search should be lazy.** Kwilt should call a place search API only at a value moment: when the user asks for a trigger, asks "near me", saves a Place, enters a travel scope, or opens a flow where resolving candidates is useful.

Implementation posture:

- Start with capture-time extraction, linked context, explicit single-place geofences, and lazy candidate resolution.
- Avoid continuous background polling and continuous nearby-place search.
- Do not promise "any pharmacy" alerts until the app has a bounded candidate-set strategy, clear permission copy, provider cost controls, and battery testing.
- Prefer surfaced proposals over hidden detection: "Want me to remind you at the Walgreens near your hotel?" is safer than silently trying to monitor every Walgreens.

### Product Surfaces

Places should support several surfaces without becoming a top-level tab by default:

- **Recommended**: highlight place-relevant Activities when place evidence makes them more likely to be doable now.
- **Location Triggers / Location Offers**: explicit user-approved arrive/leave delivery for a specific Activity.
- **Quick Add**: create the to-do first, then suggest a location trigger when AI or text contains a useful place.
- **Activity Detail**: inspect and edit the Activity's place assignment, place reference, and optional trigger intent.
- **Phone Agent / Text Coach**: parse place-bearing capture such as "remind me to return the library books when I am near the library" and create a permissioned Activity/place proposal.
- **Settings-managed Places**: let the user inspect, rename, delete, or forget durable place memory after it is confirmed.
- **Future learned places**: suggest durable place memory only after repeated task-place evidence and user confirmation.
- **Future smarter reminders / automation**: use confirmed place memory to propose reminder timing or scoped automation after trust is earned.

### Recommendation Relationship

Places enhance Recommended by adding a grounded answer to:

> Is this Activity more relevant because of a place relationship?

The recommendation engine should distinguish:

- **Weak place signal**: Activity has a place reference or coordinates. This can help context fit but should not dominate.
- **Medium place signal**: Activity is explicitly assigned to a Place, has user-confirmed place intent, or has a schedule/reminder aligned with a place.
- **Strong place signal**: a relevant location trigger fired recently, the user is in a confirmed place context, or a learned place match is active in a future phase.

Examples:

- "Pick up prescription" with a Walgreens trigger rises when the arrive trigger has recently fired.
- "Return library books" assigned to Library does not beat urgent due work when the user is not in a library context.
- Several grocery-related Activities can be considered together if Kwilt has a confirmed grocery place context, but the engine should still choose the most actionable one to three.

### Phone Agent Relationship

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

### Trust And Permission Posture

Places must preserve the existing review-safe location posture:

- Capture first; never block Activity creation on a place decision.
- Request OS location permission only after the user accepts a place-trigger behavior that needs it.
- Do not infer/read current location while location triggers are disabled.
- Use generic fallback copy such as "this location" when the exact place name is uncertain.
- Treat location events as signals or offers, not automatic completion.
- Make saved/learned places user-approved, editable, and deleteable.

### Learning Release

The first learning release should make Places real as a shared interpretation layer inside existing surfaces, not as a new area of the app.

Must be real:

- A typed minimum model for place reference, assignment, intent, evidence, context, memory, and suggestion.
- A compact Settings-managed durable Place representation for confirmed memory.
- Quick Add and Activity Detail should write or display that model through existing Activity place behavior.
- Recommended should consume place evidence through the shared model instead of directly treating `activity.location` as a flat boost.
- Location trigger offers should remain explicit and permissioned.
- Tests should cover the important trust edges: capture first, no current-location inference when disabled, weak place signal does not beat stronger actionability, and trigger events are offers rather than completions.

Can be thin or temporary:

- Full saved-place organization beyond rename/delete/forget.
- Phone Agent SMS copy for advanced place proposals.
- Repeated-evidence learning thresholds.
- Cross-device/server-side place audit history.

Intentionally excluded from the learning release:

- A primary Places tab or setup-first saved-place manager.
- Silent learned places.
- Automation based on inferred location habits.
- Server-side location profiling.
- Completion based solely on a location event.

### Evaluation Plan

Learning questions:

- Do users understand that a place relationship belongs to a to-do, not to hidden tracking?
- Do place-aware recommendations feel helpful because the task is more doable now?
- Do location-trigger offers feel proactive and agentic without feeling like a permission grab?
- Can Phone Agent and Quick Add share the same place proposal language without special-case behavior?
- What evidence is enough before suggesting durable place memory?

Evidence to collect:

- Place-aware Recommended selections are opened or completed more often than generic place-bearing tasks.
- Users accept location-trigger offers when they are timely and reject them without disabling trust in the broader app.
- Users can inspect, edit, or remove the place relationship from an Activity.
- No permission prompt appears before explicit user intent.
- Andrew self-use produces fewer "I know I said this place somewhere, why didn't Kwilt remember?" moments.

Disconfirming signals:

- Users think Kwilt is tracking them broadly.
- Place-bearing Activities rise when they are not actually actionable.
- The system needs a visible place database before it can deliver value.
- Phone Agent place proposals require separate semantics from in-app place behavior.

### Spec Refinement

Implementation should define the minimum durable types for:

- `PlaceReference`
- `PlaceAssignment`
- `PlaceIntent`
- `PlaceEvidence`
- `PlaceContext`
- `PlaceMemory` as a Settings-managed supporting object
- `PlaceSuggestion`

The important refinement question is not which phase owns each type. It is which fields are needed now so current Activity location metadata, explicit trigger state, location-offer acceptance, recent trigger events, and future saved places can all speak the same language without turning the Activity model into a pile of ad hoc fields.

Acceptance criteria for a build-ready spec:

- Existing Activity location behavior maps cleanly into the Places model.
- Activity-place assignment works independently from notification/geofence triggers.
- Quick Add, Activity Detail, Recommended, and Location Offers can share the same place interpretation.
- Weak, medium, and strong place signals are represented explicitly.
- Trust rules are enforceable in code, not just copy.
- Saved/learned Places can remain absent from the first value moment, but confirmed durable Places have a Settings management home.

## Success Signal

Qualitatively, users say Kwilt helped them remember the right thing in the right place without feeling tracked or forced into setup.

Behaviorally:

- Place-aware Recommended selections are opened or completed more often than generic place-bearing tasks.
- Location-trigger offers are accepted when they are timely and rejected when they are not useful without causing permission distrust.
- Phone Agent can capture place-bearing requests and turn them into clear, confirmable Activity/place proposals.
- Saved-place suggestions, when eventually shipped, are accepted because they feel earned and unsurprising, and the resulting Places are manageable from Settings.

Trust guardrails:

- Users can inspect and remove place relationships.
- Location permission prompts occur only after explicit user intent.
- Place memory does not become a hidden surveillance layer.

## Open questions

- What is the minimum typed shape for place evidence without overbuilding saved places?
- Should recent location-trigger events be stored only locally, synced, or represented as server-side action/audit events?
- How should Phone Agent phrase place proposals over SMS so the user understands what will be saved versus what will only be used once?
- What evidence threshold is required before suggesting a saved place?
- Should "home" be a first-class place kind, or should it wait until the privacy model is clearer?
