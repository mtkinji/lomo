# System Direction: A Scalable Overture

**Status:** Selected system direction for a non-disruptive learning release. This defines the
product contract needed for the concept to scale; it is not yet an implementation specification.
See [04d-guided-overture-learning-release.md](04d-guided-overture-learning-release.md).

## The Requirement

The Guided Overture cannot be a fixed film, a hand-maintained list inside the onboarding screen,
or one beat per capability.

It should be a small **stage system**:

- every capable product area can contribute one or more truthful, executable task vignettes;
- Kwilt centrally selects a short, balanced sequence for the current person and product state;
- the same selected records render both the quick demonstration and the stable task buttons; and
- the sequence routes into capability-owned activation and first value.

The governing scalability rule is:

> **Adding capabilities expands the candidate library, not the length of onboarding.**

If Kwilt grows from six capabilities to twenty, first-run should still show roughly five or six
well-chosen forms of help. Breadth should become more relevant and better composed, not longer.

## The Separation Of Responsibilities

### The capability owns truth

Each capability owns:

- the concrete tasks it can actually help a person begin;
- the example object and result shown in its vignette;
- its native entry or activation destination;
- any setup, permission, authority, device, region, or entitlement boundary;
- the event or state that proves first value; and
- its reduced-motion and accessibility meaning.

Money should define what **Review recent spending** really opens and what connection is required.
Screen Time should define what **Choose apps to block** means for the current device and role.
Games should define what it can start immediately. The global shell should not invent those
contracts.

### The shell owns composition

Kwilt's orientation layer owns:

- whether generic orientation should appear at all;
- how many beats the overture contains;
- which available offers form a useful cross-section of Kwilt;
- avoiding redundant or misleading combinations;
- ordering and pacing;
- the **Something else** and **Look around Kwilt** paths;
- reorientation for returning users; and
- keeping the experience coherent as the portfolio changes.

A capability may become eligible for the overture when it is added. It does not get a permanent
right to a beat.

## The Composition Pipeline

```text
capability registry
  -> capability-owned orientation offers
    -> availability, eligibility, and truthfulness filter
      -> bounded portfolio selection
        -> one shared scene renderer
          -> stable task-choice surface
            -> capability-owned activation and first value
```

This is the same modular-monolith principle already present in Kwilt's capability registry:
global infrastructure coordinates, while capabilities retain their native product contracts.

## A Provisional Orientation Offer Contract

Each capability can publish zero, one, or several orientation offers. The contract should support
an offer collection from the beginning, while the first release asks each orientation-ready
capability to identify one canonical primary offer. Additional offers can power Agent routing,
contextual guidance, and the full map before they are candidates for the short overture.

Conceptually, an offer must answer the following questions:

| Field | What it establishes |
| --- | --- |
| Stable offer ID | Lets exposure, selection, dismissal, and revision refer to the same offer |
| Capability owner | Names the system that owns the promise and resulting value |
| Task label | States the action as a concrete verb, object, or decision |
| Example state | Supplies the specific object shown before the transformation |
| Result state | Supplies the visible change that makes the help understandable |
| Scene template | Selects one bounded visual grammar such as arrange, summarize, block, hand off, start, or save |
| Coverage tags | Helps the curator avoid a sequence of five near-identical planning tasks |
| Availability | Says whether this offer is active in the current build and region |
| Eligibility | States device, age, authority, role, account, or entitlement conditions without guessing life need |
| Setup disclosure | Names material setup the user should understand before committing |
| Entry contract | Routes to the exact native activation or first-value destination |
| First-value proof | Names the authoritative event or state that fulfills the offer |
| Accessibility summary | Communicates the same before-and-after meaning without motion |
| Suggested contexts | Names explicit evidence that can make the offer relevant; it does not grant the capability global priority |

The offer is not marketing metadata. It is a small public product contract: **if Kwilt shows this
task, the installed product must be able to honor it.**

### Example records, expressed as product meaning

```text
Money
  task: Review recent spending
  example: Three transactions become a clear category total
  setup: Connect an account if none is connected
  entry: Money connection or recent-transactions destination
  first value: Real transactions are visible and attributable

Games
  task: Start a game
  example: A prompt and people become a ready first round
  setup: Choose or invite players only if the game requires it
  entry: Ready-to-play game session
  first value: The first real prompt or turn is active

Stories
  task: Save a story
  example: A photo and sentence become a saved story card
  setup: None for text; photos or microphone only when selected
  entry: Story capture with the minimum useful input ready
  first value: The story exists and can be revisited
```

