# Frame: transaction-display-names

## What the user said

> some transactions have terrible names, like this one. As a user, I can acknowledge this is the real transaction name but I don't like it. Feels like a good subject for a design loop
>
> Also, it says "Not in a budget category" but it also says it's in the Housing category... so that's weird

## Restated in user voice

When Maya opens a transaction whose bank-provided name is technically real but unreadable, she wants Kwilt Money to preserve the source evidence while letting her see a name she can recognize later, so the transaction list feels trustworthy instead of hostile.

## Target audience

`audience-aspirational-family-organizers` - households trying to become more organized without adopting a finance methodology.

## Representative persona

Maya is a parent or household lead who wants calm support for ordinary family decisions.

- Current situation: she is reviewing real connected transactions, including provider fallback names that can look like raw ACH metadata.
- What she's trying to become/do: keep budget meters trustworthy without manually reconciling a bank ledger.
- Emotional state or tension: she accepts that the raw bank name is evidence, but she does not want that evidence to be the primary human label.
- What would make this feel wrong to her: rewriting evidence silently, inventing a confident name, or mixing name cleanup with category assignment.

## Hero anchor

`jtbd-trust-this-app-with-my-life` - money evidence needs both truth and legibility.

## Job flow step

`match-transactions-to-lane` - Keep the category meter trustworthy with reviewed transactions.

Current score: `3.5` with medium confidence. The review flow is strong enough to correct categories, but the primary transaction label can still be provider-hostile and the screen had a contradictory "Not in a budget" action while Housing was selected.

## Active anchors

- `jtbd-trust-this-app-with-my-life` - source evidence must remain visible and untouched.
- `jtbd-review-budget-reality-before-spending` - transaction evidence has to be legible enough to support budget reality.
- `jtbd-carry-intentions-into-action` - one correction should reduce future review friction when the same source appears again.

## Friction we're addressing

Plaid rows use `merchant_name` when it exists and fall back to the raw transaction `name` when it does not. That fallback is honest but sometimes ugly enough to make the detail screen feel broken. Separately, the page rendered "Not in a budget" as a static action even when a category pill was selected.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: transaction detail page, transactions inventory, budget detail activity rows, and older transaction detail sheet.
- Existing user flow: users confirm, correct, exclude, create categories, and optionally create similar-merchant rules from transaction review.
- Existing domain/data model: `NormalizedTransaction` carries `merchantName` and `originalDescription`; Plaid rows preserve `name`, `merchant_name`, and personal finance category fields.
- Existing technical affordances: transaction review persistence already updates budget assignment and match rules; no transaction display-name override model exists yet.
- Existing UX/copy conventions: concrete evidence, one useful next step, no provider jargon as primary copy, no fake certainty.

Constraints to preserve:

- Keep the real bank/Plaid descriptor visible as source evidence.
- Do not mutate the provider transaction name.
- Do not make category assignment depend on the user's display name.
- Do not auto-generate names that appear more certain than the source data.

Constraints we may challenge:

- `merchantName` currently acts as both evidence label and user-facing title.
- Similar-name rules are category-focused only; there is no companion "display name for similar transactions" behavior.

Design implication:

This should be a personal display layer over transaction evidence. The user should be able to say "show this to me as TenantCloud" while still seeing the original ACH descriptor below.

## Aspirational design challenge

How might we help Maya make unreadable transaction names recognizable, while preserving the raw bank evidence and the compact transaction-review flow?

## Out of scope

- AI-led receipt or merchant enrichment.
- Changing Plaid sync semantics.
- Replacing category matching rules.
- Household-wide naming policy.
- Hiding raw bank evidence.

## Open question

Should the first release support only a one-off transaction display name, or also "use this name for similar transactions" from day one?
