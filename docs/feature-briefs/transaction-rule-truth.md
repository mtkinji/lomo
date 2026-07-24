---
id: brief-transaction-rule-truth
title: Transaction Rule Truth
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: match-transactions-to-lane
serves: [jtbd-trust-this-app-with-my-life, jtbd-carry-intentions-into-action, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-transaction-display-names]
owner: andrew
last_updated: 2026-07-10
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# Transaction Rule Truth

## Product Decision

Kwilt Money should state whether a merchant rule is active before offering rule creation, and it should distinguish historical assignments that will change from future matches the rule will cover.

## Empathy Statement

I can see that all of these Costco transactions are already in Shopping, but I cannot tell whether Kwilt Money is following an active rule, repeating a suggestion, or asking me to create automation it already has. I need the app to tell me what is true before it asks me to act.

## Job Delivery

- Job: `review-budget-reality-before-spending`
- Step: `match-transactions-to-lane`
- Current score: 3.5
- Expected delivery change: 3.5 -> 4 if TestFlight verification proves active-rule status and actual change counts remain correct across active, absent, and conflicting cases.
- Evidence required: transaction detail -> inline rule truth -> appropriate CTA -> accurate existing/future delta -> persisted rule -> refreshed active receipt.
- Map update trigger: after runtime verification on a current native TestFlight build.

## User Problem

Repeated historical categorization looks like evidence that a rule is already working, while the current builder still asks the user to create a rule and claims it will update rows already showing the destination category. The user cannot distinguish current result, result provenance, and future automation.

## User Experience

- Transaction detail shows one compact merchant-rule receipt beneath Category.
- An equivalent rule says `Rule active` and names merchant, category, and future behavior.
- No equivalent rule says `No rule yet` and offers `Create rule`.
- A rule targeting another category says what is active and offers an explicit change path.
- Category selection never creates or opens rule automation by itself.
- The builder separates `existing transactions that will change` from `future transactions this rule will match`.
- An equivalent active rule never gets a `Create rule` CTA.
- After a rule is saved, refreshed detail shows `Rule active`.

## State Contract

- `active`: a saved rule matches the merchant and selected category at the current scope.
- `absent`: no saved merchant rule matches the merchant.
- `conflicting`: a saved matching merchant rule targets another category or incompatible scope.
- Shared visible categories alone never imply `active`.
- Existing-row impact counts only rows whose persisted category assignment will actually change.
- Future coverage is stated separately and never expressed as a historical update count.

## Copy Contract

Use:

- `Rule active`
- `Future Costco charges will be categorized as Shopping.`
- `No rule yet`
- `Create rule`
- `0 existing transactions will change.`
- `Future matching charges will use Shopping.`

Avoid:

- `Match future Costco charges` without current rule status.
- `This will update 59 visible transactions` when those rows already persist Shopping.
- `Use rule` without naming whether it creates, changes, or applies one.
- Any wording that treats a shared category as proof of a saved rule.

## Data And System Behavior

- Expose saved merchant rules through the connected snapshot or a focused rule query.
- Derive rule state with the same merchant matching logic used during classification.
- Require both merchant match and destination category match for `active`.
- Compare persisted row assignments to the proposed category for historical impact.
- Reuse the existing rule persistence path and exact/partial modes.
- Refresh rule and transaction state after creation before rendering `active`.

## Acceptance Criteria

- Equivalent active rule: page says `Rule active`; no create CTA appears.
- No active rule: page says `No rule yet`; create CTA appears.
- Conflicting rule: page names the active destination and does not offer duplicate creation.
- Fifty-nine already-Shopping Costco rows produce an existing-change count of zero.
- A truly different historical assignment appears in the change count and preview.
- Selecting an already effective category does not automatically open the rule builder.
- Dismissing the builder leaves rule and category state unchanged.
- Focused tests cover active, absent, conflicting, same-category, and changed-category cases.
- `npm run test:forecast`, `npm run lint`, and `npm run job-delivery:check` pass.
- A current native TestFlight build proves the complete Costco and Smith's phone flows.

## Exclusions

- Global rules dashboard.
- Rule deletion from transaction detail.
- AI-generated rules.
- Default per-row provenance badges.
- Merchant or transaction telemetry in analytics.

## Learning Release

- Channel: TestFlight.
- Minimum proof set: equivalent Costco rule, absent Costco rule with already-matching history, conflicting merchant rule, and Smith's category confirmation.
- Permanent threshold: five representative merchant checks with correct status and impact, plus no drawer lockup or duplicate-rule offer.

## Spec Refinement

Clear enough to build with these decisions:

- Inline status is the primary truth surface; the drawer is action/detail only.
- Equivalent-rule deduplication is required, not optional polish.
- Existing impact and future coverage are separate concepts and separate copy.
- The current transaction page and rule table remain the system boundaries.

Implementation questions to resolve from source before editing:

- Whether an exact and partial rule for the same merchant/category should display one summarized active state or the most specific state.
- Whether conflicting rules can exist under current database uniqueness constraints and, if so, which one wins classification today.
- Whether historical rows with the destination category but an inferred source need confirmation writes during rule creation; default assumption is no.

Deferred decisions:

- Global rule editing and deletion.
- Per-row provenance display.
- Rule coverage analytics.

## Completion Checklist

- Did this change affect the mapped job step? Yes, `match-transactions-to-lane`.
- Did it materially alter a UX flow? Yes, rule creation becomes explicit and status-first.
- Did it create evidence for `docs/job-delivery-map.yaml`? Only after TestFlight verification.
- Should friction or recommended next action change? After proof, replace the rule-persistence ambiguity with any remaining conflict/editing gap.
- Should the delivery score change? Move toward 4 only after current native proof across the required states.
