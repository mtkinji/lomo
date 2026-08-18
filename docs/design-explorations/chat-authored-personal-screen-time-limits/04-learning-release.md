# Learning Release: Chat-Authored Personal Screen Time Limits

## Concept To Build

Ask Chat for a personal daily app allowance, then finish the exact private selection and save in Kwilt's native Screen Time builder.

## Capability Delta

Today, the user cannot reliably carry self, app, and duration from Chat into Screen Time. After this release, they can repeat that job for any label and bounded daily duration. Per-session and household limits remain excluded.

## User Experience

Chat presents one **Continue in Kwilt** action naming the minute allowance. Continue opens the existing personal builder with `daily_limit` and duration already resolved. The user chooses apps through Apple's picker, reviews a sentence, and saves. The rule appears under **My rules**.

## Buildable Slice

Must be real: subject-safe routing, correction continuity, typed tool schema, durable client action, builder input, local persistence, Device Activity monitoring, threshold shield, and focused tests.

Can be thin: suggested app label is contextual copy only because Apple does not expose token lookup by name.

Intentionally excluded: analytics about which app was selected, usage-history storage, notifications, per-session reset, and server sync.

## Release Channel

Local/signed-device first. Simulator verifies navigation and builder state; signed-device proof is required for monitoring and shielding.

## Reversibility

The rule is a separate local kind with a named monitor/store. Disabling or deleting it stops monitoring and clears only its store.
