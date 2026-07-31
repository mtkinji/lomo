# Converge: Protected Core, Flexible Room

## Chosen coherent system

Choose **Protected Core, Flexible Room** as the financial model, with a
**Critical-Moment Answer** as its interaction model.

The system has one plain organizing promise:

> Kwilt protects the spending you have already committed to, tells you what
> remains flexible for everyday choices, and helps you understand what a new
> decision would change.

This weaves together setup, the 70% living limit, automatic planning,
categories, mixed spending, Summary, purchase decisions, rebalancing, Chat,
widgets, Screen Time protections, household questions, and long-term adaptation
without giving each capability a separate mental model.

## Why this is the missing center

The earlier directions each solved only one layer:

- The One-Answer Budget improved orientation.
- The Decision Simulator improved purchase and rebalance decisions.
- The Conversational Budget accepted different user questions.
- Guardrailed Autopilot reduced maintenance.
- Adaptive Dialect respected different financial language.

Protected Core, Flexible Room supplies the shared financial truth all five need:

1. What portion of the plan is already protected?
2. What portion remains flexible?
3. How much flexible spending remains now?
4. What would this decision change?
5. Does anything require the customer's judgment?

The interface can then answer different questions without constructing a
different financial system for each customer.

## The customer model

### 1. Monthly living limit

The customer has one confirmed boundary for ordinary living, such as 70% of a
stable monthly planning-income basis.

Example:

`$4,800 monthly planning income × 70% = $3,360 monthly living limit`

The remainder of income stays undefined. Kwilt does not call it savings,
giving, investing, debt payment, or available cash unless the customer has
explicitly given it that meaning.

### 2. Protected core

Within the monthly living limit, Kwilt first sets aside supported fixed
commitments and intentionally protected monthly contributions.

Examples:

- housing and recurring bills;
- stable contractual commitments;
- monthly contributions to a repair, medical, gift, travel, or annual-cost
  reserve;
- another economically committed amount the customer confirms belongs in the
  protected core.

`Protected` means the plan will not silently use this capacity for another
purpose. It does not necessarily mean the bill has already been paid or that
cash-flow coverage has been proven.

### 3. Flexible room

Flexible room is what remains inside the living limit after the protected core:

`flexible capacity = monthly living limit - protected monthly amounts`

Flexible spending may include groceries, fuel, household goods, dining,
clothing, entertainment, and other amounts that vary. Flexible does **not** mean
unnecessary. Groceries and medicine may vary while remaining essential.

Example:

- Monthly living limit: `$3,360`
- Protected core: `$2,400`
- Flexible capacity: `$960`
- Flexible spending so far: `$617`
- Flexible room remaining: `$343`

The primary answer becomes:

> You have $343 left for flexible spending this month.

Supporting explanation:

> Your plan protects $2,400 for fixed expenses and planned contributions. You
> have used $617 of the $960 available for flexible spending.

### 4. Category guides inside flexible room

Kwilt distributes flexible capacity across recognizable categories using the
governed plan and household evidence. These allocations explain where flexible
money is expected to go; they should not automatically turn every category edge
into a moral or mathematical cliff.

If Groceries is above its guide while flexible room remains elsewhere, Kwilt can
say:

> Groceries is $40 above its guide, but you still have $120 of flexible room in
> the overall plan. No protected amount needs to change.

This makes category allocation useful without forcing constant rebalancing or
perfect categorization.

### 5. Decision consequence

At a critical moment, Kwilt evaluates the proposed choice against:

- the relevant category guide;
- total flexible room;
- current spending pace and supported forecast;
- the protected core;
- customer-owned limits and intentions;
- trustworthy timing or cash-flow evidence when available;
- freshness, coverage, and unresolved transaction meaning.

It then reduces the result to one of four states:

- fits the rules you set;
- fits with one named trade-off;
- does not fit the confirmed rules;
- Kwilt cannot tell yet, with the missing evidence named.

## Two axes the system must not confuse

### Economic behavior

- **Fixed commitment:** predictable and difficult to vary in the current period.
- **Flexible spending:** varies with ordinary choices or circumstances.
- **Reserve contribution:** stable monthly funding for a future or lumpy need.
- **Outside the living plan:** not assigned to ordinary living.

### Governance authority

- **Customer-protected:** Kwilt cannot reduce or reinterpret it automatically.
- **System-adjustable:** Kwilt may maintain it within confirmed policies.
- **Provisional:** evidence is not strong enough for consequential use.

These axes are independent. A customer-set Dining amount is economically
flexible and stays inside flexible room, but it may be customer-protected from
automatic redistribution. A recurring utility bill may be economically fixed
and system-maintained from supported evidence. A mixed Costco purchase may be
provisional without changing the protected-versus-flexible conclusion.

