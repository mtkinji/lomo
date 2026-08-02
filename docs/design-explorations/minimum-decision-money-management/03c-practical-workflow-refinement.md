# Practical Workflow Refinement

## Status

This is a design recommendation, not authorization to change the app. It
refines the app-experience direction against the current checkout and the
constraints of Kwilt's existing shell, Plaid, Unified Chat, and Screen Time
control plane.

## Corrections to the earlier direction

### Do not make `Check a purchase` a general Money feature

Kwilt cannot ordinarily know that a customer is about to buy something. A
permanent amount-entry button would ask the customer to invent a new ritual and
would overstate Kwilt's place in the purchase flow.

Purchase support should exist only when the customer has already expressed the
question or created an interruption:

- the customer asks Chat, `Can I afford $75 for a birthday gift?`;
- a customer-authored Money Screen Time agreement pauses a selected app;
- a later operating-system surface provides a legitimate contextual handoff.

Even in a Screen Time review, Kwilt should not assume that opening an app means
buying. The ordinary answer remains why access paused and what financial room
exists. `I am planning to spend…` can be an optional question offered from that
context, not a required step.

The product job is therefore **answer a spending decision when asked**, not
**interrupt every purchase**.

## Diagnosis of the current setup

The current setup is structurally close. It already has the right major inputs:
a living percentage, Plaid connection, plan construction, and a completion
state. The problem is not the Plaid flow and does not require a new onboarding
system.

The avoidable difficulty is in the handoffs around those inputs:

- the opening promise is aspirational but does not say what Money will make
  easier;
- `living target`, `account evidence`, `versioned plan`, and `plan receipts` are
  system vocabulary before the customer has a useful result;
- the percentage is chosen before account data exists, so its dollar effect
  cannot yet be shown;
- `Ready to build` adds another apparent decision even though the customer has
  already chosen the target and connected an account;
- completion announces that a plan exists instead of giving the first answer.

For a low-app-fluency customer, every screen should answer three things without
requiring inference: **What is this? Why do I need it? What happens next?**

## A bounded setup refinement

Keep the current sequence and leave Plaid untouched. Change the meaning and
copy of the steps around it.

### 1. Explain the concrete promise

Current:

> Make money decisions from the life you mean to live.

Recommended:

> **Know what is already spoken for—and what you can spend flexibly.**
>
> Kwilt uses your income, regular expenses, and plans to give you one monthly
> answer.

Primary action: `Set up Money`.

That is the promise: Money will separate what is already committed from the
room the customer can still use. It is specific enough to verify at the end of
setup.

### 2. Choose an intention, without pretending dollars are known

When no usable account evidence exists:

> **How much of your income is for ordinary living?**
>
> Start with 70%. Kwilt will show the dollar amount after your account is
> connected. You can change it later.

The percentage options can remain. Label 70% as the recommended starting point
if product policy supports that recommendation. The primary action should be
`Continue`, not `Use this target`, because the consequence is still provisional.

If usable evidence already exists, show the real percentage and dollar amount
on this same screen. The flow need not force an already-connected customer
through a generic version of setup.

### 3. Explain the handoff, then use Plaid as it is

Immediately before Plaid:

> **Connect the account where income and regular expenses appear.**
>
> Kwilt uses the transactions Plaid shares to estimate your monthly plan.

Primary action: `Connect with Plaid`.

This does not alter Plaid's consent, institution, authentication, or account
selection UI. It only tells the customer why Kwilt is sending them there and
what will happen when they return.

### 4. Turn `build` into progress, then show the consequence

After Plaid returns, Kwilt can build the provisional plan without making the
customer decide whether a plan should now be “built.” Replace the `Ready to
build` decision screen with a progress state:

> **Working out your monthly plan…**
>
> Finding regular income and expenses.

Then show the actual result:

> **Here is your monthly plan**
>
> Monthly income used for planning: $4,800
>
> Your 70% living limit: $3,360
>
> Already spoken for: $2,400
>
> Flexible this month: $960

> Kwilt may adjust the category guides as spending changes. It will not change
> your 70% limit without you.

Primary action: `Use this plan`. Secondary disclosure: `See what is included`.

This confirmation is the original percentage decision made legible in dollars,
not an additional budgeting decision. If the supported calculation is already
authoritative under current product rules, it may instead be a completion
screen with `Go to Budget`; the important point is that `Build my Money plan`
must not remain a second abstract commitment.

### 5. Complete with the promised answer

Do not end with `Your plan lives in Kwilt now.` End with the same four numbers
the customer will see in ordinary use, plus one action:

> **You have $960 for flexible spending this month.**
>
> Your $2,400 of regular expenses and planned contributions is already included.

Primary action: `Go to Budget`.

### Setup exception rule

If the customer skips Plaid or evidence is insufficient, do not produce a fake
zero or imply setup is complete. Say the one missing fact and offer the direct
recovery action. Manual planning income can remain the fallback when supported,
but it should not appear as a competing setup path by default.

## Screen Time: central control, local meaning

The accepted architecture is already right:

- **Settings > Screen Time** is the cross-domain overview and router;
- **Money > Category > App controls** is the canonical editor for a Money
  agreement;
- the shared control plane owns Apple authorization, selection, enforcement,
  reconciliation, and receipts;
- Money owns the condition, customer-facing reason, category context, and exact
  return.

The opportunity is narrower than a Screen Time redesign. The current
category-local editor presents app selection and five conditions as settings.
That is reasonable for maintenance but difficult for first use.

### First-use local setup

Use one short guided sentence instead of asking the customer to compare the
entire policy model:

1. **Purpose:** `Pause selected apps when Shopping needs my attention.`
2. **Apps:** open Apple's picker, unchanged.
3. **When:** recommend one plain-language condition from the current context,
   with `Choose another time` for the remaining conditions.
4. **Confirmation:** `Kwilt will pause these apps when Shopping reaches 95% of
   its monthly guide.`

After this first use, the current settings-style editor remains appropriate.
Settings shows whether the agreement is on and routes back to the category; it
does not duplicate this composer.

### Runtime review

Keep the existing `Open for 20 min` and `Keep blocked` authority choices. Add
only the facts needed to understand the moment:

> **Shopping is paused because it reached 95% of its monthly guide.**
>
> $84 remains in Shopping. $214 remains across flexible spending.

Optional contextual action: `Ask about this` or `I am planning to spend…`.
Neither is required to regain or keep access.

## Chat as a first-class workflow participant

Chat should participate through one shared context-and-return protocol, not by
becoming a separate Money assistant or a permanent button on every screen.
Today `UnifiedChatLaunchContext` supports Goals, To-dos, and Chapters; Money is
not yet a participating capability. This is a real system gap.

Money participation requires:

- a Money capability context for the current month;
- object context for a category and, where useful, a transaction;
- moment context for a pending rebalance or Screen Time review;
- a removable customer-visible context chip;
- an exact return target to the originating Money surface;
- Money-owned calculations, previews, mutations, receipts, and corrections.

Chat may present Money-owned components in its timeline—a flexible-room answer,
a transaction explanation, a rebalance preview, or a scheduled-answer offer.
It must not reconstruct the arithmetic from prose or generate database queries
as the source of truth.

### Sketch A: direct contextual handoff

```text
Budget

$343 left for flexible spending
Of $960 through July 31

[ Ask Kwilt about this month ]
```

Tapping opens the independent Chat capability with `Money · July` attached and
an exact return to Budget. Chat offers a few relevant starters but creates no
thread until the customer sends.

Strength: simplest and most consistent with the current capability layer.

Weakness: the navigation transition can feel heavier for one quick question.

### Sketch B: contextual composer that becomes Chat

```text
Shopping needs attention

$84 left in Shopping

[ Ask about this ]
        ↓
┌────────────────────────────────────┐
│ Shopping · July                 ×  │
│ What would you like to know?       │
│ [Why did this pause?]              │
│ [Can I spend $60?]                 │
│ [type or speak…]            [Send] │
└────────────────────────────────────┘
```

The composer is a presentation of Unified Chat, not Money-owned chat. Sending
expands into the durable Chat timeline; dismissing returns without creating an
empty thread.

Strength: the question begins in the moment with no context retelling.

Weakness: requires careful keyboard, sheet, accessibility, and transition work.

### Sketch C: inline conversational timeline inside Money

Money renders multiple messages and action components directly in the Budget or
category screen.

Strength: maximum continuity.

Weakness: duplicates the Chat surface, makes long conversations compete with
Money content, complicates return/history semantics, and risks capability-owned
policy drifting into presentation code.

### Recommendation

Use **Sketch A as the first learning release**, designed so the same launcher
can later open the **Sketch B composer** without changing the context contract.
Do not build Sketch C.

Make Chat invitations contextual rather than ubiquitous:

