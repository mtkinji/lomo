# Learning Release: Household Invite Delivery And Recovery

## Concept To Build

One Household invitation is remembered across real email delivery, recipient app discovery, QR, shared link, and short-code recovery.

## Capability Delta

Today, the family cannot trust that an entered email was sent or resume the original invitation without its long code.

After this release, the sender gets a truthful handoff receipt and the intended signed-in recipient can review the pending invitation without re-entering a code.

Still intentionally not supported: nearby pairing and automatic joining.

## User Experience

After **Invite caregiver**, the sender sees the recipient, delivery truth, QR, short code, and one Share action. If email fails, the receipt remains fully usable. On the recipient account, Household opens directly to the normal invitation review when a pending invitation matches the authenticated email.

## Existing Product Relationship

Enhances the existing Household create/preview/accept contract and reuses its privacy review. Device setup remains separate.

## Buildable Slice

Must be real: one pending invitation identity, recipient discovery, actual Resend attempt, QR/link/code receipt, explicit acceptance, auditability, and duplicate-prevention tests.

Can be thin: sender-side historical pending-invite management; recovery occurs when create is retried.

Excluded: nearby discovery, email-open tracking UI, and capability grants.

## Release Channel

TestFlight after local two-account proof and backend deployment, because email and cross-account discovery cannot be learned from a source-only build.

## Brand-Goodwill Guardrails

- Never say **Email sent** without a successful provider receipt.
- Email failure never destroys the QR/code fallback.
- Recipient review remains explicit.

## Reversibility

The new transport fields and RPCs are additive; clients can fall back to existing code preview/acceptance while the new receipt is rolled back.

## Permanent Product Threshold

Two separate accounts can complete create -> delivery/discovery -> review -> accept without duplicate invitation rows or manual support.
