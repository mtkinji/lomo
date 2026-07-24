# Yes-And: Budget Amount Adjustment

Original idea: make the `Monthly amount` visible in Category settings actionable, while deciding whether the actual edit belongs locally, globally, or in a plan-aware flow.

**Yes, and what if it could start from the category but show the whole-plan effect?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: moves from isolated amount editing to consequence-aware plan maintenance.
- New value: Maya can change Housing without wondering whether the rest of the plan still works.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the impact is one plain sentence, not a spreadsheet.

**Yes, and what if the current amount had a source receipt?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: helps the user understand whether she is correcting her own number, a starter template, a bill, or history.
- New value: the change feels like editing a known assumption instead of fighting a black box.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the receipt is compact and factual.

**Yes, and what if global planning appears only when the local change needs it?**

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: keeps simple corrections simple while still respecting plan balance.
- New value: a $25 correction can stay focused; a $400 increase can invite a fuller review.
- Cost delta vs. original: medium
- Anti-pattern check: pass if escalation is contextual, not a nag.

**Yes, and what if the user can save a deliberate over-target plan?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: preserves agency instead of pretending the app knows the family's constraints.
- New value: Kwilt can say the plan is over target without blocking reality.
- Cost delta vs. original: low-medium
- Anti-pattern check: pass if the save action is plain and reversible.

**Yes, and what if temporary month changes stay separate from the base amount?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: prevents one unusual month from corrupting the regular plan.
- New value: school supplies, repairs, travel, and annual bills can be handled without changing the normal category amount.
- Cost delta vs. original: high
- Anti-pattern check: pass later; too much for the first release.

**Yes, and what if the affordance teaches the product model?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the UI can show that category amounts are part of a plan without requiring a finance lesson.
- New value: `Monthly amount` becomes a reference plus a doorway, not a dead label.
- Cost delta vs. original: low
- Anti-pattern check: pass if the row label stays literal.

## Job elevation
The bigger job is not "change a budget amount." It is "keep one category and the whole monthly plan true at the same time."

## Frame recommendation
Run the design loop with an expanded frame: the entry point can live in Category settings, but the edit interaction should be a plan-aware `Adjust amount` flow with a visible whole-plan consequence and an optional route to full plan review.
