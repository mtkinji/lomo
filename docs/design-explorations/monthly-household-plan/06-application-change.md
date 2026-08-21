# Application Change: Monthly Household Plan

## Status

This artifact translates the accepted product model into the current Kwilt
Money application. It articulates the smallest coherent screen and flow change.
The core four-screen hierarchy is now rendered in `07-four-screen-mockup.md`.
This is still not an accepted UI specification or implementation plan.

Savings visibility, the decremented resource pool, and runway remain unresolved
and must not be invented in the first mockups.

## What I See Today

### First use

The current first-use sequence is:

```text
Money promise
→ choose a 50–100% monthly living target
→ connect accounts
→ Kwilt builds category budgets
→ budgets ready
```

The strongest failure is structural: the user must choose the derivation before
Kwilt has evidence. `70%` is presented as the decision even though the real
decision is the monthly household amount that the percentage may produce.

The completion screen confirms that Kwilt built budgets from income and
spending, but it does not show the recommended household amount, committed
portion, or flexible portion the user has actually adopted.

### Budget Summary

Summary already has the right primary job and strongest visible answer:

> `$X left this month`

It separates Flexible spending from Committed spending and provides category
drill-down. That hierarchy should remain.

The explanatory drawer is still organized around the old model:

- `YOUR MONTHLY BOUNDARY`
- `Living target · 70%`
- `Income basis`

The user must translate a percentage and income basis back into the household
plan amount. Summary has no bounded representation for current-month additions,
signed category carry, carry history, or reset boundaries.

### Money Plan

The Money Plan settings screen exposes both:

- a living percentage with `Use 5% less` and `Use 5% more`; and
- a user-set monthly planning amount.

These appear as competing settings rather than one plan amount with an
inspectable derivation. `Current plan` is summarized as a percentage target,
which reinforces the wrong center.

### Category detail

Category detail currently presents:

- `Spent`, `Left`, and `Limit`;
- a `Funding` fact of `Monthly` or `Reserve`;
- a `Monthly` versus `Reserve` selector; and
- a rollover toggle only for `Monthly` categories.

This is conceptually fragmented. The user must choose among funding rhythm,
rollover, expected need, and due month before learning one plain answer: how much
is available in the category this month and why?

The current source also stores `rolloverEnabled` without applying persistent
signed carry to ordinary monthly category availability. Persistent anchor-based
math exists under the separate Reserve path.

### Transactions

Transactions currently permit `Outside the plan`. That is useful for genuine
exclusions, but it cannot express an intentional unusual expense that should
remain visible while being accepted as a one-time addition to the month.

The application should not solve this by adding routine funding-source fields
to Transaction Detail.

## The Anchor in Play

Primary design principle:

> Let the household recognize one intelligent monthly plan and one current
> spending answer; reveal derivation, carry, additions, and history only where
> they materially explain that answer.

This serves:

- `jtbd-review-budget-reality-before-spending`;
- `jtbd-trust-this-app-with-my-life`; and
- `jtbd-carry-intentions-into-action`.

The interface must remain a family decision surface, not an allocation
dashboard or checkbook ledger.

## References Worth Knowing

These are task-scoped external exemplars, not Kwilt design authorities.

### Copilot Money — Budget Rollovers and monthly budgets

Verified from Copilot's public Help Center on 2026-08-20:

- <https://help.copilot.money/en/articles/3790828-budget-rollovers>
- <https://help.copilot.money/en/articles/6206293-editing-budgets-by-month>

Preserve:

- cumulative positive and negative rollover;
- a visible starting month; and
- historical month-by-month arithmetic.

Translate:

- keep the base category amount visually distinct from the carry adjustment;
- use explicit boundary language rather than `first month with rollover`.

Reject:

- separate same-budget versus different-budget modes as primary UI;
- global rollover configuration that requires users to infer category effects;
  and
- historical edits that quietly alter future months.

### Monarch Money — Flex Budgeting with rollovers

Verified from Monarch's public Help Center on 2026-08-20:

- <https://help.monarchmoney.com/hc/en-us/articles/4411119762196-Rollover-budget-feature>

