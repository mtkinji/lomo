# Frame: live-better-goal-crossover

## What the user said

> Blaire has been saying she wants Kwilt Money to give her advice on what she can do to improve her finances and spend smarter... I'm wondering if we might use this as a crossover moment between Kwilt and Kwilt Money - where we encourage her to set a goal to live better?

## Restated in user voice

When Blaire sees a spending pattern that keeps repeating, she wants more than a meter or warning; she wants a small, trustworthy next move that helps her live more intentionally with money, so that better financial behavior becomes part of ordinary life instead of another budgeting chore.

## Target audience

`audience-aspirational-family-organizers`: households trying to become more organized without adopting a productivity methodology.

## Representative persona

Blaire, modeled as an early-user instance of `Maya`: a household organizer who wants money guidance that feels practical, calm, and personal.

- Current situation: she can inspect budgets and transactions, but the product does not yet tell her what behavior might help.
- What she is trying to become/do: spend with more intention, reduce drift, and feel more in control without becoming a finance hobbyist.
- Emotional state or tension: she is open to advice, but advice around money can become shamey, generic, or too much.
- What would make this feel wrong to her: moralizing spend, surprise goal creation, overconfident AI, or Budget turning into a productivity dashboard.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - help me make real progress in the few areas I most want to grow.

## Job flow step

`sustain-household-pattern` in `job-flow-maya-review-budget-reality-before-spending`.

Current product offering: Budget home/detail, a thin Plan summary, a fixture Ask workspace, and app-review scaffolding.

Delivery score: 1.5. The app can show budget reality, but it does not yet help the user turn repeated spending insight into a durable life pattern.

Gap: Budget can point at a spending pattern, but Kwilt is the better home for the identity-and-action follow-through that makes the pattern change stick.

## Active anchors

- `jtbd-move-the-few-things-that-matter` - a money pattern becomes a real goal, not just a budget note.
- `jtbd-carry-intentions-into-action` - advice should produce a concrete next action.
- `jtbd-put-intention-before-impulse` - the goal can reinforce intentional spending moments.
- `jtbd-trust-this-app-with-my-life` - financial advice plus goal handoff is high trust and must stay transparent.
- `jtbd-review-budget-reality-before-spending` - the advice should arise from budget reality, not generic coaching.

## Friction we're addressing

Budget answers "what happened?" and "can I open this app?", but Blaire is asking "what can I do differently?" The missing bridge is from evidence to behavior change. If Budget tries to own the whole change loop, it risks becoming noisy; if it only shows numbers, it misses the advice demand.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Budget detail, Review, Plan, Ask, and Screen Time controls exist in Kwilt Money.
- Existing user flow: inspect budget reality, review transactions, optionally gate a spend-triggering app.
- Existing domain/data model: `Budget`, `BudgetMeterSnapshot`, transaction matches, app-gate rules, and review events. Kwilt owns `Arc`, `Goal`, `Activity`, and `Chapter`.
- Existing technical affordances: Expo `Linking`, agent-workspace fixture surface, budget forecast signals, transaction evidence, and possible future deep links between apps.
- Existing UX/copy conventions: calm, non-shaming, user-owned, transparent, and evidence-first.

Constraints to preserve:

- Budget remains the evidence and spending-decision product.
- Kwilt remains the durable goal and follow-through product.
- No automatic goal creation.
- No financial advice that pretends to know more than the data supports.
- No productivity-app framing.

Constraints we may challenge:

- Budget's Plan tab can become the place where repeated money patterns suggest one life-oriented next move.
- Budget can carry a structured "goal draft" payload toward Kwilt, if the user explicitly accepts it.

Design implication:

This should not be a general advice engine. It should be an insight-to-goal bridge: Budget detects or explains one pattern, then invites a Kwilt goal only when the change requires repeated behavior beyond the next purchase.

## Aspirational design challenge

How might we help Blaire turn a repeated spending pattern into one chosen "live better" goal, while preserving Budget as a calm evidence surface and Kwilt as the follow-through system?

## Out of scope

- Automated investment, debt, tax, or credit advice.
- Full cross-app account merge.
- Auto-created goals or hidden background writes into Kwilt.
- A broad personal finance coaching dashboard.

## Open question

Should the first learning release hand off to the installed Kwilt app, or test the value with an in-Budget goal draft before wiring the cross-app bridge?
