# Diverge: Platform Alternatives

## A. Gmail-specific To-do card

Add Gmail fields and Gmail buttons directly to the Activity model and detail
screen.

- Strength: fastest path to a convincing demo.
- Weakness: every future source repeats the same schema, rendering,
  authorization, stale-state, and receipt work.
- Verdict: reject as the product architecture; useful only as a throwaway
  feasibility spike.

## B. Passive source attachments

Allow an Activity to retain links, snippets, and provenance, but require the
user to leave Kwilt for every action.

- Strength: simple, durable, and low risk.
- Weakness: answers “why” but not “where and how”; it cannot host Meal Planning
  participation or capability-owned review.
- Verdict: retain as a subset of the platform, not the whole solution.

## C. Typed capability action cards

Store a typed, opaque binding on the Activity. At render time, a registered
provider resolves viewer-specific presentation, live state, permitted actions,
and an exact destination. Invocations return authoritative receipts.

- Strength: one calm Activity host; capability ownership; current permission
  checks; reusable across native and external sources.
- Weakness: requires a provider registry, lifecycle contract, versioning, and a
  strict design budget.
- Verdict: recommended.

## D. Arbitrary AI-generated mini-apps

Let a model or connector persist a flexible card schema and action payload on
each Activity.

- Strength: maximum apparent flexibility.
- Weakness: creates an unreviewable execution surface, inconsistent UX,
  authorization risk, migration risk, and duplicate capability logic.
- Verdict: reject.

## Convergence signal

Choose C, while preserving B for passive provenance. The platform earns its
generality only after two meaningfully different providers use it: one native
Kwilt capability and one external connector.
