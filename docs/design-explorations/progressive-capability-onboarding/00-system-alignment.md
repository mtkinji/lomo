# System Alignment: Progressive Capability Onboarding

## Executive diagnosis

Kwilt's accepted product architecture is capability-first, but its onboarding state and narrative
are still product-monolith-first.

The current implementation has a strong Goals onboarding experience and a growing collection of
contextual education patterns. It does not yet have a platform model that can coordinate first
value, setup, permissions, education, and return across many capabilities.

This is the exact mismatch:

| Layer | Current truth | Unified-Kwilt need |
| --- | --- | --- |
| Public product | One Kwilt containing many capabilities | Preserve |
| First-run story | Goals/Arcs are the compulsory route into Kwilt | Route through the user's live need |
| Completion state | One `hasCompletedFirstTimeOnboarding` boolean | Global entry plus per-capability adoption state |
| Later education | Many independent dismissal/seen flags | Shared attention policy plus capability-owned journeys |
| Permissions | Notification request in global FTUX; architecture says capability-time permissioning | Just-in-time permission requests tied to visible value |
| Capability contract | Metadata, route, permissions, agent surface, lifecycle | Add activation/adoption semantics without turning registry into UI config |
| Runtime startup | Several capability services initialize globally | Align activation claims with actual lifecycle ownership |
| Return path | Goals onboarding lands on the created Arc | Every capability activation lands on the native value it created |

## Current user journey

The current first-run path in `App.tsx` and `FirstTimeUxFlow.tsx` is effectively:

```text
Launch
  -> restore/authenticate account
  -> determine new vs returning user
  -> global three-step FTUX
       Welcome
       Notification permission
       Goals/Arcs path explanation
  -> hosted Goal+Arc workflow
  -> persist first Arc and Goal
  -> mark global onboarding complete
  -> land on Arc detail
  -> sequence additional Arc/Goal/Activity/Plan/share education
```

This path is coherent for a user who came to Kwilt to clarify an aspiration and move it through a
Goal. It is not neutral. It makes a strong product claim: understanding and creating the Goals
domain is the admission price for every other capability.

Returning users are already treated as a distinct case, which is a useful precedent. The app
checks for synced data and routes returning users through a narrower permission-oriented flow
instead of replaying the entire Goal+Arc journey.

## Existing assets worth preserving

### 1. A genuinely meaningful first-value journey

The Goal+Arc onboarding is not disposable scaffolding. It creates real domain objects, lands on the
result, and has a defined continuation into Activities. That is the right *shape* for capability
activation: setup should create value, not merely teach controls.

### 2. Capability-owned local contracts

The unified architecture explicitly preserves native capability workflows and local visual
languages. Progressive onboarding can follow the same ownership rule: the shell coordinates entry
and attention, while each capability owns the minimum path to first value.

### 3. Just-in-time precedents

Several product decisions already reject universal setup:

- Location is requested only when a location-based feature is chosen.
- Screen Time setup is contextual and security-sensitive.
- Household creation happens when another person is actually added or invited.
- Focus education appears at the Activity action where it becomes meaningful.
- Place behavior is taught through the location surface rather than a global explainer.

These are not isolated exceptions. Together they are the beginning of a progressive capability
onboarding philosophy.

### 4. Capability metadata and lifecycle contracts

`CapabilityDefinition` already has availability, routes, deep links, permissions, agent surface,
and lifecycle hooks. This creates a natural architectural seam for activation, but the registry
should remain declarative product infrastructure rather than become a giant hard-coded tutorial
engine.

### 5. Exact native return destinations

Unified Chat and the capability shell already value exact return paths. Activation should use the
same principle: after setup or learning, return to the precise object, inventory, session, or
receipt that now matters.

## Current liabilities

### 1. One global completion flag is semantically overloaded

`hasCompletedFirstTimeOnboarding` currently answers several different questions at once:

- Has the person crossed the global first-run gate?
- Have they created an Arc and Goal?
- Are they safe to show post-onboarding guides?
- Are they new or returning?
- Have permissions been addressed?

Those questions diverge in a capability platform. A user can be globally established, deeply
active in Money, untouched in Games, partially configured in Screen Time, and returning to Goals
after six months. None of those states should reset or replay global onboarding.

### 2. Progressive education exists as uncoordinated booleans

The app already tracks many first-use moments: first Arc celebration, Goal guide, Activity guide,
Plan-ready handoff, Activity detail guide, Arc exploration, sharing, credits, Focus, Chapters
settings, and more. The flags are locally sensible, but they do not express:

- which capability owns the education;
- which user intent activated it;
- whether first value happened;
- whether another overlay currently owns attention;
- whether the user deferred setup versus rejected the capability;
- whether the guidance should resume after an app update or long absence;
- whether a household member has a different role-specific journey.

The likely failure mode is prompt collision, not absence of education.

### 3. The capability registry describes possibility, not adoption

The current registry can say a capability is active, preview, or hidden for the product. It cannot
say what the capability means to a particular user. Product availability and user adoption are
different state machines.

Examples:

- Money may be product-available but not connected by Maya.
- Screen Time may be configured for one child but not authorized on another device.
- Games may be immediately usable without setup, yet never discovered.
- Stories may have imported content and therefore be valuable on first open.
- Goals may be established globally but dormant for months.

### 4. Runtime behavior does not fully match the activation architecture

The unified platform contract says unopened capabilities should not initialize their work. Today,
`App.tsx` still starts several global services on app initialization, including location offers,
health background work, Screen Time protection sync, and other domain services. This was already a
known capability-platform gap. Progressive onboarding will be misleading if the UI says a
capability has not been activated while its services or permissions behave as if it has.

