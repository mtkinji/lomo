# Learning Release: First-Install Quiet Compass

## Concept To Build

Build a production-shaped first-install rehearsal in which a person with unknown intent sees one
illustrated Kwilt Welcome, chooses one desired success in ordinary language, and enters a real
capability-owned journey that ends at a native result.

The product rule is:

> **Assume intent is unknown. Ask one useful question. End in real value.**

This replaces the earlier learning focus on showing the whole portfolio. The question is no longer
whether a montage can make Kwilt's breadth visible. The question is whether one strong Welcome and
one useful outcome decision can route a new person into genuine success without requiring them to
understand the suite.

## Capability Delta

Today, a new user cannot:

- experience the production-quality Welcome independently from the current Notifications and
  Arc/Goal sequence;
- choose why they want Kwilt without learning capability names;
- route from first install into different real native outcomes;
- choose **Something else** or **Look around** as valid non-failure paths;
- choose any primary release-ready path from the chooser;
- distinguish completion of universal orientation from progress inside a capability; or
- interrupt a chosen capability path and resume it without replaying global onboarding.

After this learning release, an internal tester can:

- rehearse the default unknown-intent first launch without mutating production onboarding state;
- see the real illustrated Welcome in its proposed universal role;
- choose from a small set of truthful outcome offers;
- enter both accepted onboarding archetypes: the question-led Arc/Goal journey and the
  illustration-led Screen Time journey;
- use **Something else** to enter bounded Agent help;
- choose Screen Time, budgets, playing together, meal planning, chores, Goals, To-dos, or
  another primary path once its capability-specific experience passes the readiness gate;
- use **Look around** to enter the real shell without being treated as incomplete;
- relaunch and resume an interrupted handoff at the correct place; and
- inspect whether the selected capability emitted authoritative first-value proof.

Still intentionally not supported:

- Replacing automatic production first install.
- Claiming Kwilt knows why the person installed it.
- Adding deferred-install attribution or campaign routing.
- Showing the Food planning path, Money, Chores, or another non-baseline capability before it passes the shared
  onboarding and readiness contracts.
- Showing an unready capability or simulating an unavailable outcome.
- Requesting notifications or capability permissions globally.
- Creating new illustrations before the rendered experience proves a specific need.

## User Experience

### Entry

Add a development-only **First-install rehearsal** entry in Developer Tools. The wrapper explains:

- this replays the proposed first-install experience;
- production first-time completion state stays untouched;
- choosing a capability path can create real account data after an explicit confirmation; and
- the tester can reset only the rehearsal session.

The wrapper is internal. After **Begin rehearsal**, the experience should look and behave like the
proposed product, without “Lab,” test-mode explanation, or implementation controls in the main
flow.

### Step 1: Universal Welcome

Reuse `FullScreenInterstitial`, the current Welcome illustration, branded color, calm motion, and
one primary action.

The content should establish only:

- this is Kwilt;
- it can help with different parts of everyday life; and
- the person can start with what would be useful now.

Do not mention Arcs, Goals, notifications, the capability menu, setup completion, or the full
portfolio here.

Primary action: **Find a place to start**.

Secondary action: **Look around**.

The exact copy is subject to the later copy pass; this artifact defines the job and hierarchy.

### Step 2: Desired-success chooser

Show one calm screen headed by:

> **What would make Kwilt useful today?**

The chooser presents all primary outcome paths whose owning capabilities have passed the
onboarding and readiness contracts. It is one coherent, scrollable surface—not a featured subset
plus a second catalog. **Something else** is reserved for unmatched needs, not for an ordinary
supported path.

The first technical checkpoint contains two real, accepted capability offers chosen specifically
to exercise the two onboarding archetypes:

1. **Make progress on something important**
   - Owner: Goals / Arcs.
   - Archetype: guided discovery and creation.
   - Handoff: the accepted question-led identity-direction and Goal journey.
   - First-value proof: a real Arc or Goal is created and the user reaches its native detail.
