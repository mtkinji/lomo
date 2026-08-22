# Diverge: Reviewing Budget Overages

## Fixed design challenge

How might we help Maya review the budgets and transactions contributing to a whole-plan overage, correct how material spending affects the plan—including `Paid from savings`—and return to one trustworthy result without turning Budget into an accounting dashboard?

## Axis of variation

The alternatives vary by **where the review begins and how much guidance Kwilt provides**:

- whole-plan statement first;
- existing category inventory first;
- transaction exceptions first; or
- guided resolution one cause at a time.

All alternatives preserve the fixed monthly plan, actual transaction history, and category truth. None treats a budget increase as recovery.

## Alternative A: What’s Contributing Drawer

The over-budget answer exposes one contextual action: `Review overages`. It opens the existing Flexible spending drawer, but the drawer leads with a new `What’s contributing` section above the financial statement. Only categories currently over budget appear, ordered by dollar contribution. Each row shows the category overage and a disclosure control. Expanding a category reveals the few material transactions driving it; tapping a transaction opens its existing detail surface with two distinct corrections: `Change category` answers what the spending was for, while `How was this paid for?` answers whether it belongs to this month’s flexible allocation, saved money, or a split. Saving returns to the drawer and recalculates the result.

- Audience/persona fit: high. Maya starts from the number she is trying to understand and sees a bounded explanation rather than the entire ledger.
- Design-challenge answer: strong. It connects whole-plan truth, category cause, and transaction correction in one progressive path.
- System-fit note: extends the existing explanation drawer and transaction detail. Requires a category-contribution projection and a distinct funding-source treatment.
- Best when: a few categories or transactions explain most of the overage.
- Fails when: the drawer becomes a long nested ledger or duplicates the full category and transaction screens.
- Four-object/capture-first stance: Money capability only; no new Kwilt object and no blocked capture or spending.
- Anti-pattern check: pass if neutral copy and progressive disclosure replace red warning rows, scores, or forced cleanup.

## Alternative B: Focus the Existing Budget List

The over-budget answer exposes `Review overages`. Tapping it scrolls the existing Budget page to the first over-budget category and temporarily filters or collapses the category inventory to `Over budget`. The existing category rows remain the primary explanation. Maya taps Health & Activities, sees the category detail, and reviews that category’s transactions. Transaction detail adds `How was this paid for?`, including `Saved money`.

- Audience/persona fit: high-medium. It reuses the page Maya already understands and avoids a second representation of categories.
- Design-challenge answer: medium-high. It makes offending budgets discoverable, but requires more navigation before the source correction becomes clear.
- System-fit note: strongest visual reuse; needs transient inventory focus state, category-detail filtering, and the funding-source treatment.
- Best when: the category list already communicates overages clearly and category detail makes the transaction cause obvious.
- Fails when: `Review overages` merely scrolls Maya to red rows she could already see, without explaining what she can change.
- Four-object/capture-first stance: Money capability only; no new object and no blocked capture.
- Anti-pattern check: pass if the focus is temporary and does not create a persistent alert/filter state.

## Alternative C: Material Transactions Review

The over-budget answer exposes `Review transactions`. It opens a filtered transaction inventory containing only the smallest set of current-month flexible transactions that materially explains the overage. Rows retain their category context. Selecting a row opens transaction detail with separate `Category` and `How was this paid for?` fields. Category supports the existing change and split-category workflow. Funding supports `Count in this month’s flexible plan`, `Paid from saved money`, or `Split between them`; `Internal transfer` and `Not household spending` remain separate money meanings rather than funding sources. A live summary shows how confirmed corrections would change the flexible result before they are saved.

- Audience/persona fit: medium-high. It reaches the actionable evidence quickly, especially for one unusual purchase.
- Design-challenge answer: strong for correction, weaker for understanding which budgets are structurally over.
- System-fit note: reuses transaction inventory and review mutations, but needs a material-driver selection algorithm, preview state, saved-money treatment, and possibly split amounts.
- Best when: one or two unusual transactions dominate the result.
- Fails when: ordinary accumulation across many purchases or unrealistic category budgets caused the overage.
- Four-object/capture-first stance: Money capability only; no new object and no blocked capture.
- Anti-pattern check: conditional pass. It fails if “material” looks like opaque AI judgment or if the user is made to clear a review queue.

## Alternative D: Guided Overage Resolution

The over-budget answer exposes `Understand this overage`. Kwilt presents one evidence-backed cause at a time: `Health & Activities is $2,922 over`, followed by its largest transaction. Maya can change or split its category, confirm that it counts in August’s flexible plan, mark it paid from savings, split the funding, or skip. After each decision, Kwilt recomputes and either presents the next material cause or ends with the remaining trusted overage and appropriate next step.

- Audience/persona fit: medium. It reduces cognitive load, but risks feeling like a mandatory cleanup assistant.
- Design-challenge answer: high when causes are few and clear; low when the overage is diffuse or every default is already correct.
- System-fit note: largest extension. Requires deterministic cause ordering, temporary resolution state, safe skipping, previews, and return behavior.
- Best when: a novel user needs help learning the difference among category, funding source, and plan treatment.
- Fails when: Maya already knows the transaction she wants to change or the flow feels like an interrogation.
- Four-object/capture-first stance: Money capability only; the flow must always be dismissible and never block spending or ordinary Money use.
- Anti-pattern check: conditional pass. It fails if completion is forced, Kwilt speaks as a financial authority, or unresolved rows remain as shame-producing tasks.

## Comparative read

| Alternative | Causal clarity | Fast correction | Existing-system reuse | Admin risk | Handles both budgets and transactions |
| --- | --- | --- | --- | --- | --- |
| A. What’s Contributing Drawer | High | High | High | Low-medium | High |
| B. Focus Existing Budget List | Medium | Medium | Very high | Low | Medium-high |
| C. Material Transactions Review | Medium | Very high | Medium-high | Medium | Medium-low |
| D. Guided Resolution | High | Medium | Medium-low | High | High |

## Divergence takeaway

Alternative A best expresses the user’s stated action: review the budgets contributing to the whole-plan overage, then inspect and correct their transactions. Alternative B is the most reductive but may not add enough help beyond the existing red category rows. Alternative C is the fastest path for the observed savings-funded transaction and could be the transaction layer inside A rather than the top-level model. Alternative D teaches the concepts most explicitly but carries too much workflow pressure for the resting Money experience.

The convergence decision should primarily compare A against a deliberately strengthened B, with C reused as the correction subflow rather than shipped as a separate review destination.

## Transaction correction contract

Every overage-review concept must preserve these separate questions:

1. **Category — What was this spending for?** Reuse existing category reassignment and split allocation. Recategorization may move the amount between flexible categories or into a committed category, and the whole-plan answer must rebuild from authoritative transaction truth.
2. **Funding — What paid for it?** Add `This month’s plan`, `Saved money`, and eventually `Split between them`. Funding changes the plan source without changing the expense category or hiding actual spending.
3. **Money meaning — Was this household spending at all?** Keep `Internal transfer`, reimbursement/non-household treatment, duplicate correction, and genuine `Outside the plan` semantics distinct from funding.

Adjusting a category’s durable budget is a fourth, separate job. It may be offered after repeated evidence shows the plan is unrealistic, but it must not be presented as correcting the current transaction or erasing the current month’s actual history.
