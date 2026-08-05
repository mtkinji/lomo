# Learning Release: Unified Chat operational control plane

## Concept To Build

Kwilt carries an actionable turn as durable typed state so corrections, retries, evidence, tools, and visible outcomes remain one truthful operation.

## Capability Delta

Today, the user cannot reliably correct a bulk Money category action without scope being reconstructed from prose.

After this release, the user can correct or retry that action and receive the same complete authorized category scope and an outcome derived from actual proposal/tool state.

Still intentionally not supported:

- automatic application of Money category changes;
- universal batch transactions across capabilities.

## User Experience

No new surface. The user speaks naturally in the existing Chat thread. Successful work appears as existing reviewable proposals; failure states say what was found, what was not prepared, and that nothing changed.

## Existing Product Relationship

This enhances Unified Chat's durable run/evidence/proposal ledger and canonical capability manifest. Money remains the editor and mutation owner.

## Buildable Slice

Must be real:

- typed Turn Contract persisted in run events;
- contract-based correction and retry continuity;
- generic selected-object and all-matching target semantics;
- complete matching-target resolution across Money, Goals, Activities, and Chapters regressions;
- deterministic action truth and invariant checks;
- multi-turn incident replay and operational metric projection.

Can be thin:

- capability actions reuse their existing individual operation contracts; no bulk declarations exist;
- operational measures may be emitted through existing run events and analytics transport.

Intentionally excluded:

- new UI, migrations, external deployment, and cross-capability atomic batch apply.

## Release Channel

Local build first, then signed Simulator and TestFlight dogfood after source gates pass.

## Brand-Goodwill Guardrails

- Never imply records were inaccessible when they were loaded.
- Never imply a proposal was applied.
- Never expose machine ids in visible copy.
- Never make Money changes without review.

## Reversibility

The contract is an additive event payload and readers tolerate its absence, so the runtime can fall back to legacy policy for older threads.

## Permanent Product Threshold

Promote the pattern after the incident corpus passes across model changes and signed-device dogfood shows correction, retry, background, and resume continuity without contradiction.
