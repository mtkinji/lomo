# Converge: Money Transaction Notes

## Choice
Choose the note row plus focused drawer.

## Capability delta
Today, Maya cannot record that a generic Venmo charge paid for family pictures. After this change, she can add, edit, or remove a household-visible note while leaving Description, category, and plan treatment unchanged.

## Trade-offs
- Accepted: One additional secondary row appears on every transaction so the feature is discoverable.
- Accepted: Notes are household-visible because Money transactions are shared household records.
- Rejected: Inline always-editing, attachments, tags, and note-driven categorization.
- Rejected: Reusing Description, because it would blur provider truth.

## Reductive design
The smallest elegant version is one optional text field on the existing transaction object, one quiet entry point, and one editing drawer. There is no new screen, setting, confirmation dialog, receipt card, or separate note object.

## Activation
The empty `Add a note` value teaches the capability in context. No onboarding, promotion, or notification is needed.

## Bet
We're betting that household-specific context is useful often enough to justify one secondary row, but not often enough to justify a larger transaction-metadata system. If that is false, revisit discoverability or remove the row rather than expanding by default.

## Success signal
Andrew can annotate the Venmo transaction as “Family pictures,” leave and reopen the detail, and see the saved note without any change to Description, category, or plan coverage.