| Money moment | Local invitation | Attached context | Useful first offers |
| --- | --- | --- | --- |
| Budget answer | `Ask about this month` | month and plan version | `What changed?`, `How much is flexible?` |
| Category detail | `Ask about Groceries` | category and month | `Why is this high?`, `What counts here?` |
| Rebalance preview | `Talk this through` | before/after preview | `What loses room?`, `What stays protected?` |
| Transaction detail | `Ask about this transaction` | transaction meaning, privacy-bounded | `Why is this here?`, `What changes if I move it?` |
| Screen Time review | `Ask about this` | category, trigger, current answer | `Why did this pause?`, `Can I spend $60?` |

Chat's timeline can then offer componentized next moves:

- `See in Budget` returns to authoritative evidence;
- `Preview a change` opens a Money-owned hypothetical;
- `Correct this transaction` opens transaction detail;
- `Send me this every Friday` opens a scoped schedule confirmation;
- `Open for 20 min` remains a Screen Time authority action with its existing
  receipt semantics.

## Routine outreach: Kwilt brings the answer back

The system needs a fourth interaction mode in addition to looking at Money,
asking Chat, and taking an action: **Kwilt reaches out when attention is likely
to be useful.** This is especially important for customers who can understand a
plain message but will not reliably navigate back through the product to find
one.

This Money-specific model may be the first instance of a broader
[`Kwilt Loop` capability](../kwilt-loops/00-yes-and.md): shared trigger,
delivery, authority, and lifecycle infrastructure with capability-local meaning
and execution.

Outreach is not one feature. It has two different authority models:

### Kwilt-originated outreach

Kwilt may identify a small set of material moments without requiring the
customer to design a rule:

- the monthly plan is ready;
- flexible room has materially changed because income or a regular expense
  changed;
- spending pace changes from supported to likely over-plan;
- a protected expense now exceeds the living limit;
- account freshness prevents a previously trustworthy answer;
- a consequential transaction needs meaning before Money can answer reliably.

These are exceptions or state transitions, not routine percentage milestones.
Kwilt should not emit a staircase of 50%, 75%, 90%, and 100% alerts merely
because those numbers are easy to implement.

Every system-originated outreach item must say why it appeared and offer a
direct way to quiet that class of outreach. Silence, dismissal, or opening the
message must not be interpreted as a financial choice.

### Customer-owned outreach

A customer may ask Kwilt to return a useful answer at a familiar time or only
under a chosen condition:

- `Tell me my flexible amount every Friday.`
- `Let me know on payday after income is updated.`
- `Tell me only if flexible room falls below $200.`
- `Let me know if Groceries starts running ahead of the month.`
- `Remind me what is flexible after the regular bills are paid.`
- `Tell me when a transaction still needs my help.`

The customer saves a typed Money question and a trigger, not a database query.
Money reruns the question against fresh authoritative evidence at delivery
time. The saved check remains named, inspectable, pausable, and removable.

### Chat is the primary check-creation surface

The customer should be able to create routine outreach by saying exactly what
they mean in Chat:

> Tell me every Friday how much flexible money I have left.

> Tell me after payday whether I am still within my 70% limit.

> When I get paid, text me what is already spoken for and what is flexible.

> Only tell me if Groceries starts running ahead of the month.

Chat interprets this as a typed, reviewable Money-check proposal with four
parts:

```text
Question     flexible_room | within_living_limit | category_pace | needs_review
Trigger      cadence | income_deposit | condition | month_event
Delivery     in_app | push | sms
Disclosure   private | summary | detailed
```

Money owns the question, evidence requirements, calculation, freshness,
refusal states, and authoritative return target. A shared scheduling service
owns due evaluation, timezone handling, deduplication, quiet hours, retry, and
delivery status. Notifications and Phone Agent are channels; neither owns a
second interpretation of the customer's finances.

#### Natural-language timing rules

- `Every Friday` is a cadence. If the customer omits a time, Kwilt uses the
  existing calm delivery-time preference and states the assumption in the
  receipt rather than forcing another setup question.
- `After payday` or `when I get paid` is an event trigger, not merely a guessed
  calendar date. It fires after a supported income transaction has settled and
  Money has refreshed the answer.
- If Money has one clearly supported recurring income stream, Chat may propose
  that source directly.
- If several deposits could reasonably mean payday, Chat asks one concrete
  clarification: `Which deposit should count—Acme payroll or Social Security?`
- If no trustworthy income event exists, Chat offers a calendar cadence as a
  fallback and labels it honestly. It does not pretend to detect payday.
- `After` may include a short, explicit settling delay when transaction sync or
  pending status makes an immediate answer unreliable.

The model may interpret the customer's words into this proposal, but a strict
schema and Money-owned validation decide whether it is supported. Raw natural
language is retained for the customer-visible label; it is not executed as SQL
or used as an unconstrained automation prompt.

