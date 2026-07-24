# Learning Release: live-better-goal-crossover

## Concept To Build

Kwilt Money shows one evidence-backed spending insight and lets the user turn it into an editable Kwilt goal draft for living the pattern better.

## Capability Delta

Today, the user cannot:

- Get a clear "what should I do differently?" answer from Budget.
- Turn a budget pattern into a Kwilt goal without manual translation.
- Preserve Budget evidence while moving follow-through into Kwilt.

After this release, the user can:

- See one pattern insight grounded in a budget meter or review history.
- Open an optional goal draft framed around living better with money.
- Confirm, edit, or dismiss the draft before any goal exists.
- Leave Budget with a concrete next step.

Still intentionally not supported:

- Full financial coaching.
- Multiple recommendations at once.
- Automatic Kwilt goal creation.
- Auto-selected Arc or identity claim.
- Raw transaction sharing into Kwilt.
- Investment, debt, tax, or credit advice.

## User Experience

The user encounters this in Budget Plan or Budget Detail after there is enough evidence for a single clear pattern.

Happy path:

1. Blaire opens Budget Plan or a budget detail page.
2. Budget shows one insight: what pattern was observed, which budget it came from, and why it matters.
3. The card offers two actions:
   - `Adjust budget rule`
   - `Set a goal?`
4. Tapping `Set a goal?` opens an editable goal draft.
5. The draft includes:
   - title,
   - short why,
   - suggested 30-day or month-end horizon,
   - one starter Activity,
   - source evidence summary.
6. Blaire confirms the handoff or dismisses it.

Example draft:

```text
Goal
Pause before household extras this month

Why
Shopping is running ahead of pace again, mostly from small Amazon purchases.

First step
Before buying household extras, add the item to a 24-hour list.
```

## Existing Product Relationship

This enhances Budget's thin Plan surface and the long-term `sustain-household-pattern` job step. It does not replace budget meters, transaction review, app controls, or Ask. It uses Kwilt for Goal and Activity follow-through instead of creating a separate goal system in Budget.

## Buildable Slice

Must be real:

- One deterministic pattern detector or fixture-backed insight source.
- One `GoalBridgeDraft` data shape.
- One in-app insight card on Plan or Budget Detail.
- One editable goal draft preview.
- One explicit user action before handoff.
- Instrumentation for seen, opened, accepted, dismissed, and fallback outcomes.
- Privacy copy that names what is and is not sent to Kwilt.

Can be thin or temporary:

- The first pattern can be fixture-backed or computed from a single budget lane.
- The first handoff can be a local preview, a clipboard/share fallback, or a deep link after the Kwilt URL contract is confirmed.
- The first starter Activity can be generated from a small template set rather than AI.

Intentionally excluded:

- Broad Ask-based advice.
- Agent-generated financial plans.
- Weekly review automation.
- Multi-budget prioritization.
- Full shared identity/account graph between Kwilt and Budget.

## Release Channel

Start with `Local build`, then `TestFlight build` if the handoff path is reliable.

Rationale: this is a high-trust crossover. The first proof should show whether the moment feels helpful to Blaire/Andrew before any production-visible prompt appears.

## Brand-Goodwill Guardrails

- Use the shared Kwilt voice rules. Budget can be more literal about spend state, but it should still sound clear, warm, practical, concrete, and non-shaming.
- Use humble evidence language: "This may be easier as a goal."
- Do not imply moral failure.
- Do not mention "optimize," "discipline," "financial health score," or "bad spending."
- Keep the goal optional and editable.
- Show the source evidence summary before handoff.
- Do not send raw transaction rows to Kwilt in the first release.
- Provide a clear dismiss path.

## Reversibility

The feature can be hidden by removing the insight card or disabling the goal handoff action. Draft payloads can remain local and temporary. No migrations are required if the first release avoids automatic goal creation and raw transaction sharing.

## Permanent Product Threshold

Promote this into accepted product capability when:

- Blaire understands why the goal was suggested.
- The prompt feels supportive rather than promotional.
- At least one accepted draft becomes a real Kwilt goal with a first Activity.
- The goal helps shape later spending behavior or app-gate decisions.
- The fallback path is not needed often enough to make the crossover feel broken.
