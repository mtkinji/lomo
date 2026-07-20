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
last_updated: 2026-07-20
---

# Places System

## Context

Kwilt already has several place-shaped ideas: explicit Activity location triggers, Quick Add location offers, contextual Recommended, learned-place concepts, and Phone Agent capture such as "remind me when I am at Trader Joe's." These should not evolve as separate one-off features. Places should become a shared system that helps Kwilt understand where an Activity can become relevant, while keeping capture first, permission explicit, and location memory inspectable.

Design-loop source artifacts live in [`docs/design-explorations/places-system/`](../design-explorations/places-system/). The converged direction is **Evidence-Gated Places**: a shared interpretation layer for place mentions, targets, links, intent, evidence, context, and memory across existing Kwilt surfaces. Durable Saved Places can be Settings-managed supporting objects once the user has confirmed memory, but they should not become a fifth primary object in the main app canvas.

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

`job-flow-maya-move-family-life-forward`, step 4: Know the next doable action. Current delivery score is 2. Kwilt can capture Activities and has Recommended, grouping, and explicit location-trigger capability, but it does not yet have a coherent Places system that connects place mentions, targets, links, place intent, place events, place memory, and recommendation relevance.

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

Each Activity owns its place relationship directly. Quick Add, Activity Detail, and Phone Agent write to the Activity; Recommended reads the Activity's place target/link and trigger intent. This is the smallest system extension and keeps the user experience concrete, but it risks repeating location logic across surfaces unless the underlying representation is shared.

**Approach B: Evidence-Gated Places**

Places are not just coordinates on an Activity. Kwilt records place mentions, targets, links, intents, evidence, and context as separate concepts, then surfaces only the user-facing behavior that matters: a recommendation, a trigger offer, an editable relationship, or a Phone Agent proposal. This best matches the trust problem because it prevents "has coordinates" from becoming "important now."

**Approach C: Saved Places First**

Kwilt asks the user to define meaningful places such as school, church, grocery, office, or gym, then uses those places across Activities and reminders. This could make the system legible, but it asks for setup before value and would feel too much like maintaining another productivity database for Maya.

### Converged Concept

Choose **Evidence-Gated Places**.

The core bet is that Kwilt can make place-related Activities feel timely and trustworthy if it treats place as an evidence-backed relationship, not a static field. A place-aware recommendation or trigger should come from a combination of place target/link, place intent, place evidence, actionability, and current place context.

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

### Object Model And Naming

The word `Place` should not cover every layer. If it means text mentions, coordinates, links, saved objects, and alerts, the system becomes hard to understand and easy to overpromise.

Recommended vocabulary:

| Concept | Meaning | Examples |
| --- | --- | --- |
| Place mention | An ephemeral parse result extracted inside a specific place-aware decision path. It should not be computed, persisted, or presented unless that decision needs it. | "Trader Joe's", "school", "library", "Walgreens". |
| Location | A coordinate-backed point or region. This is geometry, not necessarily user meaning. | Latitude/longitude, radius, geocoded address, arrive/leave region. |
| Place target | What the Activity appears to be about. This may be broad, specific, or saved. | Pharmacy, any Walgreens, Walgreens near home, Library, Walgreens on Broadway. |
| Place link | The relationship saying an Activity belongs with a place target. This should be visible only when it produces a useful affordance: search, edit, recommendation, or trigger proposal. | "Return library books" related to Library; "Pick up prescription" related to Walgreens. |
| Place intent | Why the place matters. | Doable there, pick up there, return there, created there, completed there, remind on arrive, remind on leave. |
| Place evidence | Observations that support a place relationship. | User attached location, AI suggested a location offer and user accepted, location trigger fired, task completed near a place. |
| Place context | Whether a place is relevant now. | Recent arrive/leave trigger, current confirmed place, schedule/reminder plus explicit place, future learned place context. |
| Saved Place | Durable user-approved understanding of a recurring place target, managed from Settings. | Saved grocery place, school, church, gym, Walgreens near home. |
| Location alert | Explicit arrive/leave notification behavior for a resolved location. | "Remind me when I arrive at Walgreens on Broadway." |

