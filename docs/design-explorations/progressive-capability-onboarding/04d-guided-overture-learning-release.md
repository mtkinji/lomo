# Learning Release: Guided Overture In Parallel

**Status:** Proposed learning release. The existing Goals-and-Arc onboarding remains the default.
This plan does not authorize production implementation or a general first-run experiment.

## Concept To Build

Build a real, replayable Guided Overture inside Kwilt that internal testers can open without
changing their onboarding status, then graduate it through increasingly realistic but still
isolated release stages before allowing it to arbitrate first-run for fresh internal test accounts.

The release has two honest modes:

1. **Portfolio concept mode** uses the mature-suite storyboard to test whether the overture makes
   Kwilt's intended breadth understandable. Tasks that are not active in the installed build do
   not route or masquerade as available product.
2. **Live capability mode** includes only orientation offers the installed build can fulfill and
   routes selections into real native destinations.

These modes answer different questions. Positive reaction to the portfolio concept is not proof
that capability activation works. Successful native routing through the current planning-heavy
registry is not proof that the mature portfolio story is broad enough.

## Capability Delta

Today, the team cannot:

- experience **Show -> Settle -> Choose** inside the real Kwilt visual and navigation system;
- replay and tune the sequence without resetting Goals onboarding;
- test mature-suite comprehension without presenting unavailable tasks as product promises;
- test real selection-to-value routing independently from the future portfolio storyboard; or
- try the overture as a true first-run variant without modifying the current automatic FTUX path.

After this learning release, the team can:

- open and replay the overture from an internal-only surface;
- experience its actual pacing, interruption, settle, and reduced-motion behavior on a phone;
- compare what people understand from the mature portfolio with what the current build can
  truthfully execute;
- route verified live offers into their owning capabilities;
- collect bounded comprehension and selection evidence; and
- enable a mutually exclusive first-run variant only for fresh, explicitly targeted internal test
  accounts after the isolated stages pass.

Still intentionally unsupported:

- changing the default onboarding for ordinary users;
- randomly assigning production users;
- showing unavailable capabilities as tappable promises;
- dynamically ranking offers with AI;
- implementing the complete scalable selector;
- requesting new global permissions; or
- treating a completed overture as completion of Goals onboarding or capability activation.

## Current Product Relationship

The current app automatically starts `FirstTimeUxFlow` for a signed-in, non-returning user when
`hasCompletedFirstTimeOnboarding` is false. That flow is mounted beside the root navigator and owns
Goals-and-Arc onboarding state, onboarding-created object pointers, coachmark handoffs, notification
education, and completion.

The app also already has useful isolation seams:

- a development-only Dev Tools destination;
- persisted development experiment toggles;
- PostHog-backed remote feature flags;
- a central capability registry with active/preview/hidden availability and native routes; and
- existing native animation primitives and reduced-motion precedents.

The overture learning release should use those seams without inserting itself into the default
automatic FTUX decision.

### State boundary

The overture must not read or write the existing onboarding flag as its own state.

It must not change:

- `hasCompletedFirstTimeOnboarding`;
- onboarding Arc or Goal IDs;
- onboarding celebration or coachmark flags;
- notification preferences or OS permission state;
- current FTUX trigger count; or
- existing user domain objects merely because a concept scene played.

At most, the learning release records its own exposure, composition, selected offer, skip, replay,
and route result. **Shown**, **selected**, **started**, and **value reached** remain separate facts.

## User Experience

### Entry from the internal lab

Development builds add one Dev Tools action:

> **Preview Guided Overture**

Internal TestFlight builds use a production-hidden, remotely gated **Kwilt Labs** entry available
only to allowlisted testers. Dev Tools cannot be the TestFlight entry because it is development
only.

Opening the lab never resets or launches current onboarding. It shows two internal choices:

- **Portfolio concept**
- **Live capabilities**

The lab framing disappears before the overture begins so the test surface itself resembles a real
first run.

### Overture experience

The first slice uses the leading **Stage, Then Settle** production form:

1. A short composition of concrete task transformations plays on one native stage.
2. **Choose now** remains available and lands on the stable choices.
3. The current vignette can be tapped immediately, stopping the sequence and selecting that task.
4. The completed sequence settles into **Where should we start?**
5. The task choices retain the scene's icon, color, object, and label.
6. **Something else** and **Look around Kwilt** remain visible.
7. The experience can be replayed from the internal lab.