These examples remain portfolio hypotheses until each capability's real first-value contract is
verified.

## A Bounded Scene Language

Scalability does not mean every capability ships arbitrary animation code into first-run. That
would make the overture visually inconsistent, fragile, and expensive to maintain.

Prefer a small declarative scene language built from reusable Kwilt components:

| Scene primitive | Meaning | Possible uses |
| --- | --- | --- |
| Arrange | Loose objects gain a useful place or order | To-dos, calendar, meal plan |
| Distill | Several inputs resolve into an understandable result | Money summary, recap, comparison |
| Advance | A larger intention becomes one doable next action | Goal, learning, home project |
| Protect | Selected things move behind a clear boundary | Screen Time, focus, privacy |
| Hand off | An object gains a person, role, or acknowledgment | Family task, invitation, shared list |
| Begin | A ready state becomes an active experience | Game, workout, conversation |
| Preserve | Fleeting material becomes something retained | Story, recipe, memory, note |

Each primitive can use basic movement, opacity, scale, text, icons, avatars, rows, and cards. The
capability supplies the meaningful content; the overture supplies the choreography.

If a future capability cannot be expressed through the bounded language, Kwilt can add a new
shared primitive after reviewing whether it teaches a genuinely different kind of help. The
default should not be a custom scene component.

## Selection Policy

Selection should be deterministic at first. The overture must remain useful when Agent or remote
configuration is unavailable.

### 1. Bypass when the user already supplied intent

An exact invite, deep link, explicit task action, trustworthy restore target, or authoritative
resume state routes directly to its destination. The best-selected montage is still worse than
honoring a concrete request.

### 2. Filter for promises Kwilt can honor now

Remove offers that are:

- unavailable in this build, region, device, or account state;
- ineligible because of a real safety or authority boundary;
- missing a coherent native first-value path;
- dependent on unavailable data or services; or
- stale relative to the capability's current product contract.

Do not fill an empty slot with **Coming soon**.

### 3. Keep a hard presentation budget

Select no more than the number of beats people can understand in a short overture—provisionally
five or six. The budget does not grow with the registry.

### 4. Maximize meaningful difference

Choose a set that demonstrates materially different forms of help. Avoid presenting five offers
that all amount to organizing tasks simply because those capabilities are mature.

Select at most one offer from a capability in the short overture. A capability with several
useful entry tasks can expose the rest in Agent and the full map without dominating the opening.

Coverage tags are internal editorial aids, not a new user-facing life taxonomy. Provisional tags
might include **do**, **advance**, **understand**, **protect**, **coordinate**, **enjoy**, and
**remember** until the broader suite JTBD taxonomy is complete.

### 5. Prefer explicit relevance, not sensitive inference

An explicit prior choice, declared interest, exact entry promise, or safe resume target can affect
selection. Age, transaction data, contacts, family status, or behavior should not be mined to
guess what kind of help a person ought to want.

### 6. Keep the first composition legible and stable

For a new install, use a versioned editorial composition or a small set of deterministic variants.
Do not reshuffle the entire opening on every launch or have an AI improvise it.

### 7. Allow at most one discovery slot

When Kwilt adds a strong new capability, one slot can introduce it to eligible new users or to
returning users who explicitly ask what else Kwilt can do. Do not displace the whole mental model
to advertise a launch.

## Three Exposure Levels

A capability does not need a first-run beat to be a first-class part of Kwilt.

### 1. Short overture

The most representative, currently useful task set for an unscoped person. This is tightly
budgeted and editorially composed.

### 2. Contextual introduction or reorientation

An offer appears when the user explicitly requests the broader map, when declared context makes
it clearly relevant, or when Kwilt has materially expanded and the person opts into a short
reorientation.

This is how a capability added after an existing user's first run can become visible without
replaying onboarding or producing a promotional interruption.

### 3. Full map

Every active orientation offer remains discoverable through **What can Kwilt help with?** and
through Agent routing, even when it is not one of the overture's five or six beats.

The full map can be searched or grouped as the portfolio grows, but it should still lead with task
language rather than a wall of product names.

## The Same Contract Should Power Several Surfaces

The orientation offer should be canonical enough to support:

- the animated overture beat;
- its reduced-motion static card;
- the stable **Where should we start?** button;
- the full **What can Kwilt help with?** map;
- deterministic Agent suggestion chips; and
- task-to-capability routing vocabulary.

This avoids a common form of suite drift in which onboarding promises one thing, Agent uses a
different phrase, the capability menu exposes only a product noun, and the native destination
does something else.