User-facing naming rule: use `Place` mainly for saved or resolved user-meaningful objects. Use `location` for geometry. Use `linked` or `related` only when the relationship has a visible affordance. Avoid presenting an internal place mention or raw coordinate as a Place.

This split prevents the system from treating "has coordinates" as "important now." A place mention is not a durable object, and Kwilt should not parse for place mentions as a generic background behavior. Parsing should happen only inside a place-aware decision path, such as creating a trigger proposal, running a place-aware recommendation pass, responding to user search/filter intent, building a Phone Agent proposal, or evaluating whether repeated evidence justifies asking about Saved Place memory. A place link means the Activity is contextually related to a place target; it does not mean Kwilt should notify the user. Recommendation lift should come from place relevance, actionability, and current place confidence together.

```text
place mention + optional place link + place intent + place evidence + actionability + current place context
  -> place-aware recommendation, reminder, phone-agent action, or saved-place suggestion
```

### Place Assignment Vs Location Trigger

A to-do can be linked to a place target without enabling a geofence trigger.

- **Place link** answers: "Where is this Activity contextually relevant?" It can help Activity Detail, Recommended, search, Settings-managed Places, and future Phone Agent reasoning. It does not require OS location permission.
- **Location trigger** answers: "Should Kwilt notify me when I enter or leave this place?" It is an explicit delivery rule layered on top of a resolved location and should request location permission only after the user accepts that behavior.

Examples:

- "Return library books" can be assigned to Library so it appears as place-relevant when the user is reviewing Library-related tasks. No notification is required.
- "Remind me when I get to the library" is the same contextual relationship plus an explicit arrive trigger.
- "Buy snacks" can be assigned to Grocery, while only the urgent grocery errand gets a geofence reminder.

### Visible Place Contract

If Kwilt exposes a place relationship to the user, it should also expose the outcome the user can expect. A visible place is not just metadata; it is a promise that the place will help the Activity in at least one named way.

Allowed visible contracts:

- **Related context**: "This is related to Walgreens." Kwilt may use this for Activity Detail organization, search, context grouping, and better prioritization when the place becomes relevant. It does not mean a notification will fire. If those affordances are not present, keep the relationship internal.
- **Place-aware recommendation**: "This may matter because you're near Walgreens / reviewing Walgreens-related errands." Kwilt may lift the Activity only when place evidence and actionability support it.
- **Location alert**: "Notify me when I arrive / leave." Kwilt will request permission if needed and send an explicit reminder, such as prompting the user to mark the thing done. It should not automatically complete the Activity from location alone.
- **Saved Place memory**: "Remember this Walgreens." Kwilt may reuse the saved Place across future Activities, and the user can manage it from Settings.

Disallowed visible contracts:

- Showing a bare `Place: Walgreens` row with no behavior attached.
- Implying arrival will trigger a notification when only a related context exists.
- Using a text mention as a recommendation boost without enough evidence that the Activity is more doable now.
- Saving or merging a durable Place without approval.
- Persisting internal place data merely because the text looked place-like.

### Place Assignment Vs Action Context

A to-do can also be assigned to a non-place action context. That belongs to the related To-Do Action Contexts system, not the Places system.

- **Place link** connects an Activity to a specific remembered or referenced place target: Library, Trader Joe's, Office, Church, School.
- **Action context assignment** links an Activity to a mode or circumstance: Errands, Away from home, At computer, Calls/messages, At office, Not at office.

These can overlap. A to-do might be assigned to `Errands` without any specific Place, or it might be linked to both `Errands` and `Grocery`. The action context answers "what kind of situation makes this doable?" The place target answers "which specific place or place-like target is this related to?"

Examples:

- "Drop off returns" can be assigned to `Errands` even before Kwilt knows which store.
- "Print forms" can be assigned to `At office` without being tied to a geofence.
- "Pick up prescription" can be assigned to `Errands` and to `Walgreens`; only if the user asks should it also get a geofence trigger.

### Learning Model

The Places system should learn from normal use, not from setup. The user should not have to create `Walgreens` in Settings or manually attach it to a to-do before Kwilt can be helpful. However, Kwilt should not expose a text-only reference as though it is a working location behavior.