The stable choice screen is the complete reduced-motion and screen-reader experience. Motion never
carries meaning that is absent from the task label and static state.

### Portfolio concept mode

This mode can include target-state scenes such as:

- **Plan tomorrow**
- **Plan the next step for a goal**
- **Review recent spending**
- **Choose apps to block**
- **Share a responsibility**
- **Start a game**
- **Save a story**

The composition still uses only five or six beats. When an internal research participant selects
an offer that the installed build cannot fulfill, the lab records the choice and asks one neutral
research question:

> **What would you expect Kwilt to help you do next?**

It does not show a fake capability screen, **Coming soon**, or a simulated success receipt. This
mode must remain visibly unavailable to ordinary users.

### Live capability mode

This mode is assembled only from active, verified offers in the current checkout. At the time of
this plan, the central registry contains Goals, To-dos, Plan, Arcs, and Chapters. Screen Time code
exists elsewhere in the app but is not yet represented as an active central registry capability;
Money, Games, and Stories are not present in this checkout's registry.

The first live composition should therefore be deliberately modest. Candidate offers include:

- **Add a to-do** -> native Quick Add or Activities entry;
- **Plan tomorrow** -> native Plan;
- **Plan the next step for a goal** -> the existing Goal-and-Arc path; and
- **Ask Kwilt about something else** -> Agent.

Any Screen Time offer must wait until its exact active route and first-value contract are verified
for this release. Do not add illustrative breadth to live mode just to make the montage look more
impressive.

## Release Stages

### Stage 1: Local isolated build

**Audience:** Andrew and invited observers using a development build.

**Entry:** Dev Tools only.

**What it tests:**

- whether the scene grammar is understandable at the intended pace;
- whether Stage, Then Settle feels like product orientation rather than an advertisement;
- whether tapping during a scene is discoverable;
- whether the settle preserves continuity;
- whether the task copy is specific enough;
- whether reduced motion and screen-reader behavior remain complete; and
- whether the sequence can replay without affecting current onboarding or user data.

**Exit gate:** The interaction is coherent enough to put in an internal TestFlight build. No
decision about default first-run follows from this stage.

### Stage 2: Production-hidden internal TestFlight

**Audience:** A small allowlist of internal testers and deliberately recruited concept-test
participants.

**Entry:** Remote flag plus a hidden **Kwilt Labs** route. The flag defaults off.

**What it tests:**

- real-device pacing, touch behavior, layout, performance, and accessibility;
- whether people can state several different things Kwilt can help with after one viewing;
- whether they can choose a personally relevant starting task without explanation;
- whether their expected next step matches the task label;
- whether live offers route to the correct native destination; and
- whether the experience still feels like one Kwilt on a signed build.

**Exit gate:** Portfolio comprehension and live routing are both promising, and no current
onboarding state, permissions, or native data changed merely from opening or replaying the lab.

### Stage 3: Fresh-account internal first-run variant

**Audience:** Fresh test accounts explicitly assigned to the variant. No ordinary production user.

**Entry:** A mutually exclusive first-run assignment resolved before the current FTUX auto-start
decision.

**What it tests:**

- whether the overture works without prior Kwilt knowledge;
- whether the selected task produces a better first-session direction than the current universal
  Goals path;
- whether **Something else** and **Look around Kwilt** preserve control;
- whether users understand that more exists without feeling expected to set it all up; and
- whether the current onboarding remains safely recoverable as the default or as the native Goals
  activation path.

**Technical guardrail:** If assignment is missing, late, invalid, or times out, the app runs the
current onboarding. The two full-screen experiences must never mount together or flash in
succession.

**Exit gate:** Only after this stage should Kwilt consider a small production experiment. That
decision requires a separate evaluate-learning review and a portfolio of real offers broad enough
to make the overture's promise truthful.

## Research Protocol

The test should measure comprehension and expected action, not whether people say the animation is
nice.

Give a participant the phone and say only:

> A friend told you Kwilt can help with everyday life. You downloaded it. Take a look and start
> wherever you would naturally start.

After they act, ask:

1. **What do you think Kwilt can help with?**
2. **What made you choose that starting point?**
3. **What did you expect to happen after you tapped it?**
4. **Was anything unclear, too fast, or unnecessary?**
5. **What would you look for if none of those choices fit?**

