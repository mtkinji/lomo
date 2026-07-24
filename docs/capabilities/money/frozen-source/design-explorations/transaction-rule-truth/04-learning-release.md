# Learning Release: transaction-rule-truth

## Concept To Build

Transaction review shows whether a merchant rule is active before offering rule creation, and the builder states the real change delta.

## Capability Delta

Today, the user cannot:

- Distinguish repeated current categorization from an active future rule.
- Trust the builder's historical update count.

After this release, the user can:

- See active, absent, or conflicting rule truth inline.
- Create a missing rule intentionally.
- Know how many existing transactions will actually change and that future matching will begin.

Still intentionally not supported:

- Global rule management.
- Per-row provenance outside the builder.
- Silent rule creation or broadening.

## User Experience

On transaction detail, beneath Category, Maya sees one compact rule receipt. For Costco in Shopping it says either `Rule active — Future Costco charges will be categorized as Shopping` or `No rule yet — Create a rule for future Costco charges`. An active equivalent rule has no creation CTA. A missing rule can open the existing exact/partial builder. The builder says `0 existing transactions will change` when every visible row already has Shopping and separately says the rule will apply to future matching charges.

## Existing Product Relationship

This enhances the existing transaction page and rule drawer. It replaces the automatic or ambiguous follow-up offer; category assignment, matching semantics, and the transaction inventory remain unchanged.

## Buildable Slice

Must be real:

- Load saved merchant-rule truth with the connected transaction snapshot.
- Derive equivalent, absent, and conflicting rule states.
- Suppress duplicate `Create rule` offers.
- Calculate actual existing-row changes separately from future coverage.
- Persist a newly created rule through the existing write path.
- Refresh the receipt after creation.

Can be thin or temporary:

- Conflict handling can route to a focused change-rule drawer rather than a full editor.
- Preview data can use one representative active and absent rule fixture.

Intentionally excluded:

- Rules tab or settings inventory.
- Rule deletion from transaction detail.
- AI rule suggestions.
- Analytics beyond the minimal evaluation events.

## Release Channel

`TestFlight build` - the confusion emerged in real phone use and depends on drawer behavior plus live saved-rule truth.

## Brand-Goodwill Guardrails

- Never label a rule active unless a saved matching rule exists.
- Never say transactions will update when their persisted category will not change.
- Never create or broaden a rule from category selection alone.
- Use direct copy that names the merchant, destination category, and future effect.

## Reversibility

The change is derived UI over existing transaction and rule data. It adds no required migration if saved rules are already available through the snapshot, so the receipt and adaptive CTA can be rolled back without changing stored rules.

## Permanent Product Threshold

Keep the capability when phone use shows users can correctly identify active vs absent rules and the builder's stated delta matches the persisted result across representative merchants.