Kwilt can collect place evidence from:

- **Captured language**: "pick up prescription at Walgreens", "return books to the library", "remind me when I'm near Trader Joe's".
- **AI enrichment**: a Quick Add or Phone Agent parse finds a likely place mention, target, and intent.
- **Accepted suggestions**: the user accepts "Use Walgreens for this to-do" or "Use location triggers".
- **Corrections**: the user removes a place, changes Walgreens to CVS, rejects a suggestion, or chooses "not this place".
- **Task outcomes**: the user completes or repeatedly acts on similar Activities with the same explicit place relationship.
- **Location-trigger events**: if the user enabled a trigger, arrive/leave events become evidence that the place relationship was useful.

Place parsing should contribute to the job only when it reduces user effort in a defined moment:

- **Capture with explicit place intent**: "Remind me when I get to Walgreens" needs parsing so Kwilt can propose the right alert.
- **Recommended/context pass**: a bounded recommendation job can inspect Activity text for place targets when place context is already part of the ranking question.
- **Search or inspect**: if the user searches for Walgreens or opens a place/context view, parsing helps find related Activities.
- **Correction or audit**: if the user accepts, rejects, edits, or removes a place suggestion, the place evidence explains what changed.
- **Saved Place suggestion**: repeated accepted evidence may justify asking whether to remember a place.

If no decision path is running, there is no reason to parse or persist the mention.

Learning should use a ladder:

1. **Extract** a candidate place mention only inside a decision path that needs it. Otherwise do not parse.
2. **Soft-link** the to-do when confidence is high enough and the link is non-invasive. For example, "Pick up prescription at Walgreens" can carry a Walgreens place target without interrupting capture.
3. **Use lightly** in Recommended, search, Activity Detail, and Action Context reasoning. This does not require OS location permission, and the UI must not imply that arrival will trigger anything.
4. **Ask only at the value moment** when the behavior becomes stronger: enabling a geofence trigger, saving durable Place memory, or merging repeated references into one Settings-managed Place.
5. **Remember only with approval** before creating or updating durable Saved Place memory.
6. **Learn from correction** so rejection, edits, and "not this place" reduce future suggestions.

### Automatic Assignment From Activity Language

Activity language can automatically assign useful Place meaning without automatically choosing coordinates or creating durable memory. For example, `Pick up prescriptions from Costco` contains enough evidence to create:

- a broad `PlaceTarget` for `Costco`;
- a `PlaceIntent` such as `pickup` / `doable there`;
- a provisional `PlaceLink` from the Activity to that target, with text-inference provenance and confidence.

It does not, by itself, identify which physical Costco holds the prescription. Resolution should use the strongest available user-specific evidence in this order:

1. **Exact user-approved Saved Place**: if the user has one strongly preferred or aliased Costco, automatically link the Activity to it.
2. **Explicit current-place evidence**: if the user chooses `Use current location` or the app already has valid foreground location access, search nearby and resolve only when one Costco result clearly matches the current point.
3. **Explicit scope in language or schedule**: `Costco on 300 West`, `Costco near home`, or a travel city can scope candidate search.
4. **Candidate set**: if several Costcos remain plausible, preserve the broad target and ranked candidates instead of selecting one silently.
5. **Value-moment clarification**: ask `Which Costco?` only when the user requests directions, an alert, durable saving, or opens the Place editor to resolve it.

| Evidence | Safe automatic assignment | Must not happen automatically |
| --- | --- | --- |
| `Costco` in title only | Brand-level target/link | Pick a branch, save coordinates, or enable an alert |
| One exact Saved Place match | Link to the existing Saved Place | Change Saved Place memory or enable an alert |
| Several Saved Place matches | Retain broad target and candidates | Choose one without another differentiating signal |
| Foreground current point inside one verified Costco result | Link a specific task-scoped candidate | Promote it to durable Saved Place memory |
| Explicit arrive/leave request | Propose a specific place resolution | Request permission or register a geofence before confirmation |
| Repeated accepted use of one Costco | Suggest `Remember this Costco?` | Create Saved Place memory silently |