#### Confirmation and receipt

When the request is unambiguous and the channel is already authorized, the
customer's explicit command can be sufficient authority for this low-risk,
reversible schedule. Chat responds with a receipt rather than another generic
confirmation:

> **Money check created**
>
> Every Friday at 6:00 PM, Kwilt will send a private notification and check how
> much flexible spending remains.
>
> `Change` · `Pause`

When an assumption would materially change timing, source, recipient, or
financial disclosure, Chat asks one clarification or presents a proposal for
review. It never silently selects detailed lock-screen or SMS disclosure.

#### Phone Agent delivery

When the customer says `text me`, the delivery channel is Kwilt Phone Agent:

- the phone number must already be verified and transactionally opted in;
- `STOP`, `START`, `HELP`, quiet hours, daily caps, provider delivery status,
  and channel-specific retention remain deterministic Phone Agent concerns;
- the due job invokes the same Money check used by Budget, in-app Chat, and
  notifications;
- the resulting SMS belongs to the same durable check and channel-independent
  agent chronology, not a parallel Phone-Agent-only reminder record;
- a reply such as `Why?`, `Pause this`, or `Change it to Mondays` continues the
  same authorized check context through the shared coordinator;
- if the Phone Agent is unavailable or not linked, Chat creates no imaginary
  text delivery. It offers the native Phone Agent setup handoff or uses push
  only with the customer's approval.

Example private SMS:

> Your Friday Money check is ready. Reply `show me` or open Kwilt.

Example detailed SMS, only after explicit disclosure consent:

> You have $343 for flexible spending through July 31. Reply `why`, `pause`, or
> `change`.

Kwilt Phone Agent already has source-level concepts for verified phone links,
prompt schedules, quiet hours, prompt caps, Twilio delivery, deterministic SMS
commands, and a shared durable coordinator. Those are useful implementation
inventory, not proof that this Money flow is deployed or operational. The
submitted app currently keeps unfinished Phone Agent/SMS surfaces hidden, so
SMS remains a target channel until its provider, consent, scheduler, and
cross-channel behavior are separately proven.

### Yes-and adjacencies

**Yes, and what if any useful answer could become a routine check?**

- Serves: `jtbd-get-help-without-retelling-my-life`
- Job elevation: turns one successful question into future help without asking
  the customer to rebuild it in settings.
- New value: `Tell me this every Friday` can appear after the answer that proved
  useful.
- Cost delta vs. original: medium
- Anti-pattern check: pass when the saved check is visible, editable, and easy
  to stop.

**Yes, and what if most checks were condition-based instead of report-based?**

- Serves: `jtbd-put-intention-before-impulse`
- Job elevation: earns attention only when the customer's intended boundary
  becomes relevant.
- New value: a quiet month produces no repetitive “everything is fine” alerts.
- Cost delta vs. original: medium
- Anti-pattern check: pass when customers can distinguish `condition not met`
  from failed delivery.

**Yes, and what if outreach followed familiar financial moments?**

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: makes the answer arrive when the customer naturally reasons
  about money rather than on an arbitrary app schedule.
- New value: payday, regular-bill completion, month start, and month end become
  understandable trigger templates.
- Cost delta vs. original: medium
- Anti-pattern check: pass when Kwilt does not overclaim that a detected deposit
  or bill is universally the customer's payday or final bill.

**Yes, and what if system-originated outreach were reserved for material state
changes?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: helps a low-app-fluency customer notice what matters without
  requiring them to configure every protection.
- New value: Kwilt can surface stale evidence, a newly unsupported plan, or a
  meaningful loss of flexible room before the customer discovers it by chance.
- Cost delta vs. original: medium
- Anti-pattern check: pass only with calm language, deduplication, quiet hours,
  and a clear explanation of why the message appeared.

**Yes, and what if an outreach item opened a ready-to-continue Chat context?**

- Serves: `jtbd-get-help-without-retelling-my-life`
- Job elevation: turns a notice into understanding rather than a dead-end alert.
- New value: the customer can ask `What changed?` or `What should I look at?`
  without restating the month, category, trigger, or evidence state.
- Cost delta vs. original: medium
- Anti-pattern check: pass when Chat uses Money-owned answers and exact return,
  and does not create a thread until the customer engages.

**Yes, and what if every outreach rule showed its last outcome?**

- Serves: `jtbd-understand-why-ai-suggested-this`
- Job elevation: makes silence and automation inspectable.
- New value: `Checked Friday · no message because flexible room was $343` or
  `Sent because Groceries changed to running ahead`.
