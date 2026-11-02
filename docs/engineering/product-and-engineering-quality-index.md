# Product and engineering quality index

Status: working assessment framework; individual capability assessments carry their own evidence and release decisions.
Established: 2026-11-01.

This is Kwilt's entry point for evaluating whether a product is well architected across disciplines. The criteria are reusable across products; the owners, implementation, acceptance cases, and evidence below are specific to Kwilt. A capability's success means that people can complete its intended jobs reliably and promptly, not merely that its code is organized or its tests pass.

## How to measure

Record two independent dimensions for each area:

- **Practice maturity:** absent, documented, implemented, enforced, maintained. Enforced requires evidence that a relevant failure prevents progression. Maintained also requires recurring review and correction of exceptions.
- **Current outcome evidence:** passed, failed, incomplete, unverified, or stale. Name the workflow, candidate, environment, observation date, and limitations.

Do not average these into a single quality percentage. Financial integrity, authorization, and a broken primary workflow are blocking conditions regardless of strengths elsewhere. A green static check does not imply a successful interaction; a deployed prerequisite does not imply a completed workflow.

Every assessment should identify the product owner, implementation owner, applicable acceptance case, supporting artifact or command, next action, and verification boundary. In this solo-development project Andrew owns product and release decisions; the executing agent owns implementation evidence and a precise handoff, not an unsupported release claim.

## Reusable criteria and Kwilt application

| Area | What good means | Kwilt sources and mechanisms | Evidence needed |
| --- | --- | --- | --- |
| 1. Product purpose and scope | An identifiable user outcome, constraints, and non-goals guide tradeoffs. | [Context primer](../jtbd/_kwilt-context-primer.md), capability manifests, feature briefs. | The change states the outcome and why its cost and risk are justified. |
| 2. Audience, jobs, and research | User evidence and hypotheses are distinct; representative circumstances change decisions. | [Personas](../personas/_index.md), [JTBDs](../jtbd/_index.md), product lint. | Current user evidence, valid references, confidence and contrary evidence. |
| 3. End-to-end delivery | The whole job works, including setup, handoffs, correction, and return. | [Job flows](../job-flows/_index.md), delivery-evidence contracts. | Observable workflow cases with state before/after; no component-only completion claims. |
| 4. Interaction and accessibility | Feedback is prompt, controls work, and errors preserve context and entered work. | [Design system](../design-system/README.md), [input guidance](../design-system/input-guidance.md), owned UI, native interaction tests. | Real gestures, keyboard, focus, VoiceOver, large text, loading/empty/error/retry behavior on the relevant surface. |
| 5. Architecture and ownership | One clear owner for each rule, mutation, and source of truth; bounded dependencies. | [Capability platform](../architecture/unified-kwilt-capability-platform.md), `FEATURE.md`, [code map](../agent-code-map.md), architecture lint. | Traced callers and state transitions; shared native/Chat/backend contracts; documented migration implications. |
| 6. Domain and data integrity | Atomic changes, explicit invariants, correct concurrency, and durable receipts. | Domain modules, schema constraints/RLS, RPCs, SQL fixtures, action contracts. | Failure injection, concurrent actors, retry/idempotency, round-trip and cross-surface reconciliation. |
| 7. Reliability and recovery | Failures are bounded, understandable, and recoverable without duplicate or partial work. | Typed service errors, cache/reconciliation lifecycles, provider receipts and runbooks. | Offline, timeout, lost response, stale input, session change, retry and relaunch cases. |
| 8. Performance and scaling | Common tasks have explicit latency/work budgets at realistic data sizes. | Capability telemetry, database plans, device profiling, representative fixtures. | Request counts and critical path; CPU/render work; measured p50/p95 on a named build/device/network. No inference from test duration. |
| 9. Security and privacy | Actor, owner, scope, entitlement, and retention are enforced at trusted boundaries. | RLS/grants, server validation, privacy lock, deletion/export, scoped actions. | Owner/adult/child/unrelated/signed-out matrix; negative tests; data minimization and cache clearing. |
| 10. Maintainability | Typed, cohesive, discoverable modules make changes safe; debt has an owner. | [Code-health audit](code-quality-audit-2026-06-25.md), [refinement backlog](code-quality-refinement-backlog.md), code-health ratchet. | Current hotspot metrics plus change risk. Smaller files alone do not prove better behavior. |
| 11. Verification and review | Tests exercise user-visible failure modes at the correct layer. | [Testing strategy](../automated-testing-strategy.md), [tiered verification](../development/local-verification.md), review and CI. | A regression fails before the fix and passes afterward; integration and target-runtime cases cover the changed contract. |
| 12. Delivery and operations | Changes reach reviewable checkpoints; app, schema, functions, and configuration are compatible and recoverable together. | Checkpoints below, migrations, CI, release scripts, deployment receipts, restore/forward-fix procedures. | Bounded commit/PR scope, integration cadence, target-environment preflight, candidate identity, migration/function versions, rollout and rollback evidence. |
| 13. Observability and support | Failures and delays can be located without exposing private content. | Allowlisted analytics, error classes, operational logs, provider and action receipts. | Named stage timings, failure denominators, build/backend compatibility, support repro; no amounts, merchants, or raw financial records in analytics. |
| 14. Outcome learning and stewardship | Released work is evaluated against user progress; failures change priorities. | [Job flows](../job-flows/_index.md), learning-release artifacts, incident reviews, refinement backlog. | Dated follow-up, owner, repeated-use evidence, and continue/change/retire decision. |