Preserve:

- the compact separation of planned, actual, remaining, and rollover;
- visible rollover provenance on a category amount.

Translate:

- use a literal signed line such as `−$100 from July`, not a badge or cycle
  glyph that requires learned meaning.

Reject:

- allowing category rollover to become detached from the household-level
  flexible answer without explaining why; and
- fixed/non-monthly/flex bucket rules as user-facing Money ontology.

### YNAB — Targets and available category balances

Verified from YNAB's public support documentation on 2026-08-20:

- <https://support.ynab.com/en_us/getting-started-with-targets-ryAEP08xC>
- <https://support.ynab.com/en_us/when-the-month-rolls-over-a-guide-rkyyd6qC9>

Preserve:

- the semantic distinction between a recurring monthly contribution and what
  is currently available in the category;
- the idea that lumpy needs can accumulate across periods.

Translate:

- keep Kwilt's automatic household plan and explain only the resulting amount
  and adjustment.

Reject:

- target-type, cadence, refill, set-aside, due-date, assignment, and
  money-moving configuration as the ordinary Kwilt experience.

## Three UI Directions

Axis: how visibly the new monthly-plan model should reshape today's application.

### Direction A — In-Place Rewording

Keep the current setup, Summary, Money Plan, and category layouts. Change the
setup percentage step to a monthly-amount step, relabel `Living target` as
`Monthly plan`, relabel `Limit` as `Monthly amount`, and replace the funding
rhythm selector with the carry toggle.

Top and dominant element:

- setup: monthly amount input or recommendation;
- Summary: current `$X left` answer;
- category: existing three-stat row.

Secondary material:

- derivation text beneath the amount;
- signed carry beneath the category meter.

CTA:

- `Use this plan`.

Removed:

- percentage-first setup;
- `Monthly` versus `Reserve` selector.

Added:

- current-month addition row where needed.

Anchor-principle check: partial pass. It removes wrong vocabulary but asks old
layouts to explain a meaningfully different system.

Reference grounding: translates Copilot's explicit rollover number into the
existing Kwilt facts and rows.

Best when: implementation speed dominates and the current hierarchy already
tests well.

Fails when: the user cannot distinguish the durable plan, this month's adjusted
plan, and current category availability from labels alone.

### Direction B — Progressive Plan Statement

Keep Summary's flexible-money answer as the first focal point. Add one quiet,
pressable month-level plan statement above the Flexible and Committed sections.
That statement opens a single
`This month's plan` drawer containing the regular monthly amount, committed or
protected portion, flexible capacity, current-month additions, and material
carry. Setup becomes evidence first and culminates in the same plan statement.
Money Plan becomes the durable home for amount, derivation, carry boundaries,
and receipts. Category detail shows a compact arithmetic stack only when carry
or additions change the ordinary amount.

Top and dominant element:

- Summary: `$X left this month`.

Secondary material:

- `Monthly plan $Y · $Z added this month` or `Monthly plan $Y`.

CTA:

- setup: `Use this plan`;
- Summary: the plan statement is inspectable but not styled as a competing
  primary action.

Removed:

- percentage-first setup;
- separate Reserve mode;
- always-visible plan mechanics;
- routine transaction funding provenance.

Added:

- one progressive plan explanation;
- contextual current-month addition review;
- carry start/reset controls behind category or Money Plan detail.

Anchor-principle check: pass. One answer first, one plan second, arithmetic only
when requested.

Reference grounding: uses the planned/actual/remaining clarity visible in
Monarch without adopting its bucket system, and preserves the contribution
versus available distinction from YNAB without its setup vocabulary.

Best when: Kwilt wants to preserve today's strongest Summary experience while
making the new model legible.

Fails when: the plan statement is so visually quiet that users never discover
why the number changed.

### Direction C — Month Statement First

Reshape Summary around a full monthly statement. The first block shows regular
plan, carried room, current-month additions, total planned outflow, actual
spending, and remaining flexible money. Categories follow as supporting rows.
Setup ends on the same statement structure.

Top and dominant element:

- `August plan` with the complete monthly arithmetic.

Secondary material:

- Flexible and Committed categories.

