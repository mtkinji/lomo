---
id: brief-multimodal-money-answers
title: Multimodal Money Answers
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
serves: [jtbd-review-budget-reality-before-spending, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-get-help-without-retelling-my-life]
related_briefs: [brief-budget-amount-adjustment, brief-auto-budget-from-living-target, brief-unified-chat, brief-notifications-v1-5]
owner: andrew
last_updated: 2026-07-30
---

# Multimodal Money Answers

## Context

Money asks the user to choose an income spending limit, such as 70%, but the
current Summary does not show that promise and category rebalancing does not
plainly explain whether the resulting plan still fits it. The same information
is also trapped behind Money's UI. A user who is comfortable texting but not
comfortable learning a dense financial interface should be able to ask the
obvious question and receive the same truthful answer.

## Target audience

The primary audience is `audience-aspirational-family-organizers`. They want a
calm household-money answer that supports a decision without requiring ongoing
spreadsheet work or fluency in budgeting terminology.

## Representative persona

Maya is reviewing the household plan before spending or changing a category.
She needs to see the limit she chose, understand the effect of a change, and get
the answer again through a familiar conversational path. The first learning
release must also be understandable to people with lower UI fluency, including
retired users who are comfortable with texting but not nested app navigation.

## Aspirational design challenge

How might we help Maya understand whether her plan still fits the income limit
she chose, from the UI or a plain-language question, while keeping one
authoritative financial truth and a calm, private experience?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — Money should help Maya make one useful
household decision, not turn the household plan into another system she must
continually operate.

## Job flow step

This improves steps 5, 6, and 9 of
`job-flow-maya-review-budget-reality-before-spending`: see the whole-plan reality,
understand the evidence in plain language, and trust the pattern enough to use
it again. The current flow scores understanding at 4 but trust-and-repeat at 2.
The missing visible limit and inconsistent access to its answer make the plan
harder to explain and repeat than the underlying Money model warrants.

## JTBD framing

In Maya's voice: “Before I change a category or spend, tell me whether the plan
still fits the income limit I chose. Show me the same answer wherever I ask,
remember it only when I request that, and do not make me relearn the app.” This
serves `jtbd-review-budget-reality-before-spending`, carries the chosen limit
into action, and strengthens trust without requiring Maya to restate her
financial setup.

## Design

### One answer contract

Money owns a typed, read-only plan-limit answer derived from the active living
plan. It includes:

- the chosen living percentage;
- the trustworthy monthly resource basis;
- the dollar limit;
- the amount currently planned;
- the dollar and percentage-point variance;
- unassigned or over-target amounts;
- the observation time; and
- an explicit unavailable state when the plan or income basis is not usable.

The contract produces plain-language display facts but does not make financial
recommendations. Summary, category review, Chat, and the scheduled-check return
path consume this contract. Chat never constructs database queries or performs
Money calculations independently.

### Summary

The current-month Summary shows a calm block before the category grid:

> Monthly spending limit
> $3,360 · 70% of $4,800 income
> $3,264 planned · $96 left

The block shows when the evidence was refreshed and opens the existing Money
Plan surface for details or target maintenance. Historical month pages do not
pretend that the current active living plan was their historical plan.

### Category change review

Before a category amount is saved, the review leads with the resulting planned
income percentage and dollar variance from the chosen target. It names every
other category whose plan amount changes and says that month-to-date spending is
unchanged. Missing-resource states refuse to calculate against zero income.

### Chat

For a question such as “Am I within my income spending limit?”, Unified Chat
uses the extended bounded `money.read` result. It answers in one or two plain
sentences, includes freshness, and offers `See Money details`, which returns to
the authoritative Summary. Money remains read-only in Chat; this release does
not rebalance or change the target conversationally.

### Private weekly check

After a useful answer, the user may choose one typed saved-check kind:
`current_plan_within_income_limit`. The first release offers one weekly cadence.
Management lives in Money Plan so the check is visible, pausable, and removable
without creating a general automation destination or a Chat mutation.

The device-local notification says only that the weekly Money check is ready;
it contains no amount, percentage, account, merchant, or category detail.
Opening it returns to current-month Summary, refreshes Money, and renders the
current answer. The notification is a reminder to retrieve an answer, not a
cached financial result. SMS, reply-by-text, voice, arbitrary saved questions,
and server schedules are deferred until this smaller contract is understood.

### States and copy

- Ready within limit: `$96 left in your monthly spending limit.`
- Exactly at limit: `Your plan matches your 70% spending limit.`
- Over limit: `$140 over your monthly spending limit · 2 points.`
- Not ready: `Kwilt needs a current income plan before it can check this limit.`
- Private notification: `Your weekly Money check is ready.`

Copy uses “income,” “planned,” “limit,” “left,” and “over.” Internal terms such
as resource basis, allocation, candidate, or reconciliation never appear in the
user-facing answer.

## Acceptance criteria

- Current-month Summary shows the chosen percentage, dollar basis, dollar
  limit, amount planned, variance, and freshness from authoritative plan facts.
- The limit block is absent from historical month pages or clearly identified
  as current, never projected backward as historical truth.
- Category review shows the resulting planned-income percentage, target
  percentage, dollar variance, and every changed category before save.
- UI and Chat use the same tested plan-limit projection and formatting rules.
- `money.read` returns bounded plan-limit facts without merchant, transaction,
  or account details.
- Chat gives a truthful refusal when the plan or income basis is unavailable.
- `See Money details` opens current-month Money Summary.
- One user-scoped typed weekly check can be enabled, paused, and removed.
- Notification content contains no financial values and tapping it reloads the
  current answer rather than presenting a stored amount.
- No Money values are added to analytics.
- Dynamic Type, VoiceOver labels, permission denial, timezone change, relaunch,
  notification tap, and schedule cancellation are exercised on a real device.

## Success signal

In a five-person learning cohort with varied UI fluency, participants can state
their chosen income limit and whether the current plan fits it after using
either Summary or Chat. They recognize that the weekly notification contains no
financial result and can find how to pause it. The same underlying plan produces
the same dollars and status across Summary, category review, and Chat.

## Open questions

- Does the weekly check help users return to the decision, or does it feel like
  an unnecessary financial nudge?
- After the typed in-app check is understood, is SMS valuable enough to justify
  the added identity, consent, disclosure, delivery, and reply semantics?
- Should later saved checks support a user-selected weekday and time, or remain
  attached to a single calm default?

## Proof boundary

Source and automated tests can prove calculation parity, refusal states,
storage isolation, scheduling inputs, and deep-link shape. Simulator inspection
can prove resting UI and navigation. Only a signed physical-device and invited
TestFlight learning pass can prove notification timing, privacy on the lock
screen, accessibility, background refresh behavior, and comprehension.
