# Converge: To-Do Attachment Previews

## Chosen alternative

Enhanced attachment rows.

Each attachment gets one universal mobile card with a 48–56 point media well, filename, one line of useful metadata or state, and a whole-card preview action. Photo media uses a real thumbnail; other types use clear type-specific media until a native thumbnail is available.

## Capability delta

Today the user can store an attachment but must identify it mostly by filename and open an intermediate details drawer that previews photos only.

After this change, the user can recognize attachment type and state at a glance and open the content directly from the card. Secondary details, sharing, and deletion remain revealed later.

## Reductive decisions

- Keep attachments out of the main To-Dos list.
- Use one layout for mixed media; add no gallery mode.
- Do not invent a primary attachment.
- Move the add action into the section heading when attachments exist.
- Keep destructive actions out of the card's resting state.
- Treat filename, type, size or duration, and exceptional state as sufficient resting information.

## Activation

No teaching or coachmark. The richer card appears naturally after a user adds the first attachment.

## Bet

We're betting that recognition plus one-tap preview matters more than making attachments visually dominant. If photo-heavy real use disproves that, revisit with a photo-only snapping gallery rather than changing the mixed-file default.

## Success signal

In ordinary To-Do use, Andrew can identify and open the intended attachment without first reading an attachment-details screen.
