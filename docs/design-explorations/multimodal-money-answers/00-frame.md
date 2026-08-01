# Frame: Multimodal Money Answers

## What the user said
> I think we need a multi-pronged approach. We need to simplify and layer in
> other interface modalities that might be more comfortable to a user and do
> not make them learn the UI. But there will be people in the UI, and they still
> need to be better served.

## Restated in user voice
When I have a household money question, I want a plain, trustworthy answer in
the place that feels easiest to me, so that I can understand my plan without
learning finance software and still inspect or correct the underlying truth
when I need to.

## Target audience
`audience-aspirational-family-organizers`: people who want household money to
feel understandable without becoming household finance administrators.

## Representative persona
Maya remains the representative persona. The observed retirement-age user adds
an important low-UI-fluency situation, not a separate age-based product mode.

- Current situation: Maya has a concrete question, such as whether her plan is
  within the 70% income limit she chose.
- What she is trying to do: get an answer, understand a proposed change, and
  move on without translating system language.
- Emotional state or tension: she wants reassurance grounded in real evidence,
  but does not want to study a dashboard or distrust an unexplained answer.
- What would make this feel wrong: inconsistent answers across surfaces,
  generated financial advice, hidden data access, sensitive lock-screen copy,
  or Chat becoming the only place financial truth can be inspected.

## Hero anchor
`jtbd-move-the-few-things-that-matter` - help Maya make an intentional household
decision without turning money management into another system to maintain.

## Job flow step
This work strengthens steps 5 through 9 of
`job-flow-maya-review-budget-reality-before-spending`: see the relevant reality,
understand it, correct assumptions, choose, and trust the result enough to use
the pattern again. Current Money surfaces and read contracts contain much of
the evidence, but the 70% limit is hard to find, category-change impact is too
abstract, and conversational or scheduled delivery is not yet a proven user
path.

## Active anchors
- `jtbd-review-budget-reality-before-spending` - the same financial truth should
  be understandable before spending or changing the plan.
- `jtbd-carry-intentions-into-action` - the chosen income limit must travel into
  category decisions and recurring check-ins.
- `jtbd-trust-this-app-with-my-life` - every answer needs bounded evidence,
  freshness, privacy, and a return path to the authoritative surface.
- `jtbd-get-help-without-retelling-my-life` - Chat should use the minimum
  relevant Money context without asking the user to restate their plan.

## Friction we are addressing
The user currently has to know where Money settings and category controls live,
translate `living target` and allocation language, and mentally connect category
changes to the income percentage they chose. A conversational answer can remove
that navigation burden, but it cannot compensate for a confusing or hidden
authoritative UI.

## System alignment
Constraint posture: `Extend the system`.

Current system facts:
- Money owns current transactions, categories, forecasts, living-plan evidence,
  deterministic category-change previews, plan versions, and receipts.
- Summary shows spent and planned totals but does not show the living percentage,
  supported income basis, or target variance.
- Category settings can preview a plan change but currently presents only a
  generic target sentence and affected-category count.
- Unified Chat can route Money questions and `money.read` returns current-month
  totals, forecasts, outside-plan activity, and categories.
- The Chat contract already anticipates channel-independent coordination and a
  channel provider for SMS or voice, while capability owners retain evidence,
  policy, actions, and receipts.

Constraints to preserve:
- The native Money UI remains the authoritative place to inspect, correct, and
  reverse financial state.
- Money computes answers; the language model interprets the question and
  explains capability-owned results.
- Saved questions store a typed Money intent, not generated SQL.
- The same underlying result must not disagree across UI, Chat, notification,
  or SMS.
- Missing or stale evidence produces an honest refusal state, not an answer
  calculated from zero or partial income.
- Outbound delivery is opt-in, privacy-controlled, quiet by default, and never
  silently applies a plan change.

Constraints we may challenge:
- `Living target` can remain a domain term while primary user copy becomes
  `monthly spending limit` with the chosen percentage and dollar basis visible.
- A user should not need to navigate to a settings destination before asking a
  question that the current Money evidence can already answer.

Design implication:
Build one reusable Money-answer contract and project it into several modalities.
Do not build separate UI, Chat, and SMS interpretations of the same facts.

## Aspirational design challenge
How might we help Maya receive and understand the same trustworthy Money answer
through a simple UI, ordinary conversation, or a chosen scheduled message,
while preserving Money as the inspectable source of truth?

## Out of scope
Open-ended financial advice, model-generated SQL, autonomous rebalancing,
money movement, default-detailed lock-screen messages, and a general-purpose
financial-agent platform.

## Open question
How much financial detail should an outbound message reveal by default before
the user explicitly chooses a disclosure level?
