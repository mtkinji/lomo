# Yes-And: lane-gate-onboarding

Original idea: define onboarding that starts with budget setup, then lets the user add transaction matching and app controls after the lane exists.

**Yes, and what if it could...** start from the spending app instead of the budget category.

- Serves: `jtbd-put-intention-before-impulse`
- Job elevation: the user begins with the impulse moment they already recognize.
- New value: "I want a pause before DoorDash" naturally creates a `Takeout` lane.
- Cost delta vs. original: low
- Anti-pattern check: pass if the app still lets users rename/refine the lane.

Decision: keep this as a shortcut for later, not the default first-run path.

**Yes, and what if it could...** start from the lane instead of the app.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: the user names the spending context in household language.
- New value: `Shopping at $100/month` can later map to Amazon, Target, or a card account over time.
- Cost delta vs. original: low
- Anti-pattern check: pass if setup does not become a broad budgeting exercise.

**Yes, and what if it could...** infer transaction matches immediately after account connection.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the meter becomes real quickly while still showing why transactions were suggested.
- New value: setup can end with a believable meter, not an empty shell.
- Cost delta vs. original: medium
- Anti-pattern check: pass if suggestions are editable; fail if silent assignment hides uncertainty.

**Yes, and what if it could...** make the FamilyControls selection feel like "choose what waits behind this meter."

- Serves: `jtbd-put-intention-before-impulse`
- Job elevation: app selection becomes part of the user's intention, not a technical permission step.
- New value: the app gate rule is understandable: "Show Takeout before DoorDash opens."
- Cost delta vs. original: medium
- Anti-pattern check: pass if Apple permission copy is framed calmly and reversibly.

**Yes, and what if it could...** support a two-stage setup: soft meter now, gate later.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the user can build trust before granting app-restriction permissions.
- New value: the flow can recover if FamilyControls setup fails or feels too heavy.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the app does not hide that the gate is incomplete.

**Yes, and what if it could...** generate a plain rule summary before activation.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the user sees exactly what will happen before any app is shielded.
- New value: "Before Amazon opens, show Amazon household. After review, open for 15 minutes."
- Cost delta vs. original: low
- Anti-pattern check: pass if the summary is editable and not legalistic.

## Frame recommendation

Run the loop with the expanded frame: `budget-first lane setup`.

The user is not setting up three features. They are creating one budget: "shopping at $100/month." Transaction matching and app controls are follow-on ways to make that budget easier to keep.
