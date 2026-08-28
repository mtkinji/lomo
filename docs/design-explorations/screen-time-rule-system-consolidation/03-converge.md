# Converge: Screen Time Rule System Consolidation

## Decision in plain language

Kwilt will replace the current personal and Money Screen Time implementations with one canonical rule system and the sentence-based composer developed in this design thread.

Andrew has explicitly said the existing rules do not need to be preserved. The cutover therefore will not build a migration platform. It will safely remove every old native restriction and stored legacy rule, retire the legacy screens and runtimes, and start with an empty canonical rule collection. The user then creates rules only through the one composer.

## Chosen approach: Clean cutover

1. Stop every legacy writer and foreground reconciler.
2. Enumerate all known legacy personal and Money rule/selection IDs.
3. Clear their native restrictions and usage monitors idempotently.
4. Verify that no legacy ManagedSettings selection remains active.
5. Delete legacy personal and Money rule records.
6. Make canonical composite rules the only persisted personal rule shape.
7. Route Settings, Money, Focus, Activities, Chat, and other contextual entry points into the sentence composer.
8. Remove legacy rule editors, pickers, inventory branches, domain policy ownership, and reconciliation code.

Successful cleanup is silent. If Kwilt cannot prove that old enforcement was cleared, it must not pretend the reset succeeded; it presents one calm recovery action to clear Screen Time setup or review app selection.

## Why this fits Maya

Maya encounters one understandable rule regardless of whether she begins in Settings or a Money category. Money can preselect the relevant budget, but the resulting rule is unmistakably a Screen Time rule and remains fully editable through the same sentence.

## Why this fits Marcus

Marcus receives the smallest durable system: one inventory, one rule identity, one editor, and no hidden compatibility layer to maintain. The product removes configuration concepts rather than accumulating them.

## Capability delta

### Today, the user cannot reliably

- Open every visible Screen Time rule in the same editor.
- Combine a budget condition with time, usage, Focus, or real-step truth in one rule.
- Expect enablement, deletion, explanation, and enforcement to behave consistently across rules.
- Know that visually similar rules share one persistence and lifecycle model.

### After consolidation, the user can

- Create and edit any personal rule in the sentence-based composer.
- Read one statement containing outcome, selected apps, conditions, and AND/OR logic.
- Start from Money, Focus, Activities, Settings, or Chat and arrive at the same rule.
- Add or replace a budget condition without changing rule ownership.
- Toggle, delete, explain, and reconcile every personal rule through one lifecycle.
- Trust that the visible statement and native enforcement derive from the same aggregate.

### Still intentionally unsupported

- Preserving or converting existing personal and Money rules during this development phase.
- Arbitrary nested Boolean groups, scripting, or a general automation language.
- Silent Chat mutation of native app selections or rule enforcement.
- Cross-adult visibility into private rules.
- Automatic Household authority changes as a side effect of the personal clean cutover.
- Claims of physical enforcement before signed-device proof.

## Ownership model

### Screen Time owns

- Rule ID and native selection ID.
- Subject and visibility scope.
- Selected apps and categories.
- Outcome: allow or pause access.
- Conditions and AND/OR connector.
- Enabled state, deletion, overrides, and lifecycle receipts.
- Evaluation composition, overlap behavior, native projection, and blocker explanation.
- The sentence composer, inventory row, Chat identity, and contextual return behavior.

### Condition providers own

- Eligible fields and predicates.
- Current typed truth and freshness.
- Human-readable labels and condition-specific validation.
- Capability destinations for inspecting or correcting source evidence.

Money owns budget names, predicate semantics, current budget truth, and the route for inspecting that truth. It does not own Screen Time selections, rule persistence, lifecycle, or enforcement.

## Reductive design decisions

- Use the existing sentence composer; create no migration editor, reset wizard, or second builder.
- Keep one Screen Time inventory and remove the `money` rule domain.
- Keep contextual Money entry, but make it a prefilled route into the common composer.
- Show no migration labels, progress bars, banners, or technical records after successful cleanup.
- Add no provider taxonomy, rule names, scripting mode, nesting UI, or diagnostics dashboard.
- Preserve one direct lifecycle control in the list and one lifecycle menu in detail.
- Delete compatibility code in the same phase rather than carrying it as future flexibility.

## System implications

- Promote `PersonalCompositeScreenTimeRule` into the canonical personal rule contract, renaming it only if the rename materially improves ownership clarity.
- Add a typed condition-provider boundary for Money, Focus, real-step, daily usage, and time of day.
- Make canonical rule actions the only write path used by Settings, contextual entry, runtime recovery, and Chat.
- Add one idempotent legacy-cleanup operation with an explicit version marker so relaunch cannot recreate or repeatedly mutate retired state.
- Clear every known legacy native selection and usage monitor before deleting its JavaScript record.
- Keep personal and Household authority adapters explicit while sharing the aggregate schema and composer contract.
- Remove Money app-control storage, screens, budget picker, policy evaluation loop, foreground sync aliases, inventory projection, and route types.
- Remove legacy personal rule persistence and projection after cleanup.
- Update imported Money briefs so historical ownership claims are marked superseded.

## Accepted trade-offs

- Existing development rules and their app selections will be lost.
- Andrew will recreate representative rules through the canonical composer.
- The reset requires careful native cleanup even though data migration is intentionally omitted.
- Household can retain a distinct authority/persistence adapter during this phase, but not a different grammar or editor.

## Rejected trade-offs

- We will not preserve separate Money ownership to avoid cleanup work.
- We will not hide split storage behind one visual facade.
- We will not build migration, shadow comparison, or rollback infrastructure for rules Andrew does not need.
- We will not block consolidation until every Household scenario is complete.
- We will not delete records before clearing the native enforcement they reference.

## Activation path

- Settings > Screen Time remains the canonical management surface and begins with no rules after cutover.
- Money category detail can offer **Add app rule** and open the sentence composer with the budget condition preselected.
- Focus and real-step offers open the same composer with their condition preselected.
- No broad announcement or coachmark is required; consistency teaches the system.
- If legacy cleanup fails, show one recovery action without exposing migration terminology.

## Success signal

Andrew can begin from Settings and Money, create equivalent rules in the same composer, combine a budget with another condition, save, toggle, relaunch, understand why an app is paused, temporarily open it, and delete the rule without encountering a legacy editor or leaving an orphan restriction.

## The bet

We're betting that one readable rule identity will improve comprehension and trust more than capability-local editing improves contextual convenience. We preserve contextual convenience through prefilled entry. If Money needs more context while editing, we add a source-evidence link or compact budget context—not a separate rule system.

## Completion threshold

The phase is complete when:

1. Legacy restrictions and records are cleared idempotently in upgrade and relaunch tests.
2. No legacy editor, storage writer, reconciler, inventory domain, or route remains reachable.
3. Source tests cover every condition provider, connector, overlap, lifecycle action, and cleanup path.
4. Simulator proof covers empty state, rule creation, sentence editing, contextual Money entry, lifecycle actions, relaunch, and recovery.
5. Signed-device proof covers native selection, enforcement, overlap, toggle, delete, temporary open, and cleanup.
6. TestFlight upgrade proof shows no orphan restrictions after installing over the current development build.

## Success decision

Accept the canonical system when the sentence composer is comprehensible and signed-device cleanup/enforcement passes. If cleanup fails, keep the build out of distribution and repair the cleanup operation; do not restore the legacy product model.
