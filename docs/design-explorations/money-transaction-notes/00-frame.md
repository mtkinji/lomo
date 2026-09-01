# Frame: Money Transaction Notes

## What the user said
> Can I have a way to add a note to this? It is for family pictures.

## Restated in user voice
When a bank description does not explain a household purchase, Maya wants to add the context her family will recognize later, so transaction review does not become detective work.

## Target audience
`audience-aspirational-family-organizers` — families who want useful household organization without operating a finance system.

## Representative persona
Maya is reviewing a large Venmo purchase whose provider description does not say that it paid for family pictures.

- Current situation: The amount and account are clear, but the purpose is not.
- What she's trying to do: Leave enough context for herself and her household to recognize the purchase later.
- Emotional state or tension: She wants a quick factual annotation, not another bookkeeping workflow.
- What would make this feel wrong: Replacing bank truth, forcing tags, or making the note private without saying so.

## Hero anchor
`jtbd-move-the-few-things-that-matter` — keep ordinary family commitments understandable and moving.

## Job flow step
Step 7, “inspect or correct transaction meaning only when it materially improves the decision,” currently scores 4. Kwilt can correct category and plan treatment, but cannot preserve household-specific context that the provider does not know.

## Active anchors
- `jtbd-review-budget-reality-before-spending` — a recognizable transaction is easier to inspect and trust.
- `jtbd-capture-and-find-meaning` — capture the real-world purpose without turning it into admin work.
- `jtbd-trust-this-app-with-my-life` — preserve provider truth and make household visibility explicit.

## System alignment
Constraint posture: `Extend the system`

Current system facts:
- Existing surface: Native Money transaction detail already separates provider Description, payment source, category, plan treatment, coverage, and split.
- Existing user flow: A transaction opens from Summary, Transactions, category detail, or Chat.
- Existing domain/data model: Household members read shared `budget_transactions`; confirmed transaction writes refresh the shared snapshot.
- Existing technical affordances: Canonical `Input`, `BottomDrawer`, `BottomDrawerHeader`, and semantic drawer footer.
- Existing UX/copy conventions: Provider facts stay distinct from user-owned corrections; bounded edits use one focused drawer.

Constraints to preserve:
- Do not overwrite the Plaid/provider description.
- Do not use note text to silently recategorize or change the plan.
- Make household visibility clear before save.

Constraints we may challenge:
- Transactions currently have no user-owned descriptive field.

Design implication:
Add one optional household note to the existing transaction object and expose it as secondary detail, edited on demand.

## Aspirational design challenge
How might we help Maya preserve the family meaning of a purchase in seconds, while keeping provider truth and Money decisions distinct?

## Out of scope
Attachments, receipts, tags, per-person privacy, AI inference, and editing provider descriptions.

## Open question
None for the first learning release; household visibility follows the existing shared Money transaction boundary.
