# Exploration: What Protected Core, Flexible Room Means

## Purpose

This artifact explores the implications of the converged system without
authorizing implementation. It asks whether one simple customer model can remain
financially honest across setup, ordinary orientation, category ambiguity,
purchase decisions, self-protection, rebalancing, household use, and changing
circumstances.

## The deeper product shift

Budget products often make categories the thing the customer operates. Protected
Core, Flexible Room makes categories supporting explanations inside a more
fundamental household question:

> After the things I have already committed to, what room remains for the parts
> of life that can still vary?

This changes the product from a category-allocation interface into a system that:

1. maintains one governed monthly boundary;
2. protects known commitments and future needs;
3. computes the supported room that can still flex;
4. explains where that flexible spending is going;
5. evaluates new decisions against the same truth;
6. asks for human judgment only when a value, authority, or material ambiguity
   genuinely remains.

## Semantic refinement

The apparent simplicity depends on keeping several meanings distinct internally.

### Economic role

**Fixed commitment**
A predictable obligation that is difficult to vary in the current period. The
plan protects its expected monthly amount whether or not the transaction has
posted yet.

**Reserve contribution**
A stable monthly amount assigned to a future or lumpy need. The contribution
belongs inside the monthly living limit; the accumulated reserve balance does
not become general flexible room.

**Flexible spending**
Spending whose amount can vary with ordinary life or customer choice. Flexible
does not mean unnecessary. Groceries, fuel, medicine, household supplies, and
children's needs may all be flexible.

**Outside the living plan**
Money or activity not assigned to ordinary monthly living. Kwilt does not infer
that it is savings, investing, debt repayment, giving, or spendable cash.

### Governance role

**Customer-protected**
Kwilt may explain and preview the amount but cannot reduce, repurpose, or
reinterpret it automatically.

**System-adjustable**
Kwilt may maintain the amount within a confirmed deterministic policy and must
leave an inspectable receipt for material changes.

**Provisional**
The evidence is not strong enough to support consequential calculation or
automatic maintenance.

### Why the axes matter

Economic role and governance role answer different questions:

| Example | Economic role | Governance role |
| --- | --- | --- |
| Rent supported by recurring evidence | Fixed | System-maintained or customer-confirmed |
| Dining amount explicitly locked by customer | Flexible | Customer-protected |
| Repair reserve contribution | Reserve | Customer-protected or governed |
| New pharmacy transaction with mixed contents | Provisional fixed/flexible meaning | Provisional |

A locked Dining guide remains part of flexible room. It is not moved into the
protected core merely because Kwilt lacks authority to rebalance it. Otherwise
the primary number would slowly turn every explicit preference into a “fixed
expense” and become meaningless.

## The core arithmetic

Let:

- `B` = stable monthly planning-income basis;
- `p` = customer-confirmed living percentage;
- `T = B × p` = monthly living limit;
- `P` = supported fixed commitments plus monthly reserve contributions;
- `F = max(0, T - P)` = total flexible capacity;
- `V` = counted flexible spending in the current period;
- `R = F - V` = flexible room remaining;
- `O = max(0, P - T)` = protected-core overage before flexible spending.

Example:

| Fact | Amount |
| --- | ---: |
| Stable monthly planning income | $4,800 |
| Living limit at 70% | $3,360 |
| Fixed commitments | $2,100 |
| Reserve contributions | $300 |
| Protected core | $2,400 |
| Flexible capacity | $960 |
| Flexible spending so far | $617 |
| Flexible room remaining | $343 |

The plain answer is:

> Your plan has $343 left for flexible spending this month.

`Your plan has` is more precise than `You have`. The latter can sound like a
claim about bank liquidity, bill coverage, or universal affordability that the
plan alone may not prove.

## Three numbers that must not be conflated

### Flexible room

How much supported flexible capacity remains inside the monthly living plan.

### Safe-to-spend now

