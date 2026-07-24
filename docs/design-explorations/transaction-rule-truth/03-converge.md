# Converge: transaction-rule-truth

## Scoring

| Alternative | Persona fit | Trust clarity | System fit | Blast radius | Verdict |
| --- | --- | --- | --- | --- | --- |
| Rule Receipt | High | High | High | Low | Choose |
| Truthful Rule Drawer | Medium-high | High | High | Low | Fold into chosen path |
| Provenance Per Row | Medium | High | Medium | Medium | Defer |
| Automatic Deduplication Only | Medium | Medium | Very high | Very low | Necessary but insufficient |

## Chosen alternative

Build **Rule Receipt** with a truthful drawer delta. The page owns the durable status; the drawer owns only creation or modification details.

## Capability delta

Today, the user cannot:

- Tell whether Costco → Shopping is an active future rule.
- Tell why historical Costco rows already share Shopping.
- Know whether `Create rule` will change 59 rows, zero rows, or future rows only.

After this release, the user can:

- See `Rule active` only when a matching saved rule targets the selected category.
- See `No rule yet` when the current category is not backed by a matching saved rule.
- Open rule creation intentionally and see exact existing-row and future-match impact.
- Close the drawer without changing anything.

Still intentionally not possible:

- Create a rule silently from category selection.
- Treat shared historical categories as proof of an active rule.
- Manage every rule from a new dashboard.
- Inspect provenance on every row by default.

## Reductive design decisions

- Enhance the existing transaction page instead of adding a rule-management surface.
- Replace the surprise follow-up with one inline truth receipt and, only when needed, one explicit CTA.
- Collapse redundant states: an active equivalent rule never gets a `Create rule` offer.
- In the drawer, count only rows whose persisted assignment would actually change.
- Refuse per-row provenance badges, rule analytics, and educational onboarding in the first slice.

## Activation path

The status appears organically after a transaction has an effective category and a merchant key. No onboarding or tooltip is needed.

- Active equivalent rule: show the receipt with no creation CTA.
- No active equivalent rule: show `No rule yet` with `Create rule`.
- Conflicting merchant rule: state the existing destination and require an explicit `Change rule` path rather than offering duplicate creation.

## Accepted trade-offs

- Maya sees summary provenance, not an audit label on every transaction.
- Exact/partial scope remains inside the builder.
- The first release may show only the matching rule relevant to the current merchant and selected category.

## Rejected trade-offs

- Hiding status until the drawer opens.
- Saying rows will be updated when their persisted category will not change.
- Inferring rule state from visual category repetition.

## System implications

- The connected snapshot must expose saved merchant rules to transaction detail.
- A shared selector should classify the state as `active`, `absent`, or `conflicting` for the merchant and selected category.
- Existing-row impact must compare persisted assignments, not merely collect matching merchant rows.

## Bet

We're betting that the dominant blocker is not rule complexity but missing system truth. If users still hesitate after status and delta are explicit, revisit by exposing lightweight per-row provenance in the preview only.

## Success signal

In self-use, Andrew can open Costco, immediately answer whether a future Shopping rule is active, and predict what the CTA will change before opening the drawer.