Automatic links must carry `provenance`, `confidence`, and `resolutionScope` so Activity Detail, Recommended, and correction flows can distinguish:

- inferred brand/category target;
- matched existing Saved Place;
- current-location-resolved specific place;
- user-confirmed specific place.

The user-facing result should remain lightweight and correctable. A high-confidence existing Saved Place match can appear as `Related to My Costco` with a change/remove affordance. A broad inferred target may remain quiet until it supports search, Recommended, or Place editing. Automatic assignment never implies current proximity, background tracking, a notification, or durable Saved Place creation.

#### Nearby Versus Home Resolution

Travel creates a meaningful ambiguity that nearest-place ranking cannot safely solve. If Maya is in another state and captures `Pick up something from Costco`, she may mean a Costco near her family now or her user-approved home Costco for later.

When Kwilt has a valid foreground current-region signal and a materially distant Saved Place match, it should surface a small post-capture receipt:

- `Nearby` - one or more Costco candidates scoped to the current city/state, labeled with place and distance;
- `My Costco` - the existing Saved Place, labeled with its home city/state;
- `Any Costco` - retain a brand-level target when any branch will do;
- `Choose another` - open the normal Place search.

Do not preselect `Nearby`. Proximity does not reveal whether the Activity is for this trip or after the user returns home. The selected Place supplies the action context:

- a nearby choice can make the Activity relevant in the current errands/place context;
- the home Saved Place keeps the Activity associated with home and prevents it from rising merely because the user is near a different Costco;
- a broad `Any Costco` target remains unresolved until an explicit current context makes one candidate useful.

This chooser is earned only when both candidates are real. If Kwilt lacks current-location access, it can show `My Costco` plus `Choose nearby…`; choosing nearby is the value moment for foreground location permission. If no home Costco exists, show nearby candidates only after the user asks for nearby resolution. Do not infer that the user is traveling from distance alone, and do not store a travel history. Persist the chosen Place link, not the transient comparison context.

This means Kwilt can handle Walgreens intelligently with minimal input:

- If the user types "pick up prescription at Walgreens", Kwilt should create the Activity without interrupting capture. It may use Walgreens later inside search, Activity Detail, or a bounded recommendation/context pass, but it should not pop a location setup prompt by default.
- If the user later has several Walgreens-related to-dos, Kwilt can treat Walgreens as a stronger contextual signal.
- If the user accepts a trigger or confirms "Remember Walgreens", Kwilt can create a Settings-managed Place.
- If the user never confirms durable memory, Walgreens can remain a task-level place target/link rather than a Saved Place.

The trust boundary is: **Kwilt may infer and use lightweight task-level place links when evidence is clear; Kwilt should ask before location tracking, notifications, or durable Place memory.** Once a place is visible, the UI must make the contract legible: related context, recommendation signal, enabled alert, or saved memory.

User-visible rule: **do not show raw text mentions as Places.** If Kwilt shows Walgreens, it should be clear whether Walgreens is only related context, a Saved Place, or an enabled location alert. For example, Activity Detail should avoid a bare `Place: Walgreens` row when no behavior is attached; it should use clearer framing such as `Related to Walgreens` plus no alert state, or keep the mention internal until there is a useful recommendation, edit affordance, or trigger proposal.

Internal-retention rule: **do not keep place signals that do not do work.** Place mentions should be derived only inside a useful decision path, and persisted only if they create one of these useful records:

- a `PlaceTarget` that helps search, inspection, recommendation, or trigger proposal;
- a `PlaceLink` the user can inspect or correct because it affects behavior;
- `PlaceEvidence` attached to an accepted/rejected suggestion, correction, completion, or trigger event;
- a candidate for user-approved Saved Place memory.

If none of those apply, the mention should be treated like an unused parse artifact and dropped.

### Place Candidates And Resolution

`Walgreens` is not automatically one precise map point. It can be a place target with different resolution levels:

- **Text reference**: the captured phrase, such as `Walgreens`. This is an ephemeral parse result, not a user-facing feature or durable record by default.
- **Brand or chain candidate**: any Walgreens, useful for errands and search, but not enough for a geofence.
- **Category candidate**: pharmacy, grocery, library, school, office, useful when the specific place is unclear.
- **Context-scoped candidate**: Walgreens near home, near work, near the user's hotel, in the current city, or along an errand route.
- **Candidate set**: multiple possible Walgreens locations that all satisfy the task, such as "any Walgreens this week".
- **Specific place candidate**: a particular Walgreens store, usually with a map provider id and coordinates.
- **Settings-managed Saved Place**: a user-approved durable place, such as "My Walgreens" or "Walgreens near home".

The matching scope should follow the contract:

- **Related context** can match a brand, category, context-scoped candidate, candidate set, or Saved Place. It does not need latitude/longitude.
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

- Start with capture-time extraction, related context, explicit single-place geofences, and lazy candidate resolution.
- Avoid continuous background polling and continuous nearby-place search.
- Do not promise "any pharmacy" alerts until the app has a bounded candidate-set strategy, clear permission copy, provider cost controls, and battery testing.
- Prefer surfaced proposals over hidden detection: "Want me to remind you at the Walgreens near your hotel?" is safer than silently trying to monitor every Walgreens.

### Capacity Model

Do not limit saved or named Places to the OS geofence limit. A named Place is app data; an active location alert is the scarce resource.

The product should separate:

- **Saved Places**: user-approved memory such as Home, School, Library, Grocery, Church, Office, Walgreens near home. These can be numerous because they do not require active location monitoring by default.
- **Place links**: Activity-place relationships such as "return library books" related to Library. These can be numerous and remain useful for Activity Detail, search, context grouping, and Recommended.
- **Active watched places**: specific coordinate-backed places that currently have arrive/leave monitoring enabled. These should be deliberately limited, deduplicated, and inspectable.

V1 should use an explicit watch budget, designed around iOS rather than Android:

- One watched place can serve many Activities. Five to-dos at Library should consume one active region, not five.
- The V1 user-facing limit should be lower than the platform maximum, such as 10 active watched places, so Kwilt keeps headroom for reliability, migration, and future system behavior.
- If the user tries to enable an alert beyond the active budget, Kwilt should not silently queue a false promise. It should offer a choice: keep the Place linked without an alert, replace another watched place, or defer the alert until a future smarter scheduler exists.
- If an Activity has a broad match such as "any Walgreens", the default should be related context, not active monitoring. To create an alert, Kwilt should ask the user to choose a specific Walgreens unless a dependable multi-place watch strategy has been implemented.

Suggested user-facing language:

- `Related to Walgreens` - helps Kwilt organize and recommend this task.
- `Watching Walgreens on Broadway` - Kwilt can remind you when you arrive or leave.
- `Alert not on` - this place is linked, but Kwilt is not watching your location for it.
- `Choose a place to watch` - broad matches need a specific place before arrival/leave alerts.

This design helps Maya without making her manage a technical quota. Most place value comes from capture, context, and recommendations. The scarce active-watch budget is reserved for the few reminders where a notification is genuinely worth the permission, battery, and trust cost.

### Product Surfaces

Places should support several surfaces without becoming a top-level tab by default:

- **Recommended**: highlight place-relevant Activities when place evidence makes them more likely to be doable now.
- **Location Triggers / Location Offers**: explicit user-approved arrive/leave delivery for a specific Activity.
- **Quick Add**: create the to-do first, then show a compact receipt; open focused Place confirmation only after the user engages a consequential or ambiguous result.
- **Activity Detail**: inspect and edit the Activity's place target/link and optional trigger intent.
- **Phone Agent / Text Coach**: parse place-bearing capture such as "remind me to return the library books when I am near the library" and create a permissioned Activity/place proposal.
- **Settings-managed Places**: let the user inspect, rename, delete, or forget durable place memory after it is confirmed.
- **Future learned places**: suggest durable place memory only after repeated task-place evidence and user confirmation.
- **Future smarter reminders / automation**: use confirmed place memory to propose reminder timing or scoped automation after trust is earned.

### Quick Add Confirmation Workflow

Quick Add cannot satisfy a clear location-reminder request or ambiguous Place resolution by parsing alone. It needs a compact confirmation affordance after capture, but the dock should not automatically open a sheet for ordinary generated results.

