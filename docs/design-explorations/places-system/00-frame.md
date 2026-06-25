# Frame: Places System

## What the user said

> We have a brief for a places system, can you find it and tell me where we're at with it from a maturity and implementation standpoint?
>
> that phasing stuff is complicating the story for me. lets remove it and frame this whole concept in terms of the standard design loop artifacts
>
> I mean I actually want you to run the design loop on this. Use any prior documentation you may have or want to use to inform the design process.

## Restated in user voice

When an intention depends on a place, the user wants Kwilt to preserve the place relationship and use it at the right moment, so errands, pickups, returns, and place-specific follow-through do not disappear into a generic to-do pile or a hidden location system.

## Target audience

`audience-aspirational-family-organizers` - Aspirational family organizers.

This is a Maya-first concept because ordinary family life is full of place-bound commitments: school, church, grocery stores, libraries, offices, errands, pickups, drop-offs, and returns. The system should make those commitments more doable without asking Maya to configure a place database.

Secondary trust audience: `audience-ai-native-life-operators` - AI-native life operators. Nina matters as the trust stress-test because Phone Agent and AI capture make place-bearing instructions natural, but she will reject silent location memory or opaque AI action.

## Representative persona

Maya is trying to keep family and personal to-dos moving without becoming a productivity power user.

- Current situation: she has ordinary Activities that become doable only in certain places or transitions.
- What she's trying to become/do: a steadier family organizer who can act at the right moment without scanning the whole pile.
- Emotional state or tension: she wants help, but not setup, surveillance, or one more taxonomy to maintain.
- What would make this feel wrong to her: a Places tab in the primary app canvas, a required saved-place setup flow, permission prompts before clear intent, or recommendations that treat "has coordinates" as "important now."

Nina expects a phone or text agent to understand place-bearing instructions, but only if the resulting action is previewable, permissioned, and reversible.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want to grow.

Places serve this job when they help an Activity become the next doable action in the real world rather than another item buried in a list.

## Job flow step

`job-flow-maya-move-family-life-forward`, step 4: Know the next doable action.

Current delivery score: 2. Kwilt can capture Activities and has Recommended, grouping, and explicit location-trigger capability, but it does not yet have a coherent system that connects place references, place intent, place events, place memory, and recommendation relevance.

## Active anchors

- `jtbd-carry-intentions-into-action` - Place-aware behavior should turn captured intentions into practical follow-through.
- `jtbd-capture-and-find-meaning` - Capture must remain fast and first-class even when place details are unknown or unresolved.
- `jtbd-trust-this-app-with-my-life` - Location and AI behavior must be explicit, inspectable, and calm.

## Friction we're addressing

Kwilt has several place-shaped primitives: Activity location metadata, Location Triggers / Offers, Quick Add location recommendations, contextual Recommended, and Phone Agent capture. The friction is that these can become separate one-off features unless there is a shared model for why a place matters, what evidence supports it, and when it should affect the user experience.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Activities has Quick Add, Activity Detail, Recommended, and optional location-trigger behavior.
- Existing user flow: a user can capture a to-do first, then add or accept place-trigger behavior later.
- Existing domain/data model: Activity has lightweight `location` metadata with label, latitude, longitude, arrive/leave trigger, and radius.
- Existing technical affordances: location-offer services can register geofences, reconcile eligible Activities, and deliver offer notifications from arrive/leave events.
- Existing adjacent strategy: To-Do Action Contexts covers broad practical modes such as errands, desktop, calls/messages, and saved-place context; Places is the place-specific trust/evidence substrate for that broader context layer.
- Existing UX/copy convention: location behavior should sound proactive and agentic, but not needy or manipulative; permission follows explicit user intent.

Constraints to preserve:

- Capture first; never block Activity creation on place resolution.
- No OS location permission request before the user accepts behavior that needs it.
- No silent current-location inference when location triggers are disabled.
- No automatic task completion from location events.
- No Places tab or saved-place database as the default entry point.
- Durable Places can be Settings-managed supporting objects once the user has confirmed memory.
- No broad category-weighted fake context.

Constraints we may challenge:

- Activity `location` may need to become a projection of a richer Places model rather than the only representation.
- Recommended may need place evidence as a first-class input rather than reading raw coordinates.
- Phone Agent may need shared place proposal semantics with Quick Add and Activity Detail.

Design implication:

Places should become a shared interpretation layer across existing surfaces. It should make Kwilt more trustworthy and more useful without making the user manage places directly.

## Aspirational design challenge

How might we help Maya and Nina turn place-related intentions into timely, trustworthy action, while preserving capture-first behavior, explicit permission, user-approved memory, and calm recommendations?

## Out of scope

- Building a Places tab as the primary experience.
- Asking the user to create Places before place-aware Activity value exists.
- Silent saved-place learning.
- Route tracking or continuous location history.
- Cross-user location priors.
- Family sharing of places.
- Automation that acts without a fresh user-approved rule.

## Open question

What is the minimum shared Places model that unifies current Activity location behavior, Recommended, Location Offers, Quick Add, Phone Agent, and a future Settings-managed durable Place list without overbuilding setup?