How much could be spent before a near-term cash-flow boundary while supported
obligations remain coverable. This requires account timing and obligation
evidence beyond the category plan.

### Account balance

How much money an account currently contains. It may include money needed for
future bills, transfers, reserves, or purposes outside the living plan.

The product should answer the dimension asked and qualify the others:

> Your plan has $343 left for flexible spending this month. Kwilt has not checked
> whether checking can cover this purchase before Friday.

That qualification is essential to trust, especially for customers who use
`Can I afford this?` to mean several things at once.

## Supported versus unassigned capacity

The existing governed plan may leave capacity unassigned when evidence is too
sparse to allocate honestly. Unassigned target capacity should not automatically
become flexible room.

Two distinct states are possible:

- **Supported flexible room:** the plan has adequate evidence to make the claim.
- **Unassigned capacity:** arithmetic remains under the living limit, but Kwilt
  cannot yet say what portion is safely available for ordinary flexible use.

Plain response:

> Your confirmed categories have $220 of flexible room. Another $180 remains
> unassigned while Kwilt verifies two recurring expenses.

The default answer may need to remain conservative until research shows whether
people understand the distinction. Simplicity cannot come from silently treating
unknown money as spendable.

## What Summary becomes

Summary remains the current Money destination and retains the existing category
and month grammar. The change is hierarchy, not a new shell.

### First read

> **$343 left for flexible spending**
> Of $960 through July 31

One supporting status:

> Fixed expenses and planned contributions remain protected.

Or, when attention is required:

> Groceries is running high. The overall flexible plan still has $120 of room.

Or:

> Protected expenses now exceed the 70% limit by $84. Flexible room is $0.

### Second read

Reveal the arithmetic:

- monthly planning-income basis;
- 70% living limit and dollar amount;
- fixed commitments;
- reserve contributions;
- flexible capacity, used, remaining, and forecast;
- freshness and account scope.

### Existing category layer

Category tiles remain useful for answering `Where is it going?` They should sit
under the flexible-room answer rather than require the customer to sum and
interpret them before knowing where the household stands.

Fixed and reserve categories may still appear in the familiar category system.
The system should avoid forcing a dramatic visual split until research proves
that separate sections improve comprehension rather than create another
ontology to learn.

## What categories mean now

### Categories are explanations and local guardrails

Flexible category guides answer:

- where the flexible capacity is expected to go;
- which area is tighter than intended;
- whether a proposed purchase is ordinary or consequential;
- which adjustable areas could absorb a trade-off.

They are not automatically hard permissions. If Groceries is $40 above its
guide while the total flexible plan has $120 of room, the truthful answer is not
simply `Groceries is over`.

### Category boundaries can have different strength

- **System guide:** Kwilt may redistribute within flexible capacity.
- **Customer-locked guide:** still flexible spending, but unavailable for
  automatic redistribution.
- **Hard protection:** a fixed commitment or reserve contribution that flexible
  spending cannot consume.

The default should favor system guides and ask the customer to create a stronger
boundary only when they express a real reason. Otherwise the product merely
recreates envelope administration.

### Mixed merchants become less threatening

If every plausible split remains flexible and the purchase does not change a
decision, Kwilt can tolerate approximate categorization. Ask only when the split
would change:

- protected versus flexible treatment;
- reserve usage;
- a customer-locked category boundary;
- a material forecast or decision answer;
- household privacy or authority.

## What purchase decisions become

The proposed amount is evaluated against both the local guide and aggregate
flexible room.

| Situation | Decision answer |
| --- | --- |
| Fits category guide and flexible room | `This fits. It leaves $283 of flexible room and $14 in Clothing.` |
| Exceeds category guide but fits aggregate flexible room | `Clothing would be $46 above its guide, but the overall flexible plan still has $74 left. Protected expenses do not change.` |
| Fits only by moving an adjustable guide | `This can fit by moving $80 from Dining. Dining would have $45 left.` |
| Requires a locked flexible amount | `This would require changing the Dining amount you chose to protect.` |
| Requires protected core | `This does not fit the flexible room. It would require an $84 exception or a change to a protected amount.` |
| Evidence is insufficient | `Kwilt cannot tell yet because the purchase category changes the result and its purpose is unclear.` |

