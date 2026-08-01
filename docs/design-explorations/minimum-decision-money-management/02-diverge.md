# Diverge: Delegated Monthly Budget

## Phase boundary

This phase explores four different systems for the accepted job hierarchy. Each
direction must let Kwilt maintain the monthly budget, give one trustworthy total
first, preserve category guidance, and support intentional priority changes.
No direction is selected here, and nothing authorizes implementation.

## Fixed design challenge

How might Kwilt run the monthly budget on Maya's behalf, give her one
trustworthy amount left to spend, and let her redirect category priorities
without turning her into a budget or categorization administrator?

## Shared financial contract

All four alternatives use the same Money-owned truth:

`normalized planning income × living target - protected plan - flexible spending = flexible money left`

- The planning-income basis is durable; individual paychecks do not rewrite it.
- Income received this month is useful context, not the monthly budget basis.
- Ordinary unresolved outflows are counted through a deterministic conservative
  policy instead of blocking the answer.
- Category allocations guide the flexible total but do not define whether the
  total itself is real.
- Monthly plan room is not presented as cash safe until payday.

## Axis of variation

The alternatives place the main source of comprehension and control somewhere
different:

1. **Conclusion-led:** one number is the product; the system operates beneath it.
2. **Arithmetic-led:** a tiny visible calculation creates trust.
3. **Priority-led:** the budget is experienced as choices among valued purposes.
4. **Conversation-led:** the customer expresses intent in ordinary language and
   Money returns a governed proposal.

## Alternative 1: The Managed Month

### Sketch

The existing Budget screen leads with one large answer: **`$343 left this
month`**. A short line underneath says **`$617 of $960 flexible money used`**.
Category tiles remain below as optional guidance. Kwilt creates and routinely
maintains the underlying plan from normalized income, the living target,
protected commitments, and observed spending. The customer does not review the
plan unless they choose to inspect it or Kwilt detects a material change that
requires their values.

Selecting a category answers the local question—**`$74 left for Kids`**—and
offers one secondary action, **`Change priorities`**. That action previews a
transfer between flexible categories without changing the living limit or
protected costs.

### Audience and persona fit

This is the strongest direct fit for Blair's request and Maya's desire not to
become the finance administrator. It works for someone who wants a dependable
answer without learning the model first.

### Design-challenge answer

Kwilt removes construction, upkeep, interpretation, and routine categorization
from the primary experience. The customer supplies values only when she wants
the month to favor one purpose over another.

### System fit

- Reorders the existing Budget screen rather than adding a destination.
- Builds on the governed plan, living target, protected/flexible projection,
  category detail, preview, receipt, and reversal contracts.
- Requires a deterministic income-normalization policy and a reliable total
  flexible-spend classification policy.
- Leaves Chat, notifications, Screen Time, and widgets as later delivery
  surfaces over the same answer.

### Best when / fails when

- Best when the system can maintain a credible plan and most customers mainly
  want orientation.
- Fails when the headline number feels magical, the planning basis is wrong, or
  customers cannot inspect why the plan changed.

### Four-object, capture-first, and anti-pattern check

This remains entirely inside Money and does not alter Arc, Goal, Activity, or
Chapter. Transaction capture and ingestion never wait for categorization. It
passes if the single answer is traceable and calm; it fails if it becomes a
financial health score, false permission to spend, or opaque AI authority.

## Alternative 2: The Three-Part Budget

### Sketch

The Budget screen still leads with **`$343 left this month`**, but the answer is
immediately supported by one compact calculation:

```text
Monthly living plan        $3,360
Protected costs           -$2,400
Flexible spending so far    -$617
Left                         $343
```

Income received so far can appear as a small dated fact below this calculation,
clearly separated from the durable planning basis. Categories follow beneath
the calculation. Priority changes begin from a category and show which other
flexible amount supplies the room.

### Audience and persona fit

This serves customers whose trust depends on seeing how the answer was formed.
It may help users who have been burned by incorrect budget totals, but it asks
for slightly more reading than Blair's preferred experience.

### Design-challenge answer

Kwilt still performs all management work, while four plain rows make the result
auditable without opening another screen or learning finance terminology.

### System fit

- Reuses the existing Budget and category surfaces.
- Requires the same normalized-income and transaction policies as Managed Month.
- Makes protected-plan composition and historical plan versioning especially
  important because the arithmetic is always exposed.
- Does not require Chat or a new navigation concept.

### Best when / fails when

- Best when visible arithmetic creates confidence and the four rows stay stable.
- Fails when the calculation becomes a mini-dashboard, forces users to interpret
  internal states, or grows a row for every edge case.

### Four-object, capture-first, and anti-pattern check

