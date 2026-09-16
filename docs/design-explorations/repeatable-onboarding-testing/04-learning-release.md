# Learning Release: Repeatable Onboarding Testing

## Concept To Build

A development-only **Reset & replay onboarding** action cleans the previous onboarding-created graph and restarts onboarding without pretending to create a new account.

## Capability Delta

Today, Andrew cannot quickly replay onboarding from a scoped, clearly described starting point.

After this release, Andrew can reset onboarding answers, guides, and the last onboarding-created Arc graph in one action.

Still intentionally not supported: full account recreation from the app.

## User Experience

In Dev tools → Seed & reset → First-time UX, Andrew sees what will be preserved and taps one primary action. If known onboarding content exists, a destructive confirmation names that exact scope. The flow then opens.

## Existing Product Relationship

Enhances the existing DevTools card and reuses the existing onboarding/store contracts.

## Buildable Slice

Must be real:

- scoped object cleanup;
- onboarding-state reset;
- confirmation and truthful copy;
- focused store tests;
- Simulator clean-install and replay checks.

Can be thin: manual clean-install commands and manual email sign-in.

Intentionally excluded: backend admin APIs, public signup, account pool management, and App Review cohort changes.

## Release Channel

Local development build only.

## Brand-Goodwill Guardrails

- `__DEV__` route gating remains authoritative.
- No customer-facing control or analytics event.
- No ambiguous “reset account” label.

## Reversibility

Remove the DevTools copy/action changes; no schema or migration is involved.

## Permanent Product Threshold

This remains developer tooling. A customer-facing restart would need a separate product decision and must never imply account deletion.
