# Frame: Transaction Truth To Five

## Goal

Take unified Kwilt Money's `match-transactions-to-lane` job step from 3.75 toward an evidence-backed 5 without awarding the score ahead of realistic-use proof.

## Audience and persona

- Audience: `audience-aspirational-family-organizers`
- Persona: Maya, a household lead who wants to trust budget reality before spending without maintaining a ledger.
- Hero JTBD: `jtbd-move-the-few-things-that-matter`
- Job flow: `job-flow-maya-review-budget-reality-before-spending`
- Job step: `match-transactions-to-lane`
- `serves: [jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]`

## Friction

Unified Money can persist one category and recurring merchant rules, but a genuinely mixed Costco, Target, or Amazon purchase still forces one meter to be knowingly wrong. Authenticated persistence and realistic repeated use also remain proof boundaries.

## Design challenge

How might unified Kwilt help Maya keep routine and mixed purchases reflected in the right meters while preserving a calm, reversible correction path?

## Constraints

- Money owns its data, mutations, receipts, and native destinations inside the unified shell.
- Keep one immutable bank transaction and one inventory row.
- Preserve the ordinary single-category path.
- Require exact integer-cent reconciliation and atomic replacement.
- Do not transmit merchant or account details for analytics.
