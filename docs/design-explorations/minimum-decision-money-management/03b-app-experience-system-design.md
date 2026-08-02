# App Experience System Design: Protected Core, Flexible Room

## Status

This is a UX and system-design recommendation. It describes how the accepted
concept could reshape the existing Money capability while preserving Kwilt's
shell, native navigation grammar, and current product strengths. It does not
authorize implementation.

The practical recommendations for purchase questions, setup, contextual Chat,
Screen Time setup, and the `Summary` name were refined after review in
[`03c-practical-workflow-refinement.md`](./03c-practical-workflow-refinement.md).
That document supersedes those details here; this document remains the broader
system inventory.

## Experience thesis

Money should no longer make the customer assemble an answer from meters,
percentages, category tiles, transactions, forecasts, and settings.

Every relevant surface should follow one hierarchy:

1. **Answer:** what is true for the current question?
2. **Meaning:** what changes and what remains protected?
3. **Choice:** is there a decision only the customer can make?
4. **Evidence:** how did Kwilt calculate this?
5. **Control:** where can the underlying truth or policy be corrected?

The evidence and controls already present in Money remain valuable. They move
behind a decision-ready answer rather than disappearing.

## What stays unchanged

- Kwilt's capability shell and global navigation.
- Money's top-level Summary, Transactions, and Accounts destinations.
- Native stack, back, gesture, sheet, deep-link, and restoration behavior.
- Global Chat ownership and exact native return.
- Summary's month context and category access.
- Category detail's object-page grammar, cover, meter, forecast, activity, and
  transactions.
- Transaction detail as the authoritative correction surface.
- Money plan settings and receipts as nested configuration/history.
- Category-owned Screen Time policy and Apple's opaque picker.
- Money-owned calculation, privacy, preview, mutation, receipt, and reversal.

No new Money tab, local shell, dashboard destination, planner destination,
question center, protection center, or floating global control is recommended.

## System architecture

```text
Connected accounts + transaction truth + active living plan + customer rules
                                  |
                                  v
                  Protected / Flexible projection
                  - planning income and living limit
                  - fixed commitments and reserve contributions
                  - flexible capacity, use, forecast, and room
                  - unassigned, over-target, freshness, and scope
                                  |
                   +--------------+--------------+
                   |                             |
                   v                             v
          Current-state answer            Hypothetical scenario
          Summary / widget / Chat         Purchase / rebalance / exception
                   |                             |
                   +--------------+--------------+
                                  v
                     Critical-Moment Answer
                     - headline
                     - consequence
                     - protected fact
                     - qualification
                     - supported next moves
                                  |
                                  v
       Summary / Category / Chat / Screen Time / Widget / Receipt
```

The architecture has one financial projection and one answer grammar. Each
surface supplies context and chooses an appropriate presentation; none rebuilds
the arithmetic.

## Shared UX grammar

### Answer block

The answer block is a typographic hierarchy, not necessarily another card.

It contains:

- a complete-sentence or noun-phrase headline;
- the amount and period when relevant;
- one consequence or reassurance;
- one visible qualification when evidence is limited;
- at most one primary action;
- one explicit disclosure action such as `See how this is calculated`.

Examples:

> **$343 left for flexible spending**
> Of $960 through July 31
> Fixed expenses and planned contributions remain protected.

> **This purchase fits your plan**
> It would leave $283 of flexible room. Clothing would have $14 left.

> **Kwilt cannot check flexible spending yet**
> Two recurring expenses still need meaning. Your last trustworthy answer was
> updated July 20.

### Evidence disclosure

The disclosure reveals:

- planning-income basis and provenance;
- living percentage and dollar limit;
- fixed commitments and reserve contributions;
- flexible capacity, spending, and forecast;
- unassigned capacity or over-target amount;
- freshness, account scope, and uncertain inputs;
- exact category or transaction sources.

It should use an existing drawer, nested detail, or exact object route depending
on depth. It must not become a permanent plan-math card.

### Decision actions

Actions depend on the originating moment:

- ordinary Summary: no required action;
- purchase scenario: change amount, see ways to make room, or close;
- plan change: Save or continue editing;
- Screen Time review: Open for 20 min or Keep blocked;
- stale evidence: refresh or inspect the exact account/transaction;
- household authority: send the scoped decision or leave;
- Chat: inspect the Money source or continue with one material clarification.

No generic `Continue` should conceal what authority is being exercised.

## Summary

### Current role

