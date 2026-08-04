# Learning Release: Chat Transcript Copy

## Concept To Build

Copy the current visible Chat conversation from its existing overflow menu as paste-ready Markdown.

## Capability Delta

Today, the user cannot copy a whole Chat in one action.

After this release, the user can copy the title, ordered visible turns, timestamps, and attachment names.

Still intentionally not supported: public links, internal records, or attachment contents.

## User Experience

Open a durable Chat, tap the three-dot menu, then tap `Copy chat`. Kwilt confirms that the full conversation is ready to paste. Copy failure produces a contained device-level error.

## Existing Product Relationship

This enhances the existing conversation options menu and thread aggregate. It leaves Chat persistence, rendering, and privacy authority unchanged.

## Buildable Slice

Must be real: deterministic transcript formatting, device clipboard write, menu action, success/failure feedback, and automated formatter coverage.

Can be thin: local-build dogfood is sufficient for first learning.

Intentionally excluded: share sheet, server upload, link permissions, analytics on transcript content.

## Release Channel

Local build, then the next ordinary TestFlight after simulator verification.

## Brand-Goodwill Guardrails

- User initiation only.
- No network request.
- No hidden records or attachment contents.

## Reversibility

Remove the menu item and formatter; there is no schema, stored export, or sharing grant to unwind.

## Permanent Product Threshold

Andrew uses it naturally for multiple real Chat-improvement handoffs and the pasted transcript contains enough visible context without manual cleanup.
