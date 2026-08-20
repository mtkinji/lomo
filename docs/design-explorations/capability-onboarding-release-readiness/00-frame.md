# Frame: First-Install Success Across Kwilt

## Review cadence

Check in after each phase. The first task is to rethink the strategy for a new install now that no
single capability explains why someone downloaded Kwilt. Capability onboarding and release
readiness follow from that strategy; Recipes should not be audited against a model we have not yet
chosen.

## What the user said

> The next branch should be about making sure that onboarding makes sense for new users, that we
> have capability-level onboarding concepts, and that each capability gets enough polish before
> release. I consider all of the original Kwilt capabilities to be ready in that regard. I'm not
> convinced that Recipes is ready, or the other capabilities.

> It used to be that I could onboard directly into Arcs, Goals, and To-dos. And the onboarding flow
> was designed specifically around each of those capability moments. Now a user might download the
> app because they want Recipes, or they might download the app because they want Chores or budget
> management. Onboarding should be about helping them get to success on whatever it is that they
> came for.

> We do still have some screens that I think are really good and nice that can help with that,
> though. Like our full-screen interstitial walk-throughs. I think those are still really good. I
> like our illustrations. We may need more illustrations as we expand out our strategy here, but I
> don't know that yet. So no need to jump that gun.

## Restated in user voice

When I download Kwilt, I have some reason for giving it a try even if I cannot name the capability
that fulfills it. Help me recognize the kind of success I came for, take the shortest honest path
to a real result, and understand only what I need along the way. Give me enough sense of Kwilt to
choose well without making me tour, configure, or commit to the whole app first.

## Target audience

`audience-aspirational-family-organizers` - Aspirational family organizers.

Maya is the strongest initial pressure test because she can plausibly arrive for Goals, family
planning, Recipes, Meal Planning, Groceries, Money, Chores, Screen Time, or shared participation.
She needs the suite to feel coherent, but she should never have to understand the portfolio before
getting help with the need that brought her in.

The readiness standard must also protect:

- Marcus from setup, explanation, and system-maintenance overhead.
- Nina from vague promises, hidden authority changes, and unearned data access.
- Elena from capability onboarding that only works for pristine first-run state.
- Existing Kwilt users from being treated as new to the whole app when only one capability is new
  to them.

## Representative persona

Maya, opening a capability she has not used before because a current family need made it relevant.

- Current situation: She wants one concrete outcome and has limited patience for learning a new
  product model.
- What she is trying to become/do: Make family life easier without adopting another system she
  must continually configure.
- Emotional state or tension: Interested but unconvinced; breadth is valuable only if the first
  experience demonstrates real help.
- What would make this feel wrong: A feature tour, an empty destination, an unexplained permission
  request, sample content presented as real, a setup flow that ends before value, or a surface
  whose visual and interaction quality feels below the rest of Kwilt.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want
to grow.

The cross-cutting release guardrail is `jtbd-trust-this-app-with-my-life`: every capability must
earn trust through truthful promises, bounded access, recoverable actions, coherent states, and a
finish quality that supports continued use.

## Job-flow step

This initiative builds on the provisional platform-adoption flow in
`progressive-capability-onboarding`:

1. Arrive with one live need or invited context.
2. Recognize the relevant form of help without learning the full suite.
3. Enter one capability and reach a meaningful result with the least necessary setup.
4. Grant only the data, permission, role, or connection required for that result.
5. Return directly to the useful state created.
6. Learn the next important concept in context.
7. Leave, resume, or recover without losing orientation or work.
8. Trust Kwilt more because the capability continues to feel useful and complete.

The first weak step is **recognize the relevant form of help and choose a path**. Current onboarding
assumes the desired path is identity direction, then moves every new user through notification
setup and an Arc/Goal creation workflow. That is a coherent capability journey, but it does not
resolve why an unscoped person downloaded the broader Kwilt app.

The next weak step is **enter the chosen capability and reach a meaningful result**. A first-install
strategy only works if each possible route has a truthful, native first-value journey. That is why
capability onboarding and release readiness remain part of this initiative, but they come after
the suite-level entry strategy rather than before it.

## Active anchors

- `jtbd-move-the-few-things-that-matter` - Capability entry must resolve a live need rather than
  introduce product structure.
- `jtbd-trust-this-app-with-my-life` - Availability, permissions, data provenance, actions, and
  readiness claims must be truthful and inspectable.
- `jtbd-carry-intentions-into-action` - Onboarding succeeds only when it produces a useful native
  result.
