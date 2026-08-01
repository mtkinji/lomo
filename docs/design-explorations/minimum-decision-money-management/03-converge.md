# Converge: Teach the Model, Then Manage the Month

## Chosen direction

Choose **Managed Month** as the operating system, use the **Three-Part Budget**
as a short setup lesson, and use **Priority Budget** as the focused adjustment
flow.

The everyday promise is:

> Kwilt runs the monthly plan and tells you how much flexible money remains.

The customer should understand what `flexible` means because Kwilt taught the
calculation when it first created the plan. Kwilt does not need to repeat the
full lesson every time the customer returns.

## The three-part model

The model contains only three concepts:

1. **Monthly living money** — the durable amount the customer intends to use for
   ordinary living, based on normalized planning income and the chosen target.
2. **Protected costs** — fixed expenses and planned contributions that Kwilt
   sets aside before calculating ordinary spending room.
3. **Flexible money** — what remains for spending that can vary during the
   month, such as groceries, fuel, children's activities, shopping, or dining.

Example:

```text
Monthly living money        $3,360
Protected costs            -$2,400
Flexible money                $960
```

After `$617` of flexible spending, the everyday answer is:

> **$343 left for flexible spending this month**
> `$617 of $960 used`

This is monthly plan room. It is not a claim about the current bank balance or
cash that is safe until payday.

## Setup experience

Kwilt does not ask the customer to build this calculation. It builds the draft,
then teaches it in one short review moment.

### Preferred single-moment version

```text
Your monthly plan

You plan to use                    $3,360
Protected costs                   -$2,400
Flexible money                       $960

Kwilt will keep this plan current and tell you what is left.

[Use this plan]
```

The living percentage and normalized income basis remain inspectable from this
moment, but they do not need separate instructional cards if the dollar result
is already correct and understandable.

### When one moment is not enough

Split the same lesson across no more than two moments:

1. Confirm the living-money amount and its income basis.
2. Review what Kwilt protected and see the flexible amount that remains.

Do not add a carousel, quiz, category-allocation exercise, terminology screen,
or mandatory transaction review. Education is complete when the customer can
answer: **“The large number is what remains after Kwilt set aside my protected
costs.”**

## Everyday Budget experience

The existing Budget screen keeps its month selector and category tiles. Its
reading order becomes:

1. **`$343 left for flexible spending this month`**
2. **`$617 of $960 used`**
3. Category guidance in dollars left
4. Freshness, calculation, and deeper evidence on demand

The screen does not repeatedly lead with the living percentage, normalized
income, fixed-cost total, forecast commentary, or an explanation card. Those
facts remain available through one clearly named disclosure such as **`See
monthly plan`**.

That disclosure is not a dead end. After showing the three-part calculation, it
offers one clear **`Change plan`** action. The customer can use that path to
change the living target, correct a protected cost, or redirect flexible
category priorities without returning to setup. A future **`Ask about this
plan`** entry may open contextual Chat over the same Money-owned facts and
governed proposal contracts; Chat is an additional access method, not a second
plan editor or calculator.

Income received so far may appear inside that disclosure as a dated fact. It
must not visually imply that a partial paycheck caused the durable plan to
shrink or grow.

## Priority-change experience

Categories are supporting guides inside the flexible total. A customer can
open a category and choose the same **`Change plan`** action used from the
monthly-plan disclosure. The category supplies the starting context; the shared
review supplies the whole-plan consequence.

Example:

```text
Give Kids activities $100 more this month

Beauty and Shopping would have $100 less.
Your flexible total and protected costs stay the same.

[Save change]
```

Kwilt may propose the smallest reasonable source category, but it does not
silently decide what matters less. The customer can choose another source. The
flow states whether the change applies only this month or continues, and saving
produces a reversible receipt.

## Shared plan-change review

`Change plan` is one reusable Money capability, not a collection of unrelated
editors. It can be entered from:

- **Monthly plan:** review or change the living target, protected costs, or
  flexible priorities.
- **Category detail:** begin with that category selected and show how changing
  it affects the whole plan.
- **A material Money explanation:** begin with the affected assumption or
  category already in context.
- **Contextual Chat later:** receive a typed proposal, then render the same
  native review before Save.

The shared surface always answers the same questions in the same order:

1. What are you changing?
2. What will the whole plan look like afterward?
3. What receives less room, becomes unassigned, or crosses the living target?
4. What remains protected?
5. Does this apply only this month or continue?

It receives an authoritative plan version, entry context, focused object, and
optional proposed change. It returns either no change or one version-checked
commit with an authoritative receipt and an exact route back to the originating
surface.

This should be shared domain behavior and presentation grammar, not necessarily
one oversized visual component. The calculation, consequence ordering, Save
boundary, stale-preview handling, receipt, and return contract are reusable;
the focused input control may differ for a percentage, protected amount, or
category allocation.

## Transaction and category policy

The total answer must not depend on perfect category assignment.

- High-confidence transactions are assigned automatically.
- Ordinary ambiguous outflows are counted conservatively as flexible spending.
- Mixed merchants can use a best supported category without demanding exact
  receipt splitting.
- A correction is requested only when protected-versus-flexible meaning,
  outside-plan treatment, household authority, or another material conclusion
  genuinely depends on it.