The shared pattern is a **Quick Add receipt** anchored directly above the collapsed dock:

- Confirm creation immediately.
- Add generated-result chips asynchronously when enrichment finishes.
- Show safe, reversible additions such as steps/details as passive inspectable receipts.
- Show one ambiguous Place decision with direct choices such as `Nearby`, `My Costco`, or `Any`.
- Use `Review`, `Choose another`, or `Set alert` to open a focused sheet only after the user asks for more space.
- Let the user start another Quick Add without dismissing or answering the receipt.

Do not require confirmation of every generated result. Consequence determines presentation: safe/reversible enrichment may apply with a receipt; ambiguous Place resolution needs a choice; location permission, geofence monitoring, or durable Place memory needs explicit confirmation.

When the user captures:

> Remind me when I get to Walgreens to pick up my prescription.

The reliable flow should be:

1. **Create the Activity first** with the user's original wording preserved.
2. **Recognize explicit location-alert intent** because the user asked for "when I get to" behavior.
3. **Show a post-capture receipt action** such as `Set alert` instead of silently saving a location rule or automatically opening a sheet.
4. **Open focused Place resolution only after the user taps the receipt action**, then resolve the place only as needed:
   - if there is one obvious saved/resolved Walgreens, show it;
   - if there are multiple candidates, ask "Which Walgreens?";
   - if the target is broad, such as "any Walgreens", explain that alerts need a specific place unless multi-place watching is supported.
5. **Ask for OS location permission only after the user confirms the specific alert behavior.**
6. **Attach the location alert** to the Activity, or keep the Activity without location behavior if the user dismisses the sheet.

The full Place sheet is not a general "place detected" prompt. It should appear only after the user engages an explicit place behavior such as:

- "remind me when I get to..."
- "when I arrive at..."
- "when I leave..."
- "next time I'm at..."

For weaker text such as "pick up prescription at Walgreens", Quick Add should usually create the Activity without interruption. Place parsing may later support search, recommendation, or Activity Detail editing, but it should not interrupt capture or imply a trigger.

Do not invite location setup merely because the capture text contains a place. The invite should require explicit alert language, repeated user-visible value, or a user action such as opening Activity Detail and choosing "remind me there." This protects capture from becoming a setup funnel.

The receipt and any user-opened confirmation surface should show the contract clearly:

- `Create task only` - no place behavior.
- `Remind me there` - choose/confirm a specific place, then enable an alert.
- `Remember this place` - optional later action, only after user approval.

This makes the workflow honest: capture remains low-friction, but explicit location requests have a real path to confirmation.

If the user ignores or dismisses the receipt, the Activity remains valid. A broad place target may remain if it supports a real search/recommendation/edit path, but there is no required-review queue, no automatic trigger, and no unresolved setup debt.

### Recommendation Relationship

Places enhance Recommended by adding a grounded answer to:

> Is this Activity more relevant because of a place relationship?

The recommendation engine should distinguish:

- **Weak place signal**: Activity has a place mention, place target, or coordinates. This can help context fit only inside bounded flows such as search, Activity Detail, or an explicit context view.
- **Medium place signal**: Activity is related to a Saved Place, has user-confirmed place intent, or has a schedule/reminder aligned with a place. This can help ranking inside Recommended, but only when the current app context makes the place relationship relevant.
- **Strong place signal**: an enabled location alert fired recently, the user opened Kwilt from a location notification, the user explicitly selected a place/context view, or the app has foreground/current-location permission and a confirmed match. This can lift place-specific Activities more aggressively.

Examples:

- "Pick up prescription" with a Walgreens trigger rises when the arrive trigger has recently fired.
- "Return library books" related to Library does not beat urgent due work when the user is not in a library context.
- Several grocery-related Activities can be considered together if Kwilt has a confirmed grocery place context, but the engine should still choose the most actionable one to three.

### Scenario Reliability Matrix

The Places system should be explicit about what Kwilt can know in each moment.