The final decision remains buy, wait, choose another amount, or accept the
trade-off. Kwilt does not label the purchase wise, deserved, irresponsible, or
morally discretionary.

## What rebalancing becomes

Rebalancing is no longer one generic category edit.

### Redistributing flexible guides

The total flexible capacity, living limit, and protected core do not change.
Only the suggested destination changes.

> This moves $80 of your flexible plan from Dining to Clothing. Your 70% limit
> and protected expenses stay the same.

### Locking a flexible guide

The financial role does not change, but future automatic authority does.

> Dining remains flexible spending, but Kwilt will no longer reduce its $200
> guide automatically.

### Increasing the total living limit

This changes the customer's governing boundary and deserves explicit values
authority.

> Raising the limit to 75% adds $240 to monthly living. The plan does not assign
> meaning to the remaining 25% of income.

### Expanding protected core

This reduces flexible capacity even if the total living limit stays constant.

> Protecting the new $120 repair contribution reduces flexible spending from
> $960 to $840 each month.

These distinct consequences should be stated before one Save. They should not
be hidden behind the generic phrase `category amount changed`.

## What setup becomes

The ideal setup is evidence-led and answer-first:

1. Connect supported accounts or provide the minimum manual basis needed.
2. Confirm the monthly planning-income basis only when evidence cannot.
3. Choose the share of income intended for ordinary living, with percentage and
   dollar amount always paired.
4. Kwilt identifies supported fixed commitments and reserve contributions.
5. Ask only about materially uncertain commitments that would meaningfully
   change flexible room.
6. Draft flexible category guides from household history.
7. End with the first useful answer—not an allocation review:

> Your plan protects $2,400 for fixed expenses and planned contributions. That
> leaves $960 for flexible spending this month.

Potential risk: confirming a large list of “fixed” transactions would destroy
the reductive model. The system needs a conservative evidence threshold and a
single exception-oriented review such as `Kwilt found three protected monthly
commitments. One needs your help.`

## What self-protection becomes

Protection attaches to an intention and a trigger, not merely to an app block.

Example intention:

> Keep at least $200 of flexible room through the last week of the month.

Example trigger:

> Pause Shopping when a purchase could cross that boundary.

Example critical-moment answer:

> Shopping is paused because you wanted to keep $200 for the last week. The
> flexible plan currently has $214 left.

Then, if a proposed amount is known:

> A $60 purchase would leave $154, below the boundary you chose.

The customer may open for 20 minutes, keep blocked, wait, or explicitly change
the protection. The system does not shame, secretly strengthen the restriction,
or infer that opening the app means a purchase occurred.

Protection can also mean no friction:

> This is within the room you already gave yourself. No review is needed.

## What Chat becomes

Chat is a language adapter over bounded Money questions, not a general financial
advisor.

### Example: vague question

Customer: `How much can I spend?`

Money can answer:

> Your monthly plan has $343 left for flexible spending. If you mean how much
> checking can safely cover before payday, Kwilt cannot check that yet.

This may resolve the ambiguity without asking anything.

### Example: branching ambiguity

Customer: `Can I spend $240 on tires?`

If using the Auto guide or repair reserve yields materially different results,
Kwilt asks one question:

> Should I check this against everyday Auto spending or your repair reserve?

Then it answers. It does not ask for category, account, date, period, and
financial goal separately.

### Example: explanation

Customer: `Why is flexible room only $343?`

> Your 70% living limit is $3,360. The plan protects $2,400 for fixed expenses
> and contributions, leaving $960 flexible. You have used $617 so far.

