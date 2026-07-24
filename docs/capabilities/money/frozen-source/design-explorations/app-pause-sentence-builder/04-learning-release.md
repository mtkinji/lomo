# Learning Release: app-pause-sentence-builder

## Concept To Build

The App pause screen becomes one inline rule builder for the current budget category: `Pause [apps] when:` followed by toggleable conditions.

## Capability Delta

Today, the user cannot:

- Compose the app-pause rule directly.
- Pick apps from the rule itself.
- Avoid duplicate headers, rule cards, status pills, and an Edit mode.

After this release, the user can:

- Open `App pause` and immediately see the one rule.
- Tap `Choose apps` inside the sentence to select apps/categories.
- Toggle pause conditions directly below the `when:` line.
- Expand configurable conditions inline, such as changing the near-limit threshold.
- Leave the screen with a saved, readable pause rule.

Still intentionally not supported:

- Multiple rule cards per budget.
- Budget spend status on this setup screen.
- Full Screen Time diagnostics.
- Signed-device proof of actual shielding.

## User Experience

Entry label from Budget Detail: `App pause`.

Page title: `App pause`.

Initial no-app state:

```text
Pause [Choose apps] when:

On  Shopping has transactions to review
On  Shopping is near its limit
On  Shopping is over budget
Off Shopping has not been reviewed today
```

After app selection:

```text
Pause [Amazon] when:

On  Shopping has transactions to review
On  Shopping is near its limit
On  Shopping is over budget
Off Shopping has not been reviewed today
```

The condition rows toggle on or off in place. Rows that need settings show the current setting as quiet secondary text and expand inline.

Advanced settings remain collapsed. If Screen Time access is missing after app selection, show a small inline authorization row below the sentence, not a persistent status pill.

## Existing Product Relationship

This replaces the current `Shopping pauses` management page and the drawer-first rule builder inside `app/app-control/[budgetId].tsx`. It leaves Budget Detail, the review screen, native Screen Time bridge, and Settings-level Screen Time Controls intact.

## Buildable Slice

Must be real:

- Menu label and page title both use `App pause`.
- No page-header icon.
- No duplicate category header.
- No spend-progress copy on this setup screen.
- No status pill for missing apps.
- No `Rules` section.
- No bottom `Choose apps to pause` CTA.
- App selection starts from the sentence token.
- Condition selection happens through inline toggles under `when:`.
- Existing policy persistence still works.
- `npm run lint` passes.
- Rendered simulator screenshot confirms the no-app and selected-app states.

Can be thin or temporary:

- The sentence token picker can reuse simple sheets before becoming fully polished.
- Advanced settings can stay collapsed or temporarily unavailable if the default review window remains valid.
- Native Screen Time authorization can still route to the existing setup flow when needed.

Excluded:

- Changing Screen Time native entitlements.
- Adding new analytics.
- Updating job-delivery score.
- Redesigning Review.

## Release Channel

`Local build` first, then TestFlight only after simulator screenshots confirm the screen no longer reads as a management page.

## Brand-Goodwill Guardrails

- Make missing inputs look like actions, not errors.
- Keep Screen Time wording out of the primary CTA.
- Do not make a household organizer parse conditions before selecting the app.
- Avoid shame, compliance, permission, and parental-control language.

## Reversibility

This is reversible by restoring the old summary/rule-card layout. Policy data does not need a migration because the same `AppControlPolicy` fields are reused.

## Permanent Product Threshold

Keep this direction if Andrew can complete first setup from the category screen without asking what the CTA means, why there is an Edit mode, or whether there are multiple rules.