This remains Money-owned and never blocks ingestion. It passes if the arithmetic
is a short explanation of one answer; it fails if comprehensiveness becomes a
KPI grid or if caveats overwhelm the conclusion.

## Alternative 3: The Priority Budget

### Sketch

Kwilt proposes the entire monthly plan, but the customer experiences the
flexible portion as a small set of priorities rather than a category ledger.
The main screen still says **`$343 left this month`**. Beneath it, categories
show dollars left. Choosing **`Change priorities`** opens a single-purpose flow:

> Give Kids activities $100 more this month.

Kwilt proposes the smallest corresponding reduction, such as **`Beauty and
Shopping would have $100 less`**, and shows that total flexible capacity,
protected costs, and the living limit remain unchanged. The customer can choose
a different source or save the proposal. The adjustment may be for this month
only or ongoing, but that duration is explicit before saving.

### Audience and persona fit

This directly reflects Blair's wish to favor her children's activities over
personal beauty or shopping. It treats category planning as an expression of
values instead of an exercise in numerical allocation.

### Design-challenge answer

Kwilt owns the default plan and its arithmetic. The customer owns only the
meaningful tradeoff: what matters more right now.

### System fit

- Extends existing category adjustment, governed preview, receipt, and reversal
  rather than adding a planner destination.
- Requires clear system-adjustable versus customer-protected category ownership.
- Needs a deterministic way to propose the smallest reduction without implying
  that Kwilt knows the customer's values.
- Can be invoked from Budget or category detail and later from contextual Chat.

### Best when / fails when

- Best when the plan is already credible and the customer wants to redirect it.
- Fails when the system presents too many tradeoffs, silently infers priorities,
  or converts every category overage into a rebalancing task.

### Four-object, capture-first, and anti-pattern check

This is a Money planning action, not an Arc or Goal assignment. It never blocks
transactions. It passes if proposals are neutral, reversible, and explicitly
authorized; it fails if Kwilt moralizes categories, gamifies restraint, or
quietly transfers money between customer-protected purposes.

## Alternative 4: The Money Steward

### Sketch

The Budget screen provides the same one-number receipt, but ordinary-language
conversation becomes the primary control for setup, explanation, and change.
The customer can say **`Set the budget for me`**, **`How much do I have left?`**,
or **`Give Kids activities more room than Beauty this month`**. Chat requests a
typed Money-owned calculation or proposal. The native Budget surface opens
inline or through an exact return link to show the number, category consequences,
and Save action. Chat never invents dollars or directly mutates the plan.

### Audience and persona fit

This can be exceptionally accessible for people who already use conversational
tools comfortably but struggle with app navigation. It also accommodates
different personal phrases without requiring a separate simple mode.

### Design-challenge answer

The customer does not need to learn where controls live or how Kwilt names the
budget model. She expresses the outcome; Money constructs an inspectable,
bounded answer or proposal.

### System fit

- Uses Unified Chat as an access layer and the native Budget flow as authority.
- Requires typed Money query and proposal contracts, exact return, correction,
  idempotent save, and authoritative receipts.
- Adds the most cross-capability work and therefore should follow—not substitute
  for—a trustworthy native Money model.
- Scheduled outreach and SMS remain separate later capabilities.

### Best when / fails when

- Best when customers naturally state concrete questions and preferences.
- Fails when customers do not know what to ask, conversation obscures the stable
  answer, or Chat appears more capable than the underlying Money evidence.

### Four-object, capture-first, and anti-pattern check

Chat accesses Money and does not reinterpret the four-object model or block
capture. It passes if it is concise, bounded, non-anthropomorphic, and always
returns to inspectable native truth; it fails if it becomes an oracle, a
simulated financial relationship, or a second source of financial calculations.

## Important combinations and boundaries

These directions are not feature bundles, but two relationships are already
clear:

- **Managed Month is the smallest complete operating model.** Priority Budget
  can become its focused adjustment flow without changing the primary answer.
- **Money Steward is a later access modality.** It depends on the same native
  answer and governed priority-change contract; it should not be used to hide a
  weak Money experience.

Three-Part Budget is the meaningful competing presentation choice: always show
the arithmetic, or let one number lead and place the arithmetic behind a clear
explanation action.

## Questions for convergence

1. Should the first screen show only the answer and one supporting sentence, or
   should its compact calculation always be visible?
2. Is changing category priorities part of the first learning release, or does
   the release first need to prove that people understand and trust the total?
3. What evidence must Kwilt expose on demand for the managed plan to feel
   delegated rather than mysterious?
4. What smallest deterministic income-normalization policy is trustworthy
   enough for the first release?
5. Which existing messages, controls, or states should disappear when the
   primary answer becomes reliable?
