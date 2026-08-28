# Diverge: Screen Time Rule System Consolidation

> **Decision update:** Andrew explicitly does not need existing rules preserved. The migration alternatives below record the evaluated paths, but convergence now uses a clean cutover: clear legacy native enforcement, delete legacy records and routes, and begin with an empty canonical rule collection. No migration or shadow-comparison platform is required for this phase.

## Fixed product contract

All alternatives use the same sentence-based composer already developed in this design thread. The user edits one readable statement:

> Allow access to Social when time of day is after 5:00 PM AND daily use is below 15 minutes.

The composer owns target selection, outcome, conditions, connector, lifecycle menu, save, and deletion. Money, Focus, Activities, time, and usage may supply fields and truth; none receives a separate rule editor.

## Axis of variation

The alternatives vary the **cutover strategy** from parallel legacy records to one canonical composite aggregate—not the user-facing composer.

## Alternative A: One-Time Atomic Migration

At the first eligible app launch, Kwilt converts every legacy personal rule and Money app-control policy into canonical composite rules, transfers or preserves native selection IDs, persists a migration receipt, reconciles the new aggregate set, and retires legacy reads immediately. If any rule cannot migrate safely, the transaction does not commit and the old system remains active.

### Audience and persona fit

Maya receives the cleanest conceptual result: after migration, every visible rule opens the same composer and there is no mixed state. Marcus benefits from the smallest long-term maintenance surface.

### Design-challenge answer

It creates genuine unity quickly, with one rule identity and no visible legacy branching after a successful cutover.

### System fit

- Reuses the existing composite rule schema, atomic action boundary, selection-transfer affordance, and sentence composer.
- Requires a transactional migration coordinator across the app store, Money AsyncStorage, and native ManagedSettings selections.
- Requires strong rollback because the current stores and native selection transfer do not share one native transaction.

### Best when

- Legacy rule volume is small and well characterized.
- Selection transfer is proven idempotent on signed devices.
- We can prevent any new legacy writes before cutover begins.

### Fails when

- A native selection transfers but JavaScript persistence fails, or vice versa.
- Money data is temporarily unavailable during migration.
- One malformed legacy policy blocks every otherwise-valid rule.

### Four-object and capture-first stance

This touches no Arc or Goal model. Real-step conditions consume Activity completion truth but never require Arc/Goal alignment and never block Activity capture. It restricts only user-selected external apps.

### Anti-pattern check

Passes if migration is silent on success and presents one calm recovery path on failure. Fails if it creates a migration wizard, technical dashboard, or forced configuration session.

## Alternative B: Dual-Read, Canonical-Write Cutover

Kwilt first makes the composite store the only place new and edited rules can be written. The Screen Time inventory temporarily reads both canonical and legacy sources, but every legacy row opens the sentence composer. Saving that rule writes one composite aggregate, verifies native application, records a migration receipt, and only then removes the legacy policy. A background migration converts untouched rules after dual-read comparison proves equivalent evaluation. Legacy editors and writes are removed at the start; legacy reads and reconciliation remain temporarily as a rollback bridge.

### Audience and persona fit

Maya immediately experiences one consistent editor without being forced through a migration event. Existing rules continue working while the system gathers evidence. Marcus gets a stable rule identity the first time he touches a rule.

### Design-challenge answer

It unifies the user experience first while sequencing data and enforcement cutover conservatively enough to protect trust.

### System fit

- Builds directly on the current replacement bridge in the sentence composer.
- Extends inventory normalization into an explicit migration projection rather than a permanent multi-domain presentation layer.
- Requires temporary comparison logic, migration receipts, and a hard retirement threshold so dual-read does not become permanent architecture.

### Best when

- Signed-device enforcement evidence is still incomplete.
- We want immediate UX consistency with reversible technical migration.
- Rules may be touched gradually and can migrate independently.

### Fails when

- Legacy writes remain reachable and recreate records after migration.
- The retirement threshold is vague, leaving two reconcilers indefinitely.
- Projection copy differs from the canonical rule and hides semantic mismatch.