| Scenario | What Kwilt knows reliably | What Kwilt can do | What Kwilt must not imply |
| --- | --- | --- | --- |
| Maya captures "pick up prescription at Walgreens" at home. | The text contains a possible place target. Kwilt does not know she is at Walgreens. | Create the Activity. Later use the text for search or a bounded recommendation pass. | Do not imply a reminder is active or that Kwilt knows her current place. |
| Maya captures "pick up something from Costco" while visiting another state and has a saved home Costco. | With foreground location access, Kwilt knows the current region differs materially from the Saved Place; it does not know whether she means now or later. | Create the Activity, then offer `Nearby`, `My Costco`, `Any Costco`, or `Choose another`. | Do not automatically choose the nearest Costco, claim to understand the trip, or overwrite the Saved Place. |
| Maya creates the Costco Activity from Quick Add. | The Activity is saved before asynchronous place enrichment finishes. | Show a compact receipt above the dock; add `Nearby`, `My Costco`, and `Any` when ready; keep Quick Add available. | Do not open a large sheet automatically, require a response, or hide whether generated fields were applied. |
| Maya captures "remind me when I get to Walgreens" at home. | The user requested arrive behavior, but the specific Walgreens is unresolved. | Create the Activity, show `Set alert` in the receipt, then ask which Walgreens after she taps it. | Do not open a sheet, enable an alert, or ask for location permission before engagement and confirmation. |
| Maya captures the same request while physically at Walgreens, but location alerts are off. | Unless she grants current-location access or chooses "use this location," Kwilt only knows the text. | Ask whether to use the current location or choose from search/saved places. | Do not silently infer "this Walgreens" from background location. |
| Maya is a passenger near Walgreens and opens Kwilt. | If no location alert fired and no foreground location permission is active, Kwilt does not know she is near Walgreens. | Show normal Recommended or an explicit Errands context if she selected it. | Do not lift Walgreens tasks as if proximity is known. |
| Maya arrives at a watched Walgreens. | OS geofence event says the device entered the registered region. | Show a notification or in-app offer for Activities tied to that watched place. | Do not auto-complete Activities or generalize to every Walgreens. |
| Maya opens Kwilt at Library with no watched alert. | Kwilt may not know she is at Library. | If she opens a Library view, searches Library, or chooses a place context, show related tasks. | Do not automatically move Library tasks to the top based only on a saved Place. |
| Maya opens Kwilt from a Library arrive notification. | The watched Library region fired recently. | Lift Library-related Activities and offer "mark done" / "snooze" / "disable." | Do not treat the event as proof every Library task is complete. |
| Maya has repeated Library tasks. | Kwilt knows repeated task text, saved links, accepted alerts, completions, and corrections. | Ask whether to remember Library only after repeated explicit evidence. | Do not decide "this is a library" from dwell/location alone. |

Answers to the hard reliability questions:

- Kwilt can know "Library" as a library only if the user named/saved it, chose it from a place search result, accepted a suggestion, or repeatedly confirmed/corrected Library-related tasks. It should not classify places just because the user dwells there.
- Kwilt should not keep a general history of where Maya used the app or what she did at each location. Durable place evidence should come from explicit user actions and product events: accepted location alerts, saved places, user corrections, user-selected place search results, Activity completions tied to an enabled/saved place, and location-trigger events for watched places.
- Kwilt can draw from named Saved Places, explicit Activity location rules, user-selected place search results, and current text/search context. It should not require Saved Places for every useful behavior, but Saved Places are the most trustworthy durable source.
- Saved Places can be numerous because they are app data. Active watched places are limited because they consume OS geofence capacity. iOS region monitoring is constrained to 20 simultaneous monitored regions per app; Android geofencing allows 100 per app/device user. V1 should keep a smaller user-facing active-watch budget.
- To-dos should not move to the top automatically merely because they are related to a Saved Place. They should rise when there is a strong signal: a watched-place event, explicit place/context view, search, foreground current-location confirmation, or user-selected mode.
- For broad targets such as "any Walgreens", Quick Add should ask the user to choose a specific place before enabling an alert unless multi-place watching is explicitly supported. For plain task capture without alert intent, it should not pop up a chooser.

Dependability posture:

