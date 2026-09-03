# Frame: Analytics consent

## What the user said

Preserve default-on product analytics while adding persisted withdrawal, immediate stop/reset behavior, and complete state tests; explicitly record the accepted policy risk.

## User and job

Audience: `audience-ai-native-life-operators`. Representative persona: Nina. Hero anchor: `jtbd-trust-this-app-with-my-life`.

When Kwilt can observe how she uses an intimate life system, Nina wants collection to be explicit, bounded, and reversible so she can trust Kwilt without surrendering control.

`serves: [jtbd-trust-this-app-with-my-life]`

## Job-flow gap

The cross-cutting trust gap is later control. Existing Legal & privacy settings link to policy documents but provide no analytics withdrawal choice.

## System alignment

Constraint posture: `Fit the system`.

- Reuse Legal & privacy, `SettingsGroup`, and `SettingsToggleRow`.
- Preserve the centralized event sanitizer and deterministic feature-flag fallbacks.
- Add one versioned local preference and one consent-managed client boundary.
- Keep essential service/security processing outside optional product analytics.

## Design challenge

How might we help Nina make and reverse a clear analytics choice while preserving a quiet Settings hierarchy and ensuring no feature depends on that choice?

## Out of scope

An onboarding gate, analytics dashboard, per-event controls, consent syncing between devices, or changes to the event schema.
