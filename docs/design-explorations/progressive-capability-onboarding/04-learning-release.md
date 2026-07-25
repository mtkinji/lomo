# Learning Release: Agent-Hosted Context-First Entry

> **Status: Paused; do not implement.** The broader product point of view in
> [04a-suite-onboarding-point-of-view.md](04a-suite-onboarding-point-of-view.md) reopens the
> convergence. This remains a useful record of the narrower task-router slice, not the current
> build recommendation.

## Concept To Build

New, unscoped users enter Kwilt through an Agent-hosted starting state that offers two concrete
tasks they can begin with one tap, plus a composer for anything else and a direct path into the
Kwilt shell.

The learning release is not a miniature catalog. It tests whether Agent can be the coherent front
door while native capabilities still own setup, permission, mutation, and first value.

## Capability Delta

Today, the user cannot:

- enter Kwilt through a non-Goals task without first encountering Goals-shaped onboarding;
- see a useful Agent starting state without deciding what to type;
- begin a permission-free task and a permission-led task through one shared entry contract;
- follow an exact external task link without the global onboarding flow competing for attention;
- decline Screen Time authorization and continue into the rest of Kwilt without being treated as
  globally unfinished.

After this release, the user can:

- land in Agent after authentication and see **Add a to-do** and **Choose apps to block while I
  focus** immediately;
- tap **Add a to-do**, enter the native Activities canvas with Quick Add ready, save a real
  Activity, and see it in the normal inventory;
- tap **Choose apps to block while I focus**, enter the existing Screen Time Controls setup with
  the Focus intent, and grant Screen Time access only there;
- choose **Something else** and use the normal Agent composer;
- choose **Look around Kwilt** and enter the real shell without completing a capability setup;
- follow an exact **Add a to-do** deep link directly to native Quick Add without seeing Agent or
  the old Goals onboarding sequence.

Still intentionally not supported:

- a full task catalog or task search;
- Money, Games, Stories, family Screen Time, household creation, or any capability not currently
  present with a truthful native result in this checkout;
- behavioral personalization, inferred family identity, or next-best-capability ranking;
- cross-capability recommendations after first value;
- a generic capability resume engine;
- migrating every existing onboarding, coachmark, or capability-introduction flag;
- asking for notifications, location, calendar, photos, microphone, contacts, or any other
  permission during global entry;
- allowing Agent to claim a task completed before the native capability reports the result.

## User Experience

### Entry eligibility

The release affects only a feature-flagged, new, unscoped account:

1. Kwilt restores or authenticates the account.
2. Returning users with existing value continue to their current useful destination or shell.
3. Exact deep links continue to their destination.
4. A new user with no exact route enters the durable `UnifiedChat` surface.
5. The Agent surface presents the starting-task state before requiring a message.

No permission screen appears between authentication and Agent. The current global notification
step and Goal+Arc requirement are bypassed only for the flagged cohort; the existing experience
remains the control and rollback path.

### Agent starting state

The first state says:

> What do you want to do first?

It contains exactly four actions:

1. **Add a to-do**
2. **Choose apps to block while I focus**
3. **Something else**
4. **Look around Kwilt**

The first two are host-owned deterministic routes, not prompts sent to the model. **Something
else** reveals or focuses the existing Agent composer. **Look around Kwilt** opens the normal
Option G shell.

The state should look like the beginning of Agent, not an onboarding carousel: no progress count,
capability labels, illustrations explaining the product, recommended badges, or success modal.

### Task A: Add a to-do

```text
Agent starting state
  -> Add a to-do
    -> Activities canvas with Quick Add focused
      -> enter title
        -> save
          -> durable Activity appears in the normal inventory
```

This path asks for no device permission. Optional AI enrichment, reminder, location, attachment,
sharing, and scheduling remain ordinary native choices and retain their existing approval rules.
The minimum first-value event is the owning Activity store confirming a durable Activity that is
visible in the inventory.

### Task B: Choose apps to block while I focus

```text
Agent starting state
  -> Choose apps to block while I focus
    -> Screen Time Controls with setupIntent=focus_sessions
      -> explain what Kwilt will block and where choices remain
        -> request Screen Time authorization
          -> choose apps or categories
            -> enable Focus rule
              -> Screen Time Controls shows the saved active state
```

The native Screen Time Controls flow owns authorization, app/category selection, rule selection,
denial, recovery, and completion. Agent does not preflight or mirror those states. The minimum
first-value event is an approved authorization plus at least one selected target and the Focus
Protection rule enabled. Because this requires Apple authorization, simulator navigation is not
permission or enforcement proof.

If the user declines or exits, Kwilt returns them to Agent or the shell without marking Screen Time
active and without replaying global onboarding. Recovery remains in Screen Time Controls.

### Exact-route bypass

The release adds an exact task route equivalent to:

```text
kwilt://today?openQuickAdd=1&source=progressive-entry-proof
```

After authentication, that route opens native Activities Quick Add directly. It does not show the
Agent starting state, request global permission, or create an Agent turn. This is the proof that
Agent is the default for unscoped arrival rather than a mandatory interstitial.

## Existing Product Relationship

This release enhances existing surfaces rather than introducing a new onboarding destination:

- `UnifiedChat` becomes the host for unscoped entry.
- The native Activities canvas and existing Quick Add remain the To-dos first-value surface.
- `SettingsScreenTimeProtection` remains the sole owner of Screen Time authorization and setup.
- Option G remains the real capability map behind **Look around Kwilt**.
- Existing authentication, account restoration, capability data models, mutation receipts, and
  navigation ownership remain intact.
- Goal+Arc creation remains available as Goals activation; it is simply absent from this two-task
  learning slice.

