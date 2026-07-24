# Diverge: budget-app-unlock-review

## Axis of variation
Rule-forward vs task-forward, and separate review route vs budget-native review.

## Alternative 1: Rule Board
The App Controls screen becomes the primary surface. Users configure each app's conditions with chips, thresholds, toggles, and unlock windows. When a block happens, the review route explains which rule fired.

Audience/persona fit: weak for Maya. It is powerful, but it asks her to manage the policy system before she feels the household benefit.

Design challenge answer: partially answers the need for explicitness, but not the need for task success to feel easy.

System-fit note: close to the current `app/screen-time-controls.tsx` shape, but risks turning the wedge into a settings dashboard.

Best when: Andrew needs to debug conditions during early development.

Fails when: a normal user just wants Amazon to wait behind Shopping.

Anti-pattern check: high risk of productivity-app voice and dashboard-for-its-own-sake.

## Alternative 2: Shield Deep Link To Review
The native shield takes the user to a focused `/review` screen. The screen names the budget, shows a compact meter, and offers `Open for now` or `Leave blocked`.

Audience/persona fit: decent. It gives Maya a short task and keeps her out of settings.

Design challenge answer: strong on task speed, weaker on "go to that budget" because the review can still feel like an interstitial detached from budget ownership.

System-fit note: uses the existing Review route with minimal code churn.

Best when: validating native shield -> app -> action plumbing quickly.

Fails when: the user wants confidence that she reviewed the real budget, not a generic gate screen.

Anti-pattern check: low dashboard risk, but could become a modal permission beat if copy is too abstract.

## Alternative 3: Budget-Native Unlock Dock
The blocked app deep links to the relevant Budget Detail page. A compact unlock dock appears near the meter: app label, reason, `Open for now`, and `Keep blocked`. The rest of the page remains available if Maya wants more context, but task success is in the first viewport.

Audience/persona fit: strongest. It turns the budget into the unlock surface and preserves agency.

Design challenge answer: directly answers "go to that budget and tap a button."

System-fit note: extends Budget Detail with a route-state unlock task, reuses `BudgetReviewEvent`, and keeps App Controls for setup only.

Best when: the product wants the clearest mental model.

Fails when: the Budget Detail page is too visually dense to keep the unlock task obvious.

Anti-pattern check: low risk if the dock remains compact and does not add a second dashboard.

## Alternative 4: Preset-First Setup + Budget-Native Unlock
Setup asks the user to choose a spending app and one preset: `Always review first`, `When hot`, `At 95%`, `When over`, or `Needs review`. The blocked-app moment still goes to Budget Detail with the unlock dock. Advanced rule chips exist only behind a secondary control.

Audience/persona fit: strongest for learning and long-term usability. Maya gets plain-language setup and plain-language unblock.

Design challenge answer: reduces both configuration and unblock complexity.

System-fit note: requires a small policy model extension for threshold presets and a UI refactor that demotes condition chips.

Best when: shipping a polished learning slice rather than only a technical rehearsal.

Fails when: presets hide a condition Andrew needs to debug; mitigate with an advanced/debug affordance in internal builds.

Anti-pattern check: lowest risk. It avoids dashboards, shame, streaks, forced commitment, and anthropomorphic coaching.
