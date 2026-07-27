# Learning Release: money-category-ordering

## Concept To Build

An explicit Summary drawer lets the household drag Money categories into a durable shared order.

## Capability Delta

Today, the user cannot:

- change the category sequence;
- make Summary and category pickers share a personal order.

After this release, the user can:

- open `Reorder categories` from Summary options;
- drag full-width category rows and save once;
- use accessible Move up and Move down actions;
- see the saved order after refresh and relaunch.

Still intentionally not supported:

- groups, pins, automatic ranking, hidden categories, or per-month order.

## User Experience

Summary options opens a drawer titled `Reorder categories`. Each row shows the category name and a trailing drag handle. Dragging gives selection haptics at start and success haptics after the server confirms. Done saves a changed order; Cancel or closing before a change leaves the order untouched.

## Existing Product Relationship

This enhances Summary and reuses the order already consumed by Money snapshots and pickers. It does not change category creation, plans, transaction truth, or forecasts.

## Buildable Slice

Must be real:

- atomic owner-scoped persistence of the complete active-category order;
- optimistic drawer movement with rollback on failure;
- Summary and picker consistency;
- accessibility actions and announcements.

Can be thin:

- no onboarding or analytics dashboard;
- one internal dogfood event for save success/failure is sufficient.

Intentionally excluded:

- cross-household collaboration conflict UI beyond last authoritative write;
- direct meter-grid dragging.

## Release Channel

Local build, then the next normal TestFlight bundle after authenticated simulator proof.

## Brand-Goodwill Guardrails

- Never claim success before the atomic write returns.
- Never partially persist a sequence.
- Never make reordering a prerequisite to using Money.

## Reversibility

The capability is additive. The drawer/menu command can be removed while the stored `sort_order` values continue to provide a valid stable sequence.

## Permanent Product Threshold

Keep it when the saved order survives relaunch and feels easier than searching the grid during ordinary dogfooding.