## Decision gates

| Stage | Required evidence |
| --- | --- |
| Prioritize | Named user job or engineering risk, current failure/gap, desired improvement, and scope. |
| Build | One behavior contract, affected actors, invariants, failure states, and concrete acceptance cases. |
| Local handoff | Focused regressions plus `npm run verify:local -- --run` scoped to the work when sharing a dirty checkout. Preserve omitted files and manual follow-ups. |
| Integrate | Reviewed actual candidate and uncached `npm run verify:changed -- --run`, plus applicable CI and integration checks. |
| Release | Compatibility with the target backend, relevant native/provider/physical-device evidence, authorized rollout, and recovery plan. |
| Call successful | Observed completion, reliability, and latency against the capability's requirements; update its delivery evidence. |

These connect existing Kwilt rules; they do not replace `AGENTS.md`, weaken gates, authorize production writes, or demand a full ceremony for a cosmetic change. A global criterion is consistent across products; its risk level and acceptance thresholds depend on the actual product.

## Checkpoints and integration cadence

A long-running improvement goal must produce bounded, reviewable increments. Completing the entire quality program is not a prerequisite for committing or integrating a sound increment. Commit readiness, merge readiness, release readiness and outcome success are separate decisions.

### When to stop expanding the current batch

Evaluate a checkpoint when any of these signals appears:

- A coherent user behavior or engineering invariant is implemented and its focused regressions pass.
- The next change addresses a different failure mode, adds a new dependency, or crosses another ownership/security/schema boundary. Decide whether it belongs in this batch before beginning it.
- The accumulated change can no longer be explained, reviewed or rolled back as a bounded outcome; unrelated work or another initiative's PR is becoming mixed in.
- Main has advanced, verification evidence is becoming stale, or an external/native/deployment gate is the remaining constraint on otherwise completed work.
- A work session ends. For an autonomous goal, reassess after each completed behavior contract and before starting the next workstream; do not wait for the goal itself to end.

These are judgment signals, not file-count or elapsed-time quotas. If a checkpoint is deferred, record why the changes must remain together and the concrete next checkpoint. Repeated deferral should narrow the batch or surface the dependency, not silently grow an indefinite branch.

### What to do at the checkpoint

1. **Freeze scope.** Name the bounded outcome, remaining acceptance work, and follow-up backlog. Continue fixes necessary to make this batch sound; defer independent improvements.
2. **Preserve and commit.** Inspect branch/base/dirty state, preserve unrelated work, and create coherent commits within the user's authorization once their logic is understood and locally checked. If an interruption requires a partial checkpoint, label it explicitly as incomplete; it is not merge-ready. Keep work out of unrelated PRs. A commit is a recovery/review boundary, not release proof.
3. **Assess integration.** Reconcile with current main, review the actual candidate, run the uncached integration gate and applicable CI, and verify the workflows changed by this batch. Record migration/configuration ordering and recovery. Known failures introduced by the batch in those workflows block merging; future optimization elsewhere does not. If necessary, separate an independently useful compatible subset and reverify it rather than hiding an unresolved dependency.
4. **Integrate and restart deliberately.** Merge when the integration requirements are met and authority is present. Verify the resulting state, preserve deployment and device gates, then begin the next bounded cycle from current main. Do not call the parent goal complete merely because an increment merged.

Keep a short receipt in the capability assessment or PR: outcome and included/excluded scope; branch/base/commit; checks and runtime evidence; unresolved gates; dependency/deployment order; and next-cycle work. State committed, pushed, merged, deployed and observed status separately. Policy documentation alone has maturity **documented**; enforced/maintained requires evidence of the actual checks and repeated practice. This section grants no new publishing, production or destructive-action authority.

## Capability assessments

- [Budget assessment and improvement program, November 1, 2026](budget-quality-assessment-2026-11-01.md): current source/tests, live schema and bounded database measurements; installed-device performance remains unverified.

Keep historical audits as dated evidence. New assessments should link their applicable sources here instead of treating old scores as current.
