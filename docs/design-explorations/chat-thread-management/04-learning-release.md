# Learning Release: Chat Thread Management

## Concept To Build
Give every active Chat row native swipe actions for reversible archive and confirmed permanent deletion.

## Capability Delta
Today, the user cannot clean up threads from the shell list. After this release, they can archive with Undo or permanently delete after confirmation. Bulk actions and a persistent archive browser remain unsupported.

## User Experience
The interaction lives on the existing Chat rows. Swipe right to reveal Archive; swipe left to reveal Delete. Both actions remove the row only after the repository succeeds.

## Buildable Slice and release channel
Repository archive/restore/delete operations, native swipe actions, loading protection, failure feedback, active-thread navigation repair, focused tests, and local simulator review. Release through the next normal TestFlight build after local proof.

## Guardrails and reversibility
Delete is never gesture-automatic and always names permanence. Archive offers Undo. The UI enhancement can be removed without migrating data.