2. **Set up Screen Time controls**
   - Owner: Screen Time.
   - Archetype: illustrated orientation and setup.
   - Handoff: the accepted Screen Time learning/setup journey.
   - First-value proof: the chosen Screen Time rule is saved and its truthful native state is
     visible.

Also show:

- **Something else** - bounded Agent assistance.
- **Look around Kwilt** - enter the real shell with no selected outcome.

These two wired offers are enough for the first engineering checkpoint because they test the
shared system across materially different interaction models. They are not the full intended
chooser and do not complete the learning release. The branch adds the remaining primary paths as
their capability-specific onboarding contracts pass review. The completed rehearsal shows all
primary ready routes without redesigning first install each time.

The target standard-path inventory includes at least:

- **Make progress on something important** - Goals / Arcs.
- **Get a few things out of my head** - To-dos / Activities.
- **Make meals easier** - Household Food coordination across Recipes, Meal Planning, and Groceries.
- **Set up household chores** - Chores.
- **Set up Screen Time controls** - Screen Time.
- **Make a budget I can use** - Money.
- **Start a game together** - Games.

Each item appears only after its own first-value journey, permissions, recovery states, visual
quality, accessibility, and required native proof meet the readiness bar. An unready item is absent,
not disabled or labeled **Coming soon**.

### Step 2A: Shared visual and experiential system

Every capability flow uses the same Kwilt onboarding foundation:

- full-screen interstitial and layout primitives;
- typography, color, spacing, button, progress, and motion conventions;
- shared accessibility, Dynamic Type, reduced-motion, dismissal, and resumption behavior;
- illustrations with the same established visual language and compositional role; and
- a common transition from teaching into native first value.

Each capability still owns its steps. Screen Time may need authority and permission education;
Money may need connection and data-truth education; Games may need player setup; Household Food may
need one connected-loop concept before routing to a Recipes, Meal Planning, or Groceries result;
Chores may need people and responsibility ownership. Recipe capture or discovery may support the
Food journey, but it is not a separate generic first-install promise. Shared components must not
flatten these differences into one generic wizard.

The shared system supports two initial archetypes:

- **Guided discovery and creation** for a capability whose first useful result depends on learning
  enough about the person's intention to help create it. Preserve the existing Arc/Goal/To-do
  question-led flow as the accepted reference. Its interactivity is purposeful.
- **Illustrated orientation and setup** for a capability that mainly needs to explain a mental
  model, disclose material setup, and collect a few necessary choices or permissions. Preserve
  Screen Time onboarding as the accepted reference. This is the expected starting pattern for
  most newer capabilities, subject to their individual concept review.

Both use the same visual grammar and completion contract. They do not use the same number of
questions, screens, or interactions. A capability contract declares its archetype, and any
departure must be justified by the first-value job rather than a desire to look novel.

Reuse an existing illustration when its meaning fits. Define the capability flow first, then add a
new illustration only when an actual teaching moment has no truthful existing asset. Any new art
must extend the current Kwilt illustration style rather than introduce a separate capability look.

Do not fill the initial chooser with preview, disabled, “coming soon,” or concept-only offers.

### Step 3A: Capability handoff

When an outcome is selected:

1. Record the stable offer ID and owning capability.
2. Show material setup disclosure only when that path requires it.
3. Ask for explicit confirmation that the rehearsal will now use the real capability and may create
   real data.
4. Enter the capability-owned journey.
5. Stay at the native result after first value.

Do not bounce back to the chooser, Agent, a celebration tour, or a cross-capability recommendation.

### Step 3B: Something else

Open Agent with a deterministic first message and visible scope:

> Tell me what you hoped Kwilt could help with. I’ll suggest one place to start, or you can look
> around instead.

Agent may ask at most one clarification, then propose only a typed, eligible capability route. The
proposal offers **Start**, **Change this**, and **Look around**. A conversation alone is not first
value; proof still belongs to the capability reached.

### Step 3C: Look around

Dismiss the rehearsal's blocking presentation and enter the real shell. Do not immediately reopen
the chooser, badge unfinished setup, or prompt for a capability. Developer Tools retains the manual
replay entry.

### Interruption and resumption