- `jtbd-get-help-without-retelling-my-life` - Capabilities should reuse already-authorized context
  without repeating global setup or assuming blanket access.
- `jtbd-stay-in-control-of-ai-actions` - AI-assisted setup or creation must remain bounded,
  reviewable, and recoverable.

## serves snippet

```yaml
serves: [jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life, jtbd-carry-intentions-into-action, jtbd-get-help-without-retelling-my-life, jtbd-stay-in-control-of-ai-actions]
```

## What is working now

The current first-time experience contains product assets worth preserving:

- A reusable `FullScreenInterstitial` presentation pattern that can create a calm, intentional,
  full-attention moment.
- A clear user-paced sequence with branded color, restrained motion, progress, and one primary
  action.
- Illustrations for Welcome, Notifications, and Aspirations that Andrew considers strong.
- A native capability handoff that can produce an actual Arc or Goal rather than ending at product
  education.

The current sequence is:

```text
Welcome to Kwilt
  -> Set up regular reminders
    -> Build your path forward
      -> identity Arc / Goal workflow
        -> Arc or Goal detail
```

The strategic problem is not that these screens are poor. It is that their content and destination
encode one capability-specific reason for downloading Kwilt as the universal reason.

Preserve the full-screen walkthrough and illustration language as available design material. Do
not assume the new strategy requires more illustrations, a new art direction, or a montage. The
strategy should first determine which moments deserve full-screen treatment and which existing
assets still express them truthfully.

## Accepted capability journeys

Andrew considers the original Kwilt capability family ready enough in onboarding concept and
polish. Treat these as accepted destination journeys rather than reopening them for release
qualification:

- Arcs
- Goals
- To-dos / Activities
- Plan
- Chapters

They remain useful reference implementations, not the universal first-install funnel and not a
demand that every newer capability copy their flows or visual language. A person who came for
Goals or identity direction may still receive much of today's excellent journey. A person who came
for Recipes, Chores, or Money should not have to complete it first.

## Later portfolio review

After the first-install strategy is chosen, the readiness program applies to every product-visible
capability outside the accepted baseline,
whether or not it is currently represented as a top-level registry entry. The current inventory
includes at least:

- Recipes
- Meal Planning
- Groceries
- Money
- Explore
- Games
- Chores
- Focus
- Screen Time
- Household and shared participation surfaces

Chat and the global shell should be reviewed as cross-capability entry and continuity layers, not
graded as if they were ordinary destination capabilities.

This inventory must be reconciled against the actual product before the audit is considered
complete; the TypeScript capability registry is not currently an exhaustive definition of every
user-visible capability concept.

## Friction we're addressing

Kwilt has explored **One now. One next. The full map when wanted**, Agent-led intent routing, and a
Guided Overture. Those are useful hypotheses, not a settled production strategy. The current app
still uses one Goals-shaped first-time funnel and one global completion state.

The immediate missing layer is a first-install decision model:

- What does every new user need to understand about Kwilt, regardless of why they came?
- Because a true first launch usually carries no trustworthy acquisition intent, how should Kwilt
  help the person name the success they came for without pretending the app already knows?
- When intent is unknown, how should Kwilt help them recognize a useful starting outcome?
- Which moments deserve a full-screen walkthrough, and which belong inside the chosen capability?
- What should be skipped so the user reaches first value sooner?
- What state lets Kwilt resume or reorient later without replaying onboarding?

Release qualification follows because a routing strategy cannot safely recommend a capability
whose native journey is conceptually thin, visually unfinished, dependent on hidden setup, or
unable to recover gracefully. That creates two risks:

- Global onboarding makes a promise the native capability cannot yet honor.
- The capability technically works but teaches, reassures, and finishes too little to deserve a
  new user's trust.

## System alignment

Constraint posture: `Question the system`

The prior progressive-onboarding work established valuable principles, but the user has explicitly
said Kwilt does not yet have a first-install strategy. Treat Guided Relevance and Guided Overture as
inputs to reconsider rather than an accepted production answer. Preserve the division of
responsibility in which the shell establishes bearings and the capability owns setup, permissions,
native result, and first-value proof.

### Current system facts

- Existing suite principle: **One now. One next. The full map when wanted.**
- Existing hypotheses: Agent-led intent routing, capability-owned orientation offers, and a
  bounded Guided Overture.
- Existing strong UI material: reusable full-screen interstitials, brand themes, user-paced
  progression, and liked illustrations.
