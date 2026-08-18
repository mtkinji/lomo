# Frame: Chat-Authored Personal Screen Time Limits

## What the user said

> Don't build the rule, fix the system so I can do it again via chat.

## Restated in user voice

When I state a personal app boundary in ordinary language, I want Kwilt to preserve that it is for me and carry the exact app and allowance into native review, so I can trust Chat to operate the real Screen Time capability without substituting a child or giving me generic instructions.

## Target audience and persona

`audience-ai-native-life-operators`, represented by Nina. A one-off Instagram shortcut, hidden token access, or prose-only answer would feel false.

## Hero and active anchors

- `jtbd-trust-this-app-with-my-life`
- `jtbd-stay-in-control-of-ai-actions`
- `jtbd-put-intention-before-impulse`

## Job flow step

Nina's **Express a practical job in ordinary language** step is 3/5. The observed failure changed an unspecified subject to Charlie, then lost the capability when corrected.

## System alignment

Constraint posture: `Extend the system`

- Unified Chat already supports typed native handoffs and a self Screen Time setup operation.
- Screen Time already owns personal rule identity, Apple selection tokens, inventory, and reconciliation.
- Apple app/category tokens remain device-local and are selected only in the native picker.
- Device Activity supports threshold callbacks; Managed Settings owns the resulting shield.

The extension is one generic personal `daily_limit` rule kind and one typed Chat handoff. Chat never receives Apple tokens and never claims the rule was saved merely because review opened.

## Aspirational design challenge

How might we help Nina create a reusable personal app allowance from ordinary language, while preserving native selection privacy, explicit review, and truthful enforcement receipts?

## Out of scope

- Creating Andrew's specific Instagram rule during development.
- Per-session reset, rolling windows, usage history, household limits, or cross-device sync.
- Chat auto-saving without native review.
