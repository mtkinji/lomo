# Converge: Chat Thread Management

## Chosen direction
Bidirectional swipe: right reveals Archive; left reveals Delete.

Archive immediately removes the thread from the active list and offers Undo in the standard toast. Delete first presents a confirmation that explains the conversation is permanently removed. If the active thread is affected, Chat returns to the next active thread or a clean Chat destination.

## Reductive decisions

- Enhance the existing row; add no management screen, mode, checkbox, or settings.
- Keep one action per direction rather than a crowded tray.
- Do not make a full swipe execute either action automatically.
- Do not add bulk deletion or retention controls in this slice.

## Bet and success signal
We're betting that distinct swipe directions plus confirmation/Undo make routine cleanup fast without weakening trust. Revisit with a visible Archived section if people need recovery after the Undo window.

Success means a user can archive or delete from the menu, can immediately undo archive, and cannot permanently delete through an accidental gesture alone.