Do not explain the Avatar metaphor, name the capabilities in advance, or ask whether they “liked”
the experience before testing comprehension.

A small qualitative round of approximately five to eight people is enough to expose major scene,
pacing, and expectation failures. It is not enough for statistical claims about conversion.

## Buildable Slice

### Must be real

- A native overture stage and stable choice surface inside the actual Kwilt app.
- One deterministic, versioned portfolio composition of five or six beats.
- One deterministic live composition using only verified active offers.
- Shared task records powering both scenes and buttons.
- Immediate scene tap, **Choose now**, **Something else**, and **Look around Kwilt** behavior.
- A complete static/reduced-motion presentation.
- Development-only lab entry and replay.
- Production-hidden TestFlight entry controlled by an allowlisted remote flag.
- Separate learning-release events and state.
- Tests proving that preview and replay do not mutate current onboarding completion or pointers.
- Tests proving unavailable offers cannot enter live mode.

### Can be thin or temporary

- The portfolio and live compositions can be hand-curated from registered records.
- Example objects can be deterministic local illustration data.
- The first scene language can support only the primitives needed by the chosen composition.
- Portfolio-mode expectation feedback can remain local or use one bounded internal event.
- The selector can omit personalization and diversity scoring.
- Internal lab chrome can be utilitarian because it disappears during the experience.

### Intentionally excluded

- Replacing or rewriting `FirstTimeUxFlow`.
- Automatic production first-run assignment.
- New persistence migrations for universal orientation state.
- Remote AI-generated sequencing or task copy.
- A content-management system for offers.
- Bespoke video, sound, Lottie files, or capability-specific animation engines.
- Fake native destinations for future capabilities.
- Permissions, account connections, household setup, or paywalls merely for previewing the overture.
- A production announcement for new capabilities.

## Instrumentation

Collect only what changes a product decision:

- overture mode and composition version;
- started, chose-now, skipped-to-choices, replayed, or exited;
- last beat reached;
- selected offer ID and whether selection occurred during a beat or after settle;
- time from stable choices appearing to selection;
- expected-next-step response in internal portfolio research;
- native route opened for a live offer;
- first-value proof returned when the owning capability already exposes one; and
- Reduce Motion or screen-reader presentation used, without collecting sensitive accessibility
  details beyond what is needed to verify the alternate presentation.

Do not collect free-form life needs, transaction details, contacts, family details, or the content
of created objects for this test.

## Brand-Goodwill Guardrails

- Ordinary users continue receiving the current onboarding.
- Every flag and hidden route defaults off.
- Portfolio concept mode is never exposed as ordinary product onboarding.
- Live mode shows only promises the installed build can honor.
- The experience can always be skipped to stable choices.
- No model, network request, permission, or account connection is required to render orientation.
- Opening or replaying the lab changes no onboarding, capability, or notification state.
- Exact deep links and existing data continue to outrank generic orientation.
- The test never celebrates a setup or result that did not occur.

## Reversibility

The first two stages are removed or disabled by deleting the internal route or turning off the
remote flag. They create no domain objects and do not alter existing onboarding state.

The fresh-account internal variant remains separately gated. Turning it off returns every future
session to the current onboarding decision. Because overture exposure is not stored as
`hasCompletedFirstTimeOnboarding`, a failed or abandoned variant cannot strand the account in a
false globally completed state.

Any later persistent orientation record must be additive and separately versioned. It must not
reuse the current global FTUX completion flag.

## Permanent Product Threshold

Do not replace current onboarding by default until:

- people can name several materially different forms of help after one short viewing;
- most participants choose a task without facilitator explanation;
- the task label creates the correct expectation of the next native step;
- the experience works at real-device speed and with reduced motion or a screen reader;
- live task selections reliably reach authoritative capability value;
- the active portfolio is broad enough that the overture truthfully represents Kwilt as a suite;
- exact-route, returning-user, and failure fallbacks are proven; and
- the current Goals-and-Arc journey remains available as an excellent native activation path for
  people who choose that kind of help.

## Recommendation

Build and evaluate **Stage 1: Local isolated build** first. It can answer the highest-risk visual
and comprehension questions while leaving every automatic onboarding condition untouched.

If it succeeds, graduate the same code to a production-hidden internal TestFlight route. Do not
begin by placing the overture in front of new users, even behind a broad experiment flag.
