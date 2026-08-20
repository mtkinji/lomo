# Converge: The Quiet Compass

## Decision

Choose a reductive hybrid led by **The Quiet Compass**:

> **Assume intent is unknown. Ask one useful question. End in real value.**

- A normal first launch is treated as unknown intent and receives one strong universal Welcome,
  then a small desired-success chooser.
- If an actual invite, live deep link, restore target, or interrupted path is present, it may bypass
  generic steps after only the identity, safety, or authority gates required to fulfill it.
- **Something else** opens a bounded Agent exchange for needs that do not fit the visible choices.
- The chooser presents every primary release-ready path directly. A normal supported reason for
  downloading Kwilt never requires Agent or a secondary disclosure.
- **Look around Kwilt** enters the real shell without requiring a selection.
- Illustrated full-screen moments remain part of the system, but they are used selectively for the
  universal Welcome and capability concepts that genuinely need full attention.
- Every promoted path is owned by a release-ready capability and ends in a real native result.

This is not a compromise that combines every alternative. It deliberately rejects a mandatory
portfolio tour, mandatory Agent conversation, and empty-shell default. It borrows only the parts
that reduce uncertainty without delaying value.

The user does not need to see the name **Quiet Compass**. It is an internal product direction.

## Correction from review

Kwilt cannot generally know why someone downloaded the app on the true first launch. The repository
supports cold-start and live deep links through `Linking.getInitialURL`, but that is not the same as
an implemented deferred-install attribution system that reliably carries App Store browsing,
campaign interest, or a pre-install promise into first launch.

Therefore:

- unknown intent is the production default, not one branch among equals;
- acquisition source is not used as a proxy for desired success;
- deferred-link or campaign-attribution infrastructure is not required for the first onboarding
  release; and
- verified context remains a useful optimization only when a real payload reaches the app.

## Qualitative scoring

| Alternative | Maya / target fit | Speed to first value | Trust and control | Handles breadth | System fit | Visual continuity | Main unresolved risk | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A. Quiet Compass | High | High | High | Medium | High | High | Chooser can become a renamed catalog | Strongest core |
| B. Illustrated Recognition | High | Medium | Medium-high | High | Medium | Very high | Tour length and new-art dependency | Supporting pattern |
| C. Kwilt Concierge | Medium-high | Medium-low | Medium | High | Medium | Medium | Latency and intake feel | Escape hatch |
| D. Enter Kwilt First | Medium | High | High | Medium | Medium-high | Low-medium | Weak bearings and empty states | Explicit skip path |
| E. Show, Settle, Choose | High | Medium | Medium-high | High | Medium | High | Choreography over comprehension | Learning candidate, not default |

### Why Quiet Compass leads

It resolves the strategic problem with the least new product machinery. The normal user gets one
calm Kwilt orientation, makes one comprehensible decision about desired success, and then uses the
real product. It works deterministically, preserves the strongest existing UI
language, and does not require Agent quality or a new illustration portfolio before the strategy
can be tested.

### Why the other alternatives do not lead

- **Illustrated Recognition** is a strong presentation tool, but a weak universal architecture. It
  risks turning every portfolio change into onboarding content production.
- **Kwilt Concierge** handles unusual needs well, but asking everyone to explain themselves adds
  latency and shifts product-model work onto the user.
- **Enter Kwilt First** is the correct behavior when intent is exact or the person chooses to
  browse, but it is too disorienting as the only answer for an organic first install.
- **Show, Settle, Choose** may later prove that visual demonstration materially improves
  recognition. The current evidence does not justify making its choreography the production
  strategy before a simpler chooser is tested.

## Chosen first-install architecture

### Principle 1: Unknown intent is the honest default

The normal first-launch path must succeed with no knowledge of why the person installed Kwilt.
Before showing it, check only for context the app can actually prove is present:

1. A previously chosen but interrupted first-install path stored by Kwilt.
2. An exact live or cold-start URL delivered to the installed app.
3. An authoritative restore target already associated with the account.
4. Otherwise, unknown intent.

Do not assume an App Store campaign, search term, referral page, or marketing promise survived the
installation boundary. If Kwilt later implements a trustworthy deferred handoff, it can enter this
precedence list as an optimization without redesigning the default onboarding experience.