The current Summary leads with a month selector, a two-column category grid,
and a total row showing `spent / planned`, percent used, remaining total, and
freshness. It provides strong inventory but requires the customer to interpret
how category totals relate to income, fixed commitments, flexible spending, and
the next decision.

### Recommended role

Summary becomes the authoritative current orientation surface:

1. month context;
2. flexible-room answer;
3. one material exception or no additional message;
4. existing category evidence;
5. total/freshness and deeper explanation.

### Conceptual current-month layout

```text
Summary                                             •••

‹  ›   July 2026                                  ＋

$343 left for flexible spending
Of $960 through July 31
Fixed expenses and planned contributions remain protected.

Check a purchase
See how this is calculated

Where your plan is going

[ Groceries  61% ]        [ Dining  76% ]
[ $256 / $420   ]         [ $137 / $180  ]

[ Housing   100% ]        [ Travel reserve ]
[ $1,600 planned ]        [ $620 available ]

Connected accounts · Updated today
```

This is a hierarchy sketch, not a pixel design. The current category tiles can
remain initially. The concept does not require immediate separate `Fixed` and
`Flexible` grid sections, new colors, or a redesigned meter.

### Current, past, and future language

- Current month: `$343 left for flexible spending through July 31.`
- Past month: `You finished June with $112 of flexible room.`
- Future month: `August plans $960 for flexible spending.`

Historical answers must use the historical plan version for that period. The
app must not project current category limits backward and present them as past
truth.

### Summary states

**Ready**
Lead with supported flexible room.

**On pace but category guide exceeded**
`Groceries is $40 above its guide. The flexible plan still has $120 overall.`

**Forecast risk**
`You have $343 left now. Current spending is likely to use it before month end.`

**No flexible room**
`Protected expenses use the full 70% living limit. Flexible room is $0.`

**Over target**
`Protected expenses exceed the living limit by $84. Kwilt has not reduced them.`

**Unassigned or uncertain**
State the supported amount and the specific evidence preventing a fuller claim.

**Stale**
Keep the last trustworthy answer, label its date, and provide one recovery path.

**No trustworthy basis**
Do not display `$0 left`. Say what Kwilt cannot calculate and what one input is
needed.

## Category tiles

### Recommended initial treatment

Preserve the recognizable radial meter and direct entry to category detail.
The flexible-room answer above the grid does the new interpretive work.

The tile remains local:

- percentage of this category guide used;
- spent versus guide or contribution;
- risk/forecast status already expressed through the meter.

Avoid adding `fixed`, `flexible`, `protected`, source, room, forecast, and
household-limit labels to every tile. That would make the new system more
comprehensive and less understandable.

### Later research question

Test whether the grid benefits from a restrained distinction between:

- flexible guide;
- fixed commitment;
- reserve.

Do not introduce separate permanent sections until observed comprehension shows
the distinction helps more than it fragments the familiar category model.

## Category detail

### Current role

Category detail already has strong object identity, a visual meter, month
navigation, forecast explanation, transaction activity, stats, settings,
governed plan preview, and app-control handoff.

### Recommended default hierarchy

1. Existing category hero and name.
2. Local decision answer.
3. Existing meter and forecast.
4. Activity and transactions.
5. Monthly facts and deeper controls.

Examples:

Flexible category:

> **$214 left in Groceries**
> The overall flexible plan has $343 left. Groceries is currently on pace.

Fixed category:

> **$1,600 protected for Housing**
> This is included before Kwilt calculates flexible spending.

Reserve:

> **$620 available for Travel**
> Your plan adds $100 each month. This balance is not general flexible room.

### Pending Screen Time review

When the category was opened from a Screen Time handoff, the critical-moment
answer moves above the ordinary chart. The hot job outranks routine inspection.

```text
Shopping is paused

$84 left in Shopping
$214 flexible room remains in the overall plan

You asked Kwilt to pause when Shopping runs ahead of the month.

Planning to spend?  Check an amount

[ Open for 20 min ]
[ Keep blocked    ]
```

`Check an amount` remains optional unless the customer's own policy requires a
purchase-specific review. Opening an app may mean browsing, checking an order,
or returning something; Kwilt must not assume a purchase.

### Category settings

Keep settings nested. Clarify three distinct effects before Save:

- editing a flexible guide redistributes flexible capacity;
- locking a guide changes future automation authority;
- changing a fixed or reserve amount changes total flexible capacity.

Example preview:

> Raising Groceries to $800 moves $80 from other flexible guides. Your 70% limit
> and protected expenses do not change.

Or:

> Adding a $120 protected repair contribution reduces monthly flexible spending
> from $960 to $840.

