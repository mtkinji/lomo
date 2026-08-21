# Diverge: Monthly Household Plan

## Axes of Variation

The exploration varied:

- whether the user chooses a method or recognizes a concrete recommendation;
- where an unusual expense belongs relative to the durable plan; and
- whether lumpy spending is handled through a special category type or a
  general carry-forward behavior.

## Monthly Plan Establishment

### A. Explicit Budgeting-Method Choice

Ask whether the household budgets from a percentage of income, a fixed monthly
amount, or a runway goal.

- Persona fit: medium-low; expressive but methodology-heavy.
- Design-challenge answer: weak for the three-second decision.
- System fit: straightforward but exposes internal taxonomy.
- Best when: the user already knows the desired method and number.
- Fails when: even a financially sophisticated person cannot choose a safe burn
  amount without analysis.
- Anti-pattern check: failure unless reduced to an advanced path.

### B. Evidence-Backed Amount Comparison

Connect accounts, calculate a few defensible monthly amounts, and show the
consequence of each without requiring method language.

- Persona fit: high.
- Design-challenge answer: strong; the user judges recognizable outcomes.
- System fit: extends current evidence and planning-basis seams.
- Best when: evidence supports materially different but honest alternatives.
- Fails when: choices are presented as equally good or weak evidence is hidden.
- Anti-pattern check: pass with progressive disclosure.

### C. One Recommended Monthly Plan

Kwilt presents one evidence-backed monthly amount with `Use this plan`, plus a
secondary comparison or manual path.

- Persona fit: highest when the recommendation is trustworthy.
- Design-challenge answer: strongest three-second decision.
- System fit: requires a recommendation contract and evidence receipt.
- Best when: deterministic evidence can support a clear default.
- Fails when: the recommendation sounds like advice unsupported by balances,
  history, or the household's priorities.
- Anti-pattern check: pass only with humble language and easy correction.

## Unusual Spending

### D. Revise the Durable Plan

Increase the monthly amount or category amount to include the unusual expense.

- Persona fit: low for a genuine one-time event.
- Best when: repeated evidence proves the durable plan is wrong.
- Fails when: all future months inherit Olive's braces or the increased amount
  becomes general flexible capacity.
- Decision: reject for one-time expenses; retain for real baseline changes.

### E. Add a One-Time Amount to the Current Month

Keep the durable amount unchanged and add a named, category-bound amount to the
selected month. The household may accept it before or after spending.

- Persona fit: high.
- Best when: the family makes a fast, intentional decision with uncertain cost.
- Fails when: additions become a routine way to excuse every overage.
- System fit: requires a month-specific plan layer currently absent from Money.
- Decision: leading direction.

### F. Use a Special Reserve Category

Accumulate a separate category balance for lumpy medical or other spending.

- Persona fit: medium-low; no category uniquely deserves a reserve model.
- Best when: a known future need has been deliberately funded.
- Fails when: the app fabricates a past reserve or requires separate monthly and
  reserve semantics for ordinary categories.
- Decision: reject as the user-facing model; preserve useful accumulated-balance
  arithmetic internally.

### G. Attach Funding Provenance to Each Transaction

Mark an expense as paid from current money, HSA, savings, investments, or a
split.

- Persona fit: low as a routine workflow.
- Best when: a user explicitly needs forensic transaction provenance.
- Fails when: the family must inspect and annotate transactions to understand
  current financial state.
- Decision: reject as the primary solution. Connected evidence and plan-level
  decisions should do the work.

## Lumpy Spending

### H. Positive-Only Rollover

Carry unused room forward but forgive overspending each month.

- Persona fit: incomplete.
- Best when: the only goal is saving up for a purchase.
- Fails when: prior overages should reduce future category room.
- Decision: reject.

### I. Persistent Signed Carry

Carry both positive and negative category adjustments indefinitely until spent,
recovered, or explicitly restarted.

- Persona fit: high.
- Best when: the base category amount remains stable but actual spending is
  lumpy.
- Fails when: an essential protected floor would be silently erased or the
  start history is unsupported.
- System fit: can reuse the anchor-based arithmetic currently associated with
  reserve funding.
- Decision: leading direction.

### J. Manual Month-Close Ledger

Ask the user to approve carry values, transfer room, or close categories at the
end of every month.

- Persona fit: low.
- Best when: the product is intended for envelope-accounting enthusiasts.
- Fails when: Kwilt is supposed to remove financial administration.
- Decision: reject.

## Divergence Result

Carry forward C, E, and I:

1. one recommended monthly household plan;
2. one-time category-bound additions for exceptional months; and
3. persistent signed category carry with explicit historical boundaries.

Retain B as the optional comparison path when the household wants to understand
other supported monthly amounts.