The current `FirstTimeUxFlow` and `ReturningUserPermissionsFlow` are not deleted in this release.
The feature-flagged entry resolver bypasses them for the learning cohort so the concept can be
tested reversibly before those flows are decomposed.

## Buildable Slice

### Must be real

- A PostHog-backed feature flag, provisionally `progressive-capability-entry-v1`, that can target
  Andrew's account and default off when flags are unavailable.
- A deterministic entry resolver with tested precedence: exact route, returning/existing value,
  flagged new unscoped entry, then current fallback behavior.
- A separate versioned global-orientation state for the flagged path; do not redefine every
  capability's setup status through `hasCompletedFirstTimeOnboarding`.
- An Agent-hosted native starting-task state that renders even when model inference is unavailable.
- The four actions and exact copy listed above.
- Native routing from **Add a to-do** to Activities with Quick Add focused.
- Native routing from **Choose apps to block while I focus** to
  `SettingsScreenTimeProtection` with `setupIntent: 'focus_sessions'` and an Agent-entry source for
  truthful analytics.
- **Something else** exposing the current durable Agent composer without sending a synthetic user
  message.
- **Look around Kwilt** entering the normal shell and recording global orientation without
  activating a capability.
- `openQuickAdd` support in the canonical Activities route and linking configuration so the exact
  deep link bypass is genuine.
- A no-model fallback in which the two task routes and **Look around Kwilt** still work.
- Screen-reader labels, Dynamic Type behavior, and keyboard/focus behavior for the starting state.
- Focused analytics that record routing and native outcome boundaries without recording task text
  or permission contents.
- Signed simulator proof for both routes, To-do persistence after reload, Agent composer access,
  shell escape, and global-notification absence.
- Signed physical-device or internal TestFlight proof for Screen Time authorization, target
  selection, saved Focus Protection state, denial, and return. Simulator proof alone cannot close
  this boundary.

### Can be thin or temporary

- Only two starting tasks.
- A simple host-owned vertical action list using existing Agent and button primitives.
- Andrew-only feature-flag targeting.
- One orientation version and one entry-source field rather than a complete shared activation
  registry.
- Manual reset controls in Dev Tools for repeated first-entry evaluation.
- A compact inline unavailable state for Agent inference while deterministic task routes remain
  active.
- Manual observation notes in addition to the minimum analytics events.

### Intentionally excluded

- New capability home screens, onboarding hubs, setup dashboards, completion percentages, badges,
  or capability marketplaces.
- A remotely authored task catalog.
- Ranking, personalization, experimentation across task wording, or passive behavior inference.
- Cross-capability permission preflight or a global permissions page.
- A new Agent mutation path for either task.
- A parallel Screen Time setup implementation inside Agent.
- Family Screen Time or child-device policy claims.
- Production-default migration of existing users.
- Deleting the old onboarding flows before the learning decision.

## Release Channel

Use an **internal TestFlight build for Andrew-only dogfooding**, guarded by
`progressive-capability-entry-v1` and preceded by signed-simulator verification.

This channel is necessary because the second task's authorization and native app/category picker
cannot be truthfully evaluated in the simulator. The flag keeps the changed first-run model away
from ordinary users while preserving realistic account restoration, cold start, deep-link, native
permission, reload, and return behavior.

The release is not production-default and should not be described publicly as the new onboarding
until the learning criteria are met.

## Brand-Goodwill Guardrails

- The user sees actions, not capability marketing or life-improvement promises.
- Agent never requires a composed prompt to begin either offered task.
- Offered tasks are available and produce the named native result in the tested build.
- No permission is requested before the selected task establishes why it is needed.
- The Screen Time prompt is preceded by the existing capability explanation and followed by a
  truthful saved or declined state.
- Declining Screen Time never blocks **Add a to-do**, Agent, or the rest of Kwilt.
- Exact routes do not pass through a redundant Agent or onboarding screen.
- The model is not invoked merely to render or select a starting task.
- Agent never reports completion from navigation alone; only the capability-owned result counts.
- Existing users are not replayed through the experiment.
- **Look around Kwilt** is always visible and does not imply failure or skipping something
  required.
- No celebration, paywall, notification prompt, or adjacent-capability suggestion competes with
  the first native result.

## Reversibility

Turning off `progressive-capability-entry-v1` restores the current entry behavior without deleting
or transforming capability data. The experiment adds no parallel Activity, Screen Time, Agent, or
permission model.

The versioned orientation field is additive and ignored by the control path. Deep-link
`openQuickAdd` remains a useful, backward-compatible task affordance even if the experiment is
retired. Agent starting-task presentation can be removed without affecting created Activities or
Screen Time settings because those remain capability-owned.

Do not migrate or delete `hasCompletedFirstTimeOnboarding`, notification preferences, Goal+Arc
state, or returning-user flags during this release. Those changes become appropriate only after
the product model survives evaluation.

## Permanent Product Threshold

Promote Agent-hosted context-first entry into the accepted onboarding model only when the real
bundle demonstrates all of the following:

- a new unscoped user understands the two actions without needing capability explanations;
- the user can begin either action with one tap and can use **Something else** without confusion;
- the To-do path produces a durable Activity and never asks for unrelated permission;
- the Screen Time path asks permission only inside its native setup and accurately handles approve,
  deny, exit, return, and saved-state cases;
- **Look around Kwilt** and exact deep links preserve autonomy and bypass behavior;
- Agent or model unavailability does not disable deterministic tasks;
- no route claims value before its capability-owned result exists;
- existing users remain undisrupted;
- Andrew prefers this entry over the current Goals-shaped sequence across repeated cold-start,
  interrupted, and return scenarios.

If those conditions fail, revise the Agent starting state, task language, or routing boundary before
expanding task coverage. Do not respond by adding a tour, more tasks, global permissions, or
behavioral personalization.
