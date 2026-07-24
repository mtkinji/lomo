---
id: brief-app-pause-sentence-builder
title: App Pause Sentence Builder
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: choose-intentional-access
serves: [jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-budget-reality-gate, brief-screen-time-controls]
owner: andrew
last_updated: 2026-07-07
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# App Pause Sentence Builder

## Context

The current app-pause setup surface is much more reductive than the first version, but it still behaves like a management page. It has a route/header naming mismatch, duplicate category title, spend-progress copy, setup status pills, an `Edit` mode, a `Rules` section, and a bottom CTA.

The product intent is simpler: for one budget category, the user should compose one pause rule in plain language.

## Job Delivery

- Job: `review-budget-reality-before-spending`
- Step: `choose-intentional-access`
- Current score: 3
- Expected delivery change: 3 -> 3 if this only improves setup clarity; do not raise score until simulator/device proof shows the app-pause setup and review traversal are easier.
- Evidence required: rendered simulator screenshots of no-app and selected-app states, plus a walkthrough from Budget Detail -> App pause -> choose apps -> readable saved sentence.
- Map update trigger: after runtime verification or explicit product decision that the inline sentence is the accepted setup model.

## Product Decision

Use `App pause` as the stable object name.

The App pause screen should be the rule builder itself:

```text
Pause [Choose apps] when:
```

Selected state:

```text
Pause [Amazon] when:
```

The conditions are inline toggle rows below the `when:` line, not a separate picker:

```text
On  Shopping has transactions to review
On  Shopping is near its limit
On  Shopping is over budget
Off Shopping has not been reviewed today
```

Conditions that need extra configuration disclose it inside the same row. For example, `Shopping is near its limit` shows `95% of budget` as quiet secondary text, and tapping the row expands `Pause when spending reaches [95%] of budget`.

Remove from the setup screen:

- `Shopping pauses` as title.
- duplicate `Shopping` header.
- spend-progress copy.
- status pills such as `Needs apps`.
- `Edit` button.
- `Rules` section.
- bottom `Choose apps to pause` CTA.

## Acceptance Criteria

- Budget Detail entry label and destination title both read `App pause`.
- Page header has no icon.
- The first viewport contains one primary sentence builder.
- The category appears only inside the sentence unless needed for navigation context.
- Missing app selection appears as a tappable `Choose apps` token.
- App token opens native app/category selection or the existing Screen Time setup path.
- Conditions appear as inline toggles under `when:`.
- Configurable conditions show their current setting as secondary text and expand inline.
- Existing policy persistence still saves enabled targets and conditions.
- Advanced settings do not dominate the first viewport.
- `npm run lint` passes.
- Simulator screenshot confirms the screen does not show a status dashboard or rule list.

## Spec Refinement

The default builder should use `when:` plus visible condition toggles, not the abstract phrase `needs attention`. This keeps the rule direct while avoiding a separate condition picker.

Screen Time wording should appear only when authorization or Apple's picker is directly involved. The main user-facing action is choosing apps to pause, not configuring Screen Time.

Do not update delivery score from this brief alone. This is a setup-model decision until runtime proof shows the traversal is easier.
