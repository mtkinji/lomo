# Frame: budget-app-unlock-review

## What the user said
> I want a workflow where an app is blocked until a user explicitly goes to that budget and taps a button to confirm they've reviewed the budget and they want to unblock the app(s). This would be in addition to other screen time controls, such as with the ability to block apps when over pace, block based on budget thresholds (e.g. when I reach 95% of my budget), and so forth.
>
> Our ability to be successful with this depends on our ability to communicate it clearly and make task success extremely easy.
>
> Run a design sprint to deliver this in an elegant way with a reductive UX/UI.

## Restated in user voice
When I try to open a spending app, do not make me manage rules or interpret a finance dashboard. Take me to the budget that matters, show me why access is paused, and give me one clean choice: open the app for now or keep it blocked.

## Target audience
`audience-aspirational-family-organizers`: households trying to become more organized without adopting a productivity methodology.

## Representative persona
Maya is a household lead who wants family spending to stay aligned with real constraints without turning everyday life into finance administration.

- Current situation: a spending app can be opened faster than the budget reality can be remembered.
- What she's trying to become/do: carry a household intention into the app-open moment.
- Emotional state or tension: she is willing to accept friction when it feels clarifying, not when it feels punitive or technical.
- What would make this feel wrong: rule jargon, parental-control language, shaming copy, or a screen that makes her do extra work before she understands the task.

## Hero anchor
`jtbd-put-intention-before-impulse` - spending apps should wait behind a calm, chosen review.

## Job flow step
`choose-intentional-access`

Current product offering: Budget Detail can link to App Controls, App Controls can start a review rehearsal, Review can record `opened_for_now` or `left_blocked`, and Screen Time freshness only treats open outcomes as unlocks.

Gap: the user-facing path still explains rules more than task success. The budget itself is not yet the unmistakable unlock surface, threshold-based triggers are not represented, and the copy does not collapse the model into one obvious sentence.

## Active anchors
- `jtbd-put-intention-before-impulse` - the block should interrupt automatic app opening.
- `jtbd-carry-intentions-into-action` - the user's budget intention must appear at the exact moment of possible spend.
- `jtbd-trust-this-app-with-my-life` - money plus device restrictions require transparent, reversible controls.
- `jtbd-review-budget-reality-before-spending` - the local Kwilt Money job for this value unit.

## Friction we're addressing
The policy model can support multiple triggers, but the user should not experience a policy model. They should experience a short, understandable budget review task. Task success means the user can answer four questions immediately: why paused, what budget to review, what button to tap, and what happens after.

## System alignment
Constraint posture: `Extend the system`

Current system facts:
- Existing surface: Budget Detail, App Controls, Review, Screen Time Controls, and native shield copy.
- Existing user flow: Budget Detail -> App Controls -> Review -> `Open for now` or `Leave blocked`.
- Existing domain/data model: `AppControlPolicy`, `AppControlCondition`, `BudgetReviewEvent`, `opened_for_now`, `left_blocked`, and Screen Time restriction reasons.
- Existing technical affordances: foreground Screen Time reconciliation, App Group shield reason copy, policy overrides, selected native app/category summaries.
- Existing UX/copy conventions: non-shaming budget language, compact page-native cards, explicit outcomes, and no productivity-app ceremony.

Constraints to preserve:
- Do not make a generic Screen Time manager the main product surface.
- Do not expose native app bundle IDs or opaque FamilyActivity tokens in JS-facing UI.
- Keep the first learning slice compatible with one budget and one mapped target.
- Keep leaving blocked as a successful review outcome.

Constraints we may challenge:
- App Controls currently leads with rule cards and condition chips; the sprint should demote that behind presets or an advanced affordance.
- Review currently lives as its own route; the real unlock task should be budget-detail-native or feel budget-detail-native.
- `over_budget` currently behaves more like a hard stop than a review-clearable reason; the product needs an explicit distinction.

## Design implication
The UX should have one front-door sentence: "This app opens after you review this budget." Triggers can remain flexible internally, but the visible task should be a budget review receipt with two outcomes, not a rule editor.

## Aspirational design challenge
How might we help Maya unblock a spending app only after reviewing the relevant budget, while preserving a calm, obvious, non-punitive interaction that feels easier than impulse?

## Out of scope
- Full multi-budget policy builder.
- Household/member permissions.
- New analytics pipeline.
- Native entitlement/signing work beyond the current Screen Time bridge.
- Recovery plans or AI coaching after over-budget events.

## Open question
Should `over_budget` default to review-clearable access windows, or should Kwilt reserve hard stops for a separate explicit preset?
