# Learning Release: Family Screen Time Prerequisite Activity

## Concept To Build

A caregiver can tell Chat that Charlie must use one selected app for a set number of foreground minutes before another selected app group becomes available each day.

## Capability Delta

Today, the caregiver cannot:

- create this rule through Chat;
- store the prerequisite selection and threshold as a typed agreement;
- compile the agreement into a local Device Activity threshold.

After this release, the caregiver can:

- reuse or select semantic labels such as Gospel Library and Games;
- approve one readable prerequisite proposal;
- save a versioned agreement with truthful delivery state;
- apply the threshold and target shield on an enrolled signed child device.

Still intentionally not supported:

- content verification, reading history, multiple prerequisite apps, nested logic, or Android enforcement.

## User Experience

Maya writes, “Create a rule that Charlie has to read scripture for at least five minutes before he can unlock games.” Chat uses “Gospel Library” only when it is already a saved child-scoped selection or after Maya chooses and labels it through Apple's picker. Chat then stages:

> **Use Gospel Library before Games**
> Charlie uses Gospel Library for 5 minutes before Games become available each day.

After approval, Chat reports **Saved · waiting for Charlie's device** or the current applied state. Charlie's shield states the same requirement without moral judgment. The threshold fires locally; Kwilt does not upload a usage history.

## Existing Product Relationship

This enhances Unified Chat, Family Access Rule, the family Screen Time control plane, and the existing native selection/shield infrastructure. It creates no new destination.

## Buildable Slice

Must be real:

- typed tool contract, parser, target resolution, explicit proposal, agreement RPC, receipt, and persisted rule;
- native monitor extension and bridge contract for one prerequisite/target rule;
- privacy-safe copy and no app tokens in Chat evidence or analytics;
- red-green tests for logic, prompt/tool contracts, persistence, and native generated-source evidence.

Can be thin or temporary:

- one rule, one child, daily reset, and one prerequisite/target selection pair;
- signed-device application can remain behind the existing child-device enrollment/allowlist boundary.

Intentionally excluded:

- generic rule UI, reports, progress charts, rewards, notifications, or broad production activation.

## Release Channel

TestFlight allowlist after source gates and a signed-development-device threshold drill. Simulator and generated native source do not count as threshold proof.

## Brand-Goodwill Guardrails

- Say “use Gospel Library,” not “prove you read scripture.”
- Show caregiver approval and child-device application separately.
- Keep the required app available while targets are shielded.
- Reset predictably and retain a recovery/release path.

## Reversibility

The rule is additive JSON, independently deactivatable, and addressed by stable selection IDs. Disabling the learning flag must trigger deliberate device reconciliation rather than silently abandoning a shield.

## Permanent Product Threshold

One real family uses the rule across several days, the child can explain it, ordinary thresholds transition without requests, and no reboot/offline/reset case produces an incorrect or unrecoverable shield.