Do not use passive sensitive inference, transaction content, contacts, family status, or guessed
demographics to choose a path.

### Principle 2: Universal onboarding is deliberately small

The universal layer establishes only:

- this is Kwilt;
- Kwilt can help with different parts of everyday life;
- the person can start with what matters now;
- the experience is private and under their control; and
- they can choose any primary path, say something else, or look around.

It does not request notifications, explain the capability map, collect a life profile, establish a
household, create sample objects, select a subscription, or teach Arc/Goal semantics.

### Principle 3: Capability onboarding begins at handoff

Once the path is chosen, the global layer stops explaining. The capability owns:

- the concrete promise;
- minimum setup;
- permissions, connection, role, device, region, and authority boundaries;
- any necessary full-screen concept moment;
- the first meaningful action;
- the authoritative proof of first value;
- error, cancellation, and resumption; and
- the final native destination containing the result.

### Principle 4: Shared system, capability-owned experience

Every primary capability owns a specific onboarding and first-time user experience. Those flows
share one Kwilt onboarding design system:

- `FullScreenInterstitial` and related full-attention layout primitives;
- Kwilt typography, colors, spacing, buttons, progress, and motion;
- the same illustration art direction and compositional role;
- shared accessibility, reduced-motion, Dynamic Type, dismissal, and resumption behavior; and
- a common contract for promise, setup disclosure, steps, first-value proof, and native landing.

The system creates visual and experiential family resemblance. It does not force Screen Time,
Money, Games, Meal Planning, Chores, Recipes, Goals, and To-dos through identical questions or the
same number of screens. Each capability teaches only what its first success requires.

That system explicitly supports two legitimate onboarding archetypes:

1. **Guided discovery and creation.** The experience asks a small sequence of meaningful questions
   because Kwilt needs the answers to help the person form or create the first useful thing. The
   existing Arc/Goal/To-do experience is the accepted model: the questions are part of the value,
   not setup friction to remove merely for consistency.
2. **Illustrated orientation and setup.** The experience uses a short series of full-attention
   illustrated moments to establish the capability's mental model, then asks only for the choices,
   permissions, or connections needed to begin. Existing Screen Time onboarding is the accepted
   model. Most newer capabilities are expected to use this archetype unless their first-value job
   genuinely requires guided discovery.

The chooser routes into the archetype owned by the selected capability. Consistency means a shared
shell, art direction, pacing, navigation grammar, accessibility, resumption, and finish quality. It
does not mean identical interaction depth.

Preserving the Arc/Goal/To-do questionnaire does not require preserving its current first-launch
orchestration unchanged. After a person has seen the universal Welcome and explicitly chosen that
path, the capability journey should begin at the first useful capability-specific concept or
question. It must not replay another generic welcome and create multiple apparent starts before the
questions begin.

An archetype is not a screen template that a capability fills mechanically. The capability still
has to justify every question, illustration, permission, and step against its first-value promise.
Do not add a third archetype until a real capability cannot be served well by either of these.

## Arrival flows

### Flow A: Normal first launch — unknown intent

```text
open Kwilt without a verified pending context
  -> authenticate or restore if required
  -> one illustrated Welcome
  -> What would make Kwilt useful today?
  -> choose a primary path / Something else / Look around
  -> capability-owned first-value journey
  -> real native result
```

This is the primary architecture and must work independently of attribution services, networked
Agent interpretation, or a deferred link.

The chooser shows all primary release-ready paths on one coherent, scrollable surface. It can use
compact rows or tiles and strong grouping, but it must not hide ordinary supported paths behind an
editorial shortlist, **More**, or Agent. The design challenge is to make the complete primary set
calm and legible, not to pretend the set is smaller than it is.

Candidate outcome language—not final copy—might include:

- Make progress on something important.
- Get today's to-dos under control.
- Make meals easier.
- Set up household chores.
- Set up Screen Time controls.
- Make a budget I can use.
- Start a game together.

These are examples for information-architecture testing, not final copy. They name the action or
result more concretely than **Recipes**, **Money**, **Games**, or another capability label. A path
does not appear until its capability can fulfill the promise.

**Something else** is for a need Kwilt cannot match cleanly from the ready outcome set. It is not
the required path for Screen Time, budgets, playing together, meal planning, chores, or another
standard supported capability.

