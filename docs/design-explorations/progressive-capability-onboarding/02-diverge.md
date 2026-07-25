# Diverge: Progressive Capability Adoption and Continuity

## Expanded design challenge

How might we help Maya enter Kwilt through the need that matters now, reach a meaningful result in
one capability, and gradually discover a coherent life system, while preserving calm, consent,
capability depth, and the feeling that Kwilt remembers rather than repeatedly onboards her?

The lifecycle in scope is:

```text
arrival -> orientation -> capability activation -> first value
        -> relevant expansion -> dormancy or continued use -> re-entry
```

## External pattern pressure test

The external references do not prescribe one model, but they establish useful boundaries:

- [Apple onboarding guidance](https://developer.apple.com/design/human-interface-guidelines/onboarding)
  says onboarding should ideally be fast and optional, teach through real interaction, prefer
  contextual tips to one large tutorial, postpone nonessential configuration, and let people
  experience value before purchase prompts.
- [Apple privacy guidance](https://developer.apple.com/design/human-interface-guidelines/privacy/)
  says to request only the data a feature needs and avoid asking before someone has shown interest
  in the feature.
- [Android runtime-permission guidance](https://developer.android.com/training/permissions/requesting)
  says to ask in context after the person invokes the relevant task, allow cancellation, and
  degrade gracefully after denial rather than blocking the whole app.
- [Atlassian's first-impression guidance](https://atlassian.design/patterns/first-impressions/)
  says first-use messages should be benefit-led, dismissible, coordinated across teams, generally
  one at a time, and sometimes triggered only after repeated behavior reveals a real inflection
  point.
- [Apple's machine-learning guidance](https://developer.apple.com/design/human-interface-guidelines/machine-learning)
  warns that implicit feedback can be misinterpreted, accounts and devices may be shared, and
  inference should not rely on behavior alone.

Implication for Kwilt: progressive onboarding should be interactive, contextual, and coordinated,
but an inferred intent must remain visible and correctable. The system cannot equate observed
behavior with consent or identity.

## Axes of variation

The alternatives differ across five substantive axes:

| Axis | Range |
| --- | --- |
| Routing authority | Explicit user choice -> inferred context |
| First surface | Global orientation -> capability-native surface |
| Teaching mode | Up-front explanation -> learning through action |
| Agent role | Absent -> conversational router |
| Orchestration | Simple deterministic rules -> adaptive policy |

All alternatives preserve:

- one Kwilt account, shell, and capability menu;
- capability-owned first-value journeys;
- just-in-time permission and connection requests;
- exact return to native capability value;
- capture-first behavior for Activities;
- resumable activation without setup guilt;
- no capability-completion dashboard.

## Task-entry copy contract

The first draft used broad offers such as “Get family life under control,” “Understand my money,”
“Play together,” and “Capture something worth keeping.” Those describe a category or emotional
payoff, not a task the person can recognize and begin.

Every first-entry choice should:

- start with a concrete verb;
- name the object or decision involved;
- lead directly into something the user can do now;
- produce a visible result or clear next state;
- avoid claiming to solve an entire life domain;
- use the capability's real product contract rather than marketing language.

Examples:

| Too broad | Task-focused entry |
| --- | --- |
| Move something important | Make a plan for something I want to finish |
| Get family life under control | Add a family to-do |
| Understand my money | Review my recent spending |
| Set healthier device boundaries | Choose which apps my child can use |
| Play together | Start a game |
| Capture something worth keeping | Save a story or memory |

The right-hand examples remain provisional until each imported capability's first-value contract is
verified. The durable rule is **offer a task, not a domain promise**.

## Alternative 1: Choose a Starting Task

### Sketch

After authentication and recovery checks, Kwilt asks one plain question: **“What do you want to do
first?”** The answer is a short set of concrete starting tasks, not capability names, life-domain
promises, or a complete product catalog. Examples might be **Add a to-do**, **Make a plan for
something I want to finish**, **Review my recent spending**, **Choose which apps my child can use**,
**Start a game**, and **Save a story or memory**.

The user can also choose **Look around Kwilt**. Selecting a task routes into the owning capability's
native activation journey. Kwilt explains the capability name only when it becomes a useful
landmark. Later launches open the last meaningful destination, not the task chooser.

### Maya and design-challenge fit

Strong. Maya can state her live need without learning the system, and the interaction makes her
authorship unmistakable. It is calm, bounded, and easy to correct.

### Four-object and capture-first stance

- A planning task can still create a Goal and Arc through the existing concrete-to-identity
  journey.
- A capture request can go directly to Quick Add; it never requires Arc or Goal selection.
- Other capabilities do not pretend to fit the Arc/Goal/Activity/Chapter hierarchy when their
  domain is different.

### System fit

- Reuses auth recovery, root navigation, capability registry, and capability-local flows.
- Requires a global task-to-capability mapping and per-capability activation status.
- Does not require Agent inference or a new persistent home screen.

### Best when

- The user arrives from a broad App Store or word-of-mouth promise.
- Kwilt needs a safe, understandable first release.
- The current task set is small enough that five or six concrete entries remain legible.

### Fails when

- The choice set becomes a disguised mega-menu.
- Tasks overlap so much that users must understand Kwilt before choosing.
- The system asks again after an invite, deep link, or existing data already provides a clear
  destination.

### Primer anti-pattern check

Passes if the question is optional and task-led. It fails if the chooser becomes a setup quiz,
forces commitment, or describes personal identity from a single selection.

## Alternative 2: Follow the Door They Used

### Sketch

Kwilt has no universal chooser. It treats arrival context as the first doorway:

- a Screen Time invitation opens the relevant child, app-selection, and authorization path;
- existing Money or Games records open a recognition-and-resume path;
- a deep link opens its exact object or capability;
- a widget, shortcut, share extension, or Chat handoff opens the associated task;
- an unscoped first install opens a neutral shell with one lightweight “What do you want to do
  first?” affordance rather than blocking progress.

Orientation is embedded around the actual destination. The user can always open the capability
menu or change direction.

### Maya and design-challenge fit

Very strong when Maya has a concrete entry context. It removes nearly all abstract onboarding and
respects the urgency that caused her to arrive. It is weaker for truly unscoped installs.

### Four-object and capture-first stance

- Activity capture links go straight to capture and preserve unanchored Activities.
- Goal or Arc links open native object context without replaying object-model education.
- A new Goals user still receives the capability-owned Goal+Arc first-value journey when the
  route genuinely points to Goals.

### System fit

- Extends existing deep-link and exact-return contracts.
- Requires a reliable arrival-context envelope, migration recognition, and safe fallback routes.
- Makes capability activation a navigation concern plus capability-owned state, not a global
  modal sequence.

### Best when

- Growth increasingly comes through invitations, shared objects, widgets, shortcuts, App Store
  campaigns, or standalone-app migration.
- The arrival context is authoritative and narrow.

### Fails when

- Attribution is missing, stale, or treated as more authoritative than the user's current intent.
- A shared device or forwarded link makes the inferred destination sensitive or wrong.
- The neutral fallback shell gives insufficient bearings.

### Primer anti-pattern check

Passes if context is visible, removable, and correctable. It fails if Kwilt silently personalizes
around private inferred intent or treats entry behavior as permission for cross-capability data use.

## Alternative 3: Ask Kwilt First

### Sketch

The first global surface is a bounded Agent conversation. Kwilt asks what the person wants help
with, accepts ordinary language or voice, then recommends one capability-owned starting path. The
recommendation contains a concise explanation—“Screen Time is the right place for this because…”—
and a direct action such as **Set up Screen Time** or **Start a family to-do list**. The user can
change the interpretation before leaving Chat.

The Agent remains a router and context translator. It does not simulate the capability, invent
setup completion, or own the resulting domain records. The selected capability performs the real
work and returns an authoritative result.

### Maya and design-challenge fit

Potentially strong because Maya can speak in her own terms. It avoids a rigid taxonomy and can
handle ambiguous family situations. It also introduces latency, AI trust, and conversational
burden before Kwilt has proved useful.

### Four-object and capture-first stance

- The Agent can route “I need to remember to call the school” directly to Activity capture without
  demanding an Arc or Goal.
- It can recommend the Goal+Arc journey when the user describes a sustained direction.
- It cannot auto-anchor an Activity, create an Arc from inference alone, or claim any action before
  the capability returns a receipt.

### System fit

- Reuses Unified Chat's scope, proposal, receipt, and exact-return architecture.
- Requires a complete capability-routing contract and honest provider-unavailable states.
- Adds model dependency to the most sensitive first-session moment unless a deterministic fallback
  is always present.

### Best when

- The user's need is hard to express through five or six stable starting tasks.
- Chat has already earned enough speed and trust to be a reliable front door.
- The user is Nina-like and expects conversational orchestration.

### Fails when

- The user wants to tap once and begin.
- Model latency, provider failure, or clarification turns make orientation feel like work.
- The Agent over-explains, anthropomorphizes, or behaves as a capability salesperson.

### Primer anti-pattern check

Passes only with bounded scope, humble interpretation, explicit routing, and capability-owned
receipts. It fails instantly if AI silently chooses an identity Arc, implies feelings, or claims
that setup or mutation happened when it did not.

## Alternative 4: Open House

### Sketch

After sign-in, the user enters the real Kwilt shell immediately. The capability menu is the map,
and each capability is designed to explain itself through its native empty, recognized-data, or
returning state. No intent question or Agent routing is required. Opening Money reveals the
smallest useful connection path; opening Games offers immediate play; opening Goals offers the
Goal+Arc journey; opening Screen Time explains its authority boundary.

The shell may show a single passive orientation affordance—such as “Choose a place to begin”—but
does not layer a tour over the menu. Capability education occurs only after the user enters one.

### Maya and design-challenge fit

Mixed. It maximizes autonomy and makes the product architecture honest, but Maya may experience
the full breadth before she has bearings. It works better for exploratory users and worse when
capability names are unfamiliar or grouped abstractions feel like work.

### Four-object and capture-first stance

- Quick Add remains immediately available and unblocked.
- Goals owns Arc and Goal education only after entry.
- Chapters remain retrospective and cannot be presented as a planning destination.

### System fit

- Highest fit with Option G and the capability registry.
- Requires excellent capability-native empty states and activation contracts.
- Requires little global routing logic, but places a high UX burden on menu comprehension.

### Best when

- Capability names are self-explanatory and the shell itself provides enough orientation.
- Users arrive curious about Kwilt broadly rather than with one urgent job.
- The menu can stay calm as the catalog grows.

### Fails when

- Kwilt feels like a folder of unrelated apps.
- “Goals & Plans,” Arcs, Chapters, or future groupings require prior conceptual knowledge.
- Users bounce among empty states without reaching first value.

### Primer anti-pattern check

Passes if the shell remains a map, not a dashboard, and capture is always available. It fails if
capability badges, completion indicators, or promotional cards turn the menu into an engagement
surface.

## Alternative 5: Confirmed Adaptive Weave

### Sketch

Kwilt combines deterministic entry evidence with one explicit confirmation. It first checks, in
order:

1. exact invite, deep link, or return destination;
2. recognized existing capability data or incomplete activation;
3. the user's explicit recent request;
4. only then, a concrete first-task question.

Kwilt presents the result as a proposed starting point, not a hidden decision: **“Continue
connecting your checking account?”**, **“Finish choosing apps for Jordan?”**, or **“What do you want
to do first?”** The person can continue, choose another task, or enter the shell. After first value,
a shared attention policy allows at most one relevant contextual handoff. Re-entry uses the same
evidence order and never treats dormancy as failure.

The “adaptive” part is deliberately narrow. Behavioral inference can nominate a suggestion only
after repeated, recent, nonsensitive actions; it cannot activate a capability, expose data, request
permission, or create an object.

### Maya and design-challenge fit

Strongest across the full lifecycle. It saves Maya from redundant questions when Kwilt genuinely
knows why she arrived, while preserving explicit control when it does not. It can feel coherent
across first install, invitations, migration, incomplete setup, and seasonal return.

### Four-object and capture-first stance

- Capture intents remain direct and never require Arc/Goal linkage.
- Existing Arc, Goal, Activity, or Chapter context can nominate the correct native return path but
  cannot authorize cross-domain use by itself.
- Agent interpretation is optional and subordinate to deterministic evidence and user confirmation.

### System fit

- Extends the shell, deep links, capability registry, onboarding state, and attention coordination.
- Requires the clearest shared adoption protocol and the largest orchestration surface.
- Can be implemented deterministically first; adaptive signals can remain excluded until evidence
  justifies them.

### Best when

- Kwilt must serve new, invited, migrated, active, dormant, and multi-device users with one model.
- Exact context is often available but not universal.
- The product can invest in a small orchestration layer without centralizing capability UX.

### Fails when

- The policy becomes a maze of special cases nobody can explain or test.
- “Smart” routing changes unpredictably between launches.
- The shell hides which evidence caused the suggestion.
- Capability teams encode promotional triggers as relevance signals.

### Primer anti-pattern check

Passes if routing evidence is legible, deterministic by default, and always correctable. It fails if
implicit feedback becomes identity inference, if sensitive suggestions appear on shared devices,
or if the orchestration layer optimizes adoption rather than the user's current job.

## Capability-archetype pressure test

Legend: **strong** = naturally supported; **workable** = needs a clear fallback; **weak** = likely
to create friction or ambiguity.

| Capability archetype | Choose a Starting Task | Follow the Door | Ask Kwilt First | Open House | Confirmed Adaptive Weave |
| --- | --- | --- | --- | --- | --- |
| Creation-led Goals/Arcs | strong | strong with scoped arrival | strong but slower | workable | strong |
| Connection-led Money | strong | strong for migration | workable | workable | strong |
| Permission-led Screen Time | strong | strong for invites | workable | workable | strong |
| Instant-play Games | workable; chooser adds friction | strong | weak; unnecessary conversation | strong | strong |
| Content-led Stories/Recipes | strong | strong for shared/import links | strong for ambiguous capture | workable | strong |
| Participation-led Spaces | workable | strong | strong | weak for role context | strong |
| Agent-led broad request | workable | workable | strong | weak | strong |
| Returning/migrated user | weak if repeated | strong | workable | workable | strong |
| Dormant capability re-entry | weak without added state | strong | workable | weak | strong |

## Comparative trade-offs

| Alternative | Primary strength | Primary risk | Orchestration cost | Global UI weight |
| --- | --- | --- | --- | --- |
| Choose a Starting Task | Maximum clarity and authorship | Task list becomes another menu | low-medium | one brief choice |
| Follow the Door | Fastest path from real intent to value | Missing or sensitive context | medium | almost none |
| Ask Kwilt First | Natural language handles ambiguity | Latency and trust before value | medium-high | conversational |
| Open House | Simplest, most architecture-honest | Mega-app overwhelm | low centrally, high per capability | none beyond shell |
| Confirmed Adaptive Weave | Best lifecycle coverage | Policy complexity and inference creep | high | contextual and variable |

## What divergence teaches us

No single pure model handles every arrival honestly:

- A universal question is redundant when an invite or return destination is exact.
- Arrival context is insufficient for an unscoped install.
- Agent routing is valuable for ambiguity but too expensive as a mandatory front door.
- Shell-first exploration preserves autonomy but makes Maya absorb the product hierarchy.
- A hybrid can cover the lifecycle, but only if it begins as a small deterministic precedence rule
  rather than a “smart onboarding engine.”

The convergence decision is therefore not merely which first screen wins. It is whether Kwilt
should adopt a **routing precedence** that chooses the lightest truthful doorway for the current
situation, and how little shared state is needed to make that dependable.

## Questions for convergence

1. Should an unscoped new user see one concrete task question or the real shell first?
2. Is Agent routing an optional escape hatch for ambiguity, or should it be one of the primary
   doorways?
3. How much adoption continuity must V1 store before it becomes unjustified infrastructure?
4. Can the first learning release test the model with Goals plus one structurally different
   capability, rather than pretending to solve every capability at once?
