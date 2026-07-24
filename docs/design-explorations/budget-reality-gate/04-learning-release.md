# Learning Release: budget-reality-gate

## Concept To Build

Kwilt Money shows the meter mapped to a spend-triggering app before that app
opens, then lets the user either open it for now or leave it blocked.

## Capability Delta

Today, the user cannot:

- Configure or experience a real app access pause based on the relevant budget meter.
- Record an intentional "leave blocked" outcome.
- Use review history as transparent proof of why access changed.

After this release, the user can:

- Review the mapped budget meter before the selected target opens.
- Choose `Open for now` or `Leave blocked`.
- See recent review outcomes.

Still intentionally not supported:

- Bank integrations.
- Automatic category matching.
- Shared household access.
- Advanced management for many lanes and targets.
- AI advice or coaching.

## User Experience

Maya encounters the feature through a single setup path and the review screen.
The happy path:

1. She sees meters such as `Takeout`, `Amazon household`, and `Amazon work`.
2. She maps a target app/site to a meter, such as DoorDash to `Takeout`.
3. When DoorDash access is requested, Kwilt Money shows the mapped meter.
4. The meter shows percent used, remaining dollars, and pace.
5. She chooses `Open for now` or `Leave blocked`.
6. The app records the outcome.
7. If opened, the future Screen Time adapter grants a short access window.

## Existing Product Relationship

This enhances the existing home meter, review screen, and
`BudgetReviewEvent`. It does not replace broader Kwilt mobile Activities,
Goals, or Focus features. It borrows the same philosophy: a chosen action before
an easy drift app.

## Buildable Slice

Must be real:

- Local scaffolded persona/JTBD/job-flow docs.
- Persisted budget meters/lanes.
- Persisted app gate targets.
- One active app-to-meter rule for the first learning slice.
- Two review outcomes.
- Persisted review event history.
- A Screen Time adapter boundary, even if the local/dev build simulates unlock.

Can be thin or temporary:

- Manual meter values.
- A small number of target apps.
- Local-only setup copy.
- Simulated Screen Time unlock in early local builds.

Intentionally excluded from the very first interaction test:

- Smart categorization.
- Household invites.
- Multi-rule management.
- Notifications.

Required for the first serious learning release:

- Bank/card transaction ingestion through a provider abstraction.
- Plaid as the likely first sandbox implementation path.
- MX kept as the second provider candidate if enrichment, coverage, or commercial terms are better.

## Release Channel

Start with `Local build`, then move to `TestFlight build`.

Rationale: the behavior needs to be felt in a real app loop. Manual/fixture
values can test the gate interaction, but the first serious learning release
needs sandbox-backed or real transaction sync because the meter must be trusted
as current reality.

## Brand-Goodwill Guardrails

- Always explain what is blocked and why.
- Make setup explicit and reversible.
- Treat `Leave blocked` as a normal choice.
- Avoid shame, urgency badges, streaks, and compliance language.
- Be honest when budget data is manual or fixture-backed.

## Reversibility

The release can be disabled by hiding the target rule and ignoring
`budget_reviewed` unlock events. Persisted review history can remain as private
local/account history without affecting future access rules.

## Permanent Product Threshold

Promote this from learning release to accepted product capability when repeated
self-use or early TestFlight use shows that the review pause changes spending
app behavior without feeling punitive, confusing, or too much setup.