### Flow B: Verified pending context — optional bypass

Examples: a shared recipe, Chore invitation, game invite, exact object link, or authoritative
restore target.

```text
open Kwilt through exact context
  -> authenticate or restore only if required
  -> show object-specific safety, role, or permission boundary only if required
  -> open the native object or acceptance path
  -> complete or use the requested thing
  -> remain at the native result
```

Rules:

- No generic Welcome blocks the requested action.
- No desired-success chooser appears.
- No universal notification request appears.
- A contextual capability interstitial may appear only if the user cannot safely understand or
  complete the requested action without it.
- Kwilt can establish broader bearings later, after the requested action, through a quiet and
  dismissible moment rather than replaying first install.

### Flow C: Verified known outcome — future or explicit-session case

Examples: an explicit in-app **Start with Chores** action or a future deferred handoff that has been
implemented and verified. Do not assume an ordinary App Store campaign provides this context.

```text
open Kwilt with a declared outcome
  -> authenticate or restore if required
  -> concise promise and material-setup disclosure
  -> Start / Choose something else / Look around
  -> capability-owned first-value journey
  -> real native result
```

The promise screen can reuse `FullScreenInterstitial` and a relevant existing illustration if one
fits. It is not owed a new illustration.

### Flow D: Something else

```text
tap Something else
  -> Agent opens with visible first-install scope and concrete examples
  -> user types or speaks the desired outcome
  -> Agent asks at most one necessary clarification
  -> Agent proposes one eligible native path and discloses material setup
  -> Start / Change this / Look around
  -> capability-owned first-value journey
```

Agent is an ambiguity resolver, not a mandatory concierge. It cannot invent routes, grant itself
capability authority, or claim that unavailable functionality is ready.

### Flow E: Look around

```text
tap Look around
  -> mark the blocking universal sequence as dismissed
  -> enter the real Kwilt shell
  -> keep capability menu and Agent available
  -> show capability onboarding only when the user chooses a capability
```

Browsing is a valid outcome, not failed onboarding. Kwilt should not repeatedly reopen the chooser
or use attention badges to pressure a selection.

## The role of existing interstitials and illustrations

### Preserve

- `FullScreenInterstitial` as the shared full-attention presentation primitive.
- The current Welcome illustration as the leading candidate for the one universal moment.
- Branded color fields, calm motion, clear hierarchy, one primary action, progress only when there
  is a real bounded sequence, and reduced-motion parity.
- The Aspirations illustration and current Arc/Goal walkthrough for the identity-direction path.
- The question-led Arc/Goal/To-do journey as an accepted guided-discovery archetype.
- Existing Screen Time onboarding as an accepted illustrated-orientation archetype.
- Other existing illustrations when their meaning is still truthful in the chosen capability
  journey.

### Reclassify

- **Welcome to Kwilt** becomes the universal organic-entry moment, not step 1 of a Goals funnel.
- **Build your path forward** and the aspiration illustration belong to the Arc/Goal capability
  journey.
- The Arc/Goal/To-do questions become capability-owned creation guidance rather than the universal
  model for onboarding every part of Kwilt.
- **Set up regular reminders** leaves universal onboarding. Notification education and permission
  belong where a capability can explain the concrete value of a notification.

### Do not decide yet

- Whether the desired-success chooser needs an illustration.
- Which specific moments in newer capability flows require new illustrations rather than truthful
  reuse of existing art.
- Whether a future visual demonstration outperforms the static chooser.
- How many full-screen or illustrated moments each capability needs. Every primary capability gets
  an onboarding experience, but its sequence follows its own first-value job.

## Global completion versus first success

The current single `hasCompletedFirstTimeOnboarding` concept collapses different facts. The new
strategy distinguishes them without exposing a setup dashboard.

Conceptually, Kwilt needs to know:

- whether universal orientation was shown, dismissed, or bypassed for a verified pending context;
- the verified pending-context class, when one actually exists;
- the selected outcome or **Look around** choice;
- which native path received the handoff;
- whether that capability path is in progress, abandoned, or resumable; and
- whether the capability emitted authoritative first-value proof.

The blocking global presentation ends when the person chooses a path, chooses **Look around**, or
uses a verified-context bypass. Product onboarding success is not claimed until the selected
capability proves first value.