It should not make every surface visually identical. They reuse the same task and route contract,
then present it appropriately.

## Adding A Capability

A new capability becomes orientation-ready through a bounded checklist:

1. **Prove the native path.** It can route to a coherent first-value journey in the current build.
2. **Declare one or more task offers.** Each uses concrete task language and a visible result.
3. **Choose a shared scene primitive.** Add a new primitive only if the existing language cannot
   truthfully express the capability.
4. **Declare boundaries.** Availability, eligibility, setup, permission, role, and device limits
   are explicit.
5. **Supply accessible meaning.** The static and screen-reader form is complete without motion.
6. **Verify the promise.** Contract checks prove the route exists, the capability is active, and
   the first-value signal is defined.
7. **Choose exposure.** Decide whether the offer belongs in the short overture, contextual
   introduction, full map, or some combination.

Adding the capability should not require editing the overture screen, duplicating routing logic,
or creating a new onboarding page.

## Versioning And Removal

The composition and individual offers should be versioned independently.

- A capability can revise its offer when its first-value path changes.
- The shell can revise the selected portfolio without rewriting capability contracts.
- A broken or unavailable offer can be suppressed immediately without marking the whole
  orientation incomplete.
- Removing an offer should not delete capability data or erase a user's prior interest.
- A materially new composition can be offered as optional reorientation rather than replayed as a
  mandatory setup flow.

The orientation state should record which composition and offers the person actually saw. It
should not use one global `onboardingComplete` flag to imply that every future capability has
already been introduced.

## Governance: Scalability Is Not Automatic Promotion

The system should make it cheap for a new capability to **be eligible**, not automatic for it to
**be featured**.

Before an offer enters the short overture, review:

- Is the task concrete and independently valuable?
- Can the capability fulfill the promise today?
- Does it demonstrate a form of help not already represented?
- Can the transformation be understood at overture speed?
- Is any required setup proportionate to a first action?
- Does its inclusion improve the portfolio story enough to displace another beat?

This prevents internal portfolio politics from turning first-run into one tile per team.

## Failure Modes To Prevent

### The linear-growth montage

Every capability receives a beat, so the sequence gets slower whenever Kwilt improves. This is the
opposite of scalability.

### The generic capability card

Every module supplies only an icon, noun, and promise such as **Live better**. The stage can render
it, but the person still cannot tell what to do.

### The custom-animation marketplace

Each capability ships its own visual language into the opening. The experience becomes expensive,
inconsistent, and brittle.

### The marketing/runtime split

The vignette remains after the native route, permission boundary, or outcome changed. The promise
looks polished but is no longer true.

### The ranking engine too early

Kwilt uses sensitive data or opaque AI ranking to decide what the person needs before earning
trust. Deterministic breadth plus explicit choice is the safer starting point.

### The new-capability interruption

Existing users are forced through a launch announcement or replayed onboarding. New help should
appear in the full map, through relevant context, or through optional reorientation.

## System Delta

The current capability registry centralizes labels, icons, availability, routes, deep links,
Agent support, and lifecycle hooks. It does not yet express:

- concrete user task offers;
- first-value destinations and proof;
- orientation scenes;
- eligibility or setup disclosures at task level;
- portfolio coverage semantics; or
- versioned exposure history.

The smallest system extension is not a new onboarding content file. It is a capability-owned
orientation contract plus a shell-owned selector and renderer.

This should remain separate from capability activation state. **Introduced**, **selected**,
**started**, and **value reached** are different facts.

## Reductive Principle

Do not create a second catalog exclusively for onboarding.

Extend the existing capability model so the same truthful entry contracts can power orientation,
Agent routing, the full map, and native activation. Keep the first-run composition as a small
projection of that larger registry.

## Stated Bet

We're betting that a capability-owned offer contract and a shell-owned presentation budget will
let Kwilt grow without making first-run longer, less coherent, or more expensive to maintain.

If adding a capability still requires redesigning the opening by hand, the contract is too weak.
If automatic composition produces a confusing portfolio story, the selector is being treated as
an algorithm when it still needs versioned editorial judgment.

## Next Convergence Questions

1. Should the first release use one hand-curated composition from registered offers, or implement
   the diversity selector immediately?
2. Which five or six internal coverage roles best communicate the mature suite without becoming
   a new user-facing taxonomy?
3. What exact proof threshold makes an offer eligible for the short overture rather than the full
   map only?
4. How should optional reorientation announce genuinely new breadth to existing users without
   feeling promotional?
