---
feature: chores
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves:
  - jtbd-carry-intentions-into-action
  - jtbd-invite-the-right-people-in
  - jtbd-trust-this-app-with-my-life
briefs:
  - chores-as-recurring-activities
status: shipping
last_reviewed: 2026-08-25
---

# Chores

Gives a child a quiet view of assigned household work and a shared pool they may choose from, while preserving Activity occurrences as the canonical execution identity.

## Ownership

- `domain/` owns the temporary learning record, member projection, progress derivation, and deterministic claim/completion transitions.
- `runtime/` owns versioned, local-only learning persistence.
- `screens/` owns the child-legible inventory and simulated member switcher.
- Household will own real membership authority and Household Mode; Activities will own production occurrence identity and To-dos projection.

## Proof boundary

Chores is a regular, default-pinned capability. Its current data slice still uses simulated household members and sample occurrences. It does not read or write household-authorized Activity data, project claimed work into production To-dos, authenticate a child actor, protect caregiver re-entry, reconcile offline changes, award production streak/tokens, or change Screen Time. Those remain explicit proof boundaries rather than Labs gates.
