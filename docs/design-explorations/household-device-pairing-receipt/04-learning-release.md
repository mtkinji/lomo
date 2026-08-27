# Learning release: Household device pairing receipt

## Concept to build

The caregiver pairing screen becomes a quiet, automatically updating receipt for one exact child-device connection.

## Capability delta

Today, the caregiver cannot rely on the visible surface to complete itself without interpreting three secondary actions.

After this release, the caregiver can share or present the credential and receive an automatic connected confirmation.

Still intentionally unsupported: Apple authorization receipt, remote notification after leaving the screen, and multiple personal phones for one child.

## User experience

The header contains Back, the exact child/device title, and Share. The body contains the QR code, six-digit fallback, expiration, and a quiet waiting state. When the authorized device receipt appears, the body changes to a connected confirmation with one **Done** action.

## Existing product relationship

Enhances `HouseholdDeviceSetupScreen`; no new route, model, database permission, or setup step.

## Buildable slice

Must be real: server-authorized polling, exact-child matching, automatic transition, back cancellation, native Share, loading/error/success states, and accessibility labels.

Intentionally excluded: Realtime publication, manual refresh, animation spectacle, and account linking on the caregiver device.

## Release channel

Local build, followed by a physical two-device or TestFlight claim for final end-to-end proof.

## Brand-goodwill guardrails

- Never call the device ready for Screen Time from a Kwilt claim alone.
- Do not expose child or Household device rows to unauthenticated subscriptions.
- Keep errors quiet and the temporary credential recoverable until expiry.

## Reversibility

The change is limited to the existing screen and shared header slot; polling can be removed without data migration.

## Permanent product threshold

A real second device claims successfully, the caregiver screen updates without input, and the user understands what connected.
