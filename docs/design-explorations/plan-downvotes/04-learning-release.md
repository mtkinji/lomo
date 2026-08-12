# Learning Release: Plan downvotes

## Concept To Build

Add one reversible, named downvote beside Plan upvotes so household members can
say “not for me” without starting a discussion or controlling the final choice.

## Capability Delta

Today, the user cannot:

- distinguish active dislike from silence.

After this release, the user can:

- toggle one downvote;
- replace a positive reaction with a downvote or vice versa;
- reveal who downvoted;
- see positive and negative input separately.

Still intentionally not supported:

- anonymous votes, reasons, vetoes, automatic removal, or a net popularity score.

## User Experience

Every eligible Plan row shows compact up and down arrows when the viewer has not
responded. Up opens the existing five-emoji picker. Down records a downvote
directly. Existing reaction pills and the downvote count reveal participants on
tap. The organizer continues to decide what goes to Groceries.

## Existing Product Relationship

This extends the current Plan reaction row and one-reaction-per-person record.
Recipes, Plan grouping, lifecycle, Groceries, and permissions stay unchanged.

## Buildable Slice

Must be real:

- typed downvote reaction, database constraint and RPC support;
- projection with separate positive and negative counts;
- optimistic replacement/removal;
- stable ordering and named disclosure;
- accessibility labels and Simulator proof.

Intentionally excluded:

- analytics-driven recommendation changes, reasons, notifications, and private projection.

## Release Channel

Local build first, then the branch's normal TestFlight path after multi-account proof.

## Brand-Goodwill Guardrails

- Downvotes never remove or block a recipe.
- Identity is revealable; there is no anonymous pile-on.
- Mixed reactions remain legible rather than collapsed into a score.

## Reversibility

The UI can hide the down-arrow without deleting stored response history. A later
private projection can reuse the same typed response if visibility proves wrong.

## Permanent Product Threshold

At least one multi-account household can explain the behavior, switch responses,
and make a better shopping decision without reporting that the interaction feels punitive.