CTA:

- `Review plan` or contextual `Add to August`.

Removed:

- the current flexible-first hero treatment.

Added:

- a permanent current-month statement.

Anchor-principle check: pass for truth, conditional for reduction. It makes the
model clearest but risks requiring users to read financial structure before
getting the spending answer.

Reference grounding: similar to Copilot and Monarch's month-level plan/actual
views, localized to Kwilt's committed/flexible vocabulary.

Best when: real usage shows monthly-plan comprehension is the dominant problem.

Fails when: the interface becomes a dashboard and buries the quick decision the
current Summary already serves.

## Recommendation

Choose **Direction B — Progressive Plan Statement**.

The existing Summary's strongest asset is the answer Andrew already wants to
retain: flexible money left this month. The dominant blocker is not absence of
financial detail; it is that setup and explanation center the wrong concept.

The recommended change replaces the percentage center while preserving the
ordinary return experience:

```text
First use
Connect evidence
→ Kwilt recommends one monthly plan
→ user accepts
→ categories are built
→ Summary shows flexible money left

Ordinary return
Flexible money left
→ quiet monthly-plan statement
→ category rows

Exceptional month
Flexible money left
→ monthly-plan statement names addition
→ contextual review if action is needed
```

The bet:

> We are betting that the current flexible-money answer is already the right
> first focal point, and that the dominant problem is the percentage-first
> setup and hidden plan arithmetic. If the rendered version still does not
> land, the next move is Direction C's stronger month-statement hierarchy—not
> more settings or explanatory copy.

## Recommended Screen-by-Screen Change

### 1. Money first use

Current:

```text
Choose a monthly living target
70%
[slider]
Use this target

Connect accounts
```

Proposed:

```text
Connect the accounts that matter
Kwilt uses secure history to understand income,
committed costs, and everyday spending.

[Connect accounts]

Making sense of your money

Plan around $8,000 each month
Keeps $5,200 for bills and money set aside,
with about $2,800 for flexible spending.

[Use this plan]
 Compare other amounts
```

The amount and values above are realistic-state placeholders only. Mockups must
use one coherent fixture and label all unsupported evidence honestly.

If evidence cannot support a recommendation:

```text
What monthly amount should your plan use?
Kwilt can organize current spending now and improve
the recommendation as more history becomes available.

[$ amount]
[Use this amount]
```

Percentage of income may appear inside `Compare other amounts` or `How Kwilt
chose this`, never as the universal first decision.

### 2. Budget Summary

Preserve:

```text
August

Flexible spending
$624 left this month
```

Keep the selected-month controls in their current page-content row. Preserve
both arrows, the month label, View, Add category, and horizontal month paging.

Add one secondary month-level plan statement above both spending sections:

```text
Monthly plan $8,000                         ›
```

Exceptional month:

```text
Monthly plan $8,000 · $1,740 added         ›
```

Do not add a second card or competing CTA. This is a plain aligned row beneath
the scoped month header, not content inside the Flexible spending card.

Use one explanation affordance for Flexible spending: `What's included?`.
Remove the duplicate info popover from the section label.

Give Flexible spending a borderless state surface. Keep the amount in dark ink
and use pale pine, turmeric, or madder surfaces for on-track, watch, and over.
The state word remains visible and accessible so color is not the only signal.

Give Committed spending its own planned-versus-used answer, such as `$4,860
spent out of $5,220`, without replacing the committed category inventory.

The category list remains the next focal point. A category with material carry
may show compact provenance beside its available amount:

```text
Health                         $300 left
Monthly $400 · −$100 from July
```

Do not add rollover pills to every row. Show the signed line only when nonzero.

### 3. `This month's plan` drawer

Replace the current `Flexible spending` explanation organized around living
percentage with:

```text
This month's plan

$624 left this month

REGULAR PLAN
Monthly household plan                    $8,000
Bills and money set aside                −$5,200
Flexible capacity                         $2,800

THIS MONTH
Added for Olive's orthodontics           +$1,740
Flexible spending                        −$2,176
Left                                        $624

Based on current connected evidence · Updated today
```