Use the existing authoritative preview and receipt path. Do not add a planner
grid or separate confirmation after the customer has already understood the
complete consequence.

## Check a purchase

### Entry points

Initial supported entries:

- `Check a purchase` on current-month Summary;
- contextual entry on a flexible category;
- optional amount check during a Screen Time review.

Later entries:

- natural-language Chat question;
- share or camera input;
- widget or notification return;
- household decision handoff.

### Surface

Use the existing drawer grammar rather than a new route for the initial native
flow.

From category detail, the category is already known:

```text
Check a purchase

Amount                 $60
For                    Clothing

This fits your plan.
It would leave $283 of flexible room and $14 in Clothing.
Protected expenses stay unchanged.

See calculation
```

From Summary, ask for purpose only when it materially changes the answer. The
system may first calculate whether every plausible flexible category produces
the same aggregate result.

### Actions

If it fits, the drawer may need no primary mutation action. The app cannot buy
the item. Close is a legitimate completion.

If it requires a trade-off:

- `See ways to make room` opens a governed hypothetical preview;
- `Change amount` keeps editing;
- close leaves everything unchanged.

Only an accepted plan change creates a receipt. A question does not create a
financial record or imply that a purchase occurred.

## Setup

### Current role

Current setup asks for a living percentage before account evidence, then
connects accounts, builds the plan, and sends the customer to Summary. This is
coherent with the existing allocator but cannot show the dollar or flexible-room
consequence when the percentage is chosen.

### Recommended flow

```text
1. Promise
   Know what is protected and what remains flexible.

2. Evidence
   Connect the accounts that should inform ordinary living.

3. One governing choice
   Choose the share of supported monthly income for ordinary living.
   Always show percentage and dollars together.

4. Result
   Kwilt found supported fixed commitments and reserve contributions,
   drafted flexible guides, and presents the first flexible-room answer.
```

Example target step after evidence:

> **Use 70% for monthly living**
> 70% of $4,800 is $3,360. Based on current evidence, this protects $2,400 and
> leaves $960 flexible.

The percentage remains the one values decision. Account evidence performs the
arithmetic before the customer must understand its effect.

### Exceptions

- If income evidence is missing, ask for one stable monthly planning amount.
- If a recurring commitment is consequentially uncertain, ask one concrete
  question after showing the provisional result.
- Do not require a category allocation review.
- Do not present a list of every inferred fixed expense unless the customer asks
  to inspect the calculation.
- Do not call the amount outside the living limit savings.

### Setup completion

Replace the abstract completion message `Your plan lives in Kwilt now` with the
first useful result:

> **Your Money plan is ready**
> $2,400 is protected for fixed expenses and planned contributions. $960 is
> available for flexible spending this month.

Primary action: `View Money summary`.

The existing plan-review action remains secondary and should not imply that
allocation review is required.

## Money plan settings

### Current role

The nested Money Plan surface exposes living percentage, 5% adjustments,
monthly planning amount, timing, and receipts. It is the correct location but
uses language that requires the customer to translate `living target` and
`planning amount` into consequences.

### Recommended hierarchy

**Monthly living plan**

- `70% of $4,800`;
- `$3,360 monthly living limit`;
- `$2,400 fixed and protected`;
- `$960 flexible`.

**Change the living limit**

Each 5% adjustment previews dollars and flexible-room effect before Save:

> Using 75% adds $240 to flexible capacity. Fixed expenses and planned
> contributions do not change.

**Planning-income basis**

Reveal as deeper configuration when connected evidence cannot support the
number or the customer explicitly wants their own stable basis.

**Plan timing and receipts**

Keep the current two rhythms and receipt history. Translate latest results into
the protected/flexible model.

Do not create an editable fixed-expense table or allocation planner here by
default.

## Transactions

### Inventory

Keep the current date scope, filtering, merchant names, amounts, account source,
and review state. Do not add economic-role labels to every row.

### Transaction detail

When inspected, explain the transaction's effect in customer language:

- `Counts against flexible spending`;
- `Counts against the Housing amount already protected`;
- `Uses the Travel reserve`;
- `Returns money to Groceries`;
- `Transfer—does not count as spending`;
- `Outside the monthly living plan`;
- `Kwilt needs your help before using this in an answer`.

When correcting meaning, show the consequence only when material:

> Moving this to Health changes where flexible spending appears, but flexible
> room remains $343.

Or:

> This changes the transaction from flexible spending to the Medical reserve.
> Flexible room increases by $86; the reserve will have $224 left.

