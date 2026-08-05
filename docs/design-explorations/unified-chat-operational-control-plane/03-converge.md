# Converge: Durable Turn Contract

## Chosen alternative

Add a durable Turn Contract to the existing run ledger, generic target-set composition over the canonical operation manifest, invariant-checked context authorization, and deterministic action-outcome projection.

## Capability delta

Today, the user cannot depend on a correction or retry retaining exact capability and inventory scope when routing or evidence selection changes.

After this release, a run can persist and resume:

- the intended outcome and explicit constraints;
- the exact participating capability and operation;
- whether targets are selected objects or every matching object;
- the prior run being corrected or retried;
- the authoritative counts and state used to form the visible outcome.

Still intentionally unsupported:

- silent Money mutation;
- one atomic transaction spanning unrelated capabilities;
- model-authored success without a proposal, handoff, or receipt;
- an operations dashboard the user must maintain.

## Reductive decisions

- Store the contract in the existing run-event payload; add no database table or migration.
- Keep bulk semantics out of the capability manifest; compose over its existing individual actions.
- Reuse the existing timeline; add no UI.
- Keep model interpretation, but remove its authority over target scope and action status.

## Activation

The control plane is ambient. It activates for capability actions, corrections, and retries. Users learn it only through dependable continuity and factual recovery language.

## Bet

We're betting that preserving typed intent and compiling visible status from capability facts will eliminate the highest-trust contradictions without making Chat more administrative. If not, we will narrow direct Chat action and require native handoff for capability classes that cannot satisfy the contract.

## Success signal

The incident transcript and cross-capability cases preserve scope, load the complete matching target set, stage only complete reviewable batches, and never emit an access or success claim that contradicts run facts.