Only render `Added this month` when nonzero. Carry belongs in category
arithmetic unless aggregate carry materially changes the whole flexible answer;
that household-level relationship remains an explicit mockup question.

The percentage derivation moves behind the monthly household plan row:

```text
Monthly household plan $8,000             ›
Based on 70% of supported regular income
```

### 4. Money Plan

Replace the current competing `Living target` and `Monthly planning amount`
groups with one primary group:

```text
MONTHLY HOUSEHOLD PLAN
Plan amount                               $8,000
How Kwilt chose it           Regular income rule
Review another amount                          ›
```

Then:

```text
CARRY FORWARD
Default start                    January 2026
Start all categories fresh                 ›
Start each plan year fresh               Off
```

Then recent plan receipts.

Do not expose `Use 5% less` and `Use 5% more` as permanent top-level settings.
Changing the amount should be a consequence-aware plan review, not arithmetic
buttons.

### 5. Category detail

Keep the primary month read, but change the facts when carry is active:

```text
Health

Spent              Available       Monthly amount
$200                $300             $400

THIS MONTH
Monthly amount                         $400
From July                             −$100
Available                              $300
```

If a one-time addition exists:

```text
Monthly amount                         $400
From July                             −$100
Added for Olive's orthodontics       +$1,740
Available                            $2,040
```

Replace the funding-rhythm section inside Category settings with:

```text
Carry balance forward                    On
Carrying since                  January 2026
Start next month fresh                     ›
```

The base amount editor remains, but it must clearly state whether a change
applies to the durable category amount or only the selected month.

Remove from ordinary UI:

- `Monthly` versus `Reserve` mode;
- expected-need and due-month fields as a general category configuration;
- `Funding: Monthly/Reserve` fact.

Useful reserve accumulation arithmetic may remain as internal implementation.

### 6. Material overage

Do not add a persistent exception manager. Activate only when a consequential
mismatch is explainable:

```text
Health is $1,740 above its available plan
Olive's orthodontics appears to be the reason.

[Add $1,740 to August]
 Leave August over plan
```

After acceptance:

```text
August updated
Added $1,740 for Olive's orthodontics.
Your usual monthly plan is unchanged.
```

The alternate recovery path remains available from category detail:

```text
Carry the $1,740 deficit forward
```

Do not force the user to choose a funding account or annotate the transaction.

### 7. Rollover start and reset

When enabling carry:

```text
Carry Health's balance forward

Start tracking from
(•) This month
( ) January 2026
( ) Choose another month
```

Historical selection preview:

```text
If Health had been $400/month since January,
August would begin with −$100 carried forward.

Connected history is complete from January.

[Use this history]
```

Reset:

```text
Start Health fresh in September?

September will use the usual $400 monthly amount.
August's $100 overage remains in history but will
not reduce September.

[Start fresh]
```

These are drawers launched from category settings or Money Plan, not permanent
forms on the category screen.

### 8. Transactions

No ordinary layout change is required in the first mockup.

Do not add `Paid from savings` or split-source fields to every transaction.
Keep transaction detail focused on category and money meaning. Revisit
`Outside the plan` later so an unusual but real household expense is not hidden
merely because savings funded it.

## UI Contract

Job: When the household opens Money or encounters a meaningful plan mismatch,
the user needs one intelligent monthly amount, one flexible-money answer, and a
plain explanation of material adjustments so they can act without administering
a budgeting system.

Authority chain:

1. Accepted decisions in `03-converge.md`.
2. `jtbd-review-budget-reality-before-spending` and the Maya Money job flow.
3. Current Kwilt Money Summary's flexible-first hierarchy.
4. Kwilt semantic tokens and canonical React Native components.
5. Current first-entry interstitial composition where it remains compatible.
6. Task-scoped external exemplars only for named arithmetic relationships.

Three-second read:

- setup: `Plan around $X each month`;
- Summary: `$Y left this month`;
- category with carry: `$Z available`, adjusted from the regular monthly amount.

Primary action:

- setup: `Use this plan`;
- material mismatch: `Add $X to August`;
- ordinary Summary/category use: no new dominant action.

Primary information:

