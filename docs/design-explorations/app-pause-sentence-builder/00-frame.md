# Frame: app-pause-sentence-builder

## What the user said

> 1. The menu button the user taps on and the name of this screen are different, which isn't ideal.
> 2. The Page header says Shopping Pauses, then below that we show another header with the category name "Shopping" which is redundant.
> 3. We are showing information I don't think the user needs here, including how much has been spent so far.
> 4. We show a "Needs apps" pill but why?
> 5. We show an "Edit" button, but users really shouldn't need to enter into an Edit mode, they should just show up here and make edits.
> 6. We have a "Rules" section but I thought we just had a single rule builder in sentence form and user just had to make choices within it?
> 7. This all brings us to the CTA for Choose apps to pause - which doesn't feel necessary if we improve the rule builder experience to where users will already be picking apps within it.

## Restated in user voice

When Maya is setting up a spending pause for one budget category, she wants to write the pause rule directly in plain language, so she can understand what will happen without navigating a settings page, status dashboard, or edit mode.

## Target audience

`audience-aspirational-family-organizers`: households trying to become more organized without adopting a finance or productivity methodology.

## Representative persona

Maya wants a calm guardrail before spend-triggering apps, not another control panel.

- Current situation: She is on a budget category and wants to connect that category to the app-open pause.
- What she is trying to do: make one understandable pause rule for the category.
- Emotional state or tension: app restrictions plus money can easily feel technical, punitive, or overbearing.
- What would make this feel wrong: duplicate headers, status pills that explain implementation state, a rules table, or an Edit mode before she has even made the rule.

## Hero anchor

`jtbd-put-intention-before-impulse` - the app should help Maya put one meaningful action before a drift app.

## Job flow step

Step: `choose-intentional-access`.

Current product offering: Budget Detail links to `App pauses`; the destination shows `Shopping pauses`, a category summary, status pills, a `Rules` list, and a bottom setup CTA. The core rule-builder exists only behind an `Edit` button.

Current score: `3/5` in the job-delivery map. The rehearsal path exists, but Screen Time proof and setup clarity remain weak.

Gap: The setup screen is still configuration-shaped. It should be the rule itself.

## Active anchors

- `jtbd-put-intention-before-impulse` - setup should make the app pause legible as one intentional sentence.
- `jtbd-carry-intentions-into-action` - the category intention must carry into a concrete app choice without hidden setup.
- `jtbd-trust-this-app-with-my-life` - money plus app access needs transparent, reversible behavior.
- `jtbd-review-budget-reality-before-spending` - the eventual review moment depends on a clear app-to-budget mapping.

## Friction we're addressing

The current screen makes Maya interpret structure before acting: title mismatch, duplicate category name, spend stats, status pills, rule cards, an edit button, and a bottom CTA. Those are each individually understandable, but together they make a simple pause rule feel like a settings system.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Existing surface: `app/app-control/[budgetId].tsx`.
- Existing entry point: Budget Detail `App pauses` row/menu entry.
- Existing domain model: `AppControlPolicy` supports targets, conditions, operators, hard-stop conditions, and review windows.
- Existing technical affordance: native Screen Time target selection happens through `presentScreenTimeActivityPicker`.
- Existing UX convention: page headers should be text-only, copy should be plain, and budget surfaces should avoid dashboard sprawl.

Constraints to preserve:

- Keep the rule tied to the current budget category.
- Keep the first learning slice narrow: one category screen, a small number of app targets, and existing policy persistence.
- Keep Screen Time as an implementation detail unless the user needs Apple authorization.
- Preserve reversibility and non-shaming copy.

Constraints we may challenge:

- The separate Screen Time controls screen should not be the primary setup experience for this job.
- The rule list/card model is likely unnecessary for the first one-category learning slice.
- `Edit` mode should be removed in favor of inline editing.

Design implication:

The destination screen should be a direct sentence builder: one title, one sentence, editable tokens, one persistence affordance, and optional advanced details. If the user needs apps, the sentence token should invite that action instead of a separate CTA.

## Aspirational design challenge

How might we help Maya compose one calm app pause rule for a budget category, while preserving the feeling that this is a chosen pause rather than a control panel?

## Out of scope

- Real signed-device Screen Time verification.
- Multiple independent rule groups per category.
- Full policy analytics, review history, or budget-spend explanation on this setup screen.
- Reworking the actual review screen.

## Open question

Should the first inline sentence support multiple app targets visibly, or collapse selected apps into one readable token such as `Amazon and Target`?

