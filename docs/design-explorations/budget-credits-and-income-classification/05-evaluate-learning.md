# Evaluate Learning: budget-credits-and-income-classification

## Learning Questions

- Do users understand `Income`, `Category credit`, and `Not counted / transfer` from the impact preview, without needing finance-app vocabulary?
- Does dependable rent feel more truthful as income by default?
- Do refunds and reimbursements feel more truthful as category credits?
- Does net-credit category copy feel like good news rather than a broken budget meter?
- Does remembering similar sources reduce review work without creating hidden mistakes?
- Can the system keep income/runway separate from refunds, transfers, and rewards?

## Assumptions To Validate

- Showing the effect of a choice is clearer than asking users to choose from a category taxonomy.
- The transaction detail sheet is the right correction moment.
- Three first-release outcomes are enough: income, category credit, not counted/transfer.
- Similar-source rules are acceptable if reversible.
- Users do not need split-credit support in the first release.

## Supporting Evidence

Evidence that supports the bet:

- Andrew chooses `Income` for rent after seeing the preview and says Housing still feels right.
- Andrew chooses category credit for a refund/reimbursement and says the category header now feels right.
- A net-credit category state is understandable without extra coaching.
- Similar future rent/refund transactions land with the expected meaning.
- The user does not need to open a separate settings/category screen to correct meaning.

Evidence that disconfirms the bet:

- The user still asks "why did this count?" after the impact preview.
- Income and category credit choices feel too similar or confusing.
- Users want income categories before they trust income totals.
- Similar-source rules apply too broadly and create hidden meter errors.
- Net-credit copy reads as broken, gimmicky, or too clever.

Brand-goodwill evidence:

- Copy feels factual, calm, and reversible.
- No screen implies tax, employment, or business-accounting conclusions.
- Raw transaction evidence remains visible.
- The app does not nag users to classify low-impact deposits.

## Instrumentation

Track minimally:

- `transaction_meaning_opened`
- `transaction_meaning_saved`
- `transaction_meaning_rule_saved`
- `transaction_meaning_changed`
- `transaction_meaning_rule_removed`
- `budget_net_credit_state_viewed`

Useful properties:

- meaning selected: income, category_credit, transfer, not_counted
- previous meaning source: inferred, confirmed, rule, unknown
- transaction direction
- amount band, not exact amount
- category id when category credit is selected
- applied to similar: true/false

Do not track:

- Raw merchant names.
- Raw transaction descriptions.
- Exact transaction amounts.
- Account masks or institution-specific identifiers.
- Tax/business labels.

## Decision Rule

Proceed to permanent implementation if, after local evaluation and at least one TestFlight build:

- The rent/Housing example works end-to-end.
- At least one refund/category-credit example works end-to-end.
- Similar-source meaning does not create obvious false positives.
- The UI remains understandable without a new onboarding lesson.

Revise if:

- The meaning choices are understood but the preview copy is insufficient.
- Users want separate `Transfer` and `Not counted` choices instead of one combined first-release option.
- Income-source naming becomes necessary for trust.

Retire or reframe if:

- Users consistently prefer a Monarch-style category-group system.
- The model cannot keep income/runway and category credits separated without confusing hidden state.
- Net-credit category meters damage trust more than they help.

## Expected Next Action

Author the feature brief, then build the local learning slice behind the existing transaction detail flow. Implementation should start with domain tests for signed category math and meaning classification before touching UI.