The rehearsal records, separately from production first-time state:

- Welcome shown or bypassed;
- selected offer or **Look around**;
- handoff started;
- native path in progress;
- first-value proof received; and
- session completed, abandoned, or reset.

On relaunch during an incomplete capability handoff, the rehearsal offers:

- **Continue where I left off**;
- **Choose something else**; and
- **Look around Kwilt**.

It does not replay Welcome automatically.

## Existing Product Relationship

### Reuses

- `FullScreenInterstitial` and the current Welcome illustration.
- Existing brand tokens, typography, spacing, motion, buttons, and accessibility behavior.
- Existing question-led Arc/Goal/To-do onboarding and native destinations.
- Existing illustrated Screen Time onboarding and native destination.
- Existing unanchored Activity capture and native destination.
- Existing Agent route and typed capability handoff patterns.
- Existing Developer Tools entry grammar.

### Supersedes for this learning question

- The Guided Overture's mandatory portfolio sequence.
- A fixed flow from Welcome to Notifications to identity direction.
- Agent as the required destination after visual orientation.

The existing Guided Overture code should be inspected for reusable offer/session/handoff contracts,
but the new learning release should not preserve its tour merely to reuse implementation.

### Leaves unchanged

- Automatic production `FirstTimeUxFlow`.
- Existing `hasCompletedFirstTimeOnboarding` behavior outside rehearsal.
- Returning-user detection and migration.
- Capability-specific permission and setup behavior.
- App Store, TestFlight, or production onboarding until evidence justifies promotion.

## Buildable Slice

### Must be real

- A first-install rehearsal entry isolated from production completion state.
- The actual Welcome interstitial and illustration in the proposed hierarchy.
- A static, accessible desired-success chooser with stable offer IDs.
- One chooser containing every primary readiness-gated path.
- A shared capability-onboarding component and illustration system.
- A typed capability-onboarding contract that declares guided-discovery or illustrated-orientation
  ownership without forcing both through one step schema.
- Goals/Arcs and Screen Time offers with native route contracts.
- Real capability mutation only after explicit rehearsal confirmation.
- Authoritative first-value events from the owning capability.
- **Something else** Agent handoff with deterministic opening and typed eligible routes.
- **Look around** exit to the real shell.
- Interrupted-session persistence, continuation, path change, and reset.
- VoiceOver labels and order, Dynamic Type behavior, Reduce Motion behavior, and 44pt minimum touch
  targets.
- Privacy-bounded development telemetry or an inspectable local event log using stable IDs only.

### Can be thin or temporary

- Intermediate engineering checkpoints can wire the accepted baseline journeys first while the
  remaining primary paths move through readiness review; the learning release is not complete at
  that checkpoint.
- Offer selection can be deterministic and locally declared.
- The rehearsal reset and event inspector can remain development-only.
- First-value proof can use existing authoritative object creation where available, wrapped in a
  small typed adapter.
- Visual treatment of the chooser can be refined after the hierarchy is validated in Simulator.
- A non-baseline third offer can wait for the readiness-contract phase.

### Intentionally excluded

- Deferred deep linking, campaign attribution, or install-source inference.
- Remote configuration, AI ranking, experimentation infrastructure, or sensitive personalization.
- A portfolio montage, auto-advancing animation, or one slide per capability.
- Notifications, location, contacts, photos, microphone, calendar, Screen Time, or financial
  permissions in the universal layer.
- Sample content used as a substitute for first value.
- New backend tables or migrations unless focused implementation discovery proves local namespaced
  state cannot safely support the rehearsal.
- New illustration production.
- Production analytics events before the event allowlist and evaluation plan are approved.

## Release Channel

**Local build** for the first slice.

This is the right first channel because the strategic risk is comprehension and handoff quality,
not distribution. Andrew should be able to replay the flow, create real baseline capability
results, interrupt and relaunch, test reduced motion, and inspect the resulting native state without
changing what actual new users receive.

Next gate: after local visual and native acceptance, package the same rehearsal as an internal
TestFlight-accessible hidden entry if testing with additional people is needed. Do not change the
automatic first-run path merely to get feedback.