This separation is an important domain requirement. A UI that calls every
protected amount `fixed`, or every variable amount `discretionary`, would be
simple but wrong.

## How it serves the whole lifecycle

### Recognition and entry

The customer enters through the hot moment: Summary, category detail, a
spending-app pause, Chat, a transaction anomaly, or a proposed plan change. The
question and context travel together into Money.

### Minimum setup

Kwilt uses connected evidence to draft the planning-income basis, protected
core, and flexible allocation. The customer chooses the living limit and
confirms only protected commitments that materially affect flexible room.

Setup should not ask the customer to construct all categories or label every
expense fixed versus variable. It should show the first useful answer and ask
one focused correction when evidence is consequentially uncertain.

### Everyday orientation

Summary leads with flexible room, qualified by the period and evidence:

> You have $343 left for flexible spending through July 31.

If the system cannot support that statement:

> Kwilt cannot calculate flexible room yet because two recurring expenses still
> need meaning.

The existing category view remains underneath as explanation, history, and
control—not as the first interpretation task.

### Categories and mixed spending

Categories explain where protected and flexible spending is going. Kwilt asks
about ambiguous or mixed spending only when the answer could change a critical
decision, the protected/flexible boundary, or a material category conclusion.

The system can tolerate `mixed`, `mostly groceries`, or an uncertainty range
when exact splitting would not improve the decision.

### Before a purchase

The customer asks in their own words. Context supplies what it already knows.
Kwilt asks at most one materially branching clarification, then responds:

> A $60 purchase fits. It would leave $283 of flexible room this month. Clothing
> would have $14 left, and protected expenses stay unchanged.

Or:

> This does not fit the flexible room remaining. It would require $84 from a
> protected amount or a one-time exception.

The customer retains the values decision: buy, wait, choose another amount, or
accept the named trade-off.

### Self-protection

The customer can opt into protection after Kwilt has demonstrated the answer:

> Would a pause help when Shopping is likely to use the flexible room you want
> to protect?

Existing Screen Time policies become delivery rules for the same critical-moment
answer. A pause recalls the customer's reason and current consequence before
offering `Open for 20 min` or `Keep blocked`.

Within a safe customer-chosen range, Kwilt should stay quiet. Friction increases
only when evidence indicates a meaningful boundary, customer-defined trigger,
or uncertainty.

### Rebalancing

Moving capacity among system-adjustable flexible categories does not change the
protected core or living limit. The preview can therefore say:

> This changes where your $960 of flexible spending can go. Your 70% limit and
> protected expenses do not change.

When a proposed amount expands the flexible total or touches protected capacity:

> This would put the living plan $84 over its 70% limit. Fitting it requires
> reducing a protected amount, changing the limit, or making a temporary
> exception.

One explicit Save commits the already-understood consequence and creates an
authoritative receipt.

### Chat and varied questions

Chat does not need to support arbitrary financial reasoning. It maps the
customer's wording to bounded answer dimensions over the same state:

- `How much can I spend?` → flexible room, with scope.
- `Can I buy this?` → proposed-decision consequence.
- `Are my bills covered?` → protected-plan status and cash-flow scope.
- `What can I do until payday?` → timing evidence or an honest refusal.
- `Why is Groceries so high?` → category composition and anomaly explanation.
- `Where would the money come from?` → governed trade-off preview.
- `What did I say I wanted to protect?` → customer-owned intention.

The original words remain visible. Money owns calculation and authority; Chat
owns interpretation and delivery.

### Household coordination

A scoped answer can say whether a request fits flexible room and which shared
protection would change. Another person's authority is requested only when the
household rule actually requires it. The handoff contains the decision and
consequence, not broad transaction access.

### Adaptation and recovery

An unusual month does not automatically rewrite the protected core or flexible
allocation. Kwilt asks one change-point question when evidence suggests the
difference may be durable:

> Was this a one-time expense, or should Kwilt plan for it again?

After unplanned spending, the same system finds the smallest recovery path and
keeps a temporary exception from becoming a permanent rule.

## The Critical-Moment Answer grammar

Every doorway uses the same sequence:

1. **Question:** preserve what the customer is trying to decide.
2. **Answer:** lead with the scoped conclusion.
3. **Consequence:** name what changes and what remains protected.
4. **Qualification:** disclose freshness or dimensions Kwilt could not check.
5. **Choice:** offer only the few materially different next moves.
6. **Receipt:** record only authority actually exercised inside Kwilt.

The visible grammar is:

> **One answer. One reason. One choice—only when a choice is required.**

## Presentation for an elderly grandmother

This is not a separate `simple mode`. The default experience should already be
comprehensible to someone with low app fluency:

- Use a complete sentence before percentages, charts, or category grids.
- Pair every percentage with its dollar basis.
- Use `fixed and protected` and `flexible spending`; avoid `living target`,
  `allocation candidate`, `resource basis`, and `discretionary` in primary copy.
- Present one question or decision at a time.
- Never require hidden gestures, icon interpretation, or navigation memory for
  the primary answer.
- Make touch targets, text scaling, focus order, contrast, and recovery explicit
  implementation requirements.
- Say `Kwilt cannot tell yet` rather than asking the customer to diagnose the
  system.
- Explain why a pause occurred and return the customer's own intention.
- Keep supporting arithmetic immediately available so simplicity does not feel
  like withheld information.
- Never infer incapacity, transfer authority, or reduce privacy based on age.

## Reductive UI contract

Job: When a money question or spending decision becomes hot, the customer needs
to understand their flexible room and the relevant consequence, so they can act
in line with their own intentions without operating a budget.

Primary action: None during ordinary orientation. At a decision moment, answer
the customer's question or check one proposed amount.

Must show:

- the scoped answer in a complete sentence;
- flexible room remaining and period;
- the most important relevant consequence;
- what remains protected;
- evidence limitation when material;
- whether state is current, hypothetical, or committed.

Reveal later:

- income basis and living-limit arithmetic;
- protected commitments and reserve contributions;
- flexible category guides;
- forecast range, freshness, confidence, and source records;
- alternative trade-offs and plan history.

Must not add:

- a dashboard, score, planner grid, approval queue, permanent question catalog,
  `simple mode`, new tab, new shell, or persistent floating control;
- a universal `You can afford this` claim;
- default surveillance, partner permission, or automatic purchase logging;
- a requirement to categorize perfectly before receiving an answer.

Reuse map:

- Summary → current flexible-room answer and progressive evidence.
- Category detail → relevant category consequence and exact transactions.
- Governed plan preview → non-mutating trade-off calculation.
- Living-plan receipt → committed result and safe undo.
- Unified Chat → natural-language doorway and exact native return.
- Money glanceable state/widgets → privacy-minimized orientation.
- Screen Time handoff → customer-chosen pause at a critical moment.
- Transaction detail → correction of authoritative money meaning.

Behavior sources:

- Current living-plan target, fixed-first allocation, flexible evidence,
  overrides, reserves, preview, receipt, correction, forecast, freshness, and
  app-control contracts.
- Critical-moment empathy model in `00-critical-money-moments.md`.
- Customer constraints: preserve Kwilt shell/navigation and recommend before
  implementation.

Unresolved decisions:

- Whether customers understand `flexible spending` without confusing it with
  optional or morally lesser spending.
- How to represent protected and flexible components that coexist inside one
  user-facing category.
- Which recurring-expense evidence is strong enough to enter the protected core
  without confirmation.
- Whether flexible category amounts are soft guides by default or require a
  stronger customer-owned boundary.
- What evidence is required before the product may answer timing or cash-flow
  questions rather than plan-fit questions only.
- Which single critical moment should anchor the first learning release.

Required states:

- ready with flexible room;
- no flexible room because protected amounts consume the target;
- protected amounts exceed the target;
- missing or stale income basis;
- uncertain fixed/variable meaning;
- proposed purchase fits;
- fits with trade-off;
- does not fit;
- cannot determine;
- preview versus committed result;
- safe and unsafe undo.

Proof path: Not run. This is a recommendation artifact, not an implemented
surface. Any later build must prove realistic fixed/flexible examples, text
scaling, smallest viewport, Screen Time return, Chat return, preview/save/receipt,
stale evidence, and correction on the actual owned runtime.

## Why this is elegant

- One financial decomposition supports the whole lifecycle.
- One answer grammar supports different customer questions.
- One protection model supports quiet freedom and deliberate friction.
- One authoritative Money engine serves UI, Chat, widgets, and OS handoffs.
- Categories remain useful without becoming the system the customer must operate.
- Depth is retained but revealed only when it helps the current decision.
- The app shell remains unchanged.

## Stated bet

We are betting that customers can understand and act on household money more
easily when Kwilt first protects known commitments, then makes the remaining
flexible room explicit, and uses that same truth to answer whatever bounded
question becomes hot.

If customers still cannot decide, the missing dimension is likely not more
category detail. It is whether the question actually concerns cash-flow timing,
household authority, a customer-owned intention, or evidence trust. The answer
system should add that bounded dimension without changing the core model.

## Success signal

A customer—including someone with low app fluency—can explain without coaching:

1. how much of the monthly plan is protected;
2. how much remains flexible;
3. what they have left for ordinary choices;
4. whether a proposed purchase fits;
5. what would have to change if it does not;
6. whether Kwilt knows enough to answer confidently;
7. that nothing changes until they explicitly authorize it.
