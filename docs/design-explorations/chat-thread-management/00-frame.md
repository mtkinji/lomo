# Frame: Chat Thread Management

## What the user said
> I want to be able to swipe on these chats to delete them or archive them.

## Restated in user voice
When old or accidental conversations collect in Kwilt, I want to clear them from my active list without wondering whether I permanently lost something, so this private space stays calm and under my control.

## Target audience
`audience-ai-native-life-operators`, represented by Nina.

## Hero anchor and job-flow step
`jtbd-trust-this-app-with-my-life`, especially Nina's currently weak undo/audit step. This also directly serves `jtbd-stay-in-control-of-ai-actions`.

## System alignment
Constraint posture: `Fit the system`.

- The capability menu already owns the active thread list and the repository already supports archive.
- Thread deletion is already permitted by row-level security and cascades through thread-owned records.
- Kwilt already uses native swipe actions, destructive confirmation, compact toasts, and Undo.
- Preserve “no surprise data loss”: archive is reversible; delete is explicit and confirmed.

## Aspirational design challenge
How might we help Nina keep her active Chat list intentional, while making the difference between hiding and permanently deleting unmistakable?

## Out of scope
Bulk management, retention policies, export, and a full archived-chat browser.