This avoids two bad outcomes:

- making the person replay global onboarding because capability setup was interrupted; and
- claiming onboarding success merely because the shell handed off to a capability.

The implementation shape is deliberately deferred. These facts may not require one monolithic
store or a public capability-status model.

## Capability delta

### Today, a new user cannot reliably

- enter Kwilt for Recipes, Chores, Money, or another non-Goals need without being placed into a
  Goals-shaped universal funnel;
- preserve exact arrival intent through authentication and first-time setup;
- choose a desired outcome without learning capability names;
- browse the product without either completing or dismissing a funnel designed for another job;
- interrupt one capability's setup and resume it without conflating that state with global
  onboarding; or
- know that a promoted starting path will produce a real result rather than an empty surface.

### After this direction ships, a new user can

- continue an exact invitation, object, or outcome path without irrelevant orientation;
- receive one coherent Kwilt Welcome when their intent is unknown;
- choose the success they want in ordinary language;
- state a different need through bounded Agent help;
- look around without penalty;
- enter capability-owned setup and reach a real native result; and
- resume an interrupted capability journey without replaying global first install.

### Still intentionally not possible

- Configure the full suite during first install.
- See an unready capability represented as an actionable outcome.
- See secondary, experimental, or unready capabilities mixed into the primary chooser.
- Receive personalized routing from passive sensitive inference.
- Treat sample or preview data as first value.
- Promote a capability that has not met the required concept, experience, and proof bar.
- Use global onboarding to request notifications or capability-specific permissions.

## Reductive design decisions

### Smallest elegant version

The smallest coherent production experience is:

1. deterministic coordination that defaults to unknown intent;
2. one organic-entry Welcome;
3. one compact outcome chooser;
4. **Something else** and **Look around**;
5. typed handoff into a real capability path; and
6. invisible resumption state.

### What this replaces or collapses

- Replaces the universal Welcome -> Notifications -> Arc/Goal assumption.
- Reclassifies the Arc/Goal/To-do question flow as capability onboarding and preserves it as a
  first-class pattern.
- Removes notifications from universal first install.
- Collapses generic Agent intake into an escape hatch for unmatched intent.
- Avoids creating a separate onboarding catalog, setup center, or adoption dashboard.

### What we refuse to add

- A mandatory montage or portfolio carousel.
- A life-area survey, demographic questionnaire, or personality diagnosis.
- A capability grid presented as onboarding.
- One identical interstitial sequence imposed on every capability.
- A visible setup-progress dashboard.
- Cross-capability recommendation pressure after first value.
- New illustration production before rendered information architecture shows a real need.
- Global notification, location, contacts, photo, microphone, financial, Screen Time, or calendar
  permission requests.

### What would make this clutter for Maya

- More than one decision before the relevant native path begins.
- Multiple **next** recommendations after she chooses.
- Capability names competing with outcome language.
- A long explanation of why Kwilt selected the route.
- Repeated interstitials between the chooser and the actual task.
- Treating **Look around** or interruption as a state to correct later.

## Activation and learning path

### When it activates

- On first authenticated entry when no trustworthy interrupted path, delivered URL, or restore
  target exists—which should be treated as the normal case.
- On first unauthenticated entry after preserving the pending context through authentication.
- Not merely because the app process was freshly installed if an existing account restores usable
  state.

### When it bypasses

- Exact shared object, invite, deep link, or authoritative restore.
- Existing user with established product state.
- Development replay, which must remain clearly separate from production completion state.

### How teaching works

- Teach Kwilt once at the universal Welcome.
- Teach outcome selection through plain choices, not explanatory copy.
- Teach capability concepts inside the capability and only when needed for the next action.
- Teach permissions at the action that requires them.
- Keep Agent available for ambiguity without forcing conversation.

### What natural adoption looks like

The person chooses or arrives with an outcome, completes the capability's first-value action, stays
at the native result, and later returns to use or continue that result without needing global
reorientation.

## System implications

### Required platform concepts

- A deterministic first-launch coordinator that defaults to unknown intent and can recognize an
  actual interrupted path, delivered URL, or restore target.