### Four-object and capture-first stance

No life-architecture object changes. Real-step truth remains an optional condition sourced from Activities, and capture remains unconditional.

### Anti-pattern check

Passes if dual-read is internal and time-bounded. Fails if users see “legacy,” migration status, duplicate rows, or multiple save destinations.

## Alternative C: Projection-Only Canonical Facade

Kwilt leaves legacy Money and personal records in their existing stores but projects each into a common `ScreenTimeRule` facade. The sentence composer edits the facade, and adapters translate changes back into the originating store. One inventory and editor appear unified while storage and runtime ownership remain distributed.

### Audience and persona fit

Maya sees a consistent interface quickly. Marcus can edit rule behavior in one grammar, but the apparent unity depends on adapters remaining perfectly aligned.

### Design-challenge answer

It solves surface inconsistency without immediately moving durable ownership.

### System fit

- Lowest migration risk and smallest initial data change.
- Requires bidirectional adapters for every condition, lifecycle action, overlap case, Chat operation, and future schema evolution.
- Preserves multiple reconcilers and sources of truth indefinitely.

### Best when

- Existing stores cannot be migrated safely in the near term.
- The goal is only a short-lived UI experiment.
- Enforcement parity matters more than architectural simplification during that experiment.

### Fails when

- A composite rule contains conditions that cannot round-trip to a legacy store.
- AND/OR semantics or multi-condition rules exceed a Money policy's shape.
- Users receive different outcomes from rules that look identical.

### Four-object and capture-first stance

No object-model or capture change. The risk is trust, not life-architecture fit.

### Anti-pattern check

Fails the permanent-product bar because it hides system fragmentation behind a consistent surface. It is acceptable only as a short-lived proof mechanism with an explicit deletion date.

## Alternative D: Shadow Migration Then Coordinated Cutover

Kwilt creates canonical composite shadows for every legacy rule while legacy records remain authoritative. It evaluates both systems against the same Money snapshot and device facts without allowing the shadow rules to enforce. Internal comparison records semantic equivalence, selection continuity, and expected active state. After a signed-device cohort reaches the parity threshold, one coordinated release switches enforcement and editing to composites, then removes legacy paths.

### Audience and persona fit

Maya experiences no behavioral change during shadowing, then receives a fully unified system in one release. Marcus avoids per-rule migration states.

### Design-challenge answer

It prioritizes enforcement confidence before changing user-visible ownership.

### System fit

- Reuses composite evaluation without immediately applying native restrictions.
- Requires privacy-safe shadow telemetry, deterministic clocks/snapshots, migration receipts, and a coordinated release switch.
- Delays the consistent composer for existing Money rules until the cutover unless editing itself is moved earlier.

### Best when

- Physical-device enforcement risk is the dominant concern.
- We can run a meaningful signed-device/TestFlight comparison period.
- Existing rules are stable enough to compare repeatedly.

### Fails when

- Shadow evaluation cannot reproduce device-local usage or timing truth.
- The comparison period produces little real usage.
- Product inconsistency remains visible too long while waiting for confidence.

### Four-object and capture-first stance

No object-model or capture change. Shadow evaluation must not generate notifications, blocks, or user-visible duplicate state.

### Anti-pattern check

Passes as an invisible technical learning release. Fails if internal parity machinery becomes a customer-facing status experience or records private app identities.

## Comparative read

- **A** produces the cleanest architecture fastest but concentrates migration and rollback risk into one event.
- **B** gives the user the canonical composer immediately, moves ownership rule by rule, and supports a controlled retirement path.
- **C** is the fastest visual unification but preserves the very split ownership this phase exists to remove.
- **D** gives the strongest pre-cutover evidence but delays the product correction and depends on enough signed-device usage to learn.

The next convergence step should test a hybrid of **B as the product cutover** and **D as the enforcement proof mechanism**. The sentence composer remains fixed in either case.
