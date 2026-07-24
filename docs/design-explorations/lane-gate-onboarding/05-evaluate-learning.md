# Evaluate Learning: lane-gate-onboarding

## Learning questions

1. Does starting from a budget sentence make setup easier to understand?
2. Does seeing the meter before app controls build enough trust?
3. Can the user create one budget without feeling they are building a budget system?
4. Does the final rule summary correctly predict the live behavior?
5. Does FamilyControls selection feel like choosing apps/sites, not configuring restrictions?
6. Does the first review rehearsal teach the loop?
7. Is Plaid needed during first setup, or is it better as a follow-up after the gate is felt?

## Evidence to collect

- Time to create first lane.
- Whether user chooses Plaid or manual/dev spend first.
- Setup step where confusion occurs.
- Whether the user edits the rule summary before activation.
- Whether the user can explain the rule in one sentence.
- Whether the user can deactivate the rule without help.
- Native device behavior for selected app/site shields.
- Review unlock success/failure.

## Pass criteria

- User creates one lane with name, amount, and period.
- User selects at least one app/site target.
- Final summary names the lane, app/site, and unlock window.
- Active rule can be loaded by the review screen.
- Review event can unlock the selected target in native/dev validation or simulated validation.
- User understands how to turn the rule off.

## Fail signals

- User thinks they are setting up parental controls.
- User thinks bank connection is required before understanding the product.
- User asks why an app is blocked.
- User cannot tell which meter will appear before which app.
- Setup feels like budgeting homework.
- Apple permission language causes abandonment before the rule is understood.

## Decision points after evaluation

- If setup feels heavy: move to demo-first rehearsal before permissions.
- If users want immediate blocking: offer app controls immediately after lane creation.
- If Plaid feels too early: make manual/dev meter setup the default and invite bank connection later.
- If app token selection is confusing: wrap FamilyControls picker with more concrete pre/post copy.
- If users distrust inferred spend: add a small match explanation before activation.