- Current production behavior: Welcome -> Notifications -> Build your path forward -> identity
  Arc/Goal workflow -> Arc or Goal destination.
- Existing registry: capability identity, availability, route, deep links, settings, permissions,
  Agent surface contract, and lifecycle hooks.
- Current gap: registry availability does not encode onboarding readiness, first-value proof,
  polish evidence, degraded states, or release qualification.
- Existing verification model: automated checks, Simulator/visual review, signed-device proof,
  backend proof, TestFlight, and production are distinct gates.

### Constraints to preserve

- One Kwilt account, shell, and Agent relationship.
- Capability-owned local interaction contracts and visual character.
- First-install onboarding stays bounded as the portfolio grows.
- Setup, permission, role, and data access occur at the moment they unlock value.
- Existing full-screen walkthroughs and illustrations remain first-class design assets until the
  strategy proves they no longer fit a required moment.
- No capability claims readiness based only on registration, routing, unit tests, or happy-path
  screenshots.
- New readiness machinery must not turn the user experience into a checklist or dashboard.

### Constraints we may challenge

- `availability: active` is sufficient to determine whether a capability can be shown broadly.
- Notifications belong in universal first-install onboarding.
- Identity direction is the universal path into Kwilt rather than one strong capability journey.
- The current three interstitial topics are the correct universal sequence.
- Guided Overture is necessarily the right replacement rather than one candidate solution.
- One first-run or coachmark flag is an adequate onboarding concept.
- Functional completeness can be separated from information hierarchy, copy, accessibility,
  empty/error/re-entry states, and visual polish.
- Every product-visible capability is already represented accurately in the registry.
- A capability must wait for complete suite onboarding before its own first-use path can improve.

### Design implication

Define three related but separate contracts, in this order:

1. **First-install strategy** - how Kwilt assumes intent is unknown, helps the person recognize
   their intended outcome, establishes only universal trust, and routes to a native success path.
   Verified context may bypass parts of this flow when it actually survives, but the strategy does
   not depend on deferred attribution.
2. **Capability onboarding contract** - the promise, eligible entry moments, minimum setup,
   first-value path, contextual concepts, permissions, re-entry, recovery, and adjacency owned by
   that capability.
3. **Capability release-readiness gate** - the evidence required before the shell may promote or
   broadly expose that promise, including product coherence, state coverage, accessibility,
   visual hierarchy, native runtime proof, and remaining external gates.

The gate should produce a small set of honest states such as **not assessed**, **concept gap**,
**experience gap**, **proof gap**, and **ready**. These are product-operating states, not labels a
user sees. A binary checkbox would hide why a capability is not ready and encourage premature
release claims.

## Aspirational design challenge

How might we help Maya, on the first install, recognize the success she came to Kwilt for and reach
that success through the right native capability, while preserving the calm, illustrated,
full-attention quality of Kwilt's best onboarding moments without making one capability journey or
the whole portfolio mandatory?

## Phase ordering hypothesis

1. Audit the current first-install path and preserve the interaction and illustration qualities
   that are still working.
2. Diverge on materially different strategies for known-intent and unknown-intent arrivals.
3. Converge on the smallest coherent first-install strategy, including universal moments, routing,
   skips, success handoff, and re-entry.
4. Define the shared capability-onboarding contract that every possible route must fulfill.
5. Define the evidence-based release-readiness rubric.
6. Audit Recipes first and turn its gaps into a bounded improvement plan.
7. Validate the rubric against a materially different capability, then sequence the rest of the
   portfolio.

## Out of scope

- Re-auditing the original capability family without a concrete regression.
- Assuming the earlier Guided Overture exploration is already the production answer.
- Replacing good full-screen walkthroughs merely because their current content is too narrow.
- Commissioning or generating new illustrations before the strategy identifies a real unmet need.
- Giving every capability the same screens, sequence, copy, or visual treatment.
- Building a user-facing capability-readiness dashboard.
- Treating launch marketing, App Store metadata, or a menu presence as proof of product readiness.
- Redesigning every non-baseline capability in one undifferentiated branch.
- Marking any capability ready before the required runtime and external evidence exists.
- Implementing the readiness model before the rubric and Recipes audit shape are reviewed.

## Open question

Is the correct strategic starting point: **first install should identify or honor the success the
person came for, then route into the appropriate capability journey; the current Arc/Goal path
remains one excellent destination rather than the universal onboarding flow**?