- Cost delta vs. original: low
- Anti-pattern check: pass when this history is restrained and factual rather
  than an attention dashboard.

**Yes, and what if disclosure were chosen separately from timing?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: makes routine help safe on shared or visible devices.
- New value: private (`A Money update is ready`), summary, and detailed delivery
  can share the same trigger without assuming lock-screen financial disclosure.
- Cost delta vs. original: medium
- Anti-pattern check: pass when private is the default outside the app and
  detailed values require explicit consent.

### Delivery ladder

The trigger and answer are separate from where the customer receives them:

1. **In-app Money or Chat update:** richest answer and evidence; appropriate for
   system-originated and customer-owned checks.
2. **Private native notification:** `A Money update is ready`; opens the fresh
   in-app answer.
3. **Summary notification:** a coarse status only when the customer chooses it.
4. **Detailed notification or SMS:** later, explicit-consent channels with
   identity, disclosure, delivery-status, and reply-continuity requirements.

Push content should never cache an old financial result and present it as
current. Tapping reruns or refreshes the typed Money check. Notification
permission authorizes a channel; it does not authorize every type of financial
outreach or every disclosure level.

### Outreach control without an automation dashboard

Do not add notification configuration to initial Money setup. The lowest-
decision path is contextual:

```text
You have $343 for flexible spending through July 31.

[ Tell me only if this falls below $200 ]
```

Accepting shows one confirmation with trigger, channel, disclosure, and a
simple `Change` action. Management can live under Money Plan as a short list of
`Money checks`; the Chat timeline can also expose `Pause this check` on an item
it delivered. There should be no general-purpose rule builder or automation
center in the first release.

### Frame recommendation

Run the expanded frame already established by the multimodal Money work: one
Money-owned answer system projected into Budget, contextual Chat, Screen Time,
and permissioned routine outreach. This is larger than notifications but does
not require a new capability or navigation destination.

## Rename `Summary` to `Budget`

In the current information architecture, **Money** is already the capability
group. `Summary` is its first destination beside `Transactions` and `Accounts`.
The internal route is named `MoneySummary`, but customers never need to know
that and changing it is unnecessary migration risk.

Three plausible labels are:

1. **Budget** — says what the customer can understand and manage here; fits the
   living limit, category guides, flexible room, and month navigation.
2. **Overview** — structurally accurate but generic and report-like.
3. **This month** — concrete for current use but becomes false when the customer
   pages into a prior or future month.

Recommendation:

```text
MONEY
  Budget
  Transactions
  Accounts
```

Use `Budget` for the user-facing menu row, screen title, setup destination, and
return language. Keep `Money` as the capability name and `MoneySummary` as the
internal route until there is a separate technical reason to migrate it.

`Plan` should not be used: it collides with Kwilt's existing Plan capability and
describes only one part of this surface. `Spending` is too narrow because the
surface also explains protected commitments, reserves, and the income limit.

## Interface anchors used

- Current Kwilt Money setup supplies the right core inputs; the refinement
  removes translation and redundant commitment around them.
- Plaid Link remains the secure account-connection boundary, not a Kwilt-owned
  design surface.
- Current Kwilt Unified Chat supplies the durable thread, removable context,
  and return model; Money joins that capability contract.
- The accepted Screen Time control plane keeps centralized operational state
  separate from capability-local meaning and editing.
- The local `aispendtracker` reference supports one dominant limit answer with
  pace and projection beneath it, while its desktop shell is intentionally not
  copied.

## Smallest coherent learning release

Without changing the app shell or Plaid, test this as one connected experience:

1. Rename the user-facing `Summary` destination to `Budget`.
2. Replace setup's internal vocabulary and abstract build step with the bounded
   sequence above, ending in the actual protected/flexible answer.
3. Put the flexible-room answer above the existing category grid.
4. Add Money to the existing contextual Chat contract at Budget and category
   detail first, with exact return and no empty thread before send.
5. Offer one private customer-owned weekly check after a useful Money answer,
   using the existing
   [bounded scheduled-check direction](../../feature-briefs/multimodal-money-answers.md).
   Treat system-originated threshold outreach as the next experiment after
   usefulness, quietness, and stop controls are demonstrated.
6. Simplify first-use category-local Screen Time setup while leaving Settings as
   the overview/router and retaining the current runtime choices.

General purchase checking, an embedded Money conversation timeline, broad
system-originated outreach, widgets, SMS, and broad transaction-level Chat
context remain later tests.
