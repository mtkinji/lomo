# Origin-derived capability paths: commercial and activation frame

Status: proposed storyboards for review, not implemented or runtime verified.
Authority: extends the working journey map in `docs/feature-briefs/kwilt-first-run-onboarding.md`.
This is a continuation of the existing exploration, not a competing onboarding system.

Next review: [screen-by-screen storyboards and invitation study](09-capability-storyboards.md).

## Owner direction

Apply the reasoning and presentation developed for Money to Goals, Meals and
Screen Time. Goals and Meals are free entry paths. Advanced Screen Time can
monetize the connection to goals and money. Money setup must not be a prerequisite
for starting Screen Time.

## Frame and system alignment

Constraint posture: Fit the system. Preserve the accepted first-launch shoreline,
white choice invitation, iconed choice pills, anchored introductions, rounded
bottom actions, page transitions and slow grouped reveals. Do not reopen visual
direction or replicate Money's provider and purchase steps where they do not fit.

Audience: aspirational family organizers; representative persona Maya, arriving
with one immediate need. Marcus is a secondary stress case for Goals: do not
require learning a productivity system before taking one useful action.

User voice: When I choose the part of life I want help with, help me make one
useful change there without signing up for a project in another part of my life.

Serves: `jtbd-move-the-few-things-that-matter`,
`jtbd-carry-intentions-into-action`, `jtbd-put-intention-before-impulse`,
`jtbd-invite-the-right-people-in`, `jtbd-trust-this-app-with-my-life`.

The platform frame's underserved steps remain reaching a next doable action and
handing off into a useful capability. Completion of introductory screens is not
activation. No broad feature expansion is needed for this refinement.

## Evidence from the current system

- HouseholdStarterFlow exposes Money, Screen Time, Meals and Goals. Its current
  selection can show a quote before handing off; quote copy is not proof of real
  customer testimony and must not become fabricated social proof in new mocks.
- capabilityOnboardingNavigationTarget sends Screen Time to settings, Meals to
  RecipeLibrary with `onboarding: pick-meal`, and Goals to FirstTimeUx.
- PersonalScreenTimeRuleBuilderScreen owns Apple authorization, app selection,
  rule conditions, advanced-access checks and purchase resume intent.
- ScreenTimeProtectionSettingsScreen describes basic Focus/daily-use rules and
  advanced schedules, combinations, completed to-dos and Money.
- foodFirstCycleGuide already supports choose recipe → add to Plan → optional
  sharing → send to Groceries → review. Sharing can be skipped.
- The current Meals job flow describes a persistent shared Plan: household ideas
  and reactions, then a selected subset sent to Groceries. Do not force date or
  weekly-plan creation merely to match older onboarding documents.
- IdentityAspirationFlow creates Goals/Arcs and retains an Arc-limit call site,
  but the current `src/domain/limits.ts` policy always allows Arc and Goal
  creation. Do not mistake that legacy branch for an active purchase gate.
  This does not establish unlimited AI service usage.
- The app currently has a signed-in entry boundary. Later contextual sign-in is
  intended design, not proven guest persistence or a permission dependency.

## Shared pattern: jobs, not identical page counts

1. Recognize the selected intent with one relevant promise/invitation.
2. Ask only what changes the next action; skip questions answered by entry context.
3. Explain and request the permission, identity or paid access that action needs.
4. Help the person perform the smallest useful real action.
5. Reveal its real result; let them review or adjust before consequential changes.
6. Land in that useful state, with a natural reason to return.

Origin's lesson is deliberate progression from promise to credible personal value,
not a mandatory quiz, artificial analysis delay, or universal paywall position.
Forms and provider screens retain their own interaction contracts. Copy/results
can reveal in groups; do not disable actions until animation finishes. Returning,
screen-reader and reduced-motion paths bypass ornamental delays.

## Goals storyboard — free personal progress

- Invitation: establish that one aspiration can become a doable next step. No
  Pro offer and no list of the whole app's capabilities.
- Starting intent: accept the person's goal or aspiration; reuse the existing
  creation flow and avoid a second identity questionnaire before it.
- Clarification: ask only the missing information needed to make that goal useful.
  Allow direct/manual creation rather than making paid AI a hidden requirement.
- Review: show the proposed goal and actionable next step together. Editable,
  not silently committed; no guaranteed achievement claims.
- Save: use the actual persistence/identity boundary. If guest drafting is later
  supported, preserve the draft across sign-in; do not withhold an earned result.
- Arrival: open the saved goal and next action. Scheduling is an optional next
  action, not another mandatory onboarding screen.

