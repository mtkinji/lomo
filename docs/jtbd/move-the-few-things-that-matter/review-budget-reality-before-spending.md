---
id: jtbd-review-budget-reality-before-spending
title: "Help me review household money reality before I spend or change the plan"
parent: jtbd-put-intention-before-impulse
level: leaf
owner: andrew
last_reviewed: 2026-07-31
confidence: hypothesis
evidence:
  - docs/job-flows/maya-review-budget-reality-before-spending.md
realized_by:
  - docs/feature-briefs/kwilt-money-capability-integration.md
tags: [money, families, spending, planning, forecast, screen-time, trust]
---

## When this job is hot

Maya wants Kwilt to run an ordinary month without making her operate a finance
dashboard. She may be about to spend, open an app that makes spending easy, or
change a family priority. She first needs one trustworthy amount of flexible
money left for the month. Category room and transaction detail should support
that answer, not become prerequisites for receiving it.

## What "done" feels like for the user

Maya can rely on a durable monthly plan that Kwilt maintains on her behalf. She
can see exactly how much flexible money remains overall, then inspect what
remains by category if useful. When her priorities change, she can move room
from one category to another and understand the tradeoff. She can still inspect
or correct the evidence, but ordinary ambiguity does not force her into
bookkeeping or prevent Kwilt from giving its best deterministic answer.

## Sub-jobs

- Delegate creation and routine maintenance of a durable monthly plan.
- See exact whole-plan flexible money left before category detail.
- See dollars left by category when that helps guide a spending choice.
- Redirect capacity between categories when family priorities change, with the
  tradeoff visible before saving.
- Distinguish monthly plan room from cash that is safe until the next payday.
- Inspect or correct categorization and planning assumptions when materially
  useful, without making routine ambiguity a required task.
- Choose whether to continue spending or leave a spend-triggering app blocked.
- Trust that the plan is based on normalized income rather than being rewritten
  by each individual paycheck.

## Anti-patterns

- Presenting planned capacity, forecast, or unreviewed evidence as money already
  spent.
- Treating a forecast as certain or hiding its freshness and confidence.
- Blocking an app without a visible reason, review path, or user-owned exit.
- Using shame, punishment, or surveillance to force compliance.
- Making Maya configure a finance system before Kwilt can answer the immediate
  question.
- Withholding the whole-plan answer because one ordinary purchase has uncertain
  category meaning.
- Presenting a monthly-plan number as cash-safe-until-payday without balances,
  bill timing, and expected-income evidence.

## Notes

This began as a provisional Kwilt Money sub-job in the standalone repository.
It is promoted into the shared taxonomy because Money is now a first-class
Kwilt capability. It remains a hypothesis until same-account, signed-device,
and longitudinal use establish that this framing matches real demand.
