# Frame: transaction-rule-truth

## What the user said

> Here's another context where I can't tell if Kwilt Money is already following this rule. Like, do I really need to be offered to set this rule, or is the rule already applied? I can't tell.

## Empathy statement

I can see that all of these Costco transactions are already in Shopping, but I cannot tell whether Kwilt Money is following an active rule, repeating a suggestion, or asking me to create automation it already has. I need the app to tell me what is true before it asks me to act.

## Restated in user voice

When Kwilt shows many transactions already in the same category, Maya wants to know whether that result came from an active rule or from another kind of match, so she can trust what will happen next without creating redundant automation.

## Target audience

`audience-aspirational-family-organizers` - households trying to stay intentional without becoming finance-system administrators.

## Representative persona

Maya is a parent or household lead who wants calm support for ordinary family decisions.

- Current situation: she is reviewing a merchant whose visible history already shares one category.
- What she's trying to become/do: trust that Kwilt Money will carry a correct classification forward without unnecessary maintenance.
- Emotional state or tension: the evidence looks settled, but the CTA implies it is not.
- What would make this feel wrong to her: asking her to create a duplicate rule, implying historical rows will change when they already match, or hiding the source of automation.

## Hero anchor

`jtbd-trust-this-app-with-my-life` - money automation must state what is active, what is inferred, and what will change.

## Job flow step

`match-transactions-to-lane` - Keep the category meter trustworthy with reviewed transactions.

Current score: `3.5` with medium confidence. The flow can assign transactions and persist merchant rules, but the UI does not reliably distinguish a shared current category from an active future rule.

## Active anchors

- `jtbd-trust-this-app-with-my-life` - the screen must expose system truth before asking for a consequential action.
- `jtbd-carry-intentions-into-action` - a saved rule should reliably carry a classification forward without repeated confirmation.
- `jtbd-review-budget-reality-before-spending` - trusted category provenance keeps the meter credible.

## serves snippet

`serves: [jtbd-trust-this-app-with-my-life, jtbd-carry-intentions-into-action, jtbd-review-budget-reality-before-spending]`

## Friction we're addressing

The current rule builder says it will update 59 visible transactions even though every visible row already reads Shopping. It does not say whether an equivalent rule is already active, whether those rows were assigned by that rule, or whether creating the rule would only affect future transactions.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Existing surface: full-page transaction detail with a category picker and merchant-rule follow-up drawer.
- Existing user flow: select a category, optionally preview exact or partial merchant matching, then create a durable rule.
- Existing domain/data model: each transaction has a match source; durable merchant rules have budget, merchant text, and exact/partial match mode.
- Existing technical affordances: connected snapshots can load saved rules and the matching domain can test whether a rule applies to a transaction.
- Existing UX/copy conventions: direct active voice, compact transaction review, and explicit user action before broad updates.

Constraints to preserve:

- Do not infer that a rule exists merely because several transactions share a category.
- Do not create or mutate rules silently.
- Preserve exact vs partial matching as an advanced choice only when creating or changing a rule.
- Keep rule truth attached to transaction review rather than adding a rules dashboard.

Constraints we may challenge:

- The current flow treats category selection as a reason to offer rule creation even when the selected category did not change.
- The current preview treats already-matching historical rows as rows that will be updated.

Design implication:

The surface must lead with provenance and delta: what categorized these transactions, whether a future rule is active, and exactly what creating or changing a rule would affect.

## Aspirational design challenge

How might we help Maya understand whether Kwilt Money is already carrying a merchant classification forward, while preserving explicit consent for new or broader automation?

## Out of scope

- A global rule-management dashboard.
- AI-authored classification rules.
- Changing category matching heuristics.
- Bulk rule cleanup across unrelated merchants.

## Open question

None for the design loop; the current system already exposes enough truth to design a bounded status-first refinement.