The correction remains authoritative and updates Summary, category detail,
Chat, widgets, and future decisions from one projection.

## Accounts

Accounts remains the inventory and evidence-health destination. Its primary UX
does not need redesign for this concept.

It gains exact return paths for answer limitations:

> Flexible room was last updated July 20 because Chase needs to reconnect.

The customer lands on the affected account and recovery action, not a generic
setup screen.

Account inclusion changes current transaction truth immediately and automatic
plan guidance on the governed rhythm. Any material protected/flexible change
gets one understandable receipt.

## Chat

### Entry

Global Chat and existing contextual launch grammar stay unchanged. Money context
may be visible through the established removable context chip or exact native
return—not a new permanent Money chat tab.

### Answer shape

```text
You: Can I spend $75 on a birthday gift?

Kwilt: This fits your monthly plan. It would leave $268 of flexible room.
Your Gifts reserve would still have $310.

Based on Money updated today.
[See Gifts in Money]
```

If the question means something else:

```text
You: How much can I spend before Friday?

Kwilt: Your monthly plan has $343 of flexible room. I can't yet check whether
checking can cover spending before Friday and still cover upcoming bills.
[See how the monthly amount is calculated]
```

Chat preserves the customer's words, maps them to bounded question types, asks
at most one materially branching clarification, and renders the Money-owned
answer. It does not generate SQL, perform independent arithmetic, or offer
financial advice.

## Widgets and scheduled delivery

Widgets consume the same projection and existing privacy gate.

Possible privacy-permitting states:

- `$343 flexible room`;
- `Flexible spending is on plan`;
- `One Money item needs attention`;
- `Money updated today`.

The widget does not display a competing percent-used calculation. A tap returns
to Summary or the exact category/decision context.

Scheduled notifications or texts remain later delivery channels. They rerun a
typed question against current evidence and must show freshness and configured
disclosure. They do not store SQL or execute a frozen natural-language query.

## Screen Time protection

### Policy setup

Category ownership and Apple's picker stay unchanged. The primary experience
should express protection in customer language:

> Pause Shopping when it could use the flexible room I want to keep.

The current five presets may remain as advanced conditions. A first-use
recommendation should not require the customer to compare all five before
receiving value.

The customer may optionally preserve a short reason:

> Keep $200 for the last week of the month.

That reason is returned during the review; it is not an AI-authored moral
message.

### Runtime review

The existing handoff and 20-minute access window remain. The review adds:

- why this specific protection triggered;
- the current relevant Money answer;
- the customer's reason when configured;
- optional proposed-amount checking;
- the same two authority choices.

Opening access records only that authority. It does not infer browsing,
purchase, merchant, amount, or regret.

## Household experience

Household support remains deferred until durable membership, scope, and
authority exist. The model nevertheless defines the UX contract:

- everyone with equivalent scope receives the same arithmetic;
- wording may reflect familiar language without changing truth;
- a scoped answer may omit unrelated accounts and transactions;
- a handoff carries one decision, consequence, and authority request;
- ordinary household spending should not become a permission queue;
- assistance for a low-fluency user must not silently transfer ownership.

No shared Money screen or household feed is recommended from this concept alone.

## Copy system

### Primary terms

- `Monthly living limit` rather than `living target` in primary UI.
- `Fixed expenses and planned contributions` rather than `hard allocations`.
- `Flexible spending` rather than `discretionary spending`.
- `Flexible room` rather than `unassigned capacity` when the amount is supported.
- `Your plan has` rather than `You have` when cash liquidity is not proven.
- `Guide` rather than `limit` for system-adjustable flexible categories.
- `Set by you` or `protected from automatic changes` for customer-locked guides.

### Answer rules

- Complete sentence before arithmetic.
- Percentage always paired with dollars.
- One period or financial boundary named.
- State hypothetical versus committed.
- State the unverified dimension when it could change interpretation.
- No `safe`, `affordable`, `covered`, or `you can buy this` without evidence that
  supports the full claim.
- No shame, discipline scoring, or implied moral ranking of categories.

## Low-app-fluency and accessibility contract

- The primary current answer is visible without swiping months, opening menus,
  interpreting radial meters, or remembering navigation.
- Essential actions use text labels; icons do not carry the only meaning.
- One question and one dominant action appear at a time.
- Text scales without hiding the amount, period, qualification, or decision.
- Touch targets meet the existing system standard and remain spatially separated.
- Screen readers announce answer, scope, qualification, and state before
  supporting arithmetic.