The same facts should render identically in authoritative UI, with Chat linking
to the exact supporting Money state.

## What an elderly customer should experience

Consider a retired customer whose money arrives through Social Security and a
pension and who thinks primarily in `bills first, then what is left`.

### First useful state

> Your plan protects $2,150 for fixed expenses and planned contributions. You
> have $540 for flexible spending until July 31.

No requirement to understand category allocation, percentage arithmetic, or
month-paging gestures precedes this answer.

### When she asks a familiar question

`Can I buy a $75 birthday gift?`

> This fits your plan. It would leave $465 for flexible spending this month. The
> gift reserve still has $310 afterward.

If cash-flow evidence is incomplete:

> This fits the monthly plan. Kwilt has not checked whether your checking account
> can cover it before your pension deposit on Friday.

### When something is wrong

> Kwilt cannot update flexible room because one pension deposit is still missing.
> The last trustworthy answer was $465 on July 20.

The customer receives a direct explanation and one recovery action. She is not
expected to diagnose syncing, distinguish fixture and provider state, or infer
which screen contains the problem.

### What makes confidence possible

- complete sentences before charts;
- familiar temporal boundaries such as the next deposit or month end;
- visible scope and freshness;
- one decision at a time;
- no hidden authority transfer;
- corrections that update every downstream answer;
- stable terminology and predictable return paths;
- supporting records available without being required reading.

## What automation becomes

The automatic living plan receives a clearer contract:

- Fixed commitments and reserve contributions establish the protected core.
- Flexible capacity is the remainder inside the living limit.
- System-adjustable category guides distribute flexible capacity.
- Customer-locked flexible guides retain their economic role but are excluded
  from automatic redistribution.
- Ordinary spending updates exposure now; automatic guide changes ordinarily
  apply next month.
- A material fixed or reserve change may alter flexible capacity and must create
  a plain notice or request one decision.
- Automation never labels the remainder outside the living limit.
- Automation never moves flexible spending into or out of protected core solely
  because history changed.

The ideal quiet notice is:

> Your internet bill increased by $15. Flexible spending will be $15 lower next
> month. Nothing else requires your attention.

## Edge cases that test the model

### Protected core consumes the entire limit

> Protected expenses use all of your 70% limit. Flexible room is $0. They exceed
> the limit by $84.

Do not invent negative flexible spending or silently cut commitments.

### Variable income

Use a conservative supported basis from completed periods. If the basis is a
range or low-confidence estimate, the flexible-room answer may need to be
conservative or unavailable rather than fluctuate with each deposit.

### Fixed bill has not posted

It remains in protected core because the plan reserves its expected amount. The
account balance must not be mistaken for free capacity.

### Credit-card purchase and later payment

Count the purchase against the relevant flexible or protected role when it
occurs. The later card payment is a transfer/payment event, not new spending.
Cash-flow timing remains a separate question.

### Refund or category credit

Return capacity to the same economic role when supported. Do not treat a refund
as new planning income.

### Mixed purchase crosses roles

A transaction containing groceries and an annual membership may cross flexible
and protected meanings. Ask for a rough split only when it materially changes
the answer; otherwise retain an explicit uncertainty range.

### Essential flexible category runs over

Do not frame groceries, fuel, or medicine as irresponsible. Explain the overall
flexible consequence and whether a guide, living limit, reserve, or future plan
needs reconsideration.

### Intentional one-time exception

Record the exception and its consequence, but let the permanent plan return
automatically next period unless the customer explicitly changes it.

### Household members use different language

One person may see `flexible spending`; another may ask `what is left after the
bills`. Both must resolve to the same facts and respect scoped authority.

## Main product risks

### False comfort from one number

`$343 left` may sound safer than the evidence warrants. Always scope it to the
plan and disclose missing cash-flow or freshness dimensions when material.

### Misclassifying necessities as discretionary

Use `flexible`, not `discretionary`, as the neutral economic term. Do not turn
variable necessities into shame-bearing wants.

