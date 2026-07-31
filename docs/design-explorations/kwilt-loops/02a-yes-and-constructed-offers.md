# Yes-And: Capability-Constructed Loop Offers

## Status

This is a frame-expanding yes-and after divergence and before convergence. It
does not authorize implementation.

Ownership correction: `capability-constructed` here means that the capability
supplies supported evidence, trigger/evaluation primitives, claim limits, and
validation. Chat may construct, rank, phrase, and present the actual offer in
coordination with those primitives. See
[`02b-frame-correction-chat-primary.md`](./02b-frame-correction-chat-primary.md).

## Original idea

Let a capability construct the right follow-up offer from what current evidence
suggests the customer may want, then invite the customer to create that loop.
For Money, examples include a heads-up when the customer is about one ordinary
spend away from a limit or when current pace begins to indicate a likely
month-end overshoot.

The system is proposing a useful protection, not enabling it. The customer
still chooses whether the loop should exist.

## Core distinction

```text
Capability evidence
        ↓
Offer eligibility and ranking
        ↓
Customer-visible LoopOffer
        ↓  explicit accept
Typed KwiltLoop
        ↓
Trigger evaluation and delivery
```

A `LoopOffer` is not an active loop, notification permission, or standing
action authority. It is a capability-owned recommendation with evidence,
specific terms, and a dismiss state.

## Adjacencies

**Yes, and what if Money could turn remaining room into one familiar spending
distance?**

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: converts an abstract remaining balance into the number of
  ordinary decisions the customer can still make.
- New value: `Your recent flexible purchases are usually around $65. Want a
  heads-up when less than $65 remains?`
- Cost delta vs. original: medium
- Anti-pattern check: pass only when qualifying transaction scope, sample size,
  freshness, and exclusions make `typical` defensible. The accepted loop should
  store the visible `$65` threshold rather than silently moving as behavior
  changes.

**Yes, and what if Money could offer a forecast-change loop before the customer
is already over?**

- Serves: `jtbd-put-intention-before-impulse`
- Job elevation: moves support from retrospective reporting to an early,
  proportionate chance to adapt.
- New value: `Current spending is beginning to point above your monthly living
  limit. Want Kwilt to tell you if that becomes likely?`
- Cost delta vs. original: medium
- Anti-pattern check: pass only when forecast language is earned by measured
  calibration, stale evidence suppresses the offer, and false-warning rate is
  acceptably low. Current forecast output alone is not sufficient proof.

**Yes, and what if the system could recommend the moment as well as the
condition?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: removes the need to translate a financial routine into a clock
  schedule.
- New value: after a supported income deposit, regular bills settle, or the
  month turns, Money may offer the check whose timing best matches the customer's
  observed decision moment.
- Cost delta vs. original: medium
- Anti-pattern check: pass when the event is named literally (`after Social
  Security is deposited`) and uncertain events become clarifying questions
  rather than inferred certainty.

**Yes, and what if every offer said why Kwilt believes it may help?**

- Serves: `jtbd-understand-why-ai-suggested-this`
- Job elevation: lets the customer judge the recommendation without trusting an
  unexplained model belief.
- New value: `Because Groceries has moved from on pace to running ahead twice
  this month` or `Because you asked this on the last three Fridays`.
- Cost delta vs. original: low
- Anti-pattern check: pass when the explanation cites bounded capability facts,
  not personality claims such as `You are an impulsive spender`.

**Yes, and what if the capability chose only one best offer for the current
moment?**

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: reduces the notification setup problem to one relevant
  decision instead of a menu of automation possibilities.
- New value: an eligibility and suppression policy can rank materiality,
  actionability, evidence sufficiency, novelty, channel readiness, and recent
  declines, then expose at most one invitation.
- Cost delta vs. original: medium
- Anti-pattern check: pass when no-offer is a normal successful state and the
  system does not optimize for acceptance or notification volume.

**Yes, and what if accepting an offer taught Chat the customer's preferred
language?**

- Serves: `jtbd-get-help-without-retelling-my-life`
- Job elevation: makes later correction conversational and familiar rather than
  forcing a return to settings.
- New value: after accepting `one ordinary purchase away`, the customer may say
  `Make that $100`, `Text me instead`, or `Stop the grocery warning`, with the
  current loop as the visible referent.
- Cost delta vs. original: low
- Anti-pattern check: pass when Chat changes a typed loop with a receipt and
  does not treat conversational history as permanent hidden permission.

**Yes, and what if a declined offer became durable evidence to leave the
customer alone?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: makes saying no reduce future friction rather than merely close
  today's card.
- New value: `Not now` suppresses the same offer for a meaningful period;
  `Don't suggest this again` permanently suppresses that recipe unless the
  customer requests it.
- Cost delta vs. original: low
- Anti-pattern check: pass when decline state is owner-scoped, inspectable, and
  never used as a negative engagement signal.

**Yes, and what if the same offer machinery worked outside Money without
becoming generic AI advice?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: lets every capability reduce follow-through setup while
  retaining its own evidence and judgment.
- New value: Goals may offer a check-in after a user-chosen milestone,
  Relationships may offer a cadence after repeated explicit follow-ups, and
  Weekly Options may offer a Sunday ritual after the customer repeatedly reviews
  them.
- Cost delta vs. original: high
- Anti-pattern check: pass only through capability-authored recipes and
  eligibility policies. A general model may rank or phrase supported offers; it
  may not invent new trigger/action semantics.