- Color never carries fit/risk meaning alone.
- Loading retains the last trustworthy answer when available.
- Error states identify whether the problem belongs to evidence, the plan, or
  the proposed action and provide one recovery path.
- Back and close always leave hypothetical state uncommitted.
- The product never presents an age-derived mode or assumes a helper should gain
  access.

## Domain and service changes implied

### New pure projection

A conceptual `FlexibleRoomProjection` derives:

- planning-income basis and scope;
- living percentage and target dollars;
- fixed commitment total;
- reserve contribution total;
- flexible capacity;
- counted and forecast flexible spending;
- flexible room;
- unassigned and over-target facts;
- freshness and confidence;
- historical plan version when rendering another period.

### Explicit economic and governance roles

Current plan allocations expose fixed, override, and flexible facts, but the
new UX depends on independently representing:

- economic role: fixed, flexible, reserve, outside, or provisional;
- governance role: customer-protected, system-adjustable, or provisional.

The implementation must prove whether existing allocation rows and transaction
meaning can represent fixed and flexible components that coexist in one
user-facing category. If not, the domain needs an additive component-level
extension before the UI can make trustworthy flexible-room claims.

### Typed question and answer contract

A conceptual `CriticalMoneyQuestion` captures:

- original wording;
- bounded question family;
- originating context;
- known amount, category, period, and household scope;
- one materially branching unknown.

A conceptual `CriticalMoneyAnswer` returns:

- headline and status;
- primary consequence;
- protected fact;
- evidence qualification;
- supported next actions;
- exact native return;
- hypothetical versus committed state.

### Scenario boundary

Purchase and rebalance scenarios use a non-mutating projection. Preview state
must never leak into the active snapshot, widget, Chat answer, Screen Time
policy, or receipt until an authoritative Save succeeds.

### Surface consistency

Summary, category detail, Chat, widgets, and Screen Time should consume the same
projection version or disclose why they do not. A correction or committed plan
change must update downstream answers consistently.

## Implementation sequencing implied by the UX

This is not yet a build authorization, but the dependency order is clear:

1. Prove economic/governance roles and historical-period semantics in the
   domain.
2. Build and test the pure flexible-room projection.
3. Render the current-state answer on Summary with all non-ideal states.
4. Add one category-scoped purchase scenario using the same projection.
5. Carry the answer into the existing Screen Time handoff.
6. Expose the typed answer through Chat and glanceable state.
7. Add customer-owned protection reasons and later delivery modalities only
   after comprehension and trust are proven.

Building Chat, widgets, or a redesigned setup before the projection would create
multiple polished surfaces with no shared authoritative answer.

## What should be removed, collapsed, or demoted

- Demote the Summary total row from primary interpretation to supporting
  arithmetic once flexible room leads.
- Collapse repeated percentage explanation into one evidence disclosure.
- Remove any duplicate category quick-edit path that bypasses whole-plan preview.
- Avoid showing all five Screen Time presets as the first protection decision;
  keep advanced policy available after a simple customer-owned intent.
- Demote planning-income override and receipt mechanics beneath the primary
  Money-plan consequence.
- Do not duplicate plan math in Chat copy, widget code, or Screen Time logic.

## Unresolved UX decisions before a learning release

1. Should the Summary answer sit above the existing category grid or replace the
   current total section while remaining visible before the grid?
2. Is `flexible room` immediately understood, or is `left for flexible spending`
   sufficient without naming the concept?
3. Should `Check a purchase` be visible on Summary, contextual to categories,
   or initially available only through the Screen Time decision moment?
4. How should a category containing both supported fixed and flexible components
   present one meter without flattening the distinction?
5. What evidence threshold allows fixed commitments to appear in the protected
   total without a setup review?
6. Should a system-adjustable category guide rebalance automatically within the
   month or only shape the next month's plan?
7. What is the least alarming treatment of `protected core exceeds limit`?
8. How much exact financial detail may appear in widgets and notifications under
   the existing privacy contract?
9. Which answer language best prevents plan room from sounding like cash in the
   bank?
10. Can the first learning release test Summary comprehension and a purchase
    decision together without making either experience feel incomplete?

## Recommended first UX conversation

Before defining a learning release, resolve three design choices:

1. **Summary hierarchy:** answer above the existing grid versus a more structural
   reorganization of category presentation.
2. **Category-guide strength:** soft system guides by default versus individually
   enforced category limits.
3. **First critical moment:** voluntary `Check a purchase` versus the existing
   Screen Time handoff where the intention is already hot.

Those choices determine the minimum coherent app experience. Everything else
can remain a later doorway to the same system.
