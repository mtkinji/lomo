# Learning Release: Target-Backed Category Adjustment

## Concept to build
Turn the existing category amount drawer into a guided decision that shows spending evidence and room in the living target before entry, then states the whole-plan outcome before save.

## Buildable slice
Must be real:
- Read the active allocation source and living-plan facts.
- Derive a supported recent-spending guidepost only from complete, eligible periods.
- Show current actual spend separately from the planned amount.
- Extend override preview to return before/after resource basis, target, planned, unassigned, over-target, living percentage, and changed allocations.
- Explain whether the proposal uses unassigned room, changes flexible budgets, or exceeds target.
- Persist through the existing override and atomic plan-promotion path.

Can be thin:
- Use a recent monthly average rather than a range.
- Keep `Review full plan` hidden until a real destination exists.
- Omit guideposts whose evidence is unavailable.

Intentionally excluded:
- A new global planner, advice, a “recommended” badge, changing the target, and this-month-only amounts.

## Release channel
Andrew-only local build, then TestFlight after simulator truth checks. This changes the meaning of a high-trust money edit and must be judged on the rendered phone surface.

## Guardrails and reversibility
- No exact financial values in analytics.
- Never calculate from missing or stale income.
- Never describe actual spending as planned capacity.
- Never hide automatic category changes.
- The enhancement can be withdrawn while leaving the underlying override flow and stored plan intact.

## Permanent product threshold
Keep it when users can choose an amount, explain the target consequence, and notice every category that will change without asking what the system did behind their back.
