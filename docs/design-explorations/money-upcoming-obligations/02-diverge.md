# Diverge: Money Upcoming Obligations

Axis: smallest explanatory extension versus dedicated review capability versus conversational interpretation.

## A. Quiet Attention Line

Summary shows one contextual line only when something material deserves review: an obligation is coming sooner than expected, a large recurring amount changed, evidence is stale, or a transaction needs meaning. Tapping it opens the exact existing record or explanation.

- Value: strengthens the reason to return without adding a destination.
- Blast radius: low; presentation stays inside Money Summary.
- Limit: it cannot carry a full recurring-obligation review or teach the model by itself.

## B. Upcoming Drawer

A Summary row opens a compact Money-owned drawer showing the next likely obligations, confidence, evidence, and simple recurring/not-recurring confirmation. Confirmed items can later contribute to existing forecasts.

- Value: answers “what is already spoken for?” at the moment of decision.
- Blast radius: low; one nested Money surface plus derived domain logic.
- Limit: compact space may become crowded as evidence and correction states grow.

## C. Recurring Review Screen

A nested Money screen organizes upcoming obligations, likely recurring services, due timing, changes, and unresolved patterns. It is not a new global tab and does not offer cancellation.

- Value: strongest capability depth and clearest analogue to Origin’s standout recurring experience.
- Blast radius: low to medium; new route, richer state, and more empty/error/correction states.
- Limit: risks becoming a report users browse instead of an answer that improves decisions.

## D. Purchase Check

Maya enters an amount and optional category, and Money previews its effect on the existing monthly plan. The result is explicitly about plan fit, not affordability or financial advice.

- Value: differentiated, decision-proximate, and uses existing preview semantics.
- Blast radius: low to medium inside Money.
- Limit: without upcoming obligations it may offer false reassurance; it should follow, not precede, better future evidence.

## E. Ask About This Month

Money offers question-shaped prompts such as “Why is groceries higher?” or “What changed since last month?” and uses the existing contextual Chat drawer to explain exact evidence.

- Value: flexible explanation and strong perceived intelligence.
- Blast radius: medium to high because it crosses Money, Agent behavior, prompt contracts, and answer receipts.
- Limit: it is harder to make deterministic and trustworthy than a native evidence surface.

## Comparison

| Direction | User value | Isolation from the rest of Kwilt | Truth risk | Recommendation |
|---|---:|---:|---:|---|
| Quiet Attention Line | Medium | Very high | Low | Pair with the chosen capability |
| Upcoming Drawer | High | Very high | Low to medium | Best first slice |
| Recurring Review Screen | High | High | Low to medium | Grow into if the drawer proves too small |
| Purchase Check | High | High | Medium | Follow better upcoming evidence |
| Ask About This Month | Medium to high | Medium | Medium to high | Defer |

## Current recommendation

Converge provisionally on **Upcoming Drawer + Quiet Attention Line**:

1. derive likely obligations from existing Money evidence;
2. show each item as provisional, with its supporting transactions;
3. let Maya confirm, reject, or inspect rather than silently changing her plan;
4. show one Summary attention line only when the result is material;
5. feed confirmed obligations into the existing projection model in a later slice.

This creates one coherent Money capability without introducing another top-level destination, notification channel, generalized queue, or cross-capability dependency. Creative direction and interaction design should begin only after Andrew chooses this direction.

## Capabilities to avoid for now

- a new global Money home or additional primary tab;
- subscription cancellation integrations;
- full net-worth, investing, tax, or estate modules;
- household handoff before invitation and authority models exist;
- push alerts or recurring-engagement mechanics;
- a generalized AI financial-advice engine;
- “safe to spend until payday” without authoritative balances and income cadence.
