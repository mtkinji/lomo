# Converge: Copy Visible Transcript

## Chosen alternative

Option A, `Copy chat` in the current conversation menu.

## Capability delta

Before: Andrew must screenshot or copy individual turns to give Codex the conversational evidence needed for product improvement.

After: one action copies the chat title and ordered visible User/Kwilt turns as Markdown, ready to paste.

Still excluded: public links, internal reasoning or run metadata, private context records, evidence, proposals, receipts, and attachment contents.

## Reductive decisions

- Enhance the existing overflow menu; add no new screen or setting.
- Use one action, not separate copy-format choices.
- Include attachment names for conversational provenance but not their contents.
- Use stable ISO timestamps suitable for developer inspection.

## Activation

Organic discovery in the menu is sufficient. Success is Andrew naturally using the action after a useful or disappointing Chat exchange and pasting the result into Codex.

## Bet

We're betting that a local Markdown copy solves the real developer feedback loop without hosted sharing. If repeated use shows cross-device or collaborator friction, revisit a native share sheet before designing private links.
