# Frame: Kwilt Money Native Integration And Shared Settings

## What the user said

> Get the Money capabilities integrated natively into Kwilt, and refactor Kwilt proper's settings from Money's better settings UX/UI. Keep all work on a dedicated new branch.

## Restated in user voice

When household money needs attention, Maya wants to understand and act on it in the same calm Kwilt she already trusts, so she does not have to manage separate products, identities, or configuration systems.

## Target audience

`audience-aspirational-family-organizers` — people who want household life to feel organized without turning it into a productivity or finance hobby.

## Representative persona

Maya is coordinating ordinary family commitments and household money.

- Current situation: Money already contains useful financial workflows, but it lives in a separate TestFlight app.
- What she is trying to do: see financial reality and make the next responsible decision without learning another system.
- Emotional state or tension: she needs trustworthy detail but does not want complexity everywhere else in Kwilt.
- What would make this feel wrong: an app-within-an-app, repeated sign-in, misleading totals, duplicated settings, or finance services starting when she never opened Money.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — household money decisions are part of moving family life forward.

## Job flow step

`job-flow-maya-move-family-life-forward`: before this work, Kwilt cannot show household money reality in the same product. Delivery is effectively 1 for reviewing money before acting, and the separate app creates an adoption and trust seam.

## Active anchors

- `jtbd-put-intention-before-impulse` — current budget reality should be visible before spending.
- `jtbd-carry-intentions-into-action` — financial intentions need authoritative review and correction paths.
- `jtbd-trust-this-app-with-my-life` — identity, privacy, totals, settings ownership, and rollback must remain explicit.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Option G is the single capability shell; global Settings opens from the avatar.
- Existing user flow: Money has Summary, Transactions, and Accounts as its established local places.
- Existing domain/data model: Money tables and Edge Functions already live in the shared Kwilt Supabase project.
- Existing technical affordances: React Navigation root, capability registry/lifecycle coordinator, shared Supabase session, `SettingsSurface` primitives, unified Chat, and shared native targets.
- Existing UX/copy conventions: Money's grouped settings cards and compact rows are calmer and more coherent than Kwilt Settings Home's current flat icon list.

Constraints to preserve:

- One binary, router, auth/session, settings home, RevenueCat owner, notification owner, deletion/export path, and release train.
- No Money queries, charts, Plaid, privacy prompts, widget work, or Screen Time work before Money entry.
- Money retains its financial vocabulary, three-place navigation, privacy boundary, and authoritative data semantics.
- Existing standalone Money remains recoverable until unified parity is accepted.

Constraints we may challenge:

- Kwilt Settings Home's custom flat-row presentation may be replaced by the already-proven grouped settings grammar.
- The older Games-first program sequence is superseded by the user-authorized Money-first sequence.

Design implication:

Port Money as a native capability, not a nested application. Promote only the reusable settings grammar into shared Kwilt UI; classify each setting by global, capability, object, or session ownership before moving it.

## Aspirational design challenge

How might we help Maya understand and act on household money reality inside one calm Kwilt app, while preserving authoritative financial truth, capability-local privacy, and a single understandable settings system?

## Out of scope

- Redesigning Money's core financial workflows during the port.
- Bulk-copying the standalone Expo Router shell.
- Retiring standalone Money before parity and explicit authorization.
- Creating a second Money settings home.

## Open question

None blocks implementation; native/device acceptance remains an evidence gate rather than a design ambiguity.
