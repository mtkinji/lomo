# Learning Release: Chat Lightweight To-do Capture

## Concept To Build

Create and enrich an explicitly requested To-do in one Chat turn, then show the standard compact inventory row with its direct-open and swipe-delete grammar.

## Capability Delta

Today, the user cannot create an ordinary To-do from Chat without a redundant proposal decision.

After this release, the user can create it directly, tap it into native detail, return to the exact Chat thread, or swipe-left to delete it.

Still intentionally not supported: auto-applying updates, destructive actions, or non-To-do capability writes.

## User Experience

The user says “add call the school Friday.” Chat briefly shows bounded run progress, silently selects all available Quick Add AI enrichment choices, then replaces explanation/proposal ceremony with the authoritative Activity using the standard inventory display model. Tapping the row opens native Activity detail. Back returns to the same Chat thread. Swipe-left reveals Delete.

## Existing Product Relationship

This replaces the create proposal card, reuses the existing Activity operation/apply/recovery path, standard inventory metadata, native detail screen, and Chat return target. Update proposals remain unchanged.

## Buildable Slice

Must be real:

- Explicit create policy and auto-apply decision.
- Durable proposal/decision/receipt audit trail behind the compact result.
- Authoritative Activity creation, all available Quick Add enrichments, idempotency, recovery, delete, direct-open, and exact return.
- Standard inventory title/timing/estimate projection.

Can be thin:

- The credential-free web workbench mirrors the native inventory display model because React Native components cannot render inside its DOM.

Intentionally excluded:

- A Chat-specific To-do editor.
- Automatic updates to existing To-dos.
- Chat-specific trigger, notification, or enrichment controls.

## Release Channel

Production-hidden behind the existing Unified Chat feature flag, with signed simulator and physical-device proof before scoring as delivered.

## Brand-Goodwill Guardrails

- Only explicit create intent auto-applies.
- The result is immediately openable and deletable with the established inventory gestures.
- No additional effectful fields are introduced beyond the existing Activity contract.

## Reversibility

Disable Unified Chat or restore create proposals without migrating Activity data; created records remain ordinary authoritative Activities.

## Permanent Product Threshold

The full create/inspect/back/undo journey works without duplicate UI or incorrect enrichment on signed simulator and physical device.