- flexible money left;
- recommended or adopted monthly household amount;
- material current-month addition or signed carry when it changes the answer.

Secondary information:

- committed/protected versus flexible composition;
- derivation;
- start/reset history;
- plan receipts.

Reveal later:

- percentage rule;
- evidence details and confidence;
- comparison amounts;
- historical counterfactual assumptions;
- reset and annual-boundary controls.

Scan order:

- setup: amount → consequence → action;
- Summary: scoped month → monthly plan statement → flexible money left →
  categories → committed spending;
- category: available → spent/base amount → signed arithmetic → controls.

Must not add:

- a budgeting-method selector as the first decision;
- a plan dashboard;
- a second Summary hero card;
- a permanent exception manager;
- routine transaction funding provenance;
- Reserve as a separate ordinary category mode;
- rollover badges on every row;
- automatic exception acceptance;
- unsupported savings or runway figures.

Reuse map:

- first-use canvas → current `MoneySetupStepInterstitial` and canonical Button;
- recommended amount → existing interstitial heading hierarchy;
- Summary answer → current `MoneyPlanLimitAnswer` composition;
- plan explanation → current BottomDrawer and statement rows;
- category arithmetic → existing facts/stat rows, reduced and relabeled;
- carry toggle → current `KwiltSwitch`;
- start/reset/exception review → current BottomDrawer consequence pattern;
- receipts → current Money Plan receipt rows.

Nearest precedent:

- current Summary flexible-spending answer for hierarchy;
- current governed category-change preview for consequence and authority;
- current first-entry interstitial for focused setup moments.

External exemplar ledger:

- Copilot Money Help Center, checked 2026-08-20: preserve cumulative signed
  carry and explicit start; translate arithmetic; reject mode complexity.
- Monarch rollover help, checked 2026-08-20: preserve plan/actual/remaining
  separation; translate signed provenance; reject bucket ontology.
- YNAB targets/month rollover help, checked 2026-08-20: preserve contribution
  versus available distinction; reject target configuration burden.

Behavior sources:

- monthly household amount, signed carry, additions, boundaries, and rejected
  funding provenance → `03-converge.md`;
- current flexible-first answer → `MoneySummaryScreen.tsx` and
  `MoneyPlanLimitAnswer`;
- account connection and plan generation → current Money setup operations;
- consequence/receipt authority → governed Money plan contracts.

Unresolved decisions:

- where savings and the decremented resource pool appear;
- whether net flexible-category carry changes the whole flexible answer or is
  presented as category-specific earmarking;
- how estimated additions settle to actual amounts;
- what evidence threshold triggers an addition suggestion;
- exact terminology for `added this month`;
- protected-floor behavior under a large carried deficit; and
- final rendered hierarchy and copy.

Required mockup states:

1. recommended first-use plan after connected evidence;
2. insufficient-evidence manual amount;
3. ordinary Summary with no additions or carry;
4. Summary with one current-month addition;
5. category with positive carry;
6. category with negative carry below the monthly amount;
7. category deficit larger than the monthly amount;
8. retroactive January start with complete evidence;
9. retroactive start with partial evidence;
10. one-category reset preview;
11. material overage before addition acceptance;
12. accepted one-time addition receipt;
13. enlarged text and narrow viewport for the densest arithmetic state.

Proof path:

Render the proposed states against the current iPhone 17 Pro Money visual
grammar before changing production source. Compare the ordinary Summary against
the existing flexible-first screen, then test whether carry and additions remain
understandable at a three-second glance without opening the explanation. Keep
Simulator, signed-device, TestFlight, and live connected-account proof as
separate later gates.

## First Rendered Set

The first mockup set contains four screens, not the full required-state matrix:

1. evidence-backed plan recommendation during setup;
2. ordinary Summary with the quiet monthly-plan statement;
3. Health detail with `$400` base, `−$100` prior carry, and `$300` available;
4. August Summary or plan drawer with Olive's orthodontics added once.

That set is sufficient to judge the core hierarchy. See
`07-four-screen-mockup.md`. Start/reset drawers and partial-history states can
follow only if the four-screen model lands.