## Money offer families

### 1. Fixed remaining-room threshold

```text
You have $343 for flexible spending.

Want a heads-up when less than $100 remains?
[ Yes, privately ]  [ Not now ]
```

This is the easiest offer to understand and evaluate. Money can recommend a
threshold, but the accepted loop stores and displays a fixed amount.

### 2. One-typical-spend threshold

```text
Your recent flexible purchases are usually around $65.

Want a heads-up when less than $65 remains?
[ Yes, privately ]  [ How was $65 chosen? ]
```

Candidate evidence rules:

- use only settled, qualifying flexible spending;
- exclude income, credits, transfers, fixed commitments, reserve use, outside-
  plan activity, and transactions still needing review;
- require a minimum number and recency of observations;
- avoid mixing category-level and whole-flexible-plan transaction populations;
- prefer a robust center such as a median over an average distorted by outliers;
- refuse the offer when mixed-store splits or irregular high variance make the
  phrase `typical purchase` misleading.

The displayed amount is a product hypothesis until historical replay and user
comprehension establish an appropriate estimator. It is not currently a proven
Money metric.

### 3. Forecast crossing

```text
Your current pace may use all flexible room before July 31.

Want Kwilt to tell you if overspending becomes likely?
[ Yes, privately ]  [ See the forecast ]
```

Money currently produces projected spend, ranges, confidence, and watch/over
states. Its prediction-trust contract also says historical calibration, baseline
comparison, and false-hot-warning evidence remain incomplete. Therefore:

- `watch` may support an inspectable in-app observation;
- it must not automatically support a strong push claim such as `you are likely
  to overspend`;
- forecast-based loop offers and deliveries require a claim matrix tied to
  measured confidence, freshness, horizon, and false-warning performance;
- low-confidence or stale states should offer evidence recovery, not a warning
  loop.

### 4. Routine-event check

```text
Money recognizes one regular Social Security deposit.

Want your flexible amount after it arrives each month?
[ Yes, privately ]  [ Not now ]
```

This uses an expected event and reruns the current answer after the settled
deposit and account refresh. It does not assume every deposit is spendable or
call money outside the living limit savings.

### 5. Evidence-health protection

```text
Your Money answer depends on this connected account.

Want Kwilt to tell you if it stops updating?
[ Yes ]  [ Not now ]
```

This protects trust rather than a spending threshold and may be more valuable
than another budget alert for some customers.

## Offer eligibility contract

An offer may appear only when all applicable gates pass:

1. **Supported owner recipe:** the capability defines the trigger, evaluation,
   outcome, copy facts, and correction route.
2. **Evidence sufficiency:** freshness, sample size, scope, and confidence meet
   the recipe's claim threshold.
3. **Materiality:** the loop could change a real decision or prevent meaningful
   surprise.
4. **Actionability:** the customer can understand what receiving the message
   would let them do.
5. **No duplicate:** an equivalent active loop does not already exist.
6. **Suppression:** the customer has not recently declined or permanently muted
   the offer family.
7. **Channel readiness:** the offered channel is authorized and operational, or
   the offer clearly includes the required setup handoff.
8. **Attention budget:** no higher-value offer currently deserves the one
   available invitation slot.

The offer ranker should optimize for expected customer value and trust, not
acceptance rate, notification permission rate, or message volume.

## Presentation rules

- Place the invitation after a useful answer or material state explanation, not
  above the answer.
- Show at most one offer at a time.
- Use one literal condition and one literal outcome.
- Show the dollar amount, date, category, income source, or forecast claim that
  makes the offer concrete.
- Include `Why this?` when evidence is not self-evident.
- `Not now` dismisses without punishment; `Don't suggest this again` is
  available in the disclosure or repeat encounter.
- Acceptance creates a typed loop and immediate receipt. It does not merely
  toggle a notification permission with unclear meaning.
- Do not use red urgency, countdown pressure, personality labels, or savings
  claims unsupported by the plan.

## How this changes the prior divergence

Alternative D should no longer be framed only as Kwilt noticing repeated
questions. **Capability-constructed offers are a distinct activation layer**
that can sit over Alternative A's owner-defined recipes and Alternative B's
typed loop contract:

```text
Capability recipe and evidence policy
                 ↓
       one ranked LoopOffer
                 ↓ accept
      typed Chat-legible KwiltLoop
                 ↓
 notification now; Phone Agent when ready
```

This preserves a reductive interface: the system does the work of selecting a
useful offer, while the customer makes the one values decision—whether they
want Kwilt to carry that protection forward.

## Job elevation

The feature is no longer merely `let customers configure future help`. It is:

> Help customers discover the one future protection that current evidence makes
> useful, understand why it was offered, and adopt it with one informed choice.

No new JTBD is required. This deepens `jtbd-carry-intentions-into-action`,
`jtbd-review-budget-reality-before-spending`,
`jtbd-understand-why-ai-suggested-this`, and
`jtbd-stay-in-control-of-ai-actions`.

## Frame recommendation

**Run the design-thinking loop with the expanded frame.**

Keep Chat-authored typed loops as the general contract, but bring
capability-constructed offers into convergence as the primary activation model.
The first learning release should prove one transparent Money offer, one private
notification loop, one receipt, and one stop path. Forecast-based and
one-typical-spend offers should not enter the release until their evidence and
claim thresholds are honestly supported.
