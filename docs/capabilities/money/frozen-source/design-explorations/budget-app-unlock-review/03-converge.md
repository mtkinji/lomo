# Converge: budget-app-unlock-review

## Scoring
| Alternative | Persona fit | System fit | Reductive strength | Learning value | Decision |
| --- | --- | --- | --- | --- | --- |
| Rule Board | Low | Medium | Low | Medium | Reject |
| Shield Deep Link To Review | Medium | High | Medium | High | Keep as fallback |
| Budget-Native Unlock Dock | High | Medium | High | High | Core interaction |
| Preset-First Setup + Budget-Native Unlock | High | Medium | High | High | Winner |

## Chosen alternative
**Preset-First Setup + Budget-Native Unlock.**

The app-blocking setup should use plain presets, while the actual unblock moment should happen on Budget Detail through a compact unlock dock.

## Capability delta
Today, the user cannot:
- understand app blocking as one simple task instead of a set of Screen Time rules,
- set a threshold such as 95% as a plain product choice,
- land on the budget itself and immediately unblock from there,
- tell whether `over_budget` is review-clearable or a hard stop.

After this concept ships, the user can:
- choose a simple preset for when an app waits behind a budget,
- hit a blocked app and land on the relevant budget,
- see the reason in one sentence,
- tap `Open <App> for now` or `Keep blocked`,
- trust that only the open outcome clears the shield for the configured window.

Still intentionally not possible:
- building arbitrary Boolean rule logic,
- configuring separate native selections per policy in the first slice,
- making recovery plans mandatory,
- turning app access into a reward celebration.

## Reductive design pass
Smallest elegant version:
- One app, one budget, one preset, one unlock dock.

Enhance instead of create:
- Enhance Budget Detail as the unlock surface.
- Keep `/review` as a fallback route or thin wrapper only if routing needs it.
- Keep Settings/App Controls for setup and debugging, not task completion.

Replace/collapse:
- Collapse condition chips into presets for normal users.
- Collapse review explanation into a single reason sentence.
- Collapse receipt copy into quiet state feedback.

Refuse to add:
- no new dashboard,
- no app-rule matrix,
- no celebratory unlock animation,
- no shame copy,
- no standalone "permission" language,
- no generic "Screen Time Controls" vocabulary in the blocked-app task.

What would feel like clutter:
- showing all active conditions when one plain reason is enough,
- putting threshold, pace, over-budget, and transaction-review controls on the unlock screen,
- asking the user to confirm twice.

## UI contract
The front-door sentence is:

**This app opens after you review this budget.**

The blocked-app budget task answers exactly four questions:

1. Why paused? `Amazon is paused because Shopping is at 95%.`
2. What do I need to do? `Review Shopping.`
3. What choice do I have? `Open Amazon for now` or `Keep blocked`.
4. What happens after? `Amazon is open for 20 min` or `Amazon stays blocked`.

## Activation path
Best activation moment: the first time a selected app is actually blocked.

Teaching posture: contextual and minimal. Setup should promise "Amazon waits behind Shopping when it matters." The blocked moment teaches the rest.

Natural adoption signal: the user can complete the unblock task without visiting settings, and can explain the feature as "it makes me check Shopping before Amazon opens."

## Accepted trade-offs
- The first polished slice prioritizes one clear budget-native unlock path over general rule composition.
- Advanced condition editing is demoted even though it is useful for development.
- Hard stops are not the default; most triggers are review-clearable for a short window.

## Rejected trade-offs
- Do not make Screen Time settings the hero surface.
- Do not treat every condition as a separate user-facing workflow.
- Do not require a recovery plan before the user has learned the simpler review pattern.

## System implications
- Add a threshold trigger type or threshold preset to the policy model.
- Add a distinction between review-clearable reasons and hard-stop reasons.
- Add route params/deep-link state so Budget Detail can render the unlock dock for a specific target app and active reason.
- Keep `BudgetReviewEvent` as the receipt model and ensure Screen Time freshness checks use `opened_for_now` only.
- Use native shield copy that deep links to the budget unlock task, not to a generic settings screen.

## Bet
We're betting that a budget-native unlock task will make app blocking feel like intentional access rather than punishment. If users still feel confused or controlled, revisit by simplifying setup further and testing whether the shield copy needs to name only the budget, not the trigger reason.

## Success signal
Maya can complete the flow from a blocked app to an open app in under one minute, can tell why the app was paused, and sometimes chooses `Keep blocked` without feeling like she failed.
