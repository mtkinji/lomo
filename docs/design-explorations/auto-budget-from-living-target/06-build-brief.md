# Phase 6: Build Brief

## Accepted product contract

The canonical build contract is [`docs/feature-briefs/auto-budget-from-living-target.md`](../../feature-briefs/auto-budget-from-living-target.md).

The design converges on an automatic, transparent, versioned living plan. Kwilt does the planning work after account onboarding; the user sees active budgets, one bundled notice when they change, and detail only on demand.

## Closed trust boundaries

- Ordinary transaction income and future planning income are separate classifications.
- Asset proceeds and one-time inflows never expand budgets without explicit intent.
- Candidate computation can be hidden; active promotion cannot be secret.
- Fixed commitments and user overrides are hard constraints.
- Missing or stale evidence holds the last trustworthy plan rather than creating a zero plan.
- Promotion, receipt creation, and active-pointer movement are one atomic operation.
- Every account lifecycle change rebuilds from the complete included evidence set.
- The system may leave capacity unassigned rather than fabricate precision.

## Reductive boundary

The capability does not earn a new destination. Its visible footprint is limited to:

1. the living-target onboarding step
2. generated budgets in Summary
3. at most one Summary notice
4. a focused change receipt on demand
5. one category source line and durable amount override
6. transaction meaning only when a transaction is inspected or materially unresolved

## Build sequence

The executable sequence and file-level seams are in [`docs/superpowers/plans/2026-07-10-transparent-automatic-living-plan.md`](../../superpowers/plans/2026-07-10-transparent-automatic-living-plan.md).

Implementation begins only after the reductive-UI structural and judgment gates. Pure fixtures and domain contracts precede schema or UI work. The first installed build remains internal and promotion-kill-switch protected.

## Phase decision

Phase 6 is ready for implementation. No unresolved product question requires speculative UI or an inferred meaning for money outside the living target.
