---
id: job-flow-maya-review-budget-reality-before-spending
audience: audience-aspirational-family-organizers
persona: Maya
hero_jtbd: jtbd-move-the-few-things-that-matter
last_updated: 2026-06-24
---

# Maya: Review Budget Reality Before Spending

## Audience / Persona

Audience: `audience-aspirational-family-organizers`  
Persona: Maya

Maya is helping her household stay organized without turning family life into a
finance hobby. She wants a calm pause at the moment of spending, especially for
apps that make it easy to buy household extras without noticing the month is
running hot.

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few
areas I most want to grow.

## Active JTBDs

- `jtbd-put-intention-before-impulse` - spending apps should wait behind a calm, chosen review.
- `jtbd-carry-intentions-into-action` - the household intention to stay within a lane needs help at the moment of action.
- `jtbd-trust-this-app-with-my-life` - money and restrictions are high-trust surfaces; the app must be transparent and reversible.
- `jtbd-review-budget-reality-before-spending` - provisional local sub-job for this app.

## Job Flow

1. Name the spending categories that often drift.
2. Connect spend-triggering apps or sites to the right category.
3. See the relevant category meter before opening a connected app.
4. Understand the spend reality in plain language: what this category is for, spend against budget limit, percent used, spend pace versus the month, and projected month-end usage.
5. Choose whether to open the app for now.
6. Record the review as proof of intentional access.
7. Keep the household pattern because the pause feels helpful, not punitive.

## Current Kwilt Money Flow

1. The app has a hard-coded `SpendCategory` / `BudgetLane` for `Amazon and household extras`.
2. The home screen shows percent used, dollars remaining, and pace.
3. The review screen lets the user tap `I reviewed this`.
4. `BudgetReviewEvent` is recorded in memory.
5. Screen Time unlock behavior is described but not implemented.

## Offerings

- A scaffolded category meter.
- A scaffolded app gate target.
- One review action.
- Recent review history.
- Future Screen Time adapter seam.

## Delivery Score

| Step | Score | Rationale |
| --- | --- | --- |
| Name spending categories | 1 | One category exists only as fixture data; multiple user-owned categories are not yet supported. |
| Connect categories to apps/sites | 1 | Amazon is hard-coded; no setup flow for multiple app-to-category rules. |
| See current meter before app | 3 | The review screen shows the meter, but no real OS gate yet. |
| Understand spend reality | 4 | Percent, spend against limit, current month pace, and projected month-end usage now exist on detail, but the same clarity still needs to carry into review/app-gate moments. |
| Choose whether to open | 2 | The only visible choice is review/unlock; leaving blocked is not first-class. |
| Record review proof | 2 | In-memory event exists; no persistence or Screen Time handshake. |
| Keep household pattern | 1 | No onboarding, household context, or learning evidence yet. |

## Gaps

- The app needs a crisp value unit: a spending app pauses until the user has seen the relevant lane reality and chosen intentional access.
- The product model needs to support multiple category meters and app-to-meter mappings, even if the first learning release validates one configured mapping.
- The meter needs to answer "am I okay to open this now?" more directly without becoming a finance dashboard.
- The detail view should support both household finance categories and AI-spend categories by treating a category budget as a consumable resource: what it is for, how much has been used, whether usage is ahead of period pace, and where it is likely to land by period end.
- Trust depends on the pause being transparent, user-owned, reversible, and non-shaming.

## Aspirational Design Challenge

How might we help Maya put a calm budget-reality pause before spend-triggering
apps, while preserving Kwilt's trust, agency, and non-productivity-app voice?