- A category correction can change local category room without invalidating the
  already-counted whole-plan spending total.

This means the Budget screen should not lead with messages such as `Kwilt needs
one answer` or `Transactions need an update` when Kwilt can already count the
outflow deterministically.

## UI contract

**Job:** When Maya opens Budget during the month, she needs to know how much
flexible money remains so she can adjust ordinary spending without operating a
budget system.

**Primary action:** No action is required at rest. `See monthly plan` reveals
the calculation and one `Change plan` action. The same action from category
detail enters the shared review with that category already selected.

**Must show:** The exact flexible amount left, the month, amount used versus
flexible capacity, and category dollars left.

**Reveal later:** Monthly planning income, target percentage, protected-cost
composition, transaction evidence, forecast, provenance, and receipts.

**Must not add:** A new dashboard, permanent calculation card, setup carousel,
uncertainty task queue, category-perfection workflow, financial health score,
or Money-local navigation.

**Reuse map:** Existing Budget screen, category tiles, category detail,
governed plan preview, receipts, transaction detail, native disclosure
patterns, and one shared plan-change review contract.

**Behavior sources:** The living target and normalized planning basis define
monthly living money; protected-plan evidence defines protected costs; the
economic-role projection defines counted flexible spending; governed plan
changes define preview, save, and reversal.

**Required states:** Ready, no flexible money left, negative flexible room,
past month, future month, refreshing, stale-but-usable, and genuinely missing
planning basis. Ordinary categorization ambiguity is not a blocking state.

**Proof path:** Authenticated current-month Budget in the iOS Simulator using
real connected data, followed by category priority change, save, relaunch, and
receipt/reversal checks. Signed-device and TestFlight proof remain separate.

## Alternatives considered

| Direction | Persona fit | Comprehension | System fit | Main tradeoff |
| --- | --- | --- | --- | --- |
| Managed Month | Strongest | Strong after brief teaching | Strong | Requires trusted automation |
| Three-Part Budget always visible | Strong | Strong for detail-oriented users | Strong | Risks turning the answer into a mini-dashboard |
| Priority Budget as the whole product | Medium | Strong during rebalancing | Strong | Does not answer ordinary orientation by itself |
| Money Steward as primary UI | Strong for conversational users | Potentially strong | Medium | Depends on native Money truth and adds cross-capability scope |

## Capability delta

Today, the customer cannot reliably:

- open Budget and receive one deterministic whole-month flexible amount;
- understand that amount from a previously taught three-part model;
- treat category guidance as secondary to the whole-plan total;
- redirect one flexible priority without becoming the plan administrator.

After this concept ships, the customer can:

- accept a Kwilt-created monthly plan after one simple explanation;
- return to one exact flexible-money answer throughout the month;
- inspect dollars left by category when useful;
- move room toward a current family priority with a visible, reversible tradeoff.

Still intentionally unsupported in this release:

- claiming cash safe until payday;
- arbitrary financial advice or purchase approval;
- Chat-created plans, scheduled outreach, or SMS;
- silent changes to customer-protected amounts;
- perfect item-level splitting for mixed merchants.

## Reductive decisions

- Teach the calculation once; do not permanently display the lesson.
- Enhance Budget rather than create a new destination.
- Keep the existing category layer; change its role from primary answer to
  supporting guidance.
- Use dollars first. Percentages and planning basis are evidence, not the
  everyday headline.
- Require no action when the plan is operating normally.
- Give priority changes one entry point and one preview before Save.
- Refuse to add Chat, notifications, widgets, cash runway, and Screen Time work
  to the first coherent Money release.

## Activation path

The teaching moment appears when Kwilt has enough evidence to generate the
first credible monthly plan, not at generic app onboarding. Existing customers
see it once when their managed plan is first available; returning customers go
directly to the large flexible-money answer.

Natural adoption looks like this:

1. The customer accepts the drafted plan.
2. She later opens Budget and correctly interprets the large number.
3. She uses category dollars only when a local question matters.
4. She optionally changes one priority without editing the rest of the plan.

## Accepted tradeoffs

- The everyday screen exposes less arithmetic in exchange for faster
  comprehension; the full calculation remains one disclosure away.
- The total can be trustworthy even when a flexible purchase's precise category
  is imperfect.
- Income normalization will begin with a bounded deterministic policy rather
  than pretending to model every compensation pattern immediately.
- Cash timing remains a separate future job rather than weakening the monthly
  answer with ambiguous language.

## Stated bet

We are betting that customers will trust and act on one flexible-money number
when Kwilt first teaches the simple calculation behind it and keeps that
calculation inspectable.

If customers repeatedly reopen the calculation, confuse flexible money with
bank balance, or cannot explain what was protected, we will revisit how much of
the three-part model remains visible in the everyday Budget surface.

## Success signal

In a short comprehension test, a customer can look at the Budget screen and
answer all three questions without coaching:

1. How much flexible money is left this month?
2. What has already been set aside before that number?
3. How would you give one category more room without changing the overall
   living plan?

The historical supporting explorations in `03a`, `03b`, and `03c` remain useful
source reasoning. This document supersedes their presentation hierarchy and
release ordering where they differ.
