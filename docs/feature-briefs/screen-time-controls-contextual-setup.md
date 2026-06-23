---
id: brief-screen-time-controls-contextual-setup
title: Screen Time Controls Contextual Setup
status: draft
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-move-the-few-things-that-matter, jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-focus-protection, brief-meaningful-first-app-access]
owner: andrew
last_updated: 2026-06-20
---

# Screen Time Controls Contextual Setup

## Context

Kwilt now has one Screen Time-backed settings surface for app blocking: **Settings > Screen Time Controls**. The feature should not feel like a separate productivity system. It should help users do what matters first by blocking selected apps until a real step is done, or while Focus is running.

## Target audience

`audience-burned-out-productivity-power-users` needs practical support for moving the few things that matter without maintaining another system. Screen Time Controls matter because the user may want help before a Focus Session, before opening a distracting app, or before a scheduled to-do starts.

## Representative persona

Marcus wants a self-authored guardrail, not moralizing copy or profile management. He should feel that Kwilt is helping him protect the person he is trying to become, while keeping setup optional, local, and reversible.

## Aspirational design challenge

How might we help Marcus put real goals, to-dos, and identity-backed work before distracting apps, while preserving one simple Screen Time Controls setup flow?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` is the demand spine. The setup offer exists to make the first useful action easier than the first drift.

## Job flow step

`job-flow-marcus-move-the-few-things-that-matter` names "Decide what to do next" as an underserved step. Contextual setup offers improve that moment by offering device-level support when intent is fresh, without forcing setup during onboarding.

## JTBD framing

Screen Time Controls serves `jtbd-put-intention-before-impulse` by making distracting apps wait until the user takes a real step. It serves `jtbd-carry-intentions-into-action` by applying the same control during Focus Sessions. It serves `jtbd-trust-this-app-with-my-life` by staying explicit, local, optional, and easy to change.

## Design

Canonical IA:

```text
Settings > Screen Time Controls
Choose when selected apps are blocked.
```

Shared setup promise:

```text
Do what matters first.
Block selected apps until you take a real step.
```

A real step can be completing a to-do, recording progress, or finishing Focus.

The setup flow is shared for every entry point and is presented as a guided sequence after the user taps a setup CTA. The first-time setup surface should not expose the final settings panel all at once.

1. Explain the value.
2. Allow Screen Time.
3. Choose apps.
4. Choose when selected apps are blocked.
5. Done.

Setup intents only change entry copy, default rules, and analytics. They do not create separate adult, teen, parent, Focus Protection, or Meaningful First setup flows.

Supported setup intents:

- `focus_sessions`
- `meaningful_first_self_control`
- `meaningful_first_pattern_building`
- `meaningful_first_parent_guided`
- `settings_discovery`

Supported surfaces:

- `settings`
- `focus_drawer`
- `focus_completion`
- `today`
- `plan`
- `activity_detail`
- `scheduled_activity`
- `notification`

Default rules:

- Focus drawer entries default to `While Focus is running`.
- Self-control, pattern-building, parent-guided, and scheduled-activity entries default to `Until I take a real step`.
- Settings discovery shows both choices without forcing a default.

After setup, **Settings > Screen Time Controls** becomes the management surface:

- Show whether Screen Time Controls are on.
- Show the current blocked-app/category count.
- Provide an explicit `Edit` action for changing blocked apps or categories.
- Preserve existing blocking rules when the user edits the app list later.
- If the user removes every blocked app/category, keep the rules visible but inactive until apps are selected again.

Primary contextual offer:

```text
Fewer distractions during Focus.
Block selected apps while Focus runs.
Set Up
```

This appears in the Focus drawer before session start and must not block the Start button.

Weekly setup-offer notification:

```text
Do what matters first
Block selected apps until you take a real step.
```

It is scheduled only when notifications are already authorized, the user is eligible, and no setup notification has been scheduled in the last week.

## Success signal

The primary success signal is activation: a meaningful share of eligible users enable Screen Time Controls because the offer appears in the right moment and the setup is short enough to complete.

Primary metrics:

- `screen_time_setup_offer_shown`
- `screen_time_setup_offer_cta_tapped`
- `screen_time_setup_started`
- `screen_time_setup_completed`
- Screen Time Controls enabled rate

Secondary metrics:

- `screen_time_setup_offer_dismissed`
- `screen_time_setup_abandoned`
- `screen_time_setup_notification_scheduled`
- `screen_time_setup_notification_opened`
- protected Focus starts
- real-step unlocks

## Open questions

- Which non-Focus surfaces should ship first beyond Settings, Focus drawer, Focus completion, and notification?
- Should parent-supported setup get dedicated in-app education later, or remain a local settings entry indefinitely?
- What threshold best predicts self-control intent: two local progress days, scheduled work, or a different signal?
