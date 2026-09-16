# Frame: Budget-Led Quiet Compass

## Review cadence

The initial exploration used phase-by-phase check-ins while Andrew co-designed the starter.
On 2026-09-15, Andrew requested a comprehensive onboarding plan using the complete Origin
walkthrough. That request authorizes end-to-end planning without additional phase checkpoints;
it does not authorize app implementation, new prices, or release promotion.

The [consolidated first-run plan](../../feature-briefs/kwilt-first-run-onboarding.md) now extends
this starter exploration through authentication, commercial access, first value, capability
handoffs, and repeatable testing. Its recommended scope supersedes the earlier narrow scope below
where explicitly stated. It remains a draft for design review.

## What the user said

> We should have a clear lead offer, like a start here, and then we can have other options. I think
> our lead offer right now is about budgeting. It's like budgets plus screen time controls based on
> budgets.

## Restated in user voice

When spending apps make it easy to act before I have checked the household plan, help me see the
right budget reality first and choose intentionally. Give me a clear place to start without hiding
the other reasons I might use Kwilt.

## Target audience

`audience-aspirational-family-organizers` - Aspirational family organizers.

## Representative persona

Maya wants ordinary household money to stay understandable without becoming the household finance
administrator. She is open to a calm, user-owned pause before a spending app when that pause shows
useful budget truth and remains visible, reversible, and non-shaming.

- Current situation: A spending app can turn an unexamined impulse into a household tradeoff.
- What she is trying to do: Keep spending aligned with the household plan without constantly
  opening or maintaining a finance dashboard.
- Emotional state or tension: She wants help at the decision moment, but she does not want
  surveillance, punishment, or a complicated budgeting system.
- What would make this feel wrong: A generic app blocker, shame-based budget language, hidden
  rules, a promise of bank or Screen Time behavior that has not been proven on her device, or an
  onboarding screen that buries Kwilt's clearest offer inside an equal-weight capability catalog.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want
to grow.

## Job-flow step

`job-flow-maya-review-budget-reality-before-spending`, especially:

- Recognize and enter the Money job: current delivery score 2.
- Start or resume minimum setup: current delivery score 2.
- Make the intentional choice: current delivery score 3.
- Trust and repeat the pattern: current delivery score 2.

The first-install problem is therefore not only presenting Money. It is making the differentiated
loop legible: establish a useful budget, connect a spend-triggering app to it, see the relevant
budget at the app-open moment, then choose `Open for now` or `Keep blocked`.

## Active anchors

- `jtbd-review-budget-reality-before-spending` - The budget answer must be trustworthy and useful
  before a spending decision.
- `jtbd-put-intention-before-impulse` - The app pause carries the household intention into the
  moment it is likely to be forgotten.
- `jtbd-carry-intentions-into-action` - The budget should affect the real decision rather than stay
  inside a dashboard.
- `jtbd-trust-this-app-with-my-life` - Money evidence and device restrictions must be transparent,
  reversible, and truthful about delivery state.

## serves snippet

```yaml
serves: [jtbd-review-budget-reality-before-spending, jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
```

## System alignment

Constraint posture: `Bend the system`

This revises the accepted Quiet Compass rule that every ready capability must receive equal
first-install prominence. The capability routes remain available, but one differentiated offer
becomes the recommended start.

Current system facts:

- `App.tsx` currently makes authentication the first post-launch interaction for every signed-out
  user. The existing `SignInInterstitial` already has moving Kwilt imagery and short promises, but
  it presents those alongside the authentication controls rather than letting the user begin a
  product intention first.
- The existing capability-onboarding contract already ranks `budget-app-controls` first.
- The canonical Money job flow combines budget reality with intentional app access.
- `brief-screen-time-controls` defines budget-aware rules as canonical Screen Time rules; Money
  supplies budget identity and condition truth, while Screen Time owns rule persistence,
  explanation, and enforcement.
- `brief-budget-app-unlock-review` defines the clearest value unit as: "This app opens after you
  review this budget."
- The current production onboarding still routes all new users into the legacy Goal/Arc flow.
- Money's acquisition-to-activation path, `MoneyFirstTrustedDecision`, and repeated first-value
  evidence remain unproven in production.

Constraints to preserve:

- One public Kwilt app and account; this is a lead offer, not a return to separate app identities.
- Budget-aware app controls are optional, visible, reversible, and non-shaming.
- Money and Screen Time retain their current ownership boundaries.
- Other starter paths remain directly available without a portfolio tour or Agent conversation.
- Permissions and account connection appear only after the person chooses the lead offer and sees
  why each requirement matters.
- Activation is a trustworthy budget decision or a completed budget-aware app review, not opening
  Money, granting permission, connecting Plaid, or finishing onboarding screens.

Constraints we may challenge:

- Authentication as the first meaningful choice on a fresh install. A small install-scoped starter
  intent may precede sign-in and resume afterward, provided returning-user, exact-link, invitation,
  restore, privacy, and data-ownership paths remain correct.
- Equal visual weight for every capability on first install.
- A neutral question as the primary onboarding hierarchy.
- Generic personal Screen Time as a co-equal first-install offer when budget-aware app controls are
  the sharper differentiated promise.

Design implication:

Quiet Compass should lead with one concrete Money promise and one primary action. A quieter
"Other ways to start" region on the same screen must keep the other release-ready starter offers
plainly visible and directly tappable. They must not be hidden behind `More`, a carousel, Agent, or
another screen. The lead offer should describe the complete user loop in ordinary language rather
than presenting "Budgeting" and "Screen Time" as two features being bundled together.

## Aspirational design challenge

How might we help Maya recognize that Kwilt can bring a trustworthy budget into the exact moment
she is about to spend, while preserving agency, truthful device constraints, and easy access to
Kwilt's other useful starting points?

## Out of scope

- Reworking Money's budget engine, Plaid integration, or Screen Time enforcement.
- Promising family/child Screen Time enrollment; that flow is not production-ready.
- Choosing permanent paywall, pricing, or App Store positioning.
- Hiding non-Money starter offers behind a secondary menu, disclosure, carousel, Agent exchange,
  or another screen.

## Open question

Should the lead promise name the mechanism directly ("spending apps pause for your budget") or
lead with the outcome ("know what is left before you spend") and reveal app controls as the
differentiator underneath?
