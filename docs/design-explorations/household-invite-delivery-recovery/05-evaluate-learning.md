# Evaluate Learning: Household Invite Delivery And Recovery

## Learning questions

- Does recipient discovery remove code entry in the normal email-bound path?
- Does the receipt make email failure recoverable without confusion?
- Can families distinguish account invitation QR/code from child-device setup?

## Evidence

Support: one invitation row, successful email provider receipt or explicit failure, recipient discovery, explicit acceptance, and no duplicate retry.

Disconfirming: users create a second invite, mistake the QR for device authorization, or cannot tell whether email was sent.

## Instrumentation

Record coarse invitation-created/recovered, email-send outcome, recipient-discovered, previewed, and accepted events. Never record email addresses, codes, tokens, or QR contents in analytics.

## Decision rule

Keep and broaden after two-account Simulator plus TestFlight proof across delivered-email, failed-email, QR, and manual-code paths. Revise before rollout if any path creates duplicate invitation identity or bypasses review.