- If the user expects Kwilt to interrupt her at a place, the Activity needs an explicit enabled location alert.
- If the Activity only has related context, Kwilt may help inside app surfaces, but it should not behave like a dependable arrival reminder.
- If the product cannot reliably know the user is at the place, it should not design the experience around "Kwilt will notice when I am there."
- The highest-trust V1 is narrower: dependable alerts for explicitly watched places, plus useful in-app organization for place-related tasks.

### Phone Agent Relationship

Phone Agent makes Places more important because users naturally express place intent in text and voice:

- "Remind me to grab eggs next time I'm at Trader Joe's."
- "When I leave church, remind me to call Mom."
- "I need to return this library book."
- "Add school pickup forms for when I'm at the office."

The Phone Agent should not silently write durable place memory. It should convert place-bearing language into explicit proposals:

1. Capture the Activity or pending Activity.
2. Extract the place mention, target, and intended trigger/doable context.
3. Geocode or match a place only when needed for the requested behavior.
4. Ask for confirmation before enabling a trigger or saving durable place memory.
5. Write an audit entry showing what place relationship was created.

This lets Phone Agent, Quick Add, and in-app Activity editing share the same Places primitives instead of each inventing their own location handling.

Phone Agent and Quick Add should share the same confirmation model, even if the UI differs. Text Coach can ask a short follow-up question in conversation; Quick Add should use a compact post-capture receipt with a user-opened focused sheet when needed. Both should create the Activity first and require confirmation before enabling a location alert.

### Trust And Permission Posture

Places must preserve the existing review-safe location posture:

- Capture first; never block Activity creation on a place decision.
- Request OS location permission only after the user accepts a place-trigger behavior that needs it.
- Do not infer/read current location while location triggers are disabled.
- Do not maintain a general place-usage history or infer recurring places from app opens/dwell alone.
- Use generic fallback copy such as "this location" when the exact place name is uncertain.
- Treat location events as signals or offers, not automatic completion.
- Make saved/learned places user-approved, editable, and deleteable.

### Learning Release

The first learning release should make Places real as a shared interpretation layer inside existing surfaces, not as a new area of the app.

Must be real:

- A typed minimum model for place mention, target, link, intent, evidence, context, memory, and suggestion.
- A compact Settings-managed durable Place representation for confirmed memory.
- Quick Add and Activity Detail should write or display that model through existing Activity place behavior.
- Quick Add should have a compact post-capture receipt with a focused confirmation affordance for explicit location-alert requests.
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

- `PlaceMention`
- `PlaceTarget`
- `PlaceLink`
- `PlaceIntent`
- `PlaceEvidence`
- `PlaceContext`
- `SavedPlace` / `PlaceMemory` as a Settings-managed supporting object
- `PlaceSuggestion`

The important refinement question is not which phase owns each type. It is which fields are needed now so current Activity location metadata, explicit trigger state, location-offer acceptance, recent trigger events, and future saved places can all speak the same language without turning the Activity model into a pile of ad hoc fields.

Acceptance criteria for a build-ready spec:

- Existing Activity location behavior maps cleanly into the Places model.
- Activity-place links work independently from notification/geofence triggers.
- Quick Add, Activity Detail, Recommended, and Location Offers can share the same place interpretation.
- Weak, medium, and strong place signals are represented explicitly.
- Trust rules are enforceable in code, not just copy.
- Saved/learned Places can remain absent from the first value moment, but confirmed durable Places have a Settings management home.
- Activity-language inference can create a broad Place target/link without coordinates, notification behavior, or a Saved Place.
- A single strong Saved Place match can resolve automatically with provenance and correction; ambiguous matches remain unresolved.
- Current-location resolution requires explicit foreground evidence and never promotes a task-scoped match to durable memory without approval.
- A current-region versus saved-home mismatch presents both choices and never silently defaults to the nearby venue.
- Choosing a home Saved Place keeps the Activity associated with home rather than the current travel context.
- Quick Add uses a compact post-capture receipt for generated results and opens a full Place/Alert sheet only after explicit user action.
- Dismissing a receipt leaves a valid Activity and does not create a required-review queue.

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
