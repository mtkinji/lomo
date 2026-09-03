# Learning Release: Analytics consent

## Concept To Build

A production-default privacy control that preserves default-on analytics and makes withdrawal immediate and durable.

## Buildable Slice

Real: versioned local state, default-on initialization after preference hydration, withdraw/renew control, queue clearing, identity reset, SDK opt-out, bounded copy, and automated state coverage.

Excluded: onboarding prompts, server-synced consent, granular categories, and changes to essential service/security processing.

## Release Channel

The next TestFlight candidate. Source tests can prove state and runtime contracts; a fresh-install proxy/network inspection on the signed candidate is still required for ASR-003 closure.

## Reversibility

The UI is one existing-surface group and the runtime is isolated behind one manager. The accepted default-on policy and its risk are explicit rather than hidden in initialization code.
