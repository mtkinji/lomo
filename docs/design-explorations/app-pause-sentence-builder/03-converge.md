# Converge: app-pause-sentence-builder

## Qualitative scoring

| Alternative | Persona fit | JTBD fit | System fit | Blast radius | Notes |
| --- | --- | --- | --- | --- | --- |
| Inline Sentence Builder | High | High | Medium-high | Medium | Best match for the critique and the original rule-builder intent. |
| Two-Step Setup Sheet | Medium | Medium | High | Medium | Clear, but still setup-shaped. |
| Compact Rule Card | Medium | Medium | High | Low | Fast cleanup, but preserves the wrong object model. |
| Review-First Rehearsal | Medium-high | High | Medium | Medium-high | Useful later, but too much for this screen's first job. |

## Capability delta

Today, Maya cannot:

- Understand the app pause as one editable rule.
- Pick apps in the place where the rule is described.
- Tell why a status pill and bottom CTA exist before she has selected apps.
- Avoid an unnecessary `Edit` mode.

After this concept ships, Maya can:

- Open `App pause` from the category and immediately edit the sentence.
- Choose apps from the sentence token.
- Change the condition toggles directly under the sentence.
- Understand the current rule without a rules list, category summary, or status dashboard.

Still intentionally not supported:

- Multiple visible rule cards per category.
- Spend-progress analysis on the setup screen.
- Review history or proof receipts on this screen.
- Full Screen Time troubleshooting unless authorization is missing.

## Reductive design pass

Smallest elegant version:

- One route label: `App pause`.
- One header: `App pause`.
- One sentence start: `Pause [Choose apps] when:`
- One inline app-selection token that opens the native picker.
- One inline condition list with toggle rows.
- One collapsed advanced row for review window and hard stops.

Enhance existing feature instead of adding a new one:

- Keep `app/app-control/[budgetId].tsx`.
- Replace the summary plus rules layout with the sentence builder.
- Keep native Screen Time setup in the background; surface authorization only when required.

Remove:

- `Shopping pauses` as a screen title.
- The second `Shopping` header.
- `$0 of $200 - 0% used`.
- `Needs apps` status pill.
- `Edit` button and modal-first editing.
- `Rules` section and rule cards for the first learning slice.
- Bottom `Choose apps to pause` CTA.

Refuse to add:

- A separate help paragraph explaining Screen Time.
- A setup checklist.
- A second status model.
- New scoring or analytics language on this screen.

What would make this feel like clutter:

- Showing budget progress here.
- Showing all possible conditions as chips or cards outside the rule builder.
- Keeping a list of rules while also claiming the sentence is the rule.

## Chosen alternative

Choose `Inline Sentence Builder`.

This best fits the critique: the current screen still treats the app pause as a managed object. The better surface lets the user author the rule directly.

## Accepted trade-offs

- Accept a more custom interaction in exchange for a clearer product concept.
- Accept that multi-rule management is deferred.
- Accept that native Screen Time app selection may need a sheet/picker transition, but it should be launched from the `Choose apps` token.

## Rejected trade-offs

- Do not keep the rule list for future flexibility in the V1 learning slice.
- Do not preserve the bottom CTA as a fallback.
- Do not use status pills to explain missing inputs.
- Do not show spend progress on setup.

## System implications

- The menu label and route title should both be `App pause`.
- `screenTimeTargetLabels(...)` should feed the sentence token.
- `saveRuleDraft(...)` can persist changes from inline controls rather than a separate drawer save.
- The existing `RuleBuilderDrawer` can be retired or reduced to token pickers.
- The broader `screen-time-controls` route can remain for Settings, but it should not be the primary path for this job.

## Activation path

Maya reaches this from Shopping's budget detail. The screen shows the incomplete rule:

```text
Pause [Choose apps] when:

On  Shopping has transactions to review
On  Shopping is near its limit
On  Shopping is over budget
Off Shopping has not been reviewed today
```

Tapping `Choose apps` opens Apple's app/category picker. After selection, the sentence updates:

```text
Pause [Amazon] when:

On  Shopping has transactions to review
On  Shopping is near its limit
On  Shopping is over budget
Off Shopping has not been reviewed today
```

Tapping a condition toggles it on or off. If the condition needs more detail, the row expands inline. For example, `Shopping is near its limit` can show `95% of budget`, then expand to `Pause when spending reaches [95%] of budget`. That is enough for the first setup success. Advanced settings can stay collapsed.

## Stated bet

We're betting that the dominant blocker is object-model confusion: Maya needs to write one rule, not manage app-pause state. If this still does not land, revisit by making the setup a short guided two-step flow instead of an inline sentence.

## Success signal

Andrew can open the screen and explain the whole setup without pointing to labels outside the builder. In simulator, a no-app state has no separate CTA; the missing app token itself is the action.