### Fixed-expense detection becoming setup labor

If confidence is weak, preserve uncertainty and ask only when it materially
changes flexible room. Do not create a recurring bill-review queue.

### Category guides becoming invisible hard rules

Tell customers whether a category is a guide, customer-locked amount, fixed
commitment, or reserve when that distinction affects a decision.

### Automation eroding customer authority

Economic variability does not grant Kwilt authority. Governance ownership must
remain explicit, durable, and independently correctable.

### Personalization creating incompatible truth

Different language and timing can frame the same facts. They cannot alter the
financial calculation or produce different answers for different household
members with equivalent scope.

## Candidate system contracts

These names are exploratory, not implementation commitments.

### `FlexibleRoomProjection`

- period and planning-income basis;
- living percentage and target dollars;
- fixed commitment total;
- reserve contribution total;
- flexible capacity;
- flexible spending and forecast;
- flexible room remaining;
- unassigned and over-target facts;
- freshness, confidence, and scope.

### `CriticalMoneyQuestion`

- original customer wording;
- question family: plan fit, timing, trade-off, intention, truth, adaptation, or
  authority;
- originating Money object or OS handoff;
- known amount, category, time boundary, and household scope;
- missing materially branching input.

### `CriticalMoneyAnswer`

- one scoped headline;
- answer status: fits, trade-off, does not fit, or cannot determine;
- primary consequence;
- protected fact;
- evidence qualification;
- few supported next moves;
- authoritative return target;
- hypothetical versus committed state.

### `MoneyProtectionIntent`

- customer-owned reason;
- protected fact or boundary;
- trigger condition and supported delivery surface;
- authority, expiry, and revocation;
- privacy-minimized presentation.

## What must be learned before a build decision

1. Do people understand `flexible spending` as variable rather than frivolous?
2. Does the flexible-room answer reduce uncertainty more than category totals?
3. Do people mistake plan room for bank affordability even with scoped copy?
4. Which fixed or protected facts must be visible for the number to feel
   trustworthy?
5. When a flexible category guide is exceeded but aggregate room remains, do
   people want automatic redistribution, explanation only, or a stronger
   boundary?
6. Which question becomes hottest most often: amount left, purchase fit, timing,
   trade-off, or discrepancy?
7. Does recalling a customer-owned intention feel supportive or intrusive at a
   spending-app pause?
8. Can customers with low app fluency correct a wrong fixed/flexible assumption
   without learning internal terminology?
9. What evidence threshold makes fixed-expense inference trustworthy enough to
   avoid setup review?
10. Can the product test plan-fit value before claiming cash-flow coverage?

## Candidate learning-release slices

These are alternatives for the next phase, not a selected plan.

### A. Flexible-room comprehension

Add the protected/flexible projection to an Andrew-only version of Summary and
test whether customers can explain the number, its scope, and its basis.

Tests the model with the smallest authority and interaction risk.

### B. One purchase decision

From an existing flexible category, enter a proposed amount and receive one
plan-fit answer using the flexible-room projection. No Chat, camera, household,
SMS, or cash-flow claim.

Tests whether the model resolves the hot decision rather than merely improving
orientation.

### C. One customer-owned protection

Use the existing Screen Time handoff to return one chosen flexible-room boundary
and one current answer before `Open for 20 min` or `Keep blocked`.

Tests whether financial truth and intentional friction work together in the
real decision moment, but carries the highest device and trust risk.

## Current recommendation after exploration

The conceptual system remains coherent. The strongest sequence is likely:

1. prove that customers understand and trust flexible room;
2. use it to answer one proposed-purchase question;
3. deliver the same answer at one customer-chosen protection moment;
4. add conversational and household doorways only after the authoritative
   answer is proven;
5. expand automatic maintenance only after correction and authority are trusted.

This is a sequencing recommendation, not authorization to implement.
