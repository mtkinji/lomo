# Learning Release: Native Money And Shared Settings

## Concept To Build

One Kwilt app with a native Money capability and one Money-informed settings system.

## Capability Delta

Today, the user cannot:

- use live Money or its three-place navigation inside Kwilt;
- configure the combined product through one coherent settings hierarchy.

After the first learning release, the user can:

- open Money from Option G and move through live read-only Summary, Transactions, Accounts, and detail surfaces;
- use the refactored grouped Kwilt Settings system;
- unlock protected Money locally and return exactly from Money context or Chat.

Still intentionally not supported in the first release:

- Money mutations, Plaid linking, widgets, Screen Time consolidation, or standalone retirement.

## User Experience

The avatar opens the refactored global Settings home. Money appears once in the capability menu. Entering Money activates its runtime and opens Summary; a compact local place control switches to Transactions or Accounts. Detail screens preserve local back behavior. Leaving Money deactivates foreground resources. Protected Money content uses a capability-local privacy gate.

## Existing Product Relationship

This enhances the accepted Option G shell and replaces only Settings Home's presentation. It preserves current Kwilt settings destinations and Money's established financial workflows.

## Buildable Slice

Must be real:

- capability registration, routing, persistence migration, deep links, lifecycle, and zero-work-before-entry tests;
- shared settings components and migrated Settings Home behavior;
- shared-session live read projections with no fixture fallback;
- read-only Money screens/detail, privacy cover/unlock, and exact return;
- archive, App Thinning, launch/memory, simulator, and signed-device evidence.

Can be thin or temporary:

- internal-only availability while parity is being proven;
- finance charts may begin with the least dependency-heavy truthful presentation before Skia is added.

Intentionally excluded:

- standalone shell/provider code;
- backend migrations in the read-only slice;
- unsupported mutation affordances.

## Release Channel

TestFlight build for Andrew/internal testers after local and simulator gates. This is the earliest channel that can prove the native privacy and performance boundaries honestly.

## Brand-Goodwill Guardrails

- No fixture financial data in a signed-in state.
- No success copy before authoritative state exists.
- Money stays hidden until the coherent read-only path passes.
- Existing standalone Money remains available.

## Reversibility

Each phase is an independently revertible commit/build boundary. Data work is additive and backward-readable. Native dependencies enter one at a time with archive evidence.

## Permanent Product Threshold

Read and write parity, one-owner global concerns, signed-device privacy/Plaid/widget/Screen Time proof, accepted startup/storage impact, and explicit standalone-retirement authorization.