This does not need to be fixed during design exploration, but activation semantics must be defined
in a way that implementation can make true.

### 5. Notifications are still framed as universally relevant

The current FTUX requests notification permission before the user has experienced a capability's
value. In a broad app, the question "Allow Kwilt notifications?" is underspecified: reminders for
Goals, transaction alerts, game turns, family requests, Screen Time delivery state, and chapter
digests have different value and urgency.

The system-level permission may be shared, but the explanation and first request should be tied to
the first chosen notification-producing value. Later capabilities need in-app preference consent
even if the OS permission is already granted.

## The conceptual model Kwilt needs

### Separate five state layers

Do not create another single `onboardingStatus` enum. Track distinct truths:

1. **Account state** - signed out, restoring, established, returning, recovery required.
2. **Global orientation state** - never oriented, oriented, needs reorientation after material
   product change.
3. **Capability adoption state** - per user and capability.
4. **Capability configuration state** - domain-specific completeness and health.
5. **Education/attention state** - what was offered, deferred, dismissed, completed, or suppressed.

The product may project these into one calm experience, but the underlying distinctions prevent
false assumptions.

### A provisional capability-adoption state machine

This is a design hypothesis for later divergence, not a final schema:

```text
unseen
  -> introduced
  -> started
  -> value_reached
  -> active

started
  -> deferred
  -> blocked

active
  -> dormant
  -> resumed

any non-destructive state
  -> available again without replaying global onboarding
```

Important distinctions:

- `started` is not `configured`.
- `configured` is not `value_reached`.
- `dismissed education` is not `rejected capability`.
- `blocked by permission/provider/device` is not user abandonment.
- `dormant` is not failure; many life capabilities are seasonal.

### Capability-owned activation contracts

Each capability eventually needs to answer a small common set of questions:

- What user intent should route here?
- Can the capability produce value immediately, with demo/read-only/imported data, or does it need
  setup?
- What is the minimum setup for one meaningful result?
- Which permissions, connections, roles, entitlements, or device conditions are required, and at
  what exact moment?
- What event proves first value?
- What native destination should receive the user afterward?
- What can be deferred safely?
- How can incomplete setup resume?
- What adjacent capability may be relevant after value, and what evidence justifies mentioning it?

This is a shared activation protocol, not a demand for identical onboarding screens.

## Onboarding taxonomy

Using one word for every first-use experience will keep causing design confusion. A useful working
taxonomy is:

| Moment | Purpose | Likely owner |
| --- | --- | --- |
| Account entry | Establish or recover identity and data | Global platform |
| Orientation | Explain one Kwilt and route to a live need | Global shell |
| Activation | Reach first meaningful value in a capability | Capability |
| Enablement | Add required permission, connection, role, data, or entitlement | Capability + platform service |
| Education | Teach a deeper behavior at the moment it becomes useful | Capability |
| Expansion | Reveal an adjacent capability that advances the current job | Shell recommendation + capability |
| Re-entry | Resume partial setup or recover after dormancy | Capability |
| Migration | Preserve existing data/mental model from a standalone app | Capability + platform |

The user-facing copy need not use these terms.

## Candidate orchestration principles

These principles should govern the next phases unless the frame review changes them:

1. **Start from intent, not inventory.** A menu can show breadth after the user has bearings; it
   should not be the first assignment.
2. **First value before full configuration.** Ask only for what is needed to create a useful state.
3. **One attention owner at a time.** Global, capability, permission, paywall, celebration, and
   coachmark layers must arbitrate rather than compete.
4. **Permissions explain a concrete exchange.** Name what becomes possible now, not what Kwilt may
   someday do.
5. **Let capabilities differ.** Money connection, a game start, Goal creation, and Screen Time
   authorization should share lifecycle semantics, not visual choreography.
6. **Preserve continuity.** Reuse authorized identity, household, preferences, and context so each
   capability feels like Kwilt remembers the user.
7. **Make cross-capability reuse legible.** When data crosses a boundary, show why and allow control.
8. **Expansion follows demonstrated relevance.** Do not badge or promote a capability simply
   because it exists.
9. **Setup is resumable and reversible.** Leaving midway should not corrupt state or create empty
   domain objects.
10. **Celebrate outcomes, not configuration.** The meaningful moment is a trusted plan, connected
    account, protected device, shared memory, or started game—not “setup complete.”

## Capability archetypes to pressure-test later

Different capabilities have different activation shapes. Divergence should test at least these:

| Archetype | Example | First-value challenge |
| --- | --- | --- |
| Creation-led | Goals/Arcs | Create a meaningful object without teaching ontology first |
| Connection-led | Money | Connect/import safely, then show trustworthy summary value |
| Permission-led | Screen Time | Explain authority and device boundaries before asking for access |
| Instant-play | Games | Let the user play before explaining the broader system |
| Content-led | Stories/Recipes | Start from capture, import, or existing shared content |
| Participation-led | Household/shared spaces | Create roles and ownership only when another person enters |
| Ambient/agent-led | Chat/Agent | Establish scope and action authority as the request demands it |
| Returning/migrated | Existing Money/Games tester | Recognize existing data and skip beginner setup |

One progressive model must accommodate all of these without flattening them.

## Decisions this phase does not make

- Whether the first global prompt is a question, a short choice set, an Agent conversation, or
  inferred routing from an invite/deep link.
- Whether users can browse every capability before choosing a starting point.
- Whether capability adoption state lives locally, in Supabase, or both.
- Whether the shell visibly distinguishes active, available, preview, and dormant capabilities.
- How monetization enters activation.
- Whether cross-capability recommendations are deterministic, agent-assisted, or both.

Those belong in Yes-And, Diverge, and Converge after the frame is accepted.
