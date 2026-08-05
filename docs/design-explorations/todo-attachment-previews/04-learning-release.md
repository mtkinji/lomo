# Learning Release: To-Do Attachment Previews

## Concept To Build

Attachment cards in To-Do detail make supporting material recognizable and directly previewable without adding file-management chrome.

## Capability Delta

Today, the user cannot reliably recognize mixed attachment types or preview non-photo files in place.

After this release, the user can:

- Recognize photo, video, audio, and document attachments from one consistent card.
- Read useful type, size, duration, upload, failure, and sharing context.
- Tap the card to preview the attachment.

Still intentionally not supported:

- Attachment galleries, sorting, primary attachment selection, and main-list indicators.

## User Experience

Activity Detail shows a compact Attachments heading with an add action and a vertical list of generous attachment cards. The card is the primary preview target. A details surface retains secondary metadata and destructive actions.

## Buildable Slice

Must be real:

- Universal attachment card and all upload states.
- Lazy photo thumbnail loading.
- Direct preview behavior with a safe platform fallback.
- Accessible labels and 44-point-or-larger touch targets.

Can be thin or temporary:

- Non-photo media can use type-specific art until cached native thumbnails are available.

Intentionally excluded:

- A new attachment schema or eager background download system.

## Release Channel

Local build, followed by TestFlight only after native-device preview proof.

## Brand-Goodwill Guardrails

- No surprise downloads beyond the file the user chooses to preview.
- Failure state is written, not communicated by color alone.
- Sharing remains explicit.

## Reversibility

The card composes existing attachment records and services. It can fall back to the current details behavior without migrating data.

## Permanent Product Threshold

Real-device use shows attachments are easier to identify and open without making Activity Detail feel heavier.