GTM: acquire on achievable progress; retain through doing and revisiting the next
step. Introduce paid goal-linked app controls only when the person expresses a
distraction problem or elects that control. Free Goal creation remains complete
without it. Do not promise unlimited AI under the free capability label.

## Meals storyboard — free shared participation

- Invitation: emphasize that dinner ideas and decisions can be shared.
- First contribution: choose, save or import a real recipe through supported
  recipe entry. Do not begin with a preferences survey or Money setup.
- First result: add it to the living Plan and show the actual recipe in that Plan.
  This is useful even before another person joins.
- Participation invitation: offer supported household participation after there
  is something concrete to share. Explain the scope of access. Not now is a
  complete path; never wait for invitees before allowing progress.
- Practical payoff: let the person send chosen meals to Groceries and review the
  actual compiled ingredients. Keep this as the next useful action, not a forced
  requirement for everyone who arrived to gather meal ideas.
- Arrival: remain in the Plan or grocery list they just made, preserving context.

GTM: one organizer starts, other people contribute to a useful shared artifact.
Retention is adding ideas, choosing meals and using the resulting list. Household
participation is an invitation, not a forced referral gate. Budget awareness is a
later optional connection; neither Money nor retailer linking gates this loop.

## Screen Time storyboard — useful alone, stronger with context

- Invitation: establish the personal or household benefit, not a generic Pro ad.
- Scope: distinguish this person's device from a child's device only when the
  entry context has not already answered it. These are separate setup branches.
- Intent: lead with a basic daily-use or Focus rule. Make advanced goal/to-do and
  budget-linked options discoverable without making their setup mandatory.
- Basic branch: explain Apple access in context → authorize → select apps →
  choose supported rule parameters → review → save and verify delivery.
- Goal-linked branch: explain the existing real-step completion behavior, then
  offer Pro at the advanced-action boundary and resume. Audit the actual
  qualifying action before writing its final promise; do not invent a selector
  for an arbitrary goal or to-do. Reuse existing action context where supported.
- Budget-linked branch: reuse an existing eligible budget when available. If
  absent, explicitly explain the extra Money setup before the person commits;
  offer to continue to Money or use a basic rule instead. Do not open Plaid just
  because they chose Screen Time, and do not invent a manual budget substitute.
- Child branch: explain and guide actual household membership, caregiver role,
  device linking and native permission requirements. End at a truthful handoff
  if the child's device is absent; a saved draft is not an enforced rule.
- Arrival: show the saved rule, applicable apps and actual delivery state. Show
  pending/permission-needed state if enforcement has not been confirmed.

GTM: free basic value earns trust; paid controls express why one app spanning
intentions and money is useful. The offer is attached to an explicitly chosen
advanced behavior, not to entering Screen Time. Pro purchase does not create
missing budgets, goals, permissions or linked devices. Preserve the unfinished
rule across purchase, cancellation, dependency setup and return.

## Alternatives and recommended bet

- Universal paywall immediately after path choice: easy to standardize, but
  contradicts free Goals/Meals and makes Screen Time's basic value inaccessible.
- Complete every free setup, then always show an offer: value comes first, but
  an unrelated interruption can spoil the result and confuse what was free.
- Intent-specific commitment boundaries (recommended): consistent visual and
  narrative grammar; authentication and monetization only where the selected
  action requires them. More resume-state work, less irrelevant setup.

Bet: people who reach a useful free result will return and understand contextual
Pro controls better than people pushed through a generic subscription funnel.
Measure result creation/use and returns, not merely screen completion or offers
viewed. Measure advanced intent → offer → confirmed entitlement → working rule.

## Acceptance and unresolved decisions

- Goals and Meals must reach first useful value without a purchase screen.
- Basic Screen Time must be reachable without Money, a budget or a goal.
- Selecting budget-linked controls must disclose the Money dependency and allow
  backing out without losing the standalone Screen Time path.
- Goal-linked copy must match the actual supported trigger; verify evaluation
  semantics before any mock claims whole-goal completion tracking.
- Reconcile current free limits/AI allowance and advanced/family feature flags
  with the owner direction; do not silently change entitlements in this design pass.
- Personal and child-device activation evidence must remain separate.
- No screen count, final copy, mock or native implementation is approved by this
  document. Next: reviewed path-specific storyboards/mocks using the accepted
  shared page pattern, including denied permission, declined purchase and missing
  dependency states. Existing auth constraints must be visible in that handoff.

No app code, monetization configuration, purchases or runtime state changed in
this framing pass. The Money Sandbox check remains separately incomplete.