## Brand-Goodwill Guardrails

- The production-shaped flow contains no “Lab,” prototype disclaimer, fake capability, or disabled
  promise.
- The Developer Tools wrapper clearly distinguishes real data creation from harmless replay.
- Every outcome label describes what the next path can actually deliver.
- The Welcome remains calm and visually finished; the chooser is not allowed to look like a debug
  menu or settings list.
- Agent does not claim personal understanding or recommend unavailable capabilities.
- **Look around** and interruption are valid, neutral choices.
- No new illustration is commissioned or generated to decorate an unresolved information problem.
- Automated tests do not substitute for Simulator visual hierarchy, accessibility walkthrough,
  relaunch behavior, or native destination proof.

## Reversibility

- Keep rehearsal state namespaced from production onboarding state and version it independently.
- Keep the entry development-only in the first slice.
- Remove or hide the Developer Tools entry without changing production behavior.
- Reuse native capability objects rather than create rehearsal-only domain types.
- Real Goals, Arcs, and Activities created during rehearsal remain ordinary user data and can be
  deleted through their normal product paths.
- Avoid a database migration until the permanent state model is chosen.
- Replacing the static chooser with a later visual recognition treatment should not change offer
  IDs, typed handoffs, or first-value proof.

## Verification Path

### Automated and source proof

- Outcome-offer eligibility and stable-ID tests.
- First-launch coordinator defaults to unknown intent.
- Production onboarding state remains unchanged during rehearsal.
- Goals/Arcs and Screen Time handoffs resolve to exact native routes.
- Each eligible offer declares one supported onboarding archetype.
- First-value proof cannot be emitted by the shell or Agent.
- **Something else** accepts only typed eligible routes.
- The chooser contains every primary ready outcome and no unready outcome.
- **Look around**, interruption, continuation, path change, and reset are deterministic.
- Analytics/event-log payloads reject private content fields.

### Simulator proof

- Welcome hierarchy and illustration quality on the current iPhone target.
- Chooser fits normal and large text without looking like a catalog.
- Goals/Arcs selection reaches the accepted native journey and real result.
- The Arc/Goal questions still feel like useful guidance once they begin after an explicit chooser
  selection, without repeating a second generic introduction or creating multiple apparent starts.
- Screen Time selection reaches its accepted illustrated setup and a truthful saved native state.
- The two paths feel recognizably Kwilt without pretending to be the same interaction.
- **Something else** opens the correct bounded Agent context.
- The complete primary chooser remains calm, legible, and navigable at normal and large text sizes.
- Every included capability launches its own shared-system onboarding and reaches its native first
  value.
- **Look around** enters the shell and stays dismissed.
- Relaunch resumes the interrupted native path without replaying Welcome.
- Reduce Motion, VoiceOver, keyboard, and Dynamic Type preserve all choices and meaning.

### Proof not established by this slice

- Real first-launch behavior for production users.
- TestFlight installation and clean-account behavior.
- A non-baseline capability's onboarding readiness.
- Food, Chores, Money, or broader portfolio route quality.
- Physical-device permission, backend, entitlement, household-role, or regional behavior.
- Retention or repeated-use impact.

## Permanent Product Threshold

Do not replace production first install until all of the following are true:

- Users can understand and choose among desired-success offers without reading them as capability
  names or life-category commitments.
- The Welcome plus chooser feels at least as polished and coherent as the current first-time
  interstitial sequence.
- Every primary ready path is directly selectable from the chooser.
- **Something else** and **Look around** are useful, not escape valves caused by missing standard
  choices.
- At least one baseline and one materially different non-baseline capability have complete,
  verified first-value journeys under the shared onboarding contract.
- Interruption and relaunch do not replay global onboarding or lose the selected path.
- Existing users and returning accounts do not receive new-user onboarding.
- Simulator, signed-device, TestFlight, backend, and production gates are stated and satisfied at
  the lifecycle stage that requires them.
- Andrew accepts the rendered hierarchy and capability handoff quality; automated verification
  alone is insufficient.