- A capability-owned collection of truthful first-install outcome offers.
- Eligibility and release-readiness filtering before an offer can appear.
- Typed handoff from the shell or Agent to the native capability journey.
- Capability-owned first-value proof.
- Resumable handoff state separate from universal orientation state.
- Privacy-bounded analytics using stable IDs and states, never private user content.

### Migration implications

- Existing users with `hasCompletedFirstTimeOnboarding` remain established and must not be replayed
  through the new flow.
- Existing users who have not completed the old Arc/Goal path should not automatically be assumed
  to want it. Their actual account state and any current explicit intent should determine entry.
- Development and test replay must never mutate production first-install state unless explicitly
  running a real migration scenario.

### Risk posture

The highest product risk is not the chooser UI. It is routing into a capability whose promise or
first-value journey is not ready. That is why the next system artifact after first-install planning
must define the capability onboarding and readiness contracts before broad production replacement.

## Accepted trade-offs

- The chooser communicates less portfolio breadth than a visual overture.
- The initial outcome set is editorial and intentionally incomplete.
- Some unusual needs require one Agent exchange.
- Rare verified-context arrivals may not see the universal Welcome before completing their
  requested action.
- Visual richness is concentrated in meaningful moments rather than spread across every route.
- The new model requires more precise state than one global completion boolean.

## Rejected trade-offs

- Building deferred-install attribution before the default unknown-intent experience works.
- Slowing a verified pending action to ensure everyone sees the brand story first.
- Asking every person to converse with Agent.
- Mixing secondary, experimental, or unready capabilities into the primary chooser merely so the
  portfolio feels comprehensive.
- Preserving the universal notification step for continuity with the old flow.
- Shipping first-install choices whose native capability cannot fulfill them.
- Treating a development-only Guided Overture as sufficient evidence for production replacement.

## Stated bet

We're betting that **one clear Welcome plus one outcome decision is enough for the normal
unknown-intent first launch to reach a useful starting path without knowing why the person
installed Kwilt**.

We're also betting that Agent and richer illustrated demonstrations are more useful as selective
support than as mandatory first-install infrastructure.

If users cannot distinguish the outcome choices, choose **Something else** unusually often, or
enter paths that do not match what they expected, revisit the chooser through better task language
and a lightweight illustrated recognition test before making Agent or a montage mandatory.

If the occasional verified-context user completes a requested action but remains confused about
what Kwilt is, test a post-success Welcome rather than blocking the original action.

## Success signals

### Comprehension

- In qualitative testing, users can explain what their selected option will help them do before
  tapping it.
- Users do not describe the chooser as a list of apps, life categories, or setup commitments.
- **Look around** is understood as a valid choice, not a rejection warning.

### Behavioral

- The default path works with no acquisition or referral context.
- Verified-context arrivals reach the requested native object or action without generic detours.
- Unknown-intent arrivals can find any primary path, correct a choice, use **Something else**, or
  browse without getting stuck.
- Selected paths produce capability-owned first-value proof.
- Interrupted paths resume at the correct capability step without replaying Welcome.
- Users remain at the native result rather than being bounced back into onboarding or Agent.

### Trust and quality

- No capability-specific permission is requested before the selected action makes its value clear.
- No unavailable or unready offer appears.
- Reduced Motion, VoiceOver, Dynamic Type, and interruption/relaunch paths preserve meaning and
  control.
- Simulator, signed-device, TestFlight, backend, and production proof remain separately stated.

### Privacy-bounded instrumentation

Allow only stable event metadata such as:

- entry-context class;
- offer ID;
- chooser selection, correction, **Something else**, or **Look around**;
- handoff destination ID;
- handoff started, resumed, abandoned, or completed; and
- capability-owned first-value event name.

Do not record recipe text, chore content, financial details, family relationships, identity
narratives, Agent free text, or other private outcome content in onboarding analytics.

## Convergence checkpoint

The product direction is now specific enough to plan a learning release. The next phase should
define the smallest real implementation that can test:

- the single Welcome plus outcome chooser;
- all primary paths on one chooser plus **Something else** and **Look around**;
- capability-specific onboarding flows with authoritative first-value proof; and
- interruption and resumption without changing the production default prematurely.

Verified-context bypass should be preserved in the architecture and covered when a real cold-start
link is available, but it is not the central learning question and does not justify adding deferred
attribution infrastructure to this release.
